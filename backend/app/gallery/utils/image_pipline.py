from app.storage import storage
from app import config
from app.images import make_preview, make_thumb, make_size
import tempfile, os
from app.gallery.models.gallery_model import Photo
from app.storage import storage
from app.gallery.services.paths import downloads_dir

def process_image_pipeline(photo_id: str | int, original_path: str, owner_id: str, gallery_id: str):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        # Prepare keys for previews/thumbs
        preview_key = f"{gallery_id}/previews/{photo_id}"
        thumb_key   = f"{gallery_id}/thumbs/{photo_id}"

        # Keys for download sizes (eagerly generated)
        download_keys = {}

        for size, longest in config.DOWNLOAD_SIZES.items():
            if size != "original":
                key = f"{gallery_id}/downloads/{size}/{photo_id}"
                download_keys[size] = (key, longest)
            elif size == "original":
                # original is handled separately; skip here
                key = f"{gallery_id}/downloads/original/{photo_id}"
                download_keys[size] = (key, None)
        # 1) Get a local temp copy of the original (works for both local+gcs)
        with tempfile.TemporaryDirectory() as td:
            tmp_original = os.path.join(td, "original")

            # original_path can be '/media/key...' or 'gs://bucket/key'
            if original_path.startswith("gs://"):
                # extract key after 'gs://bucket/'
                key = original_path.split("/", 3)[-1]
            elif original_path.startswith("/media/"):
                key = original_path.lstrip("/").split("/", 1)[-1]  # remove 'media/'
            else:
                # fall back: assume it's a storage key already
                key = original_path

            storage.download_to_path(key, tmp_original)
            # 2) Create preview & thumb locally
            tmp_preview = os.path.join(td, "preview.jpg")
            tmp_thumb   = os.path.join(td, "thumb.jpg")

            make_preview(tmp_original, tmp_preview, config.IMAGE_SIZES["preview"], db)
            make_thumb(tmp_original, tmp_thumb, config.IMAGE_SIZES["thumb"], db)

            # Download Sizes (eagerly generated)
            tmp_download_paths = {}
            for size, (key, longest) in download_keys.items():
                tmp_download_path = os.path.join(td, f"{size}.jpg")
                make_size(tmp_original, tmp_download_path, longest, db)
                tmp_download_paths[size] = tmp_download_path

             # --- 4. Upload all generated files to Storage ---
            
            # Upload Preview and Thumb
            uploaded_paths = {}
            with open(tmp_preview, "rb") as f:
                storage.save_fileobj(f, preview_key)
                uploaded_paths['preview'] = preview_key
            with open(tmp_thumb, "rb") as f:
                storage.save_fileobj(f, thumb_key)
                uploaded_paths['thumb'] = thumb_key
                
            # Upload Download Sizes
            for size, tmp_path in tmp_download_paths.items():
                with open(tmp_path, "rb") as f:
                    key, _ = download_keys[size]
                    storage.save_fileobj(f, key)
                    # We don't need to store all download keys in DB for now, but 
                    # they are uploaded and ready to be served.


            # --- 5. Persist canonical paths/keys back to DB ---
            
            # Determine canonical prefix
            if storage.backend_name() == "local":
                prefix = "/media/"
                preview_path = f"{prefix}{uploaded_paths['preview']}"
                thumb_path   = f"{prefix}{uploaded_paths['thumb']}"
            else: # Assume GCS/S3 etc. for non-local backends
                prefix = f"gs://{config.GCS_BUCKET_NAME}/"
                preview_path = f"{prefix}{uploaded_paths['preview']}"
                thumb_path   = f"{prefix}{uploaded_paths['thumb']}"

            # Update DB
            p = db.query(Photo).filter(Photo.filename == photo_id).first()
            if p:
                p.path_preview = preview_path
                p.path_thumb = thumb_path
                # Note: Width/Height updates should happen inside make_* functions
                db.add(p)
                db.commit()

    except Exception as e:
        print(f"Error processing image {photo_id}: {e}")
        db.rollback()
        raise e
        
    finally:
        db.close()


