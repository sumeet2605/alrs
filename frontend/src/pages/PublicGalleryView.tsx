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
import SizePicker from "../components/SizePicker";
import { FavoritesService } from "../api/services/FavoritesService";
import { downloadGalleryZip } from "../utils/download";
import { downloadSinglePhoto } from "../utils/downloadSinglePhoto";
import { useBranding } from "../context/BrandingContext";

const { Title, Text } = Typography;

type Photo = {
  id: string;
  file_id?: string | null;
  filename: string;
  path_original?: string | null;
  width?: number | null;
  height?: number | null;
  order_index?: number | null;
  is_cover?: boolean | null;
};

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
  const branding = useBranding();

  const [gallery, setGallery] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await GalleryService.listPhotosApiGalleriesGalleryIdPhotosGet(id);
      const list = Array.isArray(resp)
        ? resp
        : (resp as any)?.photos ?? (resp as any)?.data ?? [];
      const normalized: Photo[] = (list || []).map((p: any) => ({
        ...p,
        id: String(p.id),
      }));
      setPhotos(normalized);
    } catch {
      setError("Failed to load gallery.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "4rem auto" }} />;
  if (error) return <Empty description={error} />;
  if (!photos.length) return <Empty description="No photos in this gallery" />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--secondary)" }}>
      <div style={{ padding: "40px" }}>
        <Title level={2} style={{ fontFamily: branding?.font_family || "Playfair Display" }}>
          {gallery?.title || "Gallery"}
        </Title>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "24px",
            marginTop: "30px",
          }}
        >
          {photos.map((photo) => {
            const imageUrl = resolveUrl(photo.path_original);
            return (
              <div
                key={photo.id}
                style={{
                  position: "relative",
                  borderRadius: "18px",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(200,138,138,0.15)",
                }}
              >
                <img
                  src={imageUrl || undefined}
                  style={{
                    width: "100%",
                    height: "320px",
                    objectFit: "cover",
                  }}
                />

                {branding?.logo_path && (
                  <img
                    src={resolveUrl(branding.logo_path) || undefined}
                    style={{
                      position: "absolute",
                      bottom: "16px",
                      right: "16px",
                      width: "80px",
                      opacity: 0.75,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PublicGalleryView;
