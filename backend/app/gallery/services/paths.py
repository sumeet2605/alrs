# app/gallery/services/paths.py
from pathlib import Path
from app import config

def gallery_root(owner_id: str, gallery_id: str) -> Path:
    return config.MEDIA_ROOT / owner_id / gallery_id

def originals_dir(owner_id: str, gallery_id: str) -> Path:
    return gallery_root(owner_id, gallery_id) / "originals"

def thumbs_dir(owner_id: str, gallery_id: str) -> Path:
    return gallery_root(owner_id, gallery_id) / "thumbs"

def previews_dir(owner_id: str, gallery_id: str) -> Path:
    return gallery_root(owner_id, gallery_id) / "previews"

def downloads_dir(owner_id: str, gallery_id: str, size: str) -> Path:
    return gallery_root(owner_id, gallery_id) / "downloads" / size

def rel_media_path(abs_path: Path) -> str:
    """
    Convert an absolute path under MEDIA_ROOT to a URL path starting with /media/...
    """
    abs_path = abs_path.resolve()
    root = config.MEDIA_ROOT.resolve()
    return "/media/" + abs_path.relative_to(root).as_posix()
