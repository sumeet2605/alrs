// frontend/src/pages/Dashboard/GalleryList.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Button, Row, Col, Modal, Input, Space, message } from "antd";
import { GalleryCard } from "../../components/GalleryCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GalleryService } from "../../api/services/GalleryService";
import type { GalleryCreate } from "../../api/models/GalleryCreate";

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
  const [loading, setLoading] = useState(false);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
    // don't add setIsModalOpen/searchParams to deps intentionally beyond searchParams
    // so it runs whenever query changes
  }, [searchParams]);

  // Close modal and remove ?new param
  const closeModalAndClearParam = () => {
    setIsModalOpen(false);
    setTitle("");
    setDesc("");
    // remove the 'new' query param without changing other params
    searchParams.delete("new");
    setSearchParams(searchParams, { replace: true });
    // ensure url stays at /dashboard/galleries
    navigate("/dashboard/galleries", { replace: true });
  };

  const openModal = () => {
    // set query param when user opens modal manually so behavior is consistent
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
      // refresh list and close modal
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
            <GalleryCard id={g.id} title={g.title} coverUrl={g.cover_url} description={g.description ?? ""} />
          </Col>
        ))}
      </Row>

      {/* Controlled AntD Modal (v5-friendly usage) */}
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
