// frontend/src/components/GalleryCard.tsx
import React, { useState, useCallback } from "react";
import { Card, Tooltip, App, Button, Modal, Input, Checkbox, Space, Select, DatePicker } from "antd";
import Meta from "antd/es/card/Meta";
import { Link } from "react-router-dom";
import { OpenAPI } from "../api/core/OpenAPI";
import { ShareAltOutlined, LinkOutlined } from '@ant-design/icons';
import { GalleryService } from "../api/services/GalleryService";
import axios from "axios";
import dayjs from "dayjs";

type Props = {
  id: string;
  title: string;
  coverUrl?: string | null;
  description?: string;
  isPublic?: boolean; // new prop
  onUpdated?: () => void; // optional callback to notify parent of changes
};

const expiryOptions = [
  { value: "never", label: "Never (no expiry)" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "15d", label: "15 days" },
  { value: "custom", label: "Custom date/time" },
];

export const GalleryCard: React.FC<Props> = ({ id, title, coverUrl, description, isPublic = false, onUpdated }) => {
  const [makingPublic, setMakingPublic] = useState(false);
  const [password, setPassword] = useState<string>("");
  const [makePublicChecked, setMakePublicChecked] = useState(true);
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  // expiry state
  const [expiry, setExpiry] = useState<string>("never");
  const [customExpiry, setCustomExpiry] = useState<any>(null);

  const resolveUrl = useCallback((url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = (OpenAPI.BASE ?? "").replace(/\/$/, ""); // strip trailing slash
    return `${base}${url}`;
  }, []);

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

  const openShareModal = async () => {
    // try to prefill from gallery metadata (if available)
    try {
      const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
      const headers: Record<string, string> = {};
      if (OpenAPI.TOKEN) headers["Authorization"] = `Bearer ${OpenAPI.TOKEN}`;
      const resp = await axios.get(`${base}/api/galleries/${encodeURIComponent(id)}`, {
        headers,
        withCredentials: !!OpenAPI.WITH_CREDENTIALS,
      });
      const g = resp.data;
      setMakePublicChecked(!!g.is_public);
      setPassword("");
      if (g.password_expires_at) {
        setExpiry("custom");
        setCustomExpiry(dayjs(g.password_expires_at));
      } else {
        setExpiry("never");
        setCustomExpiry(null);
      }
    } catch {
      // ignore failures (may be because user is not owner) — show defaults
      setPassword("");
      setExpiry("never");
      setCustomExpiry(null);
    }
    setMakingPublic(true);
  };

  const onShareClicked = async () => {
    if (isPublic) {
      // already public -> copy link quickly
      await copyShareLink();
      return;
    }
    await openShareModal();
  };

  const confirmMakePublic = async () => {
    setLoading(true);
    try {
      // build payload: password|null, is_public, and optional expiry
      const payload: Record<string, any> = {
        password: password || null,
        is_public: !!makePublicChecked,
      };

      if (expiry === "1h") payload.expires_seconds = 3600;
      else if (expiry === "24h") payload.expires_seconds = 24 * 3600;
      else if (expiry === "7d") payload.expires_seconds = 7 * 24 * 3600;
        else if (expiry === "15d") payload.expires_seconds = 15 * 24 * 3600;
      else if (expiry === "custom" && customExpiry) payload.expires_at = (customExpiry as any).toISOString();

      // Use generated client if available, otherwise axios as fallback
      if (typeof (GalleryService as any).setGalleryPasswordEndpointApiGalleriesGalleryIdPasswordPost === "function") {
        // NOTE: some generated clients expect specific arg shapes; use axios to be safe
        await (GalleryService as any).setGalleryPasswordEndpointApiGalleriesGalleryIdPasswordPost(id, payload);
      } else {
        const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
        const headers: Record<string, string> = {};
        if (OpenAPI.TOKEN) headers["Authorization"] = `Bearer ${OpenAPI.TOKEN}`;
        await axios.post(`${base}/api/galleries/${encodeURIComponent(id)}/password`, payload, {
          headers,
          withCredentials: !!OpenAPI.WITH_CREDENTIALS,
        });
      }

      message.success("Gallery updated");
      setMakingPublic(false);
      copyShareLink();
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

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Expiry</label>
            <Select value={expiry} onChange={(v) => setExpiry(v)} style={{ width: '100%', marginBottom: 8 }}>
              {expiryOptions.map((o) => (
                <Select.Option key={o.value} value={o.value}>
                  {o.label}
                </Select.Option>
              ))}
            </Select>

            {expiry === "custom" && (
              <DatePicker
                showTime
                style={{ width: "100%" }}
                value={customExpiry}
                onChange={(d) => setCustomExpiry(d)}
              />
            )}
            <small style={{ color: '#666' }}>Set when the password (if any) expires.</small>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default GalleryCard;
