# backend/app/images.py
from PIL import Image, ImageOps #type:ignore
from pathlib import Path
from app.config import IMAGE_SIZES
import os

def make_preview(original_path: str, out_path: str, max_side: int):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with Image.open(original_path) as im:
        im = ImageOps.exif_transpose(im)
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        im.convert("RGB").save(out_path, "JPEG", quality=90, optimize=True)

def make_thumb(original_path: str, out_path: str, size: int):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with Image.open(original_path) as im:
        im = ImageOps.exif_transpose(im)
        im.thumbnail((size, size), Image.LANCZOS)
        im.convert("RGB").save(out_path, "JPEG", quality=85, optimize=True)

# placeholder for watermarking function - you can extend with logo path and options
def apply_watermark(base_path: str, watermark_path: str, out_path: str, opacity=0.4, scale=0.2):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with Image.open(base_path).convert("RGBA") as base:
        with Image.open(watermark_path).convert("RGBA") as wm:
            wm_w = int(base.width * scale)
            wm_ratio = wm.width / wm.height
            wm = wm.resize((wm_w, int(wm_w / wm_ratio)), Image.LANCZOS)
            alpha = wm.split()[3].point(lambda p: int(p * opacity))
            wm.putalpha(alpha)
            x = base.width - wm.width - 20
            y = base.height - wm.height - 20
            base.paste(wm, (x, y), wm)
            base.convert("RGB").save(out_path, "JPEG", quality=85, optimize=True)



def _resize_longest_edge(src_path: str, dst_path: str, longest: int, quality=90):
    with Image.open(src_path) as im:
        im = im.convert("RGB")
        w, h = im.size
        if max(w, h) <= longest:
            # still write a copy to dst for consistency
            im.save(dst_path, "JPEG", quality=quality, optimize=True)
            return
        if w >= h:
            new_w = longest
            new_h = int(h * (longest / w))
        else:
            new_h = longest
            new_w = int(w * (longest / h))
        im = im.resize((new_w, new_h), Image.LANCZOS)
        im.save(dst_path, "JPEG", quality=quality, optimize=True)

def make_size(src_path: str, dst_path: str, longest: int):
    _resize_longest_edge(src_path, dst_path, longest)