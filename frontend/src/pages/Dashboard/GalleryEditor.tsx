// frontend/src/pages/Dashboard/GalleryEditor.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { UploadDropzone } from "../../components/UploadDropzone";
import {
  Row,
  Col,
  Card,
  Button,
  Popconfirm,
  App,
  Space,
  Spin,
  Empty,
  Modal,
  Input,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  DownloadOutlined,
  PictureFilled,
  SettingOutlined,
} from "@ant-design/icons";
import { GalleryService } from "../../api/services/GalleryService";
import { OpenAPI } from "../../api/core/OpenAPI";
import { downloadGalleryZip } from "../../utils/download";
import { downloadSinglePhoto } from "../../utils/downloadSinglePhoto"; // <-- make sure you have this util
import SizePicker from "../../components/SizePicker";

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
  const { message } = App.useApp();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  // password prompt state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // size picker modal state
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [sizeTarget, setSizeTarget] = useState<
    { type: "photo" | "gallery"; photoId?: string; filenameHint?: string } | null
  >(null);

  const resolveUrl = useCallback((url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
    return `${base}${url}`;
  }, []);

  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const resp = await GalleryService.listPhotosApiGalleriesGalleryIdPhotosGet(id);
      let list: Photo[] = [];
      if (!resp) list = [];
      else if (Array.isArray(resp)) list = resp as Photo[];
      else if (Array.isArray((resp as any).photos)) list = (resp as any).photos as Photo[];
      else if (Array.isArray((resp as any).data)) list = (resp as any).data as Photo[];
      else if (Array.isArray((resp as any).items)) list = (resp as any).items as Photo[];
      else list = (resp as any) as Photo[];

      // normalize ids to string
      list = list.map((p: any) => ({ ...p, id: String(p.id) }));
      setPhotos(list);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status === 401 || status === 403) {
        setPasswordModalVisible(true);
        message.info("This gallery is password protected. Please enter the password to view.");
      } else {
        message.error("Failed to load photos");
      }
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const unlockGallery = async () => {
    if (!id) return;
    setUnlocking(true);
    try {
      await GalleryService.unlockGalleryEndpointApiGalleriesGalleryIdUnlockPost(id, {
        password: passwordValue,
      });
      setPasswordModalVisible(false);
      setPasswordValue("");
      message.success("Unlocked gallery. Loading photos...");
      await fetchPhotos();
    } catch (err: any) {
      message.error(err?.response?.data?.detail ?? "Invalid password");
    } finally {
      setUnlocking(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!id) return;
    try {
      await GalleryService.deletePhotoApiGalleriesGalleryIdPhotosPhotoIdDelete(id, photoId);
      message.success("Photo deleted");
      fetchPhotos();
    } catch {
      message.error("Failed to delete photo");
    }
  };

  const setCover = async (photoId: string) => {
    if (!id) return;
    try {
      await GalleryService.setPhotoAsCoverApiGalleriesGalleryIdPhotosPhotoIdCoverPost(id, photoId);
      message.success("Cover set");
      fetchPhotos();
    } catch {
      message.error("Failed to set cover");
    }
  };

  // ---- Download handlers with size picker ----

  const openGalleryDownload = () => {
    setSizeTarget({ type: "gallery", filenameHint: `gallery-${id}.zip` });
    setSizeModalOpen(true);
  };

  const openPhotoDownload = (photo: Photo) => {
    setSizeTarget({
      type: "photo",
      photoId: photo.id,
      filenameHint: photo.filename || `photo-${photo.id}`,
    });
    setSizeModalOpen(true);
  };

  const handleSizeSelect = async (size: string) => {
    if (!id || !sizeTarget) return;
    try {
      if (sizeTarget.type === "gallery") {
        await downloadGalleryZip(id, sizeTarget.filenameHint, size ); // util supports { size }
      } else if (sizeTarget.type === "photo" && sizeTarget.photoId) {
        await downloadSinglePhoto(id, sizeTarget.photoId, sizeTarget.filenameHint, size);
      }
      message.success("Your download will start shortly.");
    } catch (err: any) {
      message.error(err?.message ?? "Download failed");
    } finally {
      setSizeModalOpen(false);
      setSizeTarget(null);
    }
  };

  if (!id) return <div>No gallery id</div>;

  return (
    <div>
      {/* Title + controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Gallery Editor</h2>
          <Tooltip title="Gallery ID">
            <div style={{ color: "#888", fontSize: 12 }}>#{id}</div>
          </Tooltip>
        </div>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPhotos}>
            Refresh
          </Button>
          <Button icon={<DownloadOutlined />} onClick={openGalleryDownload}>
            Download ZIP
          </Button>
          <Button
            icon={<PictureFilled />}
            onClick={() => {
              const first = photos[0];
              const originalUrl = resolveUrl(first?.path_original);
              if (originalUrl) window.open(originalUrl, "_blank");
              else message.info("No images to preview");
            }}
          >
            Preview
          </Button>
        </Space>
      </div>

      <UploadDropzone galleryId={id!} onComplete={fetchPhotos} />

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : photos.length === 0 ? (
          <Empty description="No photos in this gallery" />
        ) : (
          <Row gutter={[16, 16]}>
            {photos.map((p) => {
              const thumbUrl = resolveUrl(p.path_thumb ?? p.path_preview ?? p.path_original);
              const originalUrl = resolveUrl(p.path_original);
              return (
                <Col key={p.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                  <Card
                    hoverable
                    cover={
                      thumbUrl ? (
                        <div style={{ position: "relative" }}>
                          <img
                            alt={p.filename}
                            src={thumbUrl}
                            style={{ height: 160, objectFit: "cover", width: "100%" }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            height: 160,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f5f5f5",
                          }}
                        >
                          <span style={{ color: "#999" }}>No image</span>
                        </div>
                      )
                    }
                    bodyStyle={{ padding: 10 }}
                    style={{ borderRadius: 8 }}
                    actions={[
                      <Tooltip title="Set as cover" key="cover">
                        <Button type="text" onClick={() => setCover(p.id)}>
                          <SettingOutlined />
                        </Button>
                      </Tooltip>,
                      <Tooltip title="Download" key="download">
                        <Button type="text" onClick={() => openPhotoDownload(p)}>
                          <DownloadOutlined />
                        </Button>
                      </Tooltip>,
                      <Popconfirm
                        key="delete"
                        title="Delete photo?"
                        onConfirm={() => deletePhoto(p.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button type="text" danger>
                          Delete
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <Card.Meta
                      title={p.filename}
                      description={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontSize: 12, color: p.is_cover ? "#389e0d" : "#666" }}>
                            {p.is_cover ? "Cover" : ""}
                          </div>
                          <div>
                            <Button
                              type="link"
                              size="small"
                              onClick={() => originalUrl && window.open(originalUrl, "_blank")}
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      {/* Password modal */}
      <Modal
        title="Enter gallery password"
        open={passwordModalVisible}
        onOk={unlockGallery}
        onCancel={() => setPasswordModalVisible(false)}
        okText="Unlock"
        confirmLoading={unlocking}
      >
        <Input.Password
          placeholder="Password"
          value={passwordValue}
          onChange={(e) => setPasswordValue(e.target.value)}
        />
      </Modal>

      {/* Size picker modal (uses your existing component) */}
      <SizePicker
        open={sizeModalOpen}
        onCancel={() => {
          setSizeModalOpen(false);
          setSizeTarget(null);
        }}
        onSelect={handleSizeSelect} // receives size: 'original' | 'large' | 'medium' | 'web'
      />
    </div>
  );
};

export default GalleryEditor;
