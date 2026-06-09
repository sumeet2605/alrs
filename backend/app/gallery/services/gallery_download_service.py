import zipstream
from fastapi.responses import StreamingResponse
from app.storage import storage


def stream_gallery_zip(prefix: str):
    """
    Streams a ZIP archive of all files under the given storage prefix.
    Works with any configured storage backend (local, spaces, gcs).
    """
    z = zipstream.ZipFile(mode="w", compression=zipstream.ZIP_DEFLATED)

    files = storage.list_files(prefix)

    for file_path in files:
        file_stream = storage.open_stream(file_path)
        filename = file_path.split("/")[-1]
        z.write_iter(filename, file_stream)

    return z
