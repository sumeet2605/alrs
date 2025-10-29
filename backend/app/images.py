# backend/app/images.py
from __future__ import annotations
from pathlib import Path
import os
import tempfile
from PIL import (Image, ImageOps, ImageDraw, ImageFont, ImageEnhance, ImageFile)  # type: ignore
from sqlalchemy.orm import Session  # type: ignore

from app.config import IMAGE_SIZES
import app.config as config
from app.brand.service import get_settings
from app.storage import storage  # storage abstraction (GCS or local)

# Be tolerant of slightly truncated JPEGs
ImageFile.LOAD_TRUNCATED_IMAGES = True

# Pillow >= 10 uses Resampling enum, fallback for older
try:
    RESAMPLE = Image.Resampling.LANCZOS  # type: ignore[attr-defined]
except Exception:
    RESAMPLE = Image.LANCZOS  # type: ignore


# ---------- helpers ----------

def _open_image_lenient(path: str) -> Image.Image:
    """
    Open an image, transpose based on EXIF, and force-load pixels so
    errors happen here (and can be caught) rather than downstream.
    """
    # Tiny retry in case the file is still flushing to disk
    for _ in range(2):
        try:
            im = Image.open(path)
            im = ImageOps.exif_transpose(im)
            im.load()  # force decode now
            return im
        except OSError:
            import time
            time.sleep(0.05)
    # final attempt raises if failing
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    im.load()
    return im


def _resize_to_box(im: Image.Image, max_w: int, max_h: int) -> Image.Image:
    im = im.convert("RGB")
    im.thumbnail((max_w, max_h), RESAMPLE)
    return im


def _apply_watermark(img: Image.Image, db: Session | None) -> Image.Image:
    """
    Overlay a logo or text watermark according to saved brand settings.
    If disabled or no settings available, returns the image unchanged.

    Supports logo paths stored as:
      - local absolute path (e.g. "/media/owner/.../logo.png")
      - relative paths under MEDIA_ROOT (e.g. "media/brand/logo.png")
      - GCS path starting with "gs://bucket/key"
    """
    if not db:
        return img

    s = get_settings(db)
    if not getattr(s, "wm_enabled", False):
        return img

    img = img.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    long_edge = max(img.size)
    wm_scale = float(getattr(s, "wm_scale", 0.2) or 0.2)
    wm_scale_px = max(64, int(long_edge * wm_scale))

    mark: Image.Image | None = None

    logo_path = getattr(s, "logo_path", None)
    use_logo = bool(getattr(s, "wm_use_logo", False) and logo_path)

    if use_logo:
        tmp_file = None
        try:
            lp = str(logo_path)
            if lp.startswith("gs://"):
                # gs://bucket/path/to/logo.png
                # storage.download_to_path expects a key relative to the bucket (i.e. 'path/to/logo.png')
                # strip bucket name
                parts = lp[len("gs://"):].split("/", 1)
                if len(parts) == 2:
                    _, key = parts
                else:
                    key = parts[0] if parts else ""
                tmp_f = tempfile.NamedTemporaryFile(delete=False, suffix=Path(lp).suffix or ".png")
                tmp_f.close()
                tmp_file = tmp_f.name
                # download via storage abstraction
                storage.download_to_path(key, tmp_file)
                logo = Image.open(tmp_file).convert("RGBA")
            else:
                # local path or relative media path
                # if absolute filesystem path exists, use it; otherwise try MEDIA_ROOT parent + lp
                if os.path.exists(lp):
                    logo = Image.open(lp).convert("RGBA")
                else:
                    # try relative to MEDIA_ROOT parent (like earlier code used)
                    candidate = (config.MEDIA_ROOT.parent / lp.lstrip("/")).as_posix()
                    if os.path.exists(candidate):
                        logo = Image.open(candidate).convert("RGBA")
                    else:
                        # fallback: try to open as-is (may be a URL — not handled here)
                        logo = Image.open(lp).convert("RGBA")
            # resize logo to target scale
            ratio = wm_scale_px / max(logo.size)
            logo = logo.resize((max(1, int(logo.width * ratio)), max(1, int(logo.height * ratio))), RESAMPLE)
            mark = logo
        except Exception:
            # any failure to load logo -> fallback to text watermark
            mark = None
        finally:
            # cleanup temp file if we downloaded one
            if tmp_file:
                try:
                    os.unlink(tmp_file)
                except Exception:
                    pass

    if not mark:
        # Text watermark fallback
        text = getattr(s, "wm_text", None) or "©"
        mark = Image.new("RGBA", (wm_scale_px * 3, int(wm_scale_px * 0.6)), (0, 0, 0, 0))
        d = ImageDraw.Draw(mark)
        try:
            font = ImageFont.truetype("arial.ttf", int(wm_scale_px * 0.25))
        except Exception:
            font = ImageFont.load_default()
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((mark.width - tw) // 2, (mark.height - th) // 2), text, fill=(255, 255, 255, 255), font=font)

    # place watermark
    if mark:
        mx, my = mark.size
        W, H = img.size
        pad = int(long_edge * 0.02)
        posmap = {
            "top-left": (pad, pad),
            "top": ((W - mx) // 2, pad),
            "top-right": (W - mx - pad, pad),
            "left": (pad, (H - my) // 2),
            "center": ((W - mx) // 2, (H - my) // 2),
            "right": (W - mx - pad, (H - my) // 2),
            "bottom-left": (pad, H - my - pad),
            "bottom": ((W - mx) // 2, H - my - pad),
            "bottom-right": (W - mx - pad, H - my - pad),
        }
        pos = posmap.get(getattr(s, "wm_position", "bottom-right"), posmap["bottom-right"])

        alpha = float(getattr(s, "wm_opacity", 0.25) or 0.25)
        alpha = max(0.0, min(1.0, alpha))
        if alpha < 1:
            a = mark.split()[-1]
            a = ImageEnhance.Brightness(a).enhance(alpha)
            mark.putalpha(a)

        overlay.paste(mark, pos, mark)

    out = Image.alpha_composite(img, overlay).convert("RGB")
    return out


def _resize_longest_edge(src_path: str, dst_path: str, longest: int, db: Session | None, quality: int = 90):
    Path(dst_path).parent.mkdir(parents=True, exist_ok=True)
    im = _open_image_lenient(src_path).convert("RGB")
    w, h = im.size
    if max(w, h) > longest:
        if w >= h:
            new_w = longest
            new_h = int(h * (longest / w))
        else:
            new_h = longest
            new_w = int(w * (longest / h))
        im = im.resize((new_w, new_h), RESAMPLE)

    # Watermark (if enabled)
    im = _apply_watermark(im, db)

    im.save(dst_path, "JPEG", quality=quality, optimize=True, progressive=True)


# ---------- public API used by controllers ----------

def make_preview(original_path: str, out_path: str, max_side: int, db: Session | None = None):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    im = _open_image_lenient(original_path)
    im = _resize_to_box(im, max_side, max_side)
    im = _apply_watermark(im, db)
    im.save(out_path, "JPEG", quality=90, optimize=True, progressive=True)


def make_thumb(original_path: str, out_path: str, size: int, db: Session | None = None):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    im = _open_image_lenient(original_path)
    im = _resize_to_box(im, size, size)
    im = _apply_watermark(im, db)
    im.save(out_path, "JPEG", quality=85, optimize=True, progressive=True)


def make_size(src_path: str, dst_path: str, longest, db: Session | None = None):
    """
    Create a resized (longest edge = `longest`) JPEG and apply watermark
    according to brand settings.
    """
    if longest is None:
        # just copy original as-is
        make_original_with_watermark(src_path, dst_path, db)
    else:
        _resize_longest_edge(src_path, dst_path, longest, db)


def make_original_with_watermark(src_path: str, dst_path: str, db: Session | None = None, quality: int = 92):
    """
    NON-DESTRUCTIVE: produce a same-size JPEG “original” with the watermark applied.
    This does not overwrite the uploaded master file.

    Use this when the client requests `size=original` but watermarking is enabled.
    """
    Path(dst_path).parent.mkdir(parents=True, exist_ok=True)
    im = _open_image_lenient(src_path).convert("RGB")
    im = _apply_watermark(im, db)
    im.save(dst_path, "JPEG", quality=quality, optimize=True, progressive=True)
