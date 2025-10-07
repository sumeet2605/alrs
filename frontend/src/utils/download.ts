// src/utils/download.ts
import axios from "axios";
import { OpenAPI } from "../api/core/OpenAPI";

export async function downloadGalleryZip(
  galleryId: string,
  filename?: string,
  size: "original" | "large" | "medium" | "web" = "original"
) {
  const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
  const linkUrl = `${base}/api/galleries/${encodeURIComponent(galleryId)}/download?size=${encodeURIComponent(size)}&linkOnly=true`;

  const r = await axios.get(linkUrl, {
    withCredentials: !!OpenAPI.WITH_CREDENTIALS,
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN}` } : undefined,
    validateStatus: s => s >= 200 && s < 400,
  });

  if (r && r.data && typeof r.data.url === "string") {
    const finalName = r.data.filename || filename || `gallery-${galleryId}-${size}.zip`;
    const a = document.createElement("a");
    a.href = r.data.url; // signed GCS URL
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  // Fallback to blob stream if server doesn’t support linkOnly yet
  const url = linkUrl.replace("&linkOnly=true", "");
  const resp = await axios.get(url, {
    withCredentials: !!OpenAPI.WITH_CREDENTIALS,
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN}` } : undefined,
    responseType: "blob",
    validateStatus: s => s >= 200 && s < 400,
  });

  const blob = new Blob([resp.data], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename || `gallery-${galleryId}-${size}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
