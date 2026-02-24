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
        from PIL import Image
        import io
        
        input_image = Image.open(io.BytesIO(contents))
        output_image = remove(input_image, session=session)
        output_image.save(str(processed_path), "PNG")
    else:
        # Fallback: just copy the original (rembg not installed)
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(contents)).convert("RGBA")
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
