// frontend/src/pages/Dashboard/GalleryList.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Button, Row, Col, Modal, Input, Space, App } from "antd";
import { GalleryCard } from "../../components/GalleryCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GalleryService } from "../../api/services/GalleryService";
import type { GalleryCreate } from "../../api/models/GalleryCreate";
import { OpenAPI } from "../../api/core/OpenAPI";

type Gallery = {
  id: string;
  title: string;
  description?: string | null;
  is_public?: boolean;
  created_at?: string;
  cover_url?: string | null;
};

export const GalleryList: React.FC = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [_loading, setLoading] = useState(false);
  const { message } = App.useApp();

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // helper to resolve relative URLs against OpenAPI base
  const resolveUrl = useCallback((url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
    return `${base}${url}`;
  }, []);

  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await GalleryService.listGalleriesApiGalleriesGet();
      const data = resp as any;
      const list = Array.isArray(data) ? data : data?.galleries ?? data?.data ?? [];
      setGalleries(list);
    } catch (err) {
      console.error("fetch galleries", err);
      message.error("Failed to load galleries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  // Open modal automatically if ?new=true is present
  useEffect(() => {
    const newParam = searchParams.get("new");
    if (newParam === "true") {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Close modal and remove ?new param
  const closeModalAndClearParam = () => {
    setIsModalOpen(false);
    setTitle("");
    setDesc("");
    searchParams.delete("new");
    setSearchParams(searchParams, { replace: true });
    navigate("/dashboard/galleries", { replace: true });
  };

  const openModal = () => {
    setSearchParams({ new: "true" }, { replace: true });
    setIsModalOpen(true);
  };

  const createGallery = async () => {
    if (!title.trim()) return message.warning("Please enter a title");
    setCreating(true);
    try {
      const payload: GalleryCreate = { title, description: desc, is_public: false };
      const resp = await GalleryService.createGalleryApiGalleriesPost(payload);
      message.success("Gallery created");
      await fetchGalleries();
      const created = resp as any;
      const newId = created?.id;
      closeModalAndClearParam();
      if (newId) navigate(`/dashboard/galleries/${newId}`);
    } catch (err) {
      console.error("create gallery", err);
      message.error("Failed to create gallery");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openModal}>
          New Gallery
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        {galleries.map((g) => (
          <Col key={g.id}>
            <GalleryCard
              id={g.id}
              title={g.title}
              coverUrl={resolveUrl(g.cover_url)}
              description={g.description ?? ""}
              onUpdated={fetchGalleries} 
            />
          </Col>
        ))}
      </Row>

      <Modal
        title="Create gallery"
        open={isModalOpen}
        onCancel={closeModalAndClearParam}
        onOk={createGallery}
        confirmLoading={creating}
        okText="Create"
        cancelText="Cancel"
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};
