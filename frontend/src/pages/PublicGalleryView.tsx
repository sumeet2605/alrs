// src/pages/PublicGalleryView.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GalleryService } from "../api/services/GalleryService";
import { OpenAPI } from "../api/core/OpenAPI";
import { Row, Col, Card, Button, Input, Modal, Space, message, Spin, Empty } from "antd";
import axios from "axios";

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

export const PublicGalleryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [galleryTitle, setGalleryTitle] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // list photos: if gallery public, will return list. If locked -> 401
      const resp = await GalleryService.listPhotosApiGalleriesGalleryIdPhotosGet(id);
      const data = resp as any;
      const list = Array.isArray(data) ? data : data?.photos ?? data?.data ?? [];
      const normalized = list.map((p: any) => ({ ...p, id: String(p.id) }));
      setPhotos(normalized);
      setLocked(false);
    } catch (err: any) {
      console.error("fetch photos error", err);
      const status = err?.response?.status ?? err?.status;
      if (status === 401) {
        // locked
        setLocked(true);
        setPasswordModalOpen(true);
      } else if (status === 404) {
        message.error("Gallery not found");
        navigate("/");
      } else {
        message.error("Failed to load gallery");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const tryUnlock = async () => {
    if (!id) return;
    try {
      // unlock endpoint: server should set cookie on success (withCredentials)
      await GalleryService.unlockGalleryEndpointApiGalleriesGalleryIdUnlockPost(id, { password: passwordValue });
      message.success("Gallery unlocked");
      setPasswordModalOpen(false);
      setPasswordValue("");
      // After server sets cookie, re-fetch photos: cookie sent automatically because OpenAPI.WITH_CREDENTIALS = true
      await fetchPhotos();
    } catch (err: any) {
      console.error("unlock failed", err);
      message.error(err?.response?.data?.detail ?? "Incorrect password");
    }
  };

  const copyShareLink = () => {
    const base = window.location.origin;
    const path = `/g/${id}`;
    const full = `${base}${path}`;
    navigator.clipboard.writeText(full).then(
      () => message.success("Share link copied"),
      () => message.error("Copy failed")
    );
  };

  const downloadPhoto = async (p: Photo) => {
    try {
      const url = resolveUrl(p.path_original ?? "");
      if (!url) {
        message.error("Photo url not available");
        return;
      }
      const resp = await axios.get(url, { responseType: "blob", withCredentials: true });
      const blob = new Blob([resp.data], { type: resp.headers["content-type"] ?? "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = p.filename ?? `photo-${p.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("download photo", err);
      message.error("Download failed");
    }
  };

  if (!id) return <div>No gallery specified</div>;
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spin size="large" /></div>;
  if (locked) {
    return (
      <>
        <div style={{ textAlign: "center", padding: 40 }}>
          <h3>This gallery is password protected</h3>
          <Button type="primary" onClick={() => setPasswordModalOpen(true)}>Enter password to view</Button>
          <div style={{ marginTop: 12 }}>
            <Button onClick={copyShareLink}>Copy share link</Button>
          </div>
        </div>

        <Modal title="Enter gallery password" open={passwordModalOpen} onOk={tryUnlock} onCancel={() => setPasswordModalOpen(false)} okText="Unlock">
          <Input.Password placeholder="Password" value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} />
        </Modal>
      </>
    );
  }

  if (!photos.length) return <Empty description="No photos in this gallery" />;

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 12 }}>
        <Button onClick={() => window.location.href = `/dashboard/galleries/${id}`}>Open in app</Button>
        <Button type="primary" onClick={copyShareLink}>Copy share link</Button>
      </Space>

      <Row gutter={[12, 12]}>
        {photos.map((p) => (
          <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              style={{ width: "100%" }}
              cover={<img alt={p.filename} src={resolveUrl(p.path_preview ?? p.path_thumb ?? p.path_original)} style={{ height: 180, objectFit: "cover" }} />}
              actions={[
                <Button type="link" key="download" onClick={() => downloadPhoto(p)}>Download</Button>
              ]}
            >
              <Card.Meta title={p.filename} description={`${p.width ?? ""}x${p.height ?? ""}`} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default PublicGalleryView;
