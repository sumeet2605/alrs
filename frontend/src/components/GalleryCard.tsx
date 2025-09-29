// frontend/src/components/GalleryCard.tsx
import React, { useState } from "react";
import { Card, Tooltip, message, Button, Modal, Input, Checkbox, Space } from "antd";
import Meta from "antd/es/card/Meta";
import { Link } from "react-router-dom";
import { OpenAPI } from "../api/core/OpenAPI";
import { ShareAltOutlined, LinkOutlined } from '@ant-design/icons';
import { GalleryService } from "../api/services/GalleryService";

type Props = {
  id: string;
  title: string;
  coverUrl?: string | null;
  description?: string;
  isPublic?: boolean; // new prop
  onUpdated?: () => void; // optional callback to notify parent of changes
};

export const GalleryCard: React.FC<Props> = ({ id, title, coverUrl, description, isPublic = false, onUpdated }) => {
  const [makingPublic, setMakingPublic] = useState(false);
  const [password, setPassword] = useState("");
  const [makePublicChecked, setMakePublicChecked] = useState(true);
  const [loading, setLoading] = useState(false);

  const resolveUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = (OpenAPI.BASE ?? "").replace(/\/$/, ""); // strip trailing slash
    return `${base}${url}`;
  };

  const getShareUrl = () => {
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    return `${origin}/g/${encodeURIComponent(id)}`;
  };

  const copyShareLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      message.success("Share link copied to clipboard");
    } catch (e) {
      message.error("Copy failed — please copy the link manually: " + url);
    }
  };

  const openPublicView = () => {
    const url = getShareUrl();
    window.open(url, "_blank", "noopener");
  };

  // invoked when Share icon is clicked
  const onShareClicked = async () => {
    if (isPublic) {
      // already public -> just copy link
      copyShareLink();
      return;
    }
    // not public -> prompt modal to make public + optional password
    setPassword("");
    setMakePublicChecked(true);
    setMakingPublic(true);
  };

  const confirmMakePublic = async () => {
    setLoading(true);
    try {
      // payload: send both keys; backend should accept these keys
      const payload: Record<string, any> = {
        password: password || null,
        is_public: !!makePublicChecked,
      };
      await GalleryService.setGalleryPasswordEndpointApiGalleriesGalleryIdPasswordPost(id, payload);
      message.success("Gallery updated");
      setMakingPublic(false);
      // copy share link after making public
      copyShareLink();
      // notify parent to refresh list / gallery metadata
      onUpdated?.();
    } catch (err: any) {
      console.error("make public failed", err);
      message.error(err?.response?.data?.detail ?? "Failed to update gallery");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card
        hoverable
        style={{ width: 260 }}
        cover={
          coverUrl ? (
            <img
              alt={title}
              src={resolveUrl(coverUrl) ?? ""}
              style={{ height: 160, objectFit: "cover" }}
            />
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
              <span style={{ color: "#999" }}>No cover</span>
            </div>
          )
        }
        actions={[
          <Tooltip key="open" title="Open public view">
            <Button type="link" onClick={openPublicView} icon={<LinkOutlined />} />
          </Tooltip>,
          <Tooltip key="share" title={isPublic ? "Copy share link" : "Make public / share"}>
            <Button type="link" onClick={onShareClicked} icon={<ShareAltOutlined />} />
          </Tooltip>
        ]}
      >
        <Meta
          title={<Link to={`/dashboard/galleries/${id}`}>{title}</Link>}
          description={description ?? ""}
        />
      </Card>

      <Modal
        title="Make gallery public and set a password (optional)"
        open={makingPublic}
        onCancel={() => setMakingPublic(false)}
        onOk={confirmMakePublic}
        okText="Make public & share"
        confirmLoading={loading}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Checkbox checked={makePublicChecked} onChange={(e) => setMakePublicChecked(e.target.checked)}>
            Make gallery public
          </Checkbox>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Password (optional)</label>
            <Input.Password placeholder="Set a password to protect the gallery" value={password} onChange={(e) => setPassword(e.target.value)} />
            <small style={{ color: '#666' }}>Leave blank for no password.</small>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default GalleryCard;
