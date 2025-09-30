// src/utils/download.ts
import axios from 'axios';
import { OpenAPI } from '../api/core/OpenAPI';

export async function downloadGalleryZip(galleryId: string, filename?: string) {
  const base = (OpenAPI.BASE ?? '').replace(/\/$/, '');
  const url = `${base}/api/galleries/${encodeURIComponent(galleryId)}/download`;

  const headers: Record<string, string> = {};
  if (OpenAPI.TOKEN) headers['Authorization'] = `Bearer ${OpenAPI.TOKEN}`;

  const resp = await axios.get(url, {
    headers,
    withCredentials: !!OpenAPI.WITH_CREDENTIALS, // needed if gallery is unlocked via cookie
    responseType: 'blob',
    validateStatus: s => s >= 200 && s < 400, // surface server errors below
  });

  // If server accidentally sent JSON error, guard here
  const contentType = resp.headers['content-type'] || '';
  if (!contentType.includes('zip') && !contentType.includes('application/octet-stream')) {
    // Try to parse the blob to show a readable error
    const text = await resp.data.text?.().catch(() => null);
    throw new Error(text || 'Download failed (non-zip response)');
  }

  const blob = new Blob([resp.data], { type: 'application/zip' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || `gallery-${galleryId}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}
