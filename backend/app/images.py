# backend/app/images.py
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageEnhance #type:ignore
from pathlib import Path
from app.config import IMAGE_SIZES
import os
from sqlalchemy.orm import Session #type: ignore
from app.brand.service import get_settings
import app.config as config


def make_preview(original_path: str, out_path: str, max_side: int, db: Session=None):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with Image.open(original_path) as im:
        im = ImageOps.exif_transpose(im)
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        if db:
            im = _apply_watermark(im, db)
        im.convert("RGB").save(out_path, "JPEG", quality=90, optimize=True)

def make_thumb(original_path: str, out_path: str, size: int, db: Session=None):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with Image.open(original_path) as im:
        im = ImageOps.exif_transpose(im)
        im.thumbnail((size, size), Image.LANCZOS)
        if db:
            im = _apply_watermark(im, db)
        im.convert("RGB").save(out_path, "JPEG", quality=85, optimize=True)

# placeholder for watermarking function - you can extend with logo path and options
def _apply_watermark(img: Image.Image, db: Session) -> Image.Image:
    s = get_settings(db)
    if not s.wm_enabled:
        return img

    img = img.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0,0,0,0))

    # compute target size
    long_edge = max(img.size)
    wm_scale_px = max(64, int(long_edge * float(s.wm_scale or 0.2)))

    if s.wm_use_logo and s.logo_path:
        logo_path_abs = (config.MEDIA_ROOT.parent / s.logo_path.lstrip("/")).as_posix()
        try:
            logo = Image.open(logo_path_abs).convert("RGBA")
            ratio = wm_scale_px / max(logo.size)
            logo = logo.resize((int(logo.width*ratio), int(logo.height*ratio)), Image.LANCZOS)
            mark = logo
        except Exception:
            mark = None
    else:
        # simple text watermark
        mark = Image.new("RGBA", (wm_scale_px*3, int(wm_scale_px*0.6)), (0,0,0,0))
        d = ImageDraw.Draw(mark)
        text = s.wm_text or "©"
        try:
            font = ImageFont.truetype("arial.ttf", int(wm_scale_px*0.25))
        except:
            font = ImageFont.load_default()
        tw, th = d.textbbox((0,0), text, font=font)[2:]
        d.text(((mark.width-tw)//2, (mark.height-th)//2), text, fill=(255,255,255,255), font=font)

    if mark:
        # place
        mx, my = mark.size
        W,H = img.size
        pad = int(long_edge*0.02)
        posmap = {
            "top-left": (pad, pad),
            "top": ((W-mx)//2, pad),
            "top-right": (W-mx-pad, pad),
            "left": (pad, (H-my)//2),
            "center": ((W-mx)//2, (H-my)//2),
            "right": (W-mx-pad, (H-my)//2),
            "bottom-left": (pad, H-my-pad),
            "bottom": ((W-mx)//2, H-my-pad),
            "bottom-right": (W-mx-pad, H-my-pad)
        }
        pos = posmap.get(s.wm_position or "bottom-right", posmap["bottom-right"])

        # opacity
        if s.wm_opacity is not None:
            alpha = max(0.0, min(1.0, float(s.wm_opacity)))
        else:
            alpha = 0.25
        if alpha < 1:
            a = mark.split()[-1]
            a = ImageEnhance.Brightness(a).enhance(alpha)
            mark.putalpha(a)

        overlay.paste(mark, pos, mark)

    out = Image.alpha_composite(img, overlay).convert("RGB")
    return out



def _resize_longest_edge(src_path: str, dst_path: str, longest: int,db, quality=90):
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
        if db:
            im = _apply_watermark(im, db)
        im.save(dst_path, "JPEG", quality=quality, optimize=True)

def make_size(src_path: str, dst_path: str, longest: int, db: Session=None):
    print(db)
    _resize_longest_edge(src_path, dst_path, longest, db)