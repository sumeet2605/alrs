// src/pages/PublicGalleryView.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Typography, Spin, Image, Empty, Alert, Modal, Input, Button, message } from "antd";
import { GalleryService } from "../api/services/GalleryService";
import { OpenAPI } from "../api/core/OpenAPI";
import GalleryHeader from "./ClientGalleryHeader";
import { downloadGalleryZip } from "../utils/download";

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

const resolveUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
  if (!url.startsWith("/")) url = `/${url}`;
  return `${base}${url}`;
};

const PublicGalleryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [gallery, setGallery] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // lock flow
  const [locked, setLocked] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  // preview/slideshow
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Gallery metadata (if you don’t have this endpoint yet, you can skip it safely)
      try {
        // If your OpenAPI doesn’t have this method yet, remove this call.
        // @ts-ignore
        const g = await GalleryService.getGalleryApiGalleriesGalleryIdGet?.(id);
        if (g) setGallery(g);
      } catch {
        // optional, ignore if not implemented
      }

      // Photos (401 => locked)
      const resp = await GalleryService.listPhotosApiGalleriesGalleryIdPhotosGet(id);
      const list = Array.isArray(resp) ? resp : (resp as any)?.photos ?? (resp as any)?.data ?? [];
      const normalized: Photo[] = list.map((p: any) => ({ ...p, id: String(p.id) }));
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
  }, [autoplay, previewVisible, photos]);

  const tryUnlock = async () => {
    if (!id) return;
    try {
      // cookie-based unlock
      await GalleryService.unlockGalleryEndpointApiGalleriesGalleryIdUnlockPost(id, { password: passwordValue });
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

  const handleDownloadAll = async () => {
    if (!id) return;
    try {
      const name =
        gallery?.booking?.client?.display_name ||
        gallery?.title ||
        `gallery-${id}`;
      await downloadGalleryZip(id, `${name}.zip`);
    } catch (e: any) {
      Modal.error({
        title: "Download failed",
        content: e?.message ?? "Could not start download",
      });
    }
  };

  // derived display values with fallbacks
  const displayName =
    gallery?.booking?.client?.display_name ||
    gallery?.title ||
    "Gallery";

  const displayDateRaw =
    gallery?.booking?.event_date ||
    gallery?.created_at ||
    null;

  const displayDate = displayDateRaw
    ? new Date(displayDateRaw).toLocaleDateString()
    : "";

  const coverFromPhotos =
    photos.find((p) => p.is_cover)?.path_preview ||
    photos[0]?.path_preview ||
    photos[0]?.path_original ||
    null;

  const coverUrl =
    gallery?.cover_photo_url ||
    resolveUrl(coverFromPhotos) ||
    null;

  if (loading) {
    return <Spin size="large" style={{ display: "block", margin: "4rem auto" }} />;
  }

  if (locked) {
    return (
      <>
        <div style={{ textAlign: "center", padding: 40 }}>
          <Title level={3}>This gallery is password protected</Title>
          <Button type="primary" onClick={() => setPasswordModalOpen(true)}>Enter password to view</Button>
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
      {/* Hero Section */}
      {coverUrl && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "60vh",
            backgroundImage: coverUrl ? `url(${coverUrl})` : "linear-gradient(to right, #999, #555)",
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
        onDownloadAll={handleDownloadAll}
        onShare={copyShareLink}
        onSlideshow={() => {
          if (photos.length > 0) {
            setCurrentIndex(0);
            setPreviewVisible(true);
            setAutoplay(true);
          }
        }}
      />

      {/* Photos Grid */}
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
          {photos.map((p) => {
            const src = resolveUrl(p.path_preview ?? p.path_thumb ?? p.path_original) ?? undefined;
            return (
              <div
                key={p.id}
                style={{
                  breakInside: "avoid",
                  marginBottom: 16,
                  borderRadius: 8,
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                }}
              >
                <Image
                  src={src}
                  alt={p.filename}
                  style={{ width: "100%", height: "auto", display: "block" }}
                  preview={true}
                  placeholder
                />
              </div>
            );
          })}
        </div>
      </Image.PreviewGroup>
    </div>
  );
};

export default PublicGalleryView;
