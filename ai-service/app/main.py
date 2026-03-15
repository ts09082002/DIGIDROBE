"""
DGDORDE AI Background Removal Microservice
Uses rembg (U2Net) for production-grade background removal.
Uses Google Cloud Vision API for clothing classification.
Uses ColorThief (Median Cut / Palette API) for color extraction.

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
import logging
from pathlib import Path
from typing import Tuple, Dict, Any, List, Optional

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


logger = logging.getLogger("digidrobe-ai")

# ──────────────────────────────────────────────────────────────────────────────
# Google Cloud Vision API client (server-side ML Kit equivalent)
# ──────────────────────────────────────────────────────────────────────────────
_vision_client = None


def _get_vision_client():
    """Lazily initialize Google Cloud Vision client."""
    global _vision_client
    if _vision_client is None:
        try:
            from google.cloud import vision  # type: ignore

            # Looks for GOOGLE_APPLICATION_CREDENTIALS env var or
            # google-credentials.json in ai-service root
            creds_path = Path(__file__).resolve().parent.parent / "google-credentials.json"
            if creds_path.exists():
                logger.info(f"Found credentials at {creds_path}, setting GOOGLE_APPLICATION_CREDENTIALS")
                os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", str(creds_path))
            else:
                logger.warning(f"Google credentials file NOT FOUND at {creds_path}. Vision API will be disabled.")

            _vision_client = vision.ImageAnnotatorClient()
            logger.info("Google Cloud Vision client initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Vision client (likely missing credentials): {e}")
            _vision_client = "fallback"
    return _vision_client


# ──────────────────────────────────────────────────────────────────────────────
# Clothing classification via Vision API labels
# ──────────────────────────────────────────────────────────────────────────────

# Maps Vision API label descriptions (lowercase) → (category, sub_category)
_VISION_LABEL_MAP: Dict[str, Tuple[str, str]] = {
    # Topwear
    "t-shirt": ("topwear", "t_shirt"),
    "t shirt": ("topwear", "t_shirt"),
    "shirt": ("topwear", "shirt"),
    "polo shirt": ("topwear", "shirt"),
    "blouse": ("topwear", "shirt"),
    "top": ("topwear", "t_shirt"),
    "hoodie": ("topwear", "hoodie"),
    "sweatshirt": ("topwear", "hoodie"),
    "sweater": ("topwear", "sweater"),
    "pullover": ("topwear", "sweater"),
    "cardigan": ("topwear", "sweater"),
    "tank top": ("topwear", "tank_top"),
    "sleeveless shirt": ("topwear", "tank_top"),
    "vest": ("topwear", "tank_top"),
    "crop top": ("topwear", "tank_top"),
    "jersey": ("topwear", "t_shirt"),
    "active shirt": ("topwear", "t_shirt"),
    # Bottomwear
    "jeans": ("bottomwear", "jeans"),
    "denim": ("bottomwear", "jeans"),
    "shorts": ("bottomwear", "shorts"),
    "bermuda shorts": ("bottomwear", "shorts"),
    "trousers": ("bottomwear", "trousers"),
    "pants": ("bottomwear", "trousers"),
    "chinos": ("bottomwear", "trousers"),
    "joggers": ("bottomwear", "trousers"),
    "sweatpants": ("bottomwear", "trousers"),
    "leggings": ("bottomwear", "trousers"),
    "cargo pants": ("bottomwear", "trousers"),
    "skirt": ("bottomwear", "skirt"),
    "lower": ("bottomwear", "trousers"),
    "lowers": ("bottomwear", "trousers"),
    # Dresses
    "dress": ("dresses", "dress"),
    "gown": ("dresses", "dress"),
    "cocktail dress": ("dresses", "dress"),
    "one-piece garment": ("dresses", "dress"),
    "romper": ("dresses", "dress"),
    "jumpsuit": ("dresses", "dress"),
    # Outerwear
    "jacket": ("outerwear", "jacket"),
    "coat": ("outerwear", "coat"),
    "blazer": ("outerwear", "jacket"),
    "parka": ("outerwear", "coat"),
    "windbreaker": ("outerwear", "jacket"),
    "overcoat": ("outerwear", "coat"),
    "trench coat": ("outerwear", "coat"),
    "leather jacket": ("outerwear", "jacket"),
    "denim jacket": ("outerwear", "jacket"),
    "bomber jacket": ("outerwear", "jacket"),
    "raincoat": ("outerwear", "coat"),
    # Footwear
    "shoe": ("footwear", "formal_shoes"),
    "sneakers": ("footwear", "sneakers"),
    "running shoe": ("footwear", "sneakers"),
    "athletic shoe": ("footwear", "sneakers"),
    "walking shoe": ("footwear", "sneakers"),
    "tennis shoe": ("footwear", "sneakers"),
    "boot": ("footwear", "boots"),
    "hiking boot": ("footwear", "boots"),
    "ankle boot": ("footwear", "boots"),
    "sandal": ("footwear", "sandals"),
    "flip-flops": ("footwear", "sandals"),
    "slipper": ("footwear", "sandals"),
    "loafer": ("footwear", "formal_shoes"),
    "high heels": ("footwear", "formal_shoes"),
    "formal shoes": ("footwear", "formal_shoes"),
    "oxford shoe": ("footwear", "formal_shoes"),
    # Accessories
    "belt": ("accessories", "belt"),
    "hat": ("accessories", "hat"),
    "cap": ("accessories", "hat"),
    "baseball cap": ("accessories", "hat"),
    "beanie": ("accessories", "hat"),
    "scarf": ("accessories", "scarf"),
    "bag": ("accessories", "bag"),
    "handbag": ("accessories", "bag"),
    "backpack": ("accessories", "bag"),
    "purse": ("accessories", "bag"),
    "tote bag": ("accessories", "bag"),
    "watch": ("accessories", "watch"),
    "sunglasses": ("accessories", "sunglasses"),
    "glasses": ("accessories", "sunglasses"),
    "necklace": ("accessories", "jewelry"),
    "bracelet": ("accessories", "jewelry"),
    "earring": ("accessories", "jewelry"),
    "ring": ("accessories", "jewelry"),
    "tie": ("accessories", "tie"),
    "bow tie": ("accessories", "tie"),
}

# Simple keyword-based fallback classification (used when Vision API unavailable)
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
    "dress": ("dresses", "dress"),
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
    """Keyword-based fallback classification from filename."""
    name = (filename or "").lower()
    logger.info(f"Attempting fallback classification for filename: {name}")
    for keyword, (cat, subcat) in _FILENAME_KEYWORDS.items():
        if keyword in name:
            logger.info(f"Fallback match found: {keyword} -> {cat}/{subcat}")
            return cat, subcat, 0.7
    logger.info("No fallback keywords matched filename, defaulting to unclassified")
    return "unclassified", "other", 0.3


def _classify_with_vision_api(image_bytes: bytes) -> Optional[Dict[str, Any]]:
    """
    Use Google Cloud Vision API (ML Kit server-side equivalent) to label
    the image. Returns classification dict or None on failure.
    """
    client = _get_vision_client()
    if client == "fallback" or client is None:
        return None

    try:
        from google.cloud import vision  # type: ignore

        image = vision.Image(content=image_bytes)
        response = client.label_detection(image=image, max_results=15)

        if response.error.message:
            logger.error(f"Vision API error: {response.error.message}")
            return None

        labels = response.label_annotations
        raw_labels = [lbl.description for lbl in labels]
        logger.info(f"Vision API labels: {raw_labels}")

        # Walk labels in score order and find the first clothing-specific match
        best_category = None
        best_sub = None
        best_score = 0.0

        for lbl in labels:
            desc_lower = lbl.description.lower()
            # Try exact match first
            if desc_lower in _VISION_LABEL_MAP:
                cat, sub = _VISION_LABEL_MAP[desc_lower]
                if lbl.score > best_score:
                    best_category = cat
                    best_sub = sub
                    best_score = lbl.score
                    break  # First matched label is highest confidence
            # Try partial / substring match for compound labels
            else:
                for key, (cat, sub) in _VISION_LABEL_MAP.items():
                    if key in desc_lower or desc_lower in key:
                        if lbl.score > best_score:
                            best_category = cat
                            best_sub = sub
                            best_score = lbl.score
                        break

        if best_category:
            return {
                "category": best_category,
                "sub_category": best_sub,
                "confidence": round(best_score, 3),
                "is_low_confidence": best_score < LOW_CONFIDENCE_THRESHOLD,
                "ml_labels": raw_labels,
            }

        # Vision API responded but no clothing labels matched our taxonomy
        return {
            "category": "unclassified",
            "sub_category": "other",
            "confidence": 0.0,
            "is_low_confidence": True,
            "ml_labels": raw_labels,
        }

    except Exception as e:
        logger.error(f"Vision API classification error: {e}")
        return None


def classify_image(image_bytes: bytes, filename: str | None = None) -> Dict[str, Any]:
    """
    Classify clothing image using Google Cloud Vision API.
    Falls back to keyword-based classification if Vision API is unavailable.
    """
    # Try Vision API first
    vision_result = _classify_with_vision_api(image_bytes)
    if vision_result is not None:
        return vision_result

    # Fallback: keyword-based classification from filename
    logger.info("Using filename-based fallback classification")
    category, sub_category, confidence = _predict_category_from_filename(filename or "")

    is_low_confidence = confidence < LOW_CONFIDENCE_THRESHOLD
    if is_low_confidence:
        return {
            "category": "unclassified",
            "sub_category": "other",
            "confidence": round(confidence, 3),
            "is_low_confidence": True,
            "ml_labels": [],
        }

    return {
        "category": category,
        "sub_category": sub_category,
        "confidence": round(confidence, 3),
        "is_low_confidence": False,
        "ml_labels": [],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Color extraction using ColorThief (Palette API / Median Cut algorithm)
# ──────────────────────────────────────────────────────────────────────────────

# Named color palette for mapping RGB → human-readable names
COLOR_PALETTE: Dict[str, Tuple[int, int, int]] = {
    "White": (245, 245, 245),
    "Black": (10, 10, 10),
    "Light Grey": (200, 200, 200),
    "Dark Grey": (80, 80, 80),
    "Navy Blue": (44, 62, 80),
    "Blue": (52, 152, 219),
    "Sky Blue": (135, 206, 235),
    "Royal Blue": (65, 105, 225),
    "Red": (192, 57, 43),
    "Burgundy": (123, 36, 28),
    "Maroon": (128, 0, 0),
    "Pink": (233, 79, 134),
    "Light Pink": (255, 182, 193),
    "Hot Pink": (255, 105, 180),
    "Orange": (230, 126, 34),
    "Coral": (255, 127, 80),
    "Yellow": (241, 196, 15),
    "Gold": (255, 215, 0),
    "Cream": (255, 253, 208),
    "Beige": (245, 222, 179),
    "Tan": (210, 180, 140),
    "Brown": (121, 85, 72),
    "Chocolate": (139, 69, 19),
    "Olive": (128, 128, 0),
    "Khaki": (189, 183, 107),
    "Green": (39, 174, 96),
    "Forest Green": (34, 139, 34),
    "Mint": (152, 255, 152),
    "Teal": (22, 160, 133),
    "Turquoise": (64, 224, 208),
    "Purple": (128, 0, 128),
    "Lavender": (230, 230, 250),
    "Violet": (148, 103, 189),
    "Indigo": (75, 0, 130),
}


def _rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    r, g, b = rgb
    return f"#{r:02X}{g:02X}{b:02X}"


def _nearest_color_name(rgb: Tuple[int, int, int]) -> str:
    """Map an RGB tuple to the nearest named color."""
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
    Extract dominant color and palette using ColorThief (Median Cut algorithm),
    which is the same approach as Android's Palette API.

    For RGBA images, transparent pixels are masked out before analysis.

    Returns:
        (dominant_hex, dominant_name, palette)
        where palette is a list of {hex, name, population} dicts.
    """
    _fallback_palette = [{"hex": "#B0B0B0", "name": "Light Grey"}]

    try:
        # First, handle transparency: flatten RGBA onto white background
        # but only keep opaque pixel regions for analysis
        img = Image.open(io.BytesIO(processed_png_bytes)).convert("RGBA")
        arr = np.array(img)

        if arr.shape[-1] == 4:
            alpha = arr[:, :, 3]
            mask = alpha > 10  # ignore near-transparent pixels
            if not mask.any():
                return "#B0B0B0", "Light Grey", _fallback_palette

            # Create an opaque-only image for ColorThief
            opaque_pixels = arr[:, :, :3].copy()
            # Set transparent pixels to a neutral color to avoid skewing
            opaque_pixels[~mask] = [128, 128, 128]
            opaque_img = Image.fromarray(opaque_pixels, mode="RGB")
        else:
            opaque_img = img.convert("RGB")

        # Save to buffer for ColorThief
        buf = io.BytesIO()
        opaque_img.save(buf, format="PNG")
        buf.seek(0)

        from colorthief import ColorThief  # type: ignore

        ct = ColorThief(buf)

        # Get dominant color
        dominant_rgb = ct.get_color(quality=5)

        # Get palette (up to 6 colors for variety)
        try:
            palette_rgb = ct.get_palette(color_count=6, quality=5)
        except Exception:
            palette_rgb = [dominant_rgb]

        # Build palette entries
        palette_entries: List[Dict[str, str]] = []
        seen_names = set()
        for rgb_tuple in palette_rgb:
            hex_c = _rgb_to_hex(rgb_tuple)
            name_c = _nearest_color_name(rgb_tuple)
            # Deduplicate by color name to keep palette diverse
            if name_c not in seen_names:
                palette_entries.append({"hex": hex_c, "name": name_c})
                seen_names.add(name_c)
            if len(palette_entries) >= 5:
                break

        # Ensure dominant color is first
        dominant_hex = _rgb_to_hex(dominant_rgb)
        dominant_name = _nearest_color_name(dominant_rgb)

        # If the dominant color is not already in the palette, insert it
        if not palette_entries or palette_entries[0]["hex"] != dominant_hex:
            palette_entries.insert(0, {"hex": dominant_hex, "name": dominant_name})

        return dominant_hex, dominant_name, palette_entries

    except Exception as e:
        logger.error(f"Color extraction error: {e}")
        # Fallback to numpy mean color
        try:
            img = Image.open(io.BytesIO(processed_png_bytes)).convert("RGBA")
            arr = np.array(img)
            alpha = arr[:, :, 3]
            mask = alpha > 0
            if mask.any():
                rgb = arr[:, :, :3][mask]
                mean_color = tuple(int(x) for x in rgb.mean(axis=0))
                hex_color = _rgb_to_hex(mean_color)  # type: ignore[arg-type]
                name = _nearest_color_name(mean_color)  # type: ignore[arg-type]
                return hex_color, name, [{"hex": hex_color, "name": name}]
        except Exception:
            pass
        return "#B0B0B0", "Light Grey", _fallback_palette


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
    vision_ok = _get_vision_client() != "fallback"
    return {
        "status": "healthy",
        "rembg_available": REMBG_SESSION is not None,
        "vision_api_available": vision_ok,
    }


MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


def _safe_delete(file_path: Path) -> None:
    """Delete a file, ignoring errors if it doesn't exist."""
    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        pass


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal characters from filename."""
    return os.path.basename(filename).replace("..", "")


@app.post("/process")
async def process_image(image: UploadFile = File(...)):
    """Process clothing image: remove background, classify, and extract attributes."""

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    file_id = str(uuid.uuid4())
    ext = os.path.splitext(image.filename or "image.png")[1] or ".png"

    try:
        raw_contents = await image.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(status_code=400, detail="Failed to read uploaded file")

    if len(raw_contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(raw_contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB",
        )

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
    processed_path = PROCESSED_DIR / f"{file_id}_clean.png"

    try:
        with open(original_path, "wb") as f:
            f.write(contents)
    except OSError as e:
        logger.error(f"Failed to save original file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

    # Process with rembg in a worker thread to keep the event loop responsive
    try:
        bg_removed_bytes = await run_in_threadpool(_remove_background_sync, contents)

        # Apply studio-style post-processing (crop, square canvas, edge cleanup, enhancement)
        processed_bytes = await run_in_threadpool(apply_studio_look, bg_removed_bytes)
    except Exception as e:
        logger.error(f"Image processing failed for {image.filename}: {e}")
        _safe_delete(original_path)
        raise HTTPException(
            status_code=500,
            detail=f"Image processing failed: {str(e)}. The image may be corrupted or in an unsupported format.",
        )

    # Persist processed image
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
    sanitized = _sanitize_filename(filename)
    path = UPLOAD_DIR / sanitized
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(path))


@app.get("/processed/{filename}")
async def get_processed(filename: str):
    sanitized = _sanitize_filename(filename)
    path = PROCESSED_DIR / sanitized
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(path))
