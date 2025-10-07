// src/utils/downloadSinglePhoto.ts
import axios from "axios";
import { OpenAPI } from "../api/core/OpenAPI";

export async function downloadSinglePhoto(
  galleryId: string,
  photoId: string,
  filenameHint?: string,
  size: "original" | "large" | "medium" | "web" = "original"
) {
  const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
  const url = `${base}/api/galleries/${encodeURIComponent(galleryId)}/photos/${encodeURIComponent(photoId)}?size=${encodeURIComponent(size)}&linkOnly=true`;

  // Ask for a JSON link first
  const r = await axios.get(url, {
    // IMPORTANT: no credentials/authorization needed for signed URL JSON
    withCredentials: !!OpenAPI.WITH_CREDENTIALS,
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN}` } : undefined,
    validateStatus: s => s >= 200 && s < 400,
  });

  if (r && r.data && typeof r.data.url === "string") {
    const finalName = r.data.filename || filenameHint || `photo-${photoId}.jpg`;
    const a = document.createElement("a");
    a.href = r.data.url; // signed GCS URL
    a.download = finalName; // browsers will respect if same-origin; otherwise filename comes from header
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  // Fallback (older server returning bytes)
  const resp = await axios.get(url.replace("&linkOnly=true", ""), {
    withCredentials: !!OpenAPI.WITH_CREDENTIALS,
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN}` } : undefined,
    responseType: "blob",
    validateStatus: s => s >= 200 && s < 400,
  });

  const blob = new Blob([resp.data], { type: resp.headers["content-type"] || "image/jpeg" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filenameHint || `photo-${photoId}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
