// frontend/src/pages/PublicGalleryView.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Space,
} from "antd";
import { DownloadOutlined, HeartOutlined, HeartFilled } from "@ant-design/icons";
import { GalleryService } from "../api/services/GalleryService";
import { OpenAPI } from "../api/core/OpenAPI";
import GalleryHeader from "./ClientGalleryHeader";
import SizePicker from "../components/SizePicker";
import { FavoritesService } from "../api/services/FavoritesService"
import { downloadGalleryZip } from "../utils/download";
import { downloadSinglePhoto } from "../utils/downloadSinglePhoto";

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

type SizeTarget =
  | { type: "gallery"; filenameHint: string }
  | { type: "photo"; photoId: string; filenameHint: string };

const resolveUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
};

const PublicGalleryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message, modal } = App.useApp();

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
  const [sizeTarget, setSizeTarget] = useState<SizeTarget | null>(null);

  // favorites from backend
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favLimit, setFavLimit] = useState<number | null>(null);

  // show favorites only toggle
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

   // download spinner state (gallery zip + single-photo)
  const [downloading, setDownloading] = useState(false);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);

  // overlay CSS (same as before)
  const overlayCSS = `
    .photo-tile-wrap {
      break-inside: avoid;
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      position: relative;
    }
    .photo-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: flex-start; justify-content: flex-end;
      background: linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05));
      opacity: 0; transition: opacity 180ms ease;
      z-index: 3;
      pointer-events: none;
      padding: 8px;
    }
    .photo-overlay-actions {
      display: flex; gap: 8px;
      pointer-events: auto;
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
        if (typeof GalleryService.getGalleryApiGalleriesGalleryIdGet === "function") {
          // @ts-ignore
          const g = await GalleryService.getGalleryApiGalleriesGalleryIdGet(id);
          if (g) setGallery(g);
        }
      } catch { /* ignore */ }

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

  const remainingDownloads = useMemo(() => {
    if (!gallery) return null;
    const limit = gallery.download_limit;
    const count = gallery.download_count ?? 0;
    if (limit == null) return null; // unlimited
    return Math.max(0, limit - count);
  }, [gallery]);

  // load favorites from backend
  const loadFavorites = useCallback(async () => {
    if (!id) return;
    try {
      const resp: any = await (FavoritesService as any).getFavoritesApiGalleriesGalleryIdFavoritesGet?.(Number(id))
      const ids: string[] = (resp?.photo_ids ?? []).map((n: any) => String(n));
      setFavoriteIds(new Set(ids));
      setFavLimit(resp?.limit ?? null);
    } catch {
      // silently ignore; favorites are optional UX
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!locked) loadFavorites();
  }, [locked, loadFavorites]);

  // --- derive the set of photos currently displayed (full vs favorites-only)
  // useMemo so it is safe to reference in other hooks and to avoid TDZ
  const displayedPhotos = useMemo(() => {
    return showFavoritesOnly ? photos.filter((p) => favoriteIds.has(p.id)) : photos;
  }, [photos, favoriteIds, showFavoritesOnly]);

  // autoplay every 3s while preview is visible and there are >1 displayed items
  useEffect(() => {
    if (autoplay && previewVisible && displayedPhotos.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % displayedPhotos.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [autoplay, previewVisible, displayedPhotos.length]);

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
      await loadFavorites();
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      const detail = err?.response?.data?.detail ?? err?.message ?? "Incorrect password";
      console.log(status)
      // Special handling for expired password (server message contains 'expired')
      if (status === 403) {
        modal.error({
          title: "Password has expired",
          content: (
            <div>
              <p>{String(detail)}</p>
              <p style={{ marginTop: 8 }}>
                You can contact the photographer to request a new link or password.
              </p>
            </div>
          ),
        });
        setPasswordModalOpen(false);
        return;
      }
      else {
        modal.error({
          title: "Unlock failed",
          content: err?.response?.data?.detail ?? "Incorrect password",
        });
        setPasswordModalOpen(false);
      }
    }
  };

  const copyShareLink = () => {
    const full = `${window.location.origin}/g/${id}`;
    navigator.clipboard.writeText(full);
    message.success("Share link copied");
  };

  // ---- Favorites ----
  const atLimit = favLimit != null && favoriteIds.size >= favLimit;

  const toggleFavorite = async (photoId: string) => {
    if (!id) return;
    const isFav = favoriteIds.has(photoId);
    try {
      if (isFav) {
        await (FavoritesService as any).removeFavoriteApiGalleriesGalleryIdFavoritesPhotoIdDelete?.(Number(id), photoId);
        const next = new Set(favoriteIds);
        next.delete(photoId);
        setFavoriteIds(next);
        // if we are in favorites-only view, removing should update displayedPhotos automatically
        // if the currently previewed photo was removed, close preview or adjust index
        if (showFavoritesOnly) {
          // if there are no favorites left, close preview
          if (displayedPhotos.length <= 1) {
            setPreviewVisible(false);
          } else {
            // ensure currentIndex remains in-range (will refer to updated displayedPhotos)
            setCurrentIndex((ci) => Math.min(ci, Math.max(0, displayedPhotos.length - 2)));
          }
        }
      } else {
        if (atLimit) {
          modal.warning({
            title: "Favorites limit reached",
            content: `You can select up to ${favLimit} favorites.`,
          });
          return;
        }
        await (FavoritesService as any).addFavoriteApiGalleriesGalleryIdFavoritesPhotoIdPost?.(Number(id), photoId);
        const next = new Set(favoriteIds);
        next.add(photoId);
        setFavoriteIds(next);
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 409 && detail) {
        modal.warning({ title: "Favorites limit", content: detail });
      } else {
        modal.error({ title: "Favorite error", content: detail ?? "Operation failed" });
      }
    }
  };

  // ---- Downloads ----
  const canDownloadNow = () => {
    if (!gallery) return true;
    if (gallery.download_limit == null) return true;
    return (gallery.download_count ?? 0) < gallery.download_limit;
  };
  const openGalleryDownloadPicker = () => {
    if (!canDownloadNow()) {
      message.warning("Download limit reached for this gallery.");
      return;
    }
    const name =
      gallery?.booking?.client?.display_name ||
      gallery?.title ||
      `gallery-${id}`;
    setSizeTarget({ type: "gallery", filenameHint: `${name}.zip` });
    setSizeModalOpen(true);
  };

  const openPhotoDownloadPicker = (photo: Photo) => {
    const filenameHint = photo.filename || `photo-${photo.id}`;
    setSizeTarget({ 
      type: "photo", 
      photoId: photo.id, 
      filenameHint: filenameHint 
    });
    setSizeModalOpen(true);
  };

  const handleSizeConfirm = async (size: DownloadSize) => {
    if (!id || !sizeTarget) return;
    setSizeModalOpen(false);
    try {
      if (sizeTarget.type === "gallery") {
        setDownloading(true);
        await downloadGalleryZip(id, sizeTarget.filenameHint, size);
      } else if (sizeTarget.type === "photo") {
        setDownloadingPhotoId(sizeTarget.photoId);
        await downloadSinglePhoto(id, sizeTarget.photoId, sizeTarget.filenameHint, size);
      }
      message.success("Your download will start shortly.");
    } catch (e: any) {
      modal.error({
        title: "Download failed",
        content: e?.message ?? "Could not start download",
      });
    } finally {
      
      setSizeTarget(null);
      setDownloading(false);
      setDownloadingPhotoId(null);
    }
  };

  // derived display items
  const displayName =
    gallery?.booking?.client?.display_name || gallery?.title || "Gallery";

  const displayDateRaw = gallery?.booking?.event_date || gallery?.created_at || null;

  const displayDate = displayDateRaw
    ? new Date(displayDateRaw).toLocaleDateString()
    : "";
  const expiryraw = gallery?.password_expires_at || null;
  const e = expiryraw
    ? new Date(expiryraw).toLocaleDateString()
    : "";
  
  const coverFromPhotos =
    photos.find((p) => p.is_cover)?.path_preview ||
    photos[0]?.path_preview ||
    photos[0]?.path_original ||
    null;

  const coverUrl = gallery?.cover_photo_url || resolveUrl(coverFromPhotos) || null;

  // --- handle click on a thumbnail: open preview for that index in displayedPhotos
  const handleThumbClick = (idxInDisplayed: number) => {
    setCurrentIndex(idxInDisplayed);
    setPreviewVisible(true);
  };

  // Toggle favorites-only view (button placed next to header)
  const toggleShowFavoritesOnly = () => {
    setShowFavoritesOnly((s) => !s);
    // close preview when toggling to favorites-only if none are favorites
    if (!showFavoritesOnly && favoriteIds.size === 0) {
      modal.info({ title: "No favorites", content: "You have no favorites yet." });
    }
    // reset currentIndex to 0 so preview (if opened) starts at first of filtered list
    setCurrentIndex(0);
  };

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
          destroyOnHidden
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

  if (!displayedPhotos.length) {
    return (
      <div style={{ padding: 32 }}>
        <Space direction="vertical" style={{ width: "100%", alignItems: "center" }}>
          <GalleryHeader
            
            clientName={displayName}
            studioName="Alluring Lens Studio"
            e={e}
            onDownloadAll={openGalleryDownloadPicker}
            onShare={copyShareLink}
            onSlideshow={() => {
              if (displayedPhotos.length > 0) {
                setCurrentIndex(0);
                setPreviewVisible(true);
                setAutoplay(true);
              }
            }}
          />
          <div style={{ marginTop: 12 }}>
            <Tooltip title={showFavoritesOnly ? "Show all photos" : "Show favorites only"}>
              <Button
                icon={showFavoritesOnly ? <HeartFilled style={{ color: "#ff4d4f" }} /> : <HeartOutlined />}
                onClick={toggleShowFavoritesOnly}
                type={showFavoritesOnly ? "primary" : "default"}
              >
                {showFavoritesOnly ? "Favorites" : "Favorites"}
              </Button>
            </Tooltip>
          </div>

          <Empty description={showFavoritesOnly ? "No favorites yet" : "No photos in this gallery"} />
        </Space>
      </div>
    );
  }

  return (
    <Spin spinning={downloading} tip="Preparing ZIP…" wrapperClassName="download-spinner">
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
      {remainingDownloads !== null && (
        <div style={{ textAlign: "center", marginTop: 8, color: remainingDownloads === 0 ? "#ff4d4f" : "#666" }}>
        Downloads remaining: {remainingDownloads} / {gallery.download_limit}
        </div>
      )}
      {/* Optional favorites counter under header */}
      {favLimit != null && (
        <div style={{ textAlign: "center", marginTop: 12, color: "#666" }}>
          Favorites: {favoriteIds.size} / {favLimit}
        </div>
      )}

      {/* Sticky header controls */}
      
        <GalleryHeader
          clientName={displayName}
        studioName="Alluring Lens Studio"
        e={e}
          onToggleFavorites={toggleShowFavoritesOnly}
          isFavoritesOnly={showFavoritesOnly}
          favoriteCount={favoriteIds.size}
          onDownloadAll={openGalleryDownloadPicker}
          onShare={copyShareLink}
          onSlideshow={() => {
            if (displayedPhotos.length > 0) {
              setCurrentIndex(0);
              setPreviewVisible(true);
              setAutoplay(true);
            }
          }}
        />

      {/* PreviewGroup wraps the grid so slideshow works */}
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
          {displayedPhotos.map((p, index) => {
            const src =
              resolveUrl(p.path_preview ?? p.path_thumb ?? p.path_original) ??
              undefined;
            const isFav = favoriteIds.has(p.id);

            return (
              <div key={p.id} className="photo-tile-wrap">
                <Image
                  src={src}
                  alt={p.filename}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  preview={{ src: resolveUrl(p.path_original) ?? src }}
                  onClick={() => handleThumbClick(index)}
                  placeholder
                />

                {/* Hover overlay */}
                <div className="photo-overlay">
                  <div className="photo-overlay-actions">
                    <Tooltip title={isFav ? "Remove favorite" : (atLimit ? `Limit ${favLimit}` : "Favorite")}>
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
                        loading={downloadingPhotoId === p.id}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Image.PreviewGroup>

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
      </Spin>
  );
};

export default PublicGalleryView;
