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
  InputNumber,
  Checkbox,
  message as antdMessage,
} from "antd";
import {
  ReloadOutlined,
  DownloadOutlined,
  PictureFilled,
  SettingOutlined,
  DeleteOutlined,
  SelectOutlined,
  ClearOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { GalleryService } from "../../api/services/GalleryService";
import { OpenAPI } from "../../api/core/OpenAPI";
import { downloadGalleryZip } from "../../utils/download";
import { downloadSinglePhoto } from "../../utils/downloadSinglePhoto";
import SizePicker from "../../components/SizePicker";
import { FavoritesService } from "../../api/services/FavoritesService";

type Photo = {
  id: string;
  file_id?: string | null;
  filename: string;
  path_original?: string | null; // may be a storage key or a signed URL
  path_preview?: string | null;  // may be a storage key or a signed URL
  path_thumb?: string | null;    // may be a storage key or a signed URL
  width?: number | null;
  height?: number | null;
  order_index?: number | null;
  is_cover?: boolean | null;
};

type DownloadPreset = "original" | "large" | "medium" | "web";

export const GalleryEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message, modal } = App.useApp();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  // selection state for multi-delete
  const [downloading, setDownloading] = useState(false);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  // password modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // favorites limit
  const [favLimit, setFavLimit] = useState<number | null>(null);
  const [savingFavLimit, setSavingFavLimit] = useState(false);
  const [loadingFavLimit, setLoadingFavLimit] = useState(false);

  // size-picker modal
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [sizeTarget, setSizeTarget] = useState<
    { type: "photo" | "gallery"; photoId?: string; filenameHint?: string } | null
    >(null);
  const [exportingFavorites, setExportingFavorites] = useState(false);

  /**
   * Resolve a possibly-relative storage path to a URL.
   * - If it's already absolute (http/https), return as-is (e.g., signed GCS URL).
   * - Otherwise prefix with OpenAPI.BASE (for dev/local proxying).
   */
  const resolveUrl = useCallback((url?: string | null) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
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

  // load photos
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // load favorite limit
  useEffect(() => {
    const loadFavLimit = async () => {
      if (!id) return;
      setLoadingFavLimit(true);
      try {
        const resp = await (FavoritesService as any).getFavoritesLimitApiGalleriesGalleryIdFavoritesLimitGet?.(id);
        // Accept either {limit: number|null} or raw number
        const value =
          resp && typeof resp === "object" && "limit" in (resp as any)
            ? (resp as any).limit
            : (resp as any);
        setFavLimit(value ?? 0);
      } catch {
        // ignore silently; default remains
      } finally {
        setLoadingFavLimit(false);
      }
    };
    loadFavLimit();
  }, [id]);

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
      // remove locally
      setPhotos((p) => p.filter((x) => x.id !== photoId));
      // also clear selection if present
      setSelectedIds((s) => s.filter((x) => x !== photoId));
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

  // ---- Download flows ----
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

  const handleSizeSelect = async (size: DownloadPreset) => {
    if (!id || !sizeTarget) return;
    setSizeModalOpen(false);
    try {
      if (sizeTarget.type === "gallery") {
        setDownloading(true);
        await downloadGalleryZip(id, sizeTarget.filenameHint, size);
      } else if (sizeTarget.type === "photo" && sizeTarget.photoId) {
        setDownloadingPhotoId(sizeTarget.photoId);
        await downloadSinglePhoto(id, sizeTarget.photoId, sizeTarget.filenameHint, size);
      }
      message.success("Your download will start shortly.");
    } catch (err: any) {
      message.error(err?.message ?? "Download failed");
    } finally {
      
      setSizeTarget(null);
      setDownloading(false);
      setDownloadingPhotoId(null);
    }
  };

  if (!id) return <div>No gallery id</div>;

  // --- Selection helpers for multi-delete ---
  const toggleSelect = (photoId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(photoId)) return prev;
        return [...prev, photoId];
      } else {
        return prev.filter((x) => x !== photoId);
      }
    });
  };

  const selectAll = () => {
    setSelectedIds(photos.map((p) => p.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const deleteSelected = async () => {
    if (!id) return;
    if (selectedIds.length === 0) return;
    setDeletingSelected(true);
    try {
      const ops = selectedIds.map((photoId) =>
        GalleryService.deletePhotoApiGalleriesGalleryIdPhotosPhotoIdDelete(id, photoId)
          .then(() => ({ id: photoId, ok: true }))
          .catch((e: any) => ({ id: photoId, ok: false, error: e?.message ?? "error" }))
      );
      const results = await Promise.all(ops);
      const succeeded = results.filter((r: any) => r.ok).map((r: any) => r.id);
      const failed = results.filter((r: any) => !r.ok);

      // remove succeeded locally
      if (succeeded.length > 0) {
        setPhotos((p) => p.filter((x) => !succeeded.includes(x.id)));
        antdMessage.success(`Deleted ${succeeded.length} photo(s)`);
      }

      if (failed.length > 0) {
        antdMessage.error(`${failed.length} photo(s) failed to delete`);
        console.error("batch delete errors", failed);
      }

      // clear selection of removed photos
      setSelectedIds((prev) => prev.filter((id) => !succeeded.includes(id)));
    } catch (err: any) {
      console.error("deleteSelected error", err);
      antdMessage.error(err?.message ?? "Failed to delete selected photos");
    } finally {
      setDeletingSelected(false);
    }
  };

  const exportFavoritesCsv = async () => {
    if (!id) return;
    setExportingFavorites(true);
    try {
      const token = OpenAPI.TOKEN;
      if (!token || typeof token !== "string") {
        throw new Error("Authentication token not available");
      }
      const apiurl = new URL(`${OpenAPI.BASE}/api/galleries/galleries/${id}/favorites/export`);
      const resp = await fetch(apiurl, {
          method: "GET",
          headers: {
            'Authorization': `Bearer ${token}`,
          },
      });
      if (!resp.ok) {
            const errorText = await resp.text();
            modal.error({ title: "Export Failed", content: `Server error: ${resp.status} ${errorText}` });
            return;
        }
      // resp is expected to be { filename: string, content: string (CSV) }
      console.log("exportFavoritesCsv response", resp);
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gallery-${id}-favorites.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success("Favorites CSV export started");
    } catch (err: any) {
      console.error("exportFavoritesCsv error", err);
      message.error(err?.message ?? "Failed to export favorites CSV");
    } finally {
      setExportingFavorites(false);
    }
  };

  return (
    <Spin spinning={downloading} tip="Preparing ZIP…">
    <div>
      {/* Top bar */}
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

        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchPhotos}>
            Refresh
          </Button>

          <InputNumber
            min={0}
            placeholder="Favorites limit (0 = default)"
            value={favLimit ?? 0}
            onChange={(v) => setFavLimit(typeof v === "number" ? v : 0)}
            disabled={loadingFavLimit || savingFavLimit}
          />
          <Button
            loading={savingFavLimit}
            disabled={loadingFavLimit}
            onClick={async () => {
              if (!id) return;
              try {
                setSavingFavLimit(true);
                await (FavoritesService as any).setFavoritesLimitApiGalleriesGalleryIdFavoritesLimitPut?.(
                  Number(id),
                  { limit: favLimit ?? null }
                );
                message.success("Favorites limit saved");
              } catch (e: any) {
                message.error(e?.response?.data?.detail ?? "Failed to save favorites limit");
              } finally {
                setSavingFavLimit(false);
              }
            }}
          >
            Save Favorite Limit
          </Button>

          <Button icon={<DownloadOutlined />} onClick={openGalleryDownload} loading={downloading}>
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
            <Button
              icon={<FileExcelOutlined />} // import this icon from @ant-design/icons
              onClick={exportFavoritesCsv}
              loading={exportingFavorites}
            >
              Export Favorites CSV
            </Button>

          {/* Multi-select actions */}
          <Button icon={<SelectOutlined />} onClick={selectAll} disabled={photos.length === 0}>
            Select all
          </Button>
          <Button icon={<ClearOutlined />} onClick={clearSelection} disabled={selectedIds.length === 0}>
            Clear
          </Button>

          <Popconfirm
            title={`Delete ${selectedIds.length} selected photo(s)?`}
            onConfirm={deleteSelected}
            okText="Yes"
            cancelText="No"
            disabled={selectedIds.length === 0}
          >
            <Button icon={<DeleteOutlined />} danger loading={deletingSelected} disabled={selectedIds.length === 0}>
              Delete selected
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* UploadDropzone: insert created photo immediately via onComplete(photo) */}
      <UploadDropzone
        galleryId={id!}
        onComplete={(photo?: any) => {
          if (!photo) return;
          // Some backends return { photos: [...] } or the created photo directly.
          // Try to normalize: if array, insert all; if single object, insert that.
          if (Array.isArray(photo)) {
            const mapped = photo.map((p: any) => ({ ...p, id: String(p.id) }));
            setPhotos((prev) => [...mapped, ...prev]);
          } else if (photo && typeof photo === "object") {
            setPhotos((prev) => [{ ...photo, id: String(photo.id) }, ...prev]);
          } else {
            // fallback: refetch
            fetchPhotos();
          }
        }}
      />

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
              const checked = selectedIds.includes(p.id);
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
                        <Button type="text" onClick={() => openPhotoDownload(p)} loading={downloadingPhotoId === p.id}>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Checkbox checked={checked} onChange={(e) => toggleSelect(p.id, e.target.checked)} />
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
                      </div>
                    </div>
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
          onPressEnter={unlockGallery}
        />
      </Modal>

      {/* Size picker modal */}
      <SizePicker
        open={sizeModalOpen}
        onCancel={() => {
          setSizeModalOpen(false);
          setSizeTarget(null);
        }}
        onSelect={(size) => handleSizeSelect(size as DownloadPreset)}
      />
    </div>
    </Spin>
  );
};

export default GalleryEditor;
