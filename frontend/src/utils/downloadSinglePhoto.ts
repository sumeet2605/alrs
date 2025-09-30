import axios from "axios";
import { OpenAPI } from "../api/core/OpenAPI";

/**
 * Download a single photo by ID from a gallery.
 *
 * @param galleryId  string
 * @param photoId    string
 * @param filename   optional override for downloaded file name
 * @param size       optional size param: 'original' | 'large' | 'medium' | 'web'
 */
export async function downloadSinglePhoto(
  galleryId: string,
  photoId: string,
  filename?: string,
  size: string = "original"
) {
  const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
  const url = `${base}/api/galleries/${encodeURIComponent(
    galleryId
  )}/photos/${encodeURIComponent(photoId)}?size=${encodeURIComponent(size)}`;

  const headers: Record<string, string> = {};
  if (OpenAPI.TOKEN) {
    headers["Authorization"] = `Bearer ${OpenAPI.TOKEN}`;
  }

  const resp = await axios.get(url, {
    headers,
    withCredentials: !!OpenAPI.WITH_CREDENTIALS,
    responseType: "blob",
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const contentType = (resp.headers["content-type"] || "").toLowerCase();
  const isImage =
    contentType.startsWith("image/") ||
    contentType === "application/octet-stream";

  if (!isImage) {
    // show server error if JSON/blob text
    try {
      const text = await new Response(resp.data).text();
      throw new Error(text || "Download failed (non-image response)");
    } catch {
      throw new Error("Download failed (non-image response)");
    }
  }

  // If backend sets Content-Disposition, respect it; otherwise fallback
  let effectiveName = filename;
  if (!effectiveName) {
    const disposition = resp.headers["content-disposition"];
    if (disposition) {
      // e.g. attachment; filename="myphoto.png"
      const match = disposition.match(/filename="([^"]+)"/);
      if (match) {
        effectiveName = match[1];
      }
    }
    if (!effectiveName) {
      effectiveName = `photo-${photoId}-${size}`;
    }
  }

  const blob = new Blob([resp.data], { type: contentType });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = effectiveName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
