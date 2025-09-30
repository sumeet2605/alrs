import axios from 'axios';
import { OpenAPI } from '../api/core/OpenAPI';

/**
 * Download the entire gallery as a ZIP file.
 *
 * @param galleryId  string ID
 * @param filename   optional override for the downloaded filename
 * @param size       optional size param: 'original' | 'large' | 'medium' | 'web'
 */
export async function downloadGalleryZip(
  galleryId: string,
  filename?: string,
  size: string = 'original'
) {
    console.log(encodeURIComponent(
    size
  ))
  const base = (OpenAPI.BASE ?? '').replace(/\/$/, '');
  const url = `${base}/api/galleries/${encodeURIComponent(galleryId)}/download?size=${encodeURIComponent(
    size
  )}`;

  const headers: Record<string, string> = {};
  if (OpenAPI.TOKEN) {
    headers['Authorization'] = `Bearer ${OpenAPI.TOKEN}`;
  }

  const resp = await axios.get(url, {
    headers,
    withCredentials: !!OpenAPI.WITH_CREDENTIALS,
    responseType: 'blob',
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const contentType = (resp.headers['content-type'] || '').toLowerCase();
  const isZip =
    contentType.includes('zip') ||
    contentType.includes('application/octet-stream');

  if (!isZip) {
    // Attempt to read the blob as text so we can surface an error message
    try {
      const text = await new Response(resp.data).text();
      throw new Error(text || 'Download failed: non-zip response');
    } catch {
      throw new Error('Download failed: non-zip response');
    }
  }

  const effectiveName = filename || `gallery-${galleryId}-${size}.zip`;
  const blob = new Blob([resp.data], { type: 'application/zip' });
  const link = document.createElement('a');
  const href = URL.createObjectURL(blob);

  link.href = href;
  link.download = effectiveName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser a moment before revoking
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
