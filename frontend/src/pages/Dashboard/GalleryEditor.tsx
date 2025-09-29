// frontend/src/pages/Dashboard/GalleryEditor.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { UploadDropzone } from "../../components/UploadDropzone";
import { Row, Col, Card, Button, Popconfirm, message, Space, Spin, Empty } from "antd";
import { GalleryService } from "../../api/services/GalleryService";
// If you generated delete/cover endpoints later, replace these axios calls with generated ones
import axios from "axios";
import { OpenAPI } from "../../api/core/OpenAPI";

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

export const GalleryEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  const resolveUrl = useCallback((url?: string | null) => {
    if (!url) return undefined;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
    return `${base}${url}`;
  }, []);

  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const resp = await GalleryService.listPhotosApiGalleriesGalleryIdPhotosGet(id);
      // generator returns parsed JSON — adjust for server shape
      let list: Photo[] = [];
      if (!resp) {
        list = [];
      } else if (Array.isArray(resp)) {
        list = resp as Photo[];
      } else if (Array.isArray((resp as any).photos)) {
        list = (resp as any).photos as Photo[];
      } else if (Array.isArray((resp as any).data)) {
        list = (resp as any).data as Photo[];
      } else if (Array.isArray((resp as any).items)) {
        list = (resp as any).items as Photo[];
      } else {
        // fallback: try to coerce
        list = (resp as any) as Photo[];
      }
      setPhotos(list);
    } catch (err) {
      console.error("fetch photos", err);
      message.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const deletePhoto = async (photoId: string) => {
    try {
      await GalleryService.deletePhotoApiGalleriesGalleryIdPhotosPhotoIdDelete(id, photoId);
      message.success("Photo deleted");
      fetchPhotos();
    } catch (err) {
      console.error("delete photo", err);
      message.error("Failed to delete photo");
    }
  };

  const setCover = async (photoId: string) => {
    try {
      await GalleryService.setPhotoAsCoverApiGalleriesGalleryIdPhotosPhotoIdCoverPost(id, photoId);
      message.success("Cover set");
      fetchPhotos();
    } catch (err) {
      console.error("set cover", err);
      message.error("Failed to set cover");
    }
  };

  if (!id) return <div>No gallery id</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Gallery Editor</h2>

      <UploadDropzone galleryId={id!} onComplete={fetchPhotos} />

      <div style={{ marginTop: 18 }}>
        <Space style={{ marginBottom: 12 }}>
          <Button onClick={fetchPhotos}>Refresh</Button>
        </Space>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : photos.length === 0 ? (
          <Empty description="No photos in this gallery" />
        ) : (
          <Row gutter={[12, 12]}>
            {photos.map((p) => {
              const thumbUrl = resolveUrl(p.path_thumb ?? p.path_preview ?? p.path_original);
              const originalUrl = resolveUrl(p.path_original);
              return (
                <Col key={p.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                  <Card
                    hoverable
                    style={{ width: 220 }}
                    cover={
                      thumbUrl ? (
                        <img
                          alt={p.filename}
                          src={thumbUrl}
                          style={{ height: 140, objectFit: "cover", width: "100%" }}
                          onClick={() => {
                            if (originalUrl) window.open(originalUrl, "_blank");
                          }}
                        />
                      ) : (
                        <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
                          <span style={{ color: "#999" }}>No image</span>
                        </div>
                      )
                    }
                    actions={[
                      <Button key="cover" type="link" onClick={() => setCover(p.id)}>Set Cover</Button>,
                      <Popconfirm key="delete" title="Delete photo?" onConfirm={() => deletePhoto(p.id)} okText="Yes" cancelText="No">
                        <Button type="link" danger>Delete</Button>
                      </Popconfirm>
                    ]}
                  >
                    <Card.Meta title={p.filename} description={p.is_cover ? "Cover" : undefined} />
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>
    </div>
  );
};

export default GalleryEditor;
