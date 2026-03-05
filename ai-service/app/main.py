"""
DGDORDE AI Background Removal Microservice
Uses rembg (U2Net) for production-grade background removal.

Install: pip install -r requirements.txt
Run: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
import uuid
import os
import io
from pathlib import Path
from typing import Tuple, Dict, Any, List

import numpy as np
from PIL import Image, ImageEnhance, ImageOps

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

# Eagerly initialize rembg session with lightweight model for fast, cold-start-free processing
try:
    from rembg import new_session, remove  # type: ignore

    REMBG_SESSION = new_session("u2netp")
except ImportError:
    # If rembg is not installed, fall back to a no-op implementation
    REMBG_SESSION = None
    remove = None  # type: ignore[misc]


def _remove_background_sync(image_bytes: bytes) -> bytes:
    """
    CPU-bound background removal using rembg.

    Runs in a threadpool via run_in_threadpool from the async path.
    Returns PNG bytes with alpha channel preserved.
    """
    # If rembg is unavailable, just return the original bytes (no-op)
    if REMBG_SESSION is None or remove is None:
        return image_bytes

    input_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    output_image = remove(input_image, session=REMBG_SESSION)

    buffer = io.BytesIO()
    # Optimized PNG with transparency; balances size and quality
    output_image.save(buffer, format="PNG", optimize=True, compress_level=9)
    return buffer.getvalue()


CATEGORY_LEVEL1 = [
    "topwear",
    "bottomwear",
    "outerwear",
    "footwear",
    "accessories",
]

CATEGORY_LEVEL2_BY_PARENT: Dict[str, Dict[str, str]] = {
    "topwear": {
        "t_shirt": "t-shirt",
        "shirt": "shirt",
        "hoodie": "hoodie",
        "sweater": "sweater",
        "tank_top": "tank top",
    },
    "bottomwear": {
        "jeans": "jeans",
        "shorts": "shorts",
        "trousers": "trousers",
        "skirt": "skirt",
    },
    "outerwear": {
        "jacket": "jacket",
        "coat": "coat",
    },
    "footwear": {
        "sneakers": "sneakers",
        "formal_shoes": "formal shoes",
        "boots": "boots",
        "sandals": "sandals",
    },
    "accessories": {
        "belt": "belt",
        "hat": "hat",
        "scarf": "scarf",
        "bag": "bag",
    },
}

# Simple keyword-based fallback classification that maps filenames to the 2-level schema.
_FILENAME_KEYWORDS: Dict[str, Tuple[str, str]] = {
    "tshirt": ("topwear", "t_shirt"),
    "t-shirt": ("topwear", "t_shirt"),
    "tee": ("topwear", "t_shirt"),
    "shirt": ("topwear", "shirt"),
    "hoodie": ("topwear", "hoodie"),
    "sweater": ("topwear", "sweater"),
    "jumper": ("topwear", "sweater"),
    "tank": ("topwear", "tank_top"),
    "vest": ("topwear", "tank_top"),
    "jeans": ("bottomwear", "jeans"),
    "denim": ("bottomwear", "jeans"),
    "shorts": ("bottomwear", "shorts"),
    "trousers": ("bottomwear", "trousers"),
    "pants": ("bottomwear", "trousers"),
    "skirt": ("bottomwear", "skirt"),
    "dress": ("bottomwear", "skirt"),
    "coat": ("outerwear", "coat"),
    "jacket": ("outerwear", "jacket"),
    "blazer": ("outerwear", "jacket"),
    "sneaker": ("footwear", "sneakers"),
    "trainer": ("footwear", "sneakers"),
    "shoe": ("footwear", "formal_shoes"),
    "loafers": ("footwear", "formal_shoes"),
    "boot": ("footwear", "boots"),
    "sandal": ("footwear", "sandals"),
    "flipflop": ("footwear", "sandals"),
    "belt": ("accessories", "belt"),
    "hat": ("accessories", "hat"),
    "cap": ("accessories", "hat"),
    "scarf": ("accessories", "scarf"),
    "bag": ("accessories", "bag"),
}

# Confidence threshold below which we mark the result as unclassified
LOW_CONFIDENCE_THRESHOLD = 0.4


def _predict_category_from_filename(filename: str) -> Tuple[str, str, float]:
    name = (filename or "").lower()
    for keyword, (cat, subcat) in _FILENAME_KEYWORDS.items():
        if keyword in name:
            return cat, subcat, 0.7
    # Default fallback — low confidence because nothing matched
    return "topwear", "t_shirt", 0.3


_classifier = None

def get_clip_classifier():
    global _classifier
    if _classifier is None:
        try:
            from transformers import pipeline
            # Initialize zero-shot image classification model lazily
            _classifier = pipeline("zero-shot-image-classification", model="openai/clip-vit-base-patch32")
        except Exception as e:
            print(f"Failed to load CLIP classifier: {e}")
            _classifier = "fallback"
    return _classifier

def classify_image(image_bytes: bytes, filename: str | None = None) -> Dict[str, Any]:
    """
    CLIP-based zero-shot image classifier.
    Falls back to keyword-based classification if model fails to load.
    """
    classifier = get_clip_classifier()
    
    if classifier == "fallback":
        category, sub_category, confidence = _predict_category_from_filename(filename or "")
    else:
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            
            # Map candidate labels directly to our internal taxonomy
            label_map = {
                "a t-shirt": ("topwear", "t_shirt"),
                "a casual shirt": ("topwear", "shirt"),
                "a formal shirt": ("topwear", "shirt"),
                "a hoodie": ("topwear", "hoodie"),
                "a sweater": ("topwear", "sweater"),
                "a tank top": ("topwear", "tank_top"),
                "a pair of jeans": ("bottomwear", "jeans"),
                "a pair of shorts": ("bottomwear", "shorts"),
                "a pair of trousers": ("bottomwear", "trousers"),
                "a skirt": ("bottomwear", "skirt"),
                "a dress": ("dresses", "dress"),
                "a jacket": ("outerwear", "jacket"),
                "a coat": ("outerwear", "coat"),
                "a pair of sneakers": ("footwear", "sneakers"),
                "a pair of formal shoes": ("footwear", "formal_shoes"),
                "a pair of boots": ("footwear", "boots"),
                "a pair of sandals": ("footwear", "sandals"),
                "a belt": ("accessories", "belt"),
                "a hat": ("accessories", "hat"),
                "a scarf": ("accessories", "scarf"),
                "a bag or purse": ("accessories", "bag"),
            }
            
            candidate_labels = list(label_map.keys())
            results = classifier(img, candidate_labels=candidate_labels)
            
            top_result = results[0]
            label = top_result["label"]
            confidence = float(top_result["score"])
            
            category, sub_category = label_map.get(label, ("topwear", "t_shirt"))
            
        except Exception as e:
            print(f"Classification error: {e}")
            category, sub_category, confidence = _predict_category_from_filename(filename or "")

    is_low_confidence = confidence < LOW_CONFIDENCE_THRESHOLD
    if is_low_confidence:
        return {
            "category": "unclassified",
            "sub_category": "other",
            "confidence": round(confidence, 3),
            "is_low_confidence": True,
        }

    return {
        "category": category,
        "sub_category": sub_category,
        "confidence": round(confidence, 3),
        "is_low_confidence": False,
    }


COLOR_PALETTE: Dict[str, Tuple[int, int, int]] = {
    "White": (245, 245, 245),
    "Black": (10, 10, 10),
    "Light Grey": (200, 200, 200),
    "Dark Grey": (80, 80, 80),
    "Navy Blue": (44, 62, 80),
    "Blue": (52, 152, 219),
    "Sky Blue": (135, 206, 235),
    "Red": (192, 57, 43),
    "Burgundy": (123, 36, 28),
    "Pink": (233, 79, 134),
    "Orange": (230, 126, 34),
    "Yellow": (241, 196, 15),
    "Beige": (245, 222, 179),
    "Brown": (121, 85, 72),
    "Olive": (128, 128, 0),
    "Green": (39, 174, 96),
    "Teal": (22, 160, 133),
}


def _rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    r, g, b = rgb
    return f"#{r:02X}{g:02X}{b:02X}"


def _nearest_color_name(rgb: Tuple[int, int, int]) -> str:
    r, g, b = rgb
    best_name = "Unknown"
    best_dist = float("inf")
    for name, (pr, pg, pb) in COLOR_PALETTE.items():
        dr = r - pr
        dg = g - pg
        db = b - pb
        dist = dr * dr + dg * dg + db * db
        if dist < best_dist:
            best_dist = dist
            best_name = name
    return best_name


def extract_dominant_color(
    processed_png_bytes: bytes,
) -> Tuple[str, str, List[Dict[str, str]]]:
    """
    Compute dominant color and a top-3 color palette from an RGBA PNG,
    ignoring fully transparent pixels.

    Returns:
        (dominant_hex, dominant_name, palette)
        where palette is a list of up to 3 {hex, name} dicts sorted by cluster size.
    """
    _fallback_palette = [{"hex": "#B0B0B0", "name": "Light Grey"}]

    try:
        img = Image.open(io.BytesIO(processed_png_bytes)).convert("RGBA")
    except Exception:
        return "#B0B0B0", "Light Grey", _fallback_palette

    arr = np.array(img)
    if arr.shape[-1] != 4:
        rgb = arr.reshape(-1, 3)
    else:
        alpha = arr[:, :, 3]
        mask = alpha > 0
        if not mask.any():
            return "#B0B0B0", "Light Grey", _fallback_palette
        rgb = arr[:, :, :3][mask]

    # Downsample for speed
    MAX_PIXELS = 5000
    if rgb.shape[0] > MAX_PIXELS:
        idx = np.random.choice(rgb.shape[0], MAX_PIXELS, replace=False)
        rgb = rgb[idx]

    # Try K-Means clustering for richer palette (k=3)
    palette_entries: List[Dict[str, str]] = []
    try:
        from sklearn.cluster import KMeans  # type: ignore

        k = min(3, rgb.shape[0])
        km = KMeans(n_clusters=k, n_init=5, random_state=0)
        km.fit(rgb)

        labels = km.labels_
        centers = km.cluster_centers_

        # Count pixels per cluster and sort by count descending
        counts = np.bincount(labels, minlength=k)
        order = np.argsort(-counts)

        for idx_c in order:
            center = tuple(int(x) for x in centers[idx_c])
            hex_c = _rgb_to_hex(center)  # type: ignore[arg-type]
            name_c = _nearest_color_name(center)  # type: ignore[arg-type]
            palette_entries.append({"hex": hex_c, "name": name_c})

    except Exception:
        # Fallback: simple mean color only
        mean_color = tuple(int(x) for x in rgb.mean(axis=0))
        hex_color = _rgb_to_hex(mean_color)  # type: ignore[arg-type]
        name = _nearest_color_name(mean_color)  # type: ignore[arg-type]
        palette_entries = [{"hex": hex_color, "name": name}]

    dominant = palette_entries[0] if palette_entries else {"hex": "#B0B0B0", "name": "Light Grey"}
    return dominant["hex"], dominant["name"], palette_entries


def apply_studio_look(bg_removed_png_bytes: bytes) -> bytes:
    """
    Apply studio-style post-processing:
    - Auto-crop to non-transparent pixels.
    - Scale proportionally to fit within canvas_size * 0.85 (preserving aspect ratio).
    - Center on square transparent canvas (letterbox/pillarbox padding — no stretching).
    - Edge artifact cleanup: erode mask 1-2px, soft-blur narrow border to remove halos.
    - Mild brightness/contrast boost.
    """
    img = Image.open(io.BytesIO(bg_removed_png_bytes)).convert("RGBA")
    arr = np.array(img)

    # ── Step 1: Auto-crop using alpha channel ────────────────────────────────
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if ys.size == 0 or xs.size == 0:
        base = img
    else:
        top, bottom = ys.min(), ys.max()
        left, right = xs.min(), xs.max()
        # Tiny safety margin so rembg edge pixels aren't clipped
        top    = max(top - 2, 0)
        left   = max(left - 2, 0)
        bottom = min(bottom + 2, arr.shape[0] - 1)
        right  = min(right + 2, arr.shape[1] - 1)
        base = img.crop((left, top, right + 1, bottom + 1))

    bw, bh = base.size

    # ── Step 2: Proportional fit onto square canvas ──────────────────────────
    # canvas_size is derived from the longer side + 25% breathing room.
    max_side = max(bw, bh)
    canvas_size = int(max_side * 1.25)

    # Fit within 85% of the canvas while keeping aspect ratio (letterbox/pillarbox)
    fit_box = int(canvas_size * 0.85)
    fitted = ImageOps.contain(base, (fit_box, fit_box), Image.LANCZOS)

    fw, fh = fitted.size
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset_x = (canvas_size - fw) // 2
    offset_y = (canvas_size - fh) // 2
    canvas.paste(fitted, (offset_x, offset_y), fitted)

    # ── Step 3: Edge artifact cleanup (halo removal) + brightness boost ──────
    try:
        import cv2  # type: ignore

        cv_arr = np.array(canvas)
        bgr      = cv_arr[:, :, :3].copy()
        a_chan   = cv_arr[:, :, 3].copy()

        orig_mask  = (a_chan > 0).astype(np.uint8)
        kernel     = np.ones((3, 3), np.uint8)
        eroded     = cv2.erode(orig_mask, kernel, iterations=1)

        # Border region = original mask minus eroded (the outer 1-px ring)
        border_mask = (orig_mask == 1) & (eroded == 0)

        if border_mask.any():
            # Blur entire BGR then only apply blurred pixels in the border zone
            blurred_bgr = cv2.GaussianBlur(bgr.astype(np.float32), (3, 3), sigmaX=0.5)
            bgr[border_mask] = np.clip(blurred_bgr[border_mask], 0, 255).astype(np.uint8)

        # Brightness/contrast boost — only on opaque pixels
        alpha_mask_bool = a_chan > 0
        if alpha_mask_bool.any():
            enhanced_bgr = cv2.convertScaleAbs(bgr, alpha=1.15, beta=10)
            bgr[alpha_mask_bool] = enhanced_bgr[alpha_mask_bool]

        enhanced = np.dstack([bgr, a_chan])
        final_img = Image.fromarray(enhanced, mode="RGBA")

    except Exception:
        # Fallback to Pillow-only enhancement (no edge cleanup)
        final_img = canvas
        enhancer_b = ImageEnhance.Brightness(final_img)
        final_img = enhancer_b.enhance(1.1)
        enhancer_c = ImageEnhance.Contrast(final_img)
        final_img = enhancer_c.enhance(1.15)

    out_buf = io.BytesIO()
    final_img.save(out_buf, format="PNG", optimize=True, compress_level=9)
    return out_buf.getvalue()


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "rembg_available": REMBG_SESSION is not None,
    }


@app.post("/process")
async def process_image(image: UploadFile = File(...)):
    """Process clothing image: remove background, classify, and extract attributes."""

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    file_id = str(uuid.uuid4())
    ext = os.path.splitext(image.filename or "image.png")[1] or ".png"

    raw_contents = await image.read()

    # ── EXIF orientation fix ─────────────────────────────────────────────────
    # Apply EXIF transpose early so all downstream steps (rembg, OpenCV, crop)
    # work on a correctly-oriented image regardless of phone EXIF data.
    try:
        _img_exif = Image.open(io.BytesIO(raw_contents))
        _img_exif = ImageOps.exif_transpose(_img_exif)
        _exif_buf = io.BytesIO()
        # Preserve format; fall back to PNG which always supports RGBA
        save_fmt = (_img_exif.format or "PNG").upper()
        if save_fmt not in ("JPEG", "JPG", "PNG", "WEBP"):
            save_fmt = "PNG"
        if save_fmt in ("JPEG", "JPG"):
            # JPEG doesn't support transparency; convert to RGB
            _img_exif = _img_exif.convert("RGB")
            _img_exif.save(_exif_buf, format="JPEG", quality=95)
        else:
            _img_exif.save(_exif_buf, format="PNG")
        contents = _exif_buf.getvalue()
    except Exception:
        # If EXIF correction fails for any reason, proceed with raw bytes
        contents = raw_contents

    # Save original (EXIF-corrected) to disk for later retrieval
    original_path = UPLOAD_DIR / f"{file_id}{ext}"
    with open(original_path, "wb") as f:
        f.write(contents)

    # Process with rembg in a worker thread to keep the event loop responsive
    bg_removed_bytes = await run_in_threadpool(_remove_background_sync, contents)

    # Apply studio-style post-processing (crop, square canvas, edge cleanup, enhancement)
    processed_bytes = await run_in_threadpool(apply_studio_look, bg_removed_bytes)

    # Persist processed image
    processed_path = PROCESSED_DIR / f"{file_id}_clean.png"
    with open(processed_path, "wb") as f:
        f.write(processed_bytes)

    # Classification (hierarchical) — with low-confidence handling
    classification = classify_image(processed_bytes, image.filename or "")

    # Dominant color + multi-color palette
    dominant_hex, color_name, palette = extract_dominant_color(processed_bytes)

    # Simple suggested tags based on category
    suggested_tags = []
    cat = classification["category"]
    if cat == "topwear":
        suggested_tags.extend(["casual"])
    if cat == "bottomwear":
        suggested_tags.extend(["casual"])
    if cat == "outerwear":
        suggested_tags.extend(["winter"])
    if cat == "footwear":
        suggested_tags.extend(["casual"])

    data = {
        "processed_url": f"/processed/{file_id}_clean.png",
        "classification": classification,
        "attributes": {
            "dominant_color": dominant_hex,
            "color_name": color_name,
            "palette": palette,
            "suggested_tags": suggested_tags,
        },
        "id": file_id,
        "original_url": f"/uploads/{file_id}{ext}",
        "filename": image.filename,
    }

    return JSONResponse({"success": True, "data": data})


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
