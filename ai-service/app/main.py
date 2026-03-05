"""
DGDORDE AI Background Removal Microservice
Uses rembg (U2Net) for production-grade background removal.

Install: pip install -r requirements.txt
Run: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
import io
import math
import numpy as np

app = FastAPI(
    title="DGDORDE AI Service",
    description="Background removal and clothing classification",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("./uploads")
PROCESSED_DIR = Path("./processed")
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

# Lazy-load rembg to avoid startup delay
_rembg_session = None

def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        try:
            from rembg import new_session
            _rembg_session = new_session("u2net")
        except ImportError:
            return None
    return _rembg_session


CLOTHING_CATEGORIES = {
    'tops': ['shirt', 'tshirt', 't-shirt', 'blouse', 'top', 'polo', 'tank', 'sweater', 'hoodie', 'cami'],
    'bottoms': ['pants', 'jeans', 'shorts', 'skirt', 'trousers', 'leggings', 'chinos'],
    'outerwear': ['jacket', 'coat', 'blazer', 'cardigan', 'windbreaker', 'parka', 'trench'],
    'shoes': ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'loafers'],
    'accessories': ['hat', 'cap', 'scarf', 'belt', 'tie', 'watch', 'bag', 'glasses'],
    'dresses': ['dress', 'gown', 'romper', 'jumpsuit'],
}

def classify_clothing(filename: str) -> str:
    name = filename.lower()
    for category, keywords in CLOTHING_CATEGORIES.items():
        if any(kw in name for kw in keywords):
            return category
    return "tops"


def postprocess_garment(image_rgba: Image.Image) -> Image.Image:
    """
    Best-effort cleanup:
    - contour/PCA-based upright normalization on the alpha mask
    - clean alpha mask (remove tiny spots, fill tiny holes)
    - stronger wrinkle suppression + tone balancing
    - quality gate: fallback to original cutout if enhancement degrades output
    """
    img = image_rgba.convert("RGBA")
    baseline = img.copy()

    def alpha_bbox(alpha_img: Image.Image):
        arr = np.array(alpha_img, dtype=np.uint8)
        ys, xs = np.where(arr > 15)
        if len(xs) == 0:
            return None
        return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1

    def estimate_rotation_deg(alpha_img: Image.Image) -> float:
        arr = np.array(alpha_img, dtype=np.uint8)
        ys, xs = np.where(arr > 15)
        if len(xs) < 200:
            return 0.0
        x = xs.astype(np.float32) - xs.mean()
        y = ys.astype(np.float32) - ys.mean()
        cov = np.cov(np.stack([x, y]))
        eigvals, eigvecs = np.linalg.eig(cov)
        principal = eigvecs[:, np.argmax(eigvals)]
        angle = math.degrees(math.atan2(float(principal[1]), float(principal[0])))
        # Target upright axis (90 deg). Normalize to shortest rotation.
        rotate = 90.0 - angle
        while rotate > 90.0:
            rotate -= 180.0
        while rotate < -90.0:
            rotate += 180.0
        if abs(rotate) > 45.0:
            rotate = rotate - 90.0 if rotate > 0 else rotate + 90.0
        return float(max(min(rotate, 30.0), -30.0))

    def edge_strength(rgba_img: Image.Image) -> float:
        r, g, b, a = rgba_img.split()
        gray = Image.merge("RGB", (r, g, b)).convert("L")
        edges = gray.filter(ImageFilter.FIND_EDGES)
        ea = np.array(edges, dtype=np.float32)
        aa = np.array(a, dtype=np.uint8) > 15
        if aa.sum() == 0:
            return 0.0
        return float(ea[aa].mean())

    def mask_area(alpha_img: Image.Image) -> int:
        arr = np.array(alpha_img, dtype=np.uint8)
        return int((arr > 15).sum())

    # 1) Contour-aware straightening and framing
    _, _, _, a0 = img.split()
    rot = estimate_rotation_deg(a0)
    if abs(rot) > 1.5:
        img = img.rotate(rot, expand=True, resample=Image.BICUBIC)

    r, g, b, a = img.split()
    bbox = alpha_bbox(a)
    if bbox is not None:
        # Crop to garment contour bounds and place centered on fixed canvas.
        garment = img.crop(bbox)
        CANVAS_SIZE = 1024
        PAD = 84
        target = CANVAS_SIZE - PAD * 2
        gw, gh = garment.size
        scale = min(target / max(gw, 1), target / max(gh, 1))
        new_size = (max(1, int(gw * scale)), max(1, int(gh * scale)))
        garment = garment.resize(new_size, resample=Image.LANCZOS)
        canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        ox = (CANVAS_SIZE - new_size[0]) // 2
        oy = (CANVAS_SIZE - new_size[1]) // 2
        canvas.paste(garment, (ox, oy), garment)
        img = canvas
        r, g, b, a = img.split()

    # 2) Stronger fold/spot cleanup
    a = a.filter(ImageFilter.MedianFilter(size=3))
    a = a.filter(ImageFilter.MaxFilter(size=3))
    a = a.filter(ImageFilter.MinFilter(size=3))
    a = a.point(lambda p: 255 if p >= 18 else 0)

    rgb = Image.merge("RGB", (r, g, b))
    rgb = rgb.filter(ImageFilter.MedianFilter(size=3))
    rgb = rgb.filter(ImageFilter.GaussianBlur(radius=0.9))
    rgb = rgb.filter(ImageFilter.SMOOTH_MORE).filter(ImageFilter.SMOOTH_MORE)
    balanced = ImageOps.autocontrast(rgb, cutoff=1)
    rgb = Image.blend(rgb, balanced, alpha=0.42)
    rgb = ImageEnhance.Color(rgb).enhance(1.02)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.25, percent=115, threshold=2))
    rr, gg, bb = rgb.split()
    candidate = Image.merge("RGBA", (rr, gg, bb, a))

    # 3) Quality gate fallback (keep original cutout if enhancement is too destructive)
    _, _, _, ba = baseline.split()
    area_before = mask_area(ba)
    area_after = mask_area(candidate.split()[-1])
    edge_before = edge_strength(baseline)
    edge_after = edge_strength(candidate)

    if area_before > 0:
        area_ratio = area_after / max(area_before, 1)
        edge_ratio = edge_after / max(edge_before, 1e-6)
        if area_ratio < 0.72 or area_ratio > 1.35 or edge_ratio < 0.45:
            return baseline

    return candidate


@app.get("/health")
async def health_check():
    return {"status": "healthy", "rembg_available": get_rembg_session() is not None}


@app.post("/process")
async def process_image(image: UploadFile = File(...)):
    """Process clothing image: remove background and classify."""
    
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(image.filename or "image.png")[1] or ".png"
    
    # Save original
    original_path = UPLOAD_DIR / f"{file_id}{ext}"
    contents = await image.read()
    with open(original_path, "wb") as f:
        f.write(contents)
    
    # Process with rembg
    processed_path = PROCESSED_DIR / f"{file_id}_clean.png"
    
    session = get_rembg_session()
    if session:
        from rembg import remove
        
        input_image = Image.open(io.BytesIO(contents))
        output_image = remove(input_image, session=session)
        output_image = postprocess_garment(output_image)
        output_image.save(str(processed_path), "PNG")
    else:
        # Fallback: just copy the original (rembg not installed)
        img = Image.open(io.BytesIO(contents)).convert("RGBA")
        img = postprocess_garment(img)
        img.save(str(processed_path), "PNG")
    
    # Classify
    category = classify_clothing(image.filename or "")
    
    return JSONResponse({
        "success": True,
        "data": {
            "id": file_id,
            "category": category,
            "original_url": f"/uploads/{file_id}{ext}",
            "processed_url": f"/processed/{file_id}_clean.png",
            "filename": image.filename,
        }
    })


@app.get("/uploads/{filename}")
async def get_upload(filename: str):
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(path))


@app.get("/processed/{filename}")
async def get_processed(filename: str):
    path = PROCESSED_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(path))
