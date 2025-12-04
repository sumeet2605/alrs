
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Card,
  Button,
  List,
  Tag,
  Space,
  Modal,
  Input,
  Checkbox,
  Typography,
  Empty,
  Spin,
} from "antd";
import { CrmService } from "../api/services/CrmService";

const { Text } = Typography;
const { Search } = Input;

interface Gallery {
  id: number;
  title: string;
  description?: string | null;
  is_public?: boolean;
  created_at?: string | null;
}

interface SessionGalleryManagerProps {
  sessionId: number;
}

export const SessionGalleryManager: React.FC<SessionGalleryManagerProps> = ({
  sessionId,
}) => {
  const [sessionGalleries, setSessionGalleries] = useState<Gallery[]>([]);
  const [allGalleries, setAllGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ---------- Helpers ----------
  const formatDate = (value?: string | null) =>
    value ? dayjs(value).format("DD MMM YYYY") : "";

  const filteredGalleries = useMemo(() => {
    if (!search.trim()) return allGalleries;
    const q = search.toLowerCase();
    return allGalleries.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q)
    );
  }, [allGalleries, search]);

  // ---------- API: load linked galleries ----------
  const loadSessionGalleries = async () => {
    try {
      setLoading(true);
      setError(null);
      const res =
        await CrmService.listSessionGalleriesApiCrmSessionsSessionIdGalleriesGet(
          sessionId
        );
      // assuming this returns an array of Gallery-like objects
      setSessionGalleries(res as unknown as Gallery[]);
    } catch (e: any) {
      console.error(e);
      setError("Failed to load session galleries.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- API: load all galleries ----------
  const loadAllGalleries = async () => {
    try {
      setLoadingAll(true);

      if (!sessionId) {
        setAllGalleries([]);
        return;
      }

      if (
        typeof (CrmService as any)
          .listAvailableSessionGalleriesApiCrmSessionsSessionIdGalleriesAvailableGet !==
        "function"
      ) {
        // If you didn't generate /available endpoint, you can
        // call a generic GalleryService here instead.
        setAllGalleries([]);
        return;
      }

      const res =
        await (CrmService as any).listAvailableSessionGalleriesApiCrmSessionsSessionIdGalleriesAvailableGet(
          sessionId
        );

      const mapped: Gallery[] = (res || []).map((g: any) => ({
        id: g.gallery_id ?? g.id,
        title: g.title,
        description: g.description,
        is_public: g.is_public,
        created_at: g.created_at,
      }));
      setAllGalleries(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    loadSessionGalleries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ---------- Modal open/close ----------
  const openModal = () => {
    setIsModalOpen(true);
    setSelectedIds(sessionGalleries.map((g) => g.id)); // preselect existing
    loadAllGalleries();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSearch("");
    setSelectedIds([]);
  };

  // ---------- Selection ----------
  const toggleGallery = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ---------- Save links (PUT bulk) ----------
  const handleSave = async () => {
    try {
      setSaving(true);
      await CrmService.setSessionGalleriesApiCrmSessionsSessionIdGalleriesPut(
        sessionId,
        { gallery_ids: selectedIds }
      );
      await loadSessionGalleries();
      closeModal();
    } catch (e) {
      console.error(e);
      Modal.error({
        title: "Failed to update galleries",
        content: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Unlink from card ----------
  const handleUnlink = async (galleryId: number) => {
    Modal.confirm({
      title: "Remove this gallery from the session?",
      okText: "Remove",
      okType: "danger",
      cancelText: "Cancel",
      async onOk() {
        try {
          const remainingIds = sessionGalleries
            .filter((g) => g.id !== galleryId)
            .map((g) => g.id);

          await CrmService.setSessionGalleriesApiCrmSessionsSessionIdGalleriesPut(
            sessionId,
            { gallery_ids: remainingIds }
          );
          setSessionGalleries((prev) =>
            prev.filter((g) => g.id !== galleryId)
          );
        } catch (e) {
          console.error(e);
          Modal.error({
            title: "Failed to unlink gallery",
            content: "Please try again.",
          });
        }
      },
    });
  };

  // ---------- Render ----------
  return (
    <div style={{ marginTop: 16 }}>
      <Card
        size="small"
        title={
          <Space direction="vertical" size={0}>
            <Text strong>Session Galleries</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Link this session with one or more client galleries.
            </Text>
          </Space>
        }
        extra={
          <Button
            type="default"
            size="small"
            onClick={openModal}
            htmlType="button" // 🔑 prevent form submit
          >
            + Link / Manage
          </Button>
        }
        bodyStyle={{ padding: 12 }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <Spin size="small" />
          </div>
        ) : error ? (
          <Text type="danger" style={{ fontSize: 12 }}>
            {error}
          </Text>
        ) : sessionGalleries.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            No galleries linked yet. Click{" "}
            <Text strong>"Link / Manage"</Text> to add.
          </Text>
        ) : (
          <>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Currently linked:{" "}
              <Text strong>{sessionGalleries.length}</Text>
            </Text>
            <List
              style={{ marginTop: 8 }}
              size="small"
              dataSource={sessionGalleries}
              renderItem={(g) => (
                <List.Item
                  actions={[
                    <a
                      key="view"
                      href={`/galleries/${g.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>,
                    <Button
                      key="unlink"
                      type="link"
                      danger
                      size="small"
                      onClick={() => handleUnlink(g.id)}
                      htmlType="button"
                    >
                      Unlink
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size={8}>
                        <span>{g.title}</span>
                        {g.is_public !== undefined && (
                          <Tag
                            color={g.is_public ? "green" : "default"}
                            style={{ fontSize: 10 }}
                          >
                            {g.is_public ? "Public" : "Private"}
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2}>
                        {g.description && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {g.description}
                          </Text>
                        )}
                        {g.created_at && (
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            Created {formatDate(g.created_at)}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Card>

      {/* Manage galleries modal */}
      <Modal
        title={`Link galleries to Session #${sessionId}`}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        okText="Save links"
        cancelText="Cancel"
        confirmLoading={saving}
        destroyOnClose
        width={680}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Select one or more galleries from the list below. Existing links
            will stay selected unless you uncheck them.
          </Text>

          <Search
            placeholder="Search galleries by title or description"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(val) => {
              setSearch(val);
              // optional: server-side search
              // loadAllGalleries(val);
            }}
            size="small"
          />

          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              border: "1px solid #f0f0f0",
              borderRadius: 8,
              padding: 8,
            }}
          >
            {loadingAll ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <Spin size="small" />
              </div>
            ) : filteredGalleries.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No galleries found"
              />
            ) : (
              <List
                size="small"
                dataSource={filteredGalleries}
                renderItem={(g) => {
                  const checked = selectedIds.includes(g.id);
                  const alreadyLinked = sessionGalleries.some(
                    (sg) => sg.id === g.id
                  );
                  return (
                    <List.Item
                      onClick={() => toggleGallery(g.id)}
                      style={{
                        cursor: "pointer",
                        background: checked ? "#f5f5ff" : undefined,
                      }}
                    >
                      <Space align="start">
                        <Checkbox
                          checked={checked}
                          onChange={() => toggleGallery(g.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Space direction="vertical" size={0}>
                          <Space size={8}>
                            <Text strong>{g.title}</Text>
                            {alreadyLinked && (
                              <Tag color="green" style={{ fontSize: 9 }}>
                                Linked
                              </Tag>
                            )}
                          </Space>
                          {g.description && (
                            <Text
                              type="secondary"
                              style={{ fontSize: 11 }}
                              ellipsis
                            >
                              {g.description}
                            </Text>
                          )}
                          {g.created_at && (
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              Created {formatDate(g.created_at)}
                            </Text>
                          )}
                        </Space>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            )}
          </div>

          <Text type="secondary" style={{ fontSize: 12 }}>
            {selectedIds.length} gallery
            {selectedIds.length === 1 ? "" : "ies"} selected
          </Text>
        </Space>
      </Modal>
    </div>
  );
};

export default SessionGalleryManager;