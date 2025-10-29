// frontend/src/components/UploadDropzone.tsx
import React, { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Spin, App, Progress, List, Typography, Button, Space } from "antd";
import { UploadOutlined, ReloadOutlined } from "@ant-design/icons";
import { GalleryService } from "../api/services/GalleryService";
import type { AxiosProgressEvent } from "axios";

type Props = {
  galleryId: string;
  /**
   * Called when a single file has been successfully uploaded and the backend
   * has created the photo record. Receives the created photo object (any).
   * Example photo: { id, file_id, filename, path_original, ... }
   */
  onComplete?: (photo?: any) => void;
  concurrency?: number;
  autoRemoveAfterMs?: number; // 0 to disable
};

type UploadItem = {
  id: string; // internal key
  file: File;
  name: string;
  size: number;
  progress: number; // 0-100
  status: "idle" | "uploading" | "done" | "error";
  error?: string | null;
  objectName?: string | null;
  gsPath?: string | null;

  // ephemeral metrics for UI
  bytesLoaded?: number;
  speedKbps?: number | null; // KB/s
};

const RESUMABLE_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MB
const CHUNK_SIZE = 3 * 1024 * 1024; // 8 MB chunks
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_AUTO_REMOVE_MS = 1000;

const MAX_CHUNK_RETRIES = 3;
const BACKOFF_BASE_MS = 500;

export const UploadDropzone: React.FC<Props> = ({
  galleryId,
  onComplete,
  concurrency = DEFAULT_CONCURRENCY,
  autoRemoveAfterMs = DEFAULT_AUTO_REMOVE_MS,
}) => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState<number | null>(null); // aggregated
  const { message } = App.useApp();

  // aggregated progress trackers
  const totalBytesRef = useRef<number>(0);
  const uploadedBytesRef = useRef<number>(0);

  // map of fileKey -> last reported bytes for single PUT flow
  const fileLoadedMap = useRef<Record<string, number>>({});

  // per-file ephemeral timing metadata used to compute speed
  const fileProgressMeta = useRef<
    Record<
      string,
      {
        lastBytes: number;
        lastTs: number;
      }
    >
  >({});

  // timeouts for auto-remove
  const removeTimeouts = useRef<Record<string, number>>({});

  // helpers to update UI state
  const pushItems = (newItems: UploadItem[]) => setItems((s) => [...s, ...newItems]);
  const updateItem = (id: string, patch: Partial<UploadItem>) =>
    setItems((s) => s.map((it) => (it.id === id ? { ...it, ...patch } : it)));
 
  const resetProgress = () => {
    totalBytesRef.current = 0;
    uploadedBytesRef.current = 0;
    fileLoadedMap.current = {};
    fileProgressMeta.current = {};
    setPercent(null);
    // cancel any scheduled removals
    Object.values(removeTimeouts.current).forEach((tid) => clearTimeout(tid));
    removeTimeouts.current = {};
    setItems([]);
  };

  const addUploadedDelta = (delta: number) => {
    if (delta <= 0) return;
    uploadedBytesRef.current += delta;
    if (totalBytesRef.current > 0) {
      const pct = Math.round((uploadedBytesRef.current / totalBytesRef.current) * 100);
      setPercent(Math.min(100, pct));
    }
  };

  async function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  // Update per-file progress and compute speed (KB/s).
  // currentBytes is absolute bytes uploaded for that file (not delta).
  const updateProgressForFile = (id: string, currentBytes: number, totalBytes: number) => {
    // manage meta
    const now = Date.now();
    const meta = fileProgressMeta.current[id] ?? { lastBytes: 0, lastTs: now };
    const deltaBytes = Math.max(0, currentBytes - (meta.lastBytes ?? 0));
    const deltaMs = Math.max(1, now - (meta.lastTs ?? now));
    const speedKbps = deltaBytes > 0 ? Math.round((deltaBytes / 1024) / (deltaMs / 1000)) : meta.lastBytes ? 0 : 0; // KB/s

    // update meta
    fileProgressMeta.current[id] = { lastBytes: currentBytes, lastTs: now };

    // update aggregated delta
    addUploadedDelta(deltaBytes);

    // calculate percent
    const pct = totalBytes > 0 ? Math.round((currentBytes / totalBytes) * 100) : 100;

    updateItem(id, { bytesLoaded: currentBytes, speedKbps, progress: Math.min(100, pct) });
  };

  // --- API helpers ---
  const getSignedUrl = async (file: File) => {
    return GalleryService.createSignedUploadUrlApiGalleriesGalleryIdSignedUploadPost(galleryId, {
      filename: file.name,
      content_type: file.type || "application/octet-stream",
    } as any) as Promise<any>;
  };

  const getResumableSession = async (file: File) => {
    return GalleryService.createResumableUploadSessionApiGalleriesGalleryIdResumableUploadPost(galleryId, {
      filename: file.name,
      content_type: file.type || "application/octet-stream",
    } as any) as Promise<any>;
  };

  /**
   * Notify backend and return the created photo object.
   * The backend should return the created DB record for the uploaded file.
   */
  const notifyBackend = async (file: File, objectName: string, gsPath: string) => {
    const resp = await GalleryService.notifyUploadApiGalleriesGalleryIdPhotosNotifyUploadPost(galleryId, {
      filename: file.name,
      object_name: objectName,
      gs_path: gsPath,
      size: file.size,
    } as any);
    return resp;
  };

  // Schedule auto-remove for a done item (if enabled)
  const scheduleAutoRemove = (id: string) => {
    if (!autoRemoveAfterMs || autoRemoveAfterMs <= 0) return;
    // clear existing
    if (removeTimeouts.current[id]) {
      clearTimeout(removeTimeouts.current[id]);
    }
    const tid = window.setTimeout(() => {
      setItems((s) => s.filter((it) => it.id !== id));
      delete removeTimeouts.current[id];
    }, autoRemoveAfterMs);
    removeTimeouts.current[id] = tid;
  };

  // Cancel auto-remove (e.g., when retrying)
  const cancelAutoRemove = (id: string) => {
    if (removeTimeouts.current[id]) {
      clearTimeout(removeTimeouts.current[id]);
      delete removeTimeouts.current[id];
    }
  };

  // --- Upload flows ---

  // single PUT (signed) flow; updates per-file progress and aggregated progress
  const uploadSinglePut = async (item: UploadItem) => {
    const fileKey = item.id;
    cancelAutoRemove(fileKey);
    updateItem(item.id, { status: "uploading", error: null, progress: 0, speedKbps: 0, bytesLoaded: 0 });
    try {
      const signedResp: any = await getSignedUrl(item.file);
      const signedUrl: string = signedResp?.signed_url;
      const objectName: string = signedResp?.object_name;
      const gsPath: string = signedResp?.gs_path;
      if (!signedUrl || !objectName || !gsPath) throw new Error("signed url missing");

      fileLoadedMap.current[fileKey] = 0;
      fileProgressMeta.current[fileKey] = { lastBytes: 0, lastTs: Date.now() };

      await axios.put(signedUrl, item.file, {
        headers: { "Content-Type": item.file.type || "application/octet-stream" },
        onUploadProgress: (progressEvent?: AxiosProgressEvent) => {
          const loaded = (progressEvent?.loaded ?? 0) as number;
          // update per-file progress + speed
          updateProgressForFile(fileKey, loaded, item.size);
          // also update fileLoadedMap for compatibility
          fileLoadedMap.current[fileKey] = loaded;
        },
      });

      // notify backend and get created photo
      const photo = await notifyBackend(item.file, objectName, gsPath);

      // mark done, call parent with created photo, and schedule removal
      updateItem(item.id, { status: "done", progress: 100, objectName, gsPath, speedKbps: 0, bytesLoaded: item.size });
      try {
        onComplete?.(photo);
      } catch (e) {
        console.warn("onComplete handler threw", e);
      }
      scheduleAutoRemove(item.id);
    } catch (err: any) {
      console.error("single PUT failed", err);
      updateItem(item.id, { status: "error", error: err?.message ?? String(err), speedKbps: 0 });
      throw err;
    }
  };

  // fallback helper (signed PUT) used by resumable fallback logic
  const fallbackToSignedPut = async (item: UploadItem) => {
    await uploadSinglePut(item);
  };

  // resumable chunked upload flow with preflight check, retries, fallback
  const uploadResumable = async (item: UploadItem) => {
    const fileKey = item.id;
    cancelAutoRemove(fileKey);
    updateItem(item.id, { status: "uploading", error: null, progress: 0, speedKbps: 0, bytesLoaded: 0 });

    // start session
    let meta: any;
    try {
      meta = await getResumableSession(item.file);
    } catch (err: any) {
      // if starting session fails, fallback to signed PUT
      console.warn("resumable session creation failed, fallback to signed PUT", err);
      await fallbackToSignedPut(item);
      return;
    }

    const uploadUrl: string | undefined = meta?.upload_url;
    const signedPutUrl: string | undefined = meta?.signed_put_url;
    const objectName: string = meta?.object_name;
    const gsPath: string = meta?.gs_path;

    if (!uploadUrl && signedPutUrl) {
      // backend already returned fallback
      await fallbackToSignedPut(item);
      return;
    }

    if (!uploadUrl) {
      // defensively fallback
      await fallbackToSignedPut(item);
      return;
    }

    // Preflight OPTIONS check
    try {
      const optsResp = await fetch(uploadUrl, { method: "OPTIONS", mode: "cors", headers: { "Access-Control-Request-Method": "PUT" } });
      if (!optsResp.ok) {
        console.warn("resumable preflight non-ok, falling back");
        await fallbackToSignedPut(item);
        return;
      }
      // if no ACA header, fallback defensively (some environments not readable)
      if (!optsResp.headers.get("access-control-allow-origin")) {
        console.warn("resumable preflight missing ACA header, falling back");
        await fallbackToSignedPut(item);
        return;
      }
    } catch (preErr) {
      console.warn("resumable preflight error, falling back", preErr);
      await fallbackToSignedPut(item);
      return;
    }

    // upload chunks
    const total = item.size;
    let start = 0;

    while (start < total) {
      const end = Math.min(total - 1, start + CHUNK_SIZE - 1);
      const chunk = item.file.slice(start, end + 1);

     
      let attempt = 0;
      let success = false;

      while (attempt < MAX_CHUNK_RETRIES && !success) {
        try {
          await axios.put(uploadUrl, chunk, {
            headers: {
              "Content-Type": item.file.type || "application/octet-stream",
              "Content-Range": `bytes ${start}-${end}/${total}`,
            },
            onUploadProgress: (progressEvent?: AxiosProgressEvent) => {
              const loaded = (progressEvent?.loaded ?? 0) as number;
              const currentBytesForFile = Math.min(total, start + loaded);
              // update per-file progress + speed using absolute bytes
              updateProgressForFile(fileKey, currentBytesForFile, total);
              // chunkPrev only used to compute delta inside this chunk for addUploadedDelta already handled
            },
          });

          success = true;
          start = end + 1;
        } catch (err: any) {
          attempt += 1;
          const resp = err?.response;
          if (resp && resp.status === 308) {
            const rangeHeader = resp.headers && (resp.headers["range"] || resp.headers["Range"]);
            if (rangeHeader) {
              const m = String(rangeHeader).match(/bytes=0-(\d+)/);
              if (m) {
                const last = parseInt(m[1], 10);
                start = last + 1;
                success = true;
                break;
              }
            }
            // otherwise treat as retry
          }

          if (attempt >= MAX_CHUNK_RETRIES) {
            console.warn("Chunk failed after retries -> fallback", err);
            await fallbackToSignedPut(item);
            return;
          }

          const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
          await sleep(backoff);
        }
      } // attempts
    } // chunks loop

    // finished chunks: notify server
    try {
      const photo = await notifyBackend(item.file, objectName, gsPath);
      updateItem(item.id, { status: "done", progress: 100, objectName, gsPath, speedKbps: 0, bytesLoaded: item.size });

      // call parent with created photo so it can insert it immediately
      try {
        onComplete?.(photo);
      } catch (e) {
        console.warn("onComplete handler threw", e);
      }

      scheduleAutoRemove(item.id);
    } catch (err: any) {
      console.error("notify backend failed", err);
      updateItem(item.id, { status: "error", error: err?.message ?? String(err), speedKbps: 0 });
      throw err;
    }
  };

  // choose flow
  const uploadFile = async (item: UploadItem) => {
    // mark uploading
    updateItem(item.id, { status: "uploading", error: null });
    if (item.size >= RESUMABLE_THRESHOLD_BYTES) {
      return uploadResumable(item);
    } else {
      return uploadSinglePut(item);
    }
  };

  // concurrency worker pool: processes items that are idle or errored (if retry)
  const runWithConcurrency = async (queueItems: UploadItem[], concurrencyLimit: number) => {
    const queue = queueItems.slice();
    const workers = new Array(Math.max(1, concurrencyLimit)).fill(null).map(async () => {
      while (queue.length > 0) {
        const it = queue.shift();
        if (!it) break;
        // skip if already done
        const current = items.find((x) => x.id === it.id) ?? it;
        if (current.status === "done") continue;
        try {
          await uploadFile(current);
        } catch (err) {
          // continue other uploads on individual failure
          console.error("uploadFile error for", current.name, err);
        }
      }
    });

    await Promise.all(workers);
  };

  // Retry helper to retry a single failed item
  const retryItem = async (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    // cancel pending auto-remove and reset progress meta
    cancelAutoRemove(id);
    fileProgressMeta.current[id] = { lastBytes: 0, lastTs: Date.now() };
    fileLoadedMap.current[id] = 0;
    updateItem(id, { status: "idle", error: null, progress: 0, speedKbps: 0, bytesLoaded: 0 });
    try {
      await uploadFile(it);
      // optionally call onComplete if all done
      if (items.every((x) => x.status === "done")) {
        // leave batch-level onComplete out to avoid double-calling; parent receives per-file callbacks
      }
    } catch (err: any) {
      console.error("retry failed", err);
    }
  };

  // Drop handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      // create placeholders
      const newItems: UploadItem[] = acceptedFiles.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${f.name}`,
        file: f,
        name: f.name,
        size: f.size,
        progress: 0,
        status: "idle",
        error: null,
        bytesLoaded: 0,
        speedKbps: 0,
      }));
      pushItems(newItems);

      // update aggregated totals and UI
      setUploading(true);
      // add sizes to the total bytes ref (preserve any already queued)
      totalBytesRef.current = totalBytesRef.current + acceptedFiles.reduce((s, f) => s + f.size, 0);
      uploadedBytesRef.current = uploadedBytesRef.current || 0;
      setPercent((uploadedBytesRef.current > 0 && totalBytesRef.current > 0) ? Math.round((uploadedBytesRef.current / totalBytesRef.current) * 100) : 0);

      try {
        // run queue using the newly appended items
        await runWithConcurrency(newItems, concurrency);
        // when done, set aggregated percent
        setPercent(100);
        message.success("Uploads finished");
        // Do NOT call batch-level onComplete here; parent is notified per-file on success.
      } catch (err: any) {
        console.error("runWithConcurrency failed", err);
        message.error(err?.message ?? "Upload failed");
      } finally {
        setTimeout(() => {
          setUploading(false);
          // keep placeholders so user sees results; auto-remove will cleanup completed ones
        }, 600);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [galleryId, onComplete, concurrency, message, items]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "image/*": [] } });

  // UI render helpers
  const humanSize = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)} MB`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)} KB`;
    return `${n} B`;
  };

  const humanSpeed = (kbps?: number | null) => {
    if (!kbps || kbps <= 0) return "";
    if (kbps >= 1024) return `${(kbps / 1024).toFixed(2)} MB/s`;
    return `${kbps.toFixed(1)} KB/s`;
  };

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: "2px dashed #d9d9d9",
          padding: 18,
          borderRadius: 8,
          textAlign: "center",
          background: isDragActive ? "#fafafa" : undefined,
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: 14, color: "#888" }}>
          {isDragActive ? "Drop images here..." : "Drag & drop images here, or click to browse"}
          <div style={{ marginTop: 8 }}>
            <small>JPEG/PNG recommended. Large files use resumable upload. Multiple files OK.</small>
          </div>
          <div style={{ marginTop: 12 }}>
            <Space>
              <Button icon={<UploadOutlined />}>Select files</Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  // simple reset UI (doesn't cancel inflight uploads)
                  resetProgress();
                }}
              >
                Clear
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* aggregated progress */}
      {uploading && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <Spin />
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 6 }}>Uploading…</div>
            <Progress percent={percent ?? 0} status={percent === 100 ? "success" : "active"} />
          </div>
        </div>
      )}

      {/* per-file placeholders */}
      {items.length > 0 && (
        <div style={{ marginTop: 16, maxHeight: 400, overflowY: "auto"  }}>
          <List
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                key={it.id}
                actions={[
                  it.status === "error" ? (
                    <Button size="small" onClick={() => retryItem(it.id)}>
                      Retry
                    </Button>
                  ) : null,
                ]}
              >
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {it.status === "uploading" ? <Spin size="small" /> : null}
                      <div>
                        <Typography.Text strong style={{ maxWidth: 420 }}>
                          {it.name}
                        </Typography.Text>
                        <div>
                          <Typography.Text type="secondary">({humanSize(it.size)})</Typography.Text>
                          {it.speedKbps ? (
                            <Typography.Text style={{ marginLeft: 8 }}>{humanSpeed(it.speedKbps)}</Typography.Text>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div style={{ minWidth: 140, textAlign: "right" }}>
                      <Typography.Text type={it.status === "error" ? "danger" : undefined}>
                        {it.status.toUpperCase()}
                      </Typography.Text>
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <Progress
                      percent={it.progress}
                      status={it.status === "error" ? "exception" : it.status === "done" ? "success" : "active"}
                    />
                  </div>

                  {it.error ? (
                    <div style={{ marginTop: 6 }}>
                      <Typography.Text type="danger">{it.error}</Typography.Text>
                    </div>
                  ) : null}
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default UploadDropzone;
