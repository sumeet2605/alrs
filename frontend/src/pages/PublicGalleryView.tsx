// src/pages/PublicGalleryView.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Spin,
  Image,
  Empty,
  Alert,
  Modal,
  Input,
  Button,
  App,
  Tooltip,
} from "antd";
import { DownloadOutlined, HeartOutlined, HeartFilled } from "@ant-design/icons";
import { GalleryService } from "../api/services/GalleryService";
import { OpenAPI } from "../api/core/OpenAPI";
import GalleryHeader from "./ClientGalleryHeader";
import { downloadGalleryZip } from "../utils/download";
import SizePicker from "../components/SizePicker";
import axios from "axios";

const { Title, Text } = Typography;

type Photo = {
  id: string;
  file_id?: string | null;
  filename: string;
  path_original?: string | null;
  path_preview?: string | null;
  path_thumb?: string | null;
  width?: number | null;
  height?: number | null;
  order_index?: number | null;
  is_cover?: boolean | null;
};

type DownloadSize = "original" | "large" | "medium" | "web";

const resolveUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
};

const PublicGalleryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();

  const [gallery, setGallery] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // lock / unlock
  const [locked, setLocked] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  // preview / slideshow
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  // size-picker modal
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [sizeTarget, setSizeTarget] = useState<
    { type: "gallery" } | { type: "photo"; photo: Photo } | null
  >(null);

  // favorites (persist per-gallery)
  const favKey = `fav_gallery_${id}`;
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      if (!id) return new Set();
      const raw = localStorage.getItem(favKey);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  });
  const saveFavorites = (next: Set<string>) => {
    setFavorites(new Set(next));
    try {
      localStorage.setItem(favKey, JSON.stringify(Array.from(next)));
    } catch {}
  };
  const toggleFavorite = (photoId: string) => {
    const next = new Set(favorites);
    if (next.has(photoId)) next.delete(photoId);
    else next.add(photoId);
    saveFavorites(next);
  };

  // overlay CSS — let image clicks pass through (so preview opens), but buttons are clickable
  const overlayCSS = `
    .photo-tile-wrap {
      break-inside: avoid;
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      position: relative; /* important for overlay positioning */
    }
    .photo-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: flex-start; justify-content: flex-end;
      background: linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05));
      opacity: 0; transition: opacity 180ms ease;
      z-index: 3;
      pointer-events: none; /* allow clicks to pass to image */
      padding: 8px;
    }
    .photo-overlay-actions {
      display: flex; gap: 8px;
      pointer-events: auto; /* buttons are clickable */
    }
    .photo-tile-wrap:hover .photo-overlay { opacity: 1; }
    .photo-icon-btn { box-shadow: 0 6px 16px rgba(0,0,0,0.25); }
    @media (max-width: 576px) {
      .photo-overlay { align-items: center; justify-content: center; background: rgba(0,0,0,0.35); }
    }
  `;

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Optional gallery metadata
      try {
        // @ts-expect-error optional
        if (typeof GalleryService.getGalleryApiGalleriesGalleryIdGet === "function") {
          // @ts-ignore
          const g = await GalleryService.getGalleryApiGalleriesGalleryIdGet(id);
          if (g) setGallery(g);
        }
      } catch {
        /* ignore */
      }

      // Photos (401 => locked)
      const resp = await GalleryService.listPhotosApiGalleriesGalleryIdPhotosGet(id);
      const list = Array.isArray(resp)
        ? resp
        : (resp as any)?.photos ?? (resp as any)?.data ?? [];
      const normalized: Photo[] = (list || []).map((p: any) => ({
        ...p,
        id: String(p.id),
      }));
      setPhotos(normalized);
      setLocked(false);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status === 401) {
        setLocked(true);
        setPasswordModalOpen(true);
      } else if (status === 404) {
        setError("Gallery not found or is not public.");
      } else if (status === 410) {
        setError("This gallery has expired and is no longer available.");
      } else {
        setError("Failed to load gallery.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // autoplay every 3s while preview is visible
  useEffect(() => {
    if (autoplay && previewVisible && photos.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [autoplay, previewVisible, photos.length]);

  const tryUnlock = async () => {
    if (!id) return;
    try {
      await GalleryService.unlockGalleryEndpointApiGalleriesGalleryIdUnlockPost(id, {
        password: passwordValue,
      });
      setPasswordModalOpen(false);
      setPasswordValue("");
      message.success("Gallery unlocked");
      await fetchAll();
    } catch (err: any) {
      Modal.error({
        title: "Unlock failed",
        content: err?.response?.data?.detail ?? "Incorrect password",
      });
    }
  };

  const copyShareLink = () => {
    const full = `${window.location.origin}/g/${id}`;
    navigator.clipboard.writeText(full);
    message.success("Share link copied");
  };

  // ---- Downloads ----
  const openGalleryDownloadPicker = () => {
    setSizeTarget({ type: "gallery" });
    setSizeModalOpen(true);
  };

  const openPhotoDownloadPicker = (photo: Photo) => {
    setSizeTarget({ type: "photo", photo });
    setSizeModalOpen(true);
  };

  const handleSizeConfirm = async (size: DownloadSize) => {
    if (!id || !sizeTarget) return;
    try {
      if (sizeTarget.type === "gallery") {
        const name =
          gallery?.booking?.client?.display_name ||
          gallery?.title ||
          `gallery-${id}`;
        await downloadGalleryZip(id, `${name}.zip`, size);
      } else {
        const p = sizeTarget.photo;
        await downloadSinglePhotoBlob(id, p.id, size, p.filename || `photo-${p.id}.jpg`);
      }
    } catch (e: any) {
      Modal.error({
        title: "Download failed",
        content: e?.message ?? "Could not start download",
      });
    } finally {
      setSizeModalOpen(false);
      setSizeTarget(null);
    }
  };

  // Single-photo download (blob) with cookies + auth header if present
  const downloadSinglePhotoBlob = async (
    galleryId: string,
    photoId: string,
    size: DownloadSize,
    filename: string
  ) => {
    const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
    const url = `${base}/api/galleries/${encodeURIComponent(
      galleryId
    )}/photos/${encodeURIComponent(photoId)}?size=${encodeURIComponent(size)}`;

    const headers: Record<string, string> = {};
    if (OpenAPI.TOKEN) headers["Authorization"] = `Bearer ${OpenAPI.TOKEN}`;

    const resp = await axios.get(url, {
      headers,
      withCredentials: !!OpenAPI.WITH_CREDENTIALS,
      responseType: "blob",
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const blob = new Blob([resp.data], { type: resp.headers["content-type"] || "image/jpeg" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  };

  // derived display
  const displayName =
    gallery?.booking?.client?.display_name || gallery?.title || "Gallery";

  const displayDateRaw = gallery?.booking?.event_date || gallery?.created_at || null;

  const displayDate = displayDateRaw
    ? new Date(displayDateRaw).toLocaleDateString()
    : "";

  const coverFromPhotos =
    photos.find((p) => p.is_cover)?.path_preview ||
    photos[0]?.path_preview ||
    photos[0]?.path_original ||
    null;

  const coverUrl = gallery?.cover_photo_url || resolveUrl(coverFromPhotos) || null;

  if (loading) {
    return <Spin size="large" style={{ display: "block", margin: "4rem auto" }} />;
  }

  if (locked) {
    return (
      <>
        <div style={{ textAlign: "center", padding: 40 }}>
          <Title level={3}>This gallery is password protected</Title>
          <Button type="primary" onClick={() => setPasswordModalOpen(true)}>
            Enter password to view
          </Button>
          <div style={{ marginTop: 12 }}>
            <Button onClick={copyShareLink}>Copy share link</Button>
          </div>
        </div>

        <Modal
          title="Enter gallery password"
          open={passwordModalOpen}
          onOk={tryUnlock}
          okText="Unlock"
          onCancel={() => setPasswordModalOpen(false)}
          destroyOnClose
        >
          <Input.Password
            placeholder="Password"
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            onPressEnter={tryUnlock}
          />
        </Modal>
      </>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <Alert message="Error" description={error} type="error" showIcon />
        <Empty description={error} />
      </div>
    );
  }

  if (!photos.length) {
    return <Empty description="No photos in this gallery" />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <style>{overlayCSS}</style>

      {/* Hero Section */}
      {coverUrl && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "60vh",
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "20%",
              left: "50%",
              transform: "translateX(-50%)",
              color: "#fff",
              textAlign: "center",
              padding: "0 16px",
            }}
          >
            <Title style={{ color: "#fff", fontSize: 48, marginBottom: 8 }}>
              {displayName}
            </Title>
            {displayDate && (
              <Text style={{ color: "#eee", fontSize: 18 }}>{displayDate}</Text>
            )}
          </div>
        </div>
      )}

      {/* Sticky header controls */}
      <GalleryHeader
        clientName={displayName}
        studioName="Alluring Lens Studio"
        onDownloadAll={openGalleryDownloadPicker}
        onShare={copyShareLink}
        onSlideshow={() => {
          if (photos.length > 0) {
            setCurrentIndex(0);
            setPreviewVisible(true);
            setAutoplay(true);
          }
        }}
      />

      {/* Wrap the grid INSIDE PreviewGroup so preview can control it */}
      <Image.PreviewGroup
        preview={{
          visible: previewVisible,
          onVisibleChange: (v) => {
            setPreviewVisible(v);
            if (!v) setAutoplay(false);
          },
          current: currentIndex,
          onChange: (idx) => setCurrentIndex(idx),
        }}
      >
        <div
          style={{
            columnCount: 4,
            columnGap: "16px",
            padding: "32px",
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
          {photos.map((p, index) => {
            const src =
              resolveUrl(p.path_preview ?? p.path_thumb ?? p.path_original) ??
              undefined;
            const isFav = favorites.has(p.id);

            return (
              <div
                key={p.id}
                className="photo-tile-wrap" // Use a class for consistency with CSS
              >
                <Image
                  src={src}
                  alt={p.filename}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  // Manually pass a non-resolvable URL for the `preview` property
                  // to prevent a duplicate preview group being created for each image.
                  // Instead, we rely on the parent <Image.PreviewGroup />.
                  preview={{ src: resolveUrl(p.path_original) ?? src }}
                  onClick={() => setCurrentIndex(index)}
                  placeholder
                />

                {/* Hover overlay (doesn't block image clicks) */}
                <div className="photo-overlay">
                  <div className="photo-overlay-actions">
                    <Tooltip title={isFav ? "Remove favorite" : "Favorite"}>
                      <Button
                        className="photo-icon-btn"
                        shape="circle"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(p.id);
                        }}
                        icon={
                          isFav ? (
                            <HeartFilled style={{ color: "#ff4d4f" }} />
                          ) : (
                            <HeartOutlined />
                          )
                        }
                      />
                    </Tooltip>

                    <Tooltip title="Download">
                      <Button
                        type="primary"
                        className="photo-icon-btn"
                        shape="circle"
                        icon={<DownloadOutlined />}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openPhotoDownloadPicker(p);
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Image.PreviewGroup>

      {/* Unlock modal - Moved here for clean structure, but you had it outside the main return too */}
      {/* Retained your original placement to keep changes minimal, but typically it would go after the main content */}

      {/* Size picker modal */}
      <SizePicker
        open={sizeModalOpen}
        onCancel={() => {
          setSizeModalOpen(false);
          setSizeTarget(null);
        }}
        onSelect={(size: DownloadSize) => handleSizeConfirm(size)}
      />
    </div>
  );
};

export default PublicGalleryView;