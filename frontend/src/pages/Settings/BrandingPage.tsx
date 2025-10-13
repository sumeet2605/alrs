// src/pages/Settings/BrandingPage.tsx
import { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Switch,
  Select,
  Slider,
  Button,
  Upload,
  Row,
  Col,
  App,
} from "antd";
import type { UploadProps } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import { OpenAPI } from "../../api/core/OpenAPI";

const positions = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

function resolveUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

export default function BrandingPage() {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Current logo URL from server
  const [serverLogoUrl, setServerLogoUrl] = useState<string | null>(null);

  // Locally selected (but not yet uploaded) file + preview
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const base = (OpenAPI.BASE ?? "").replace(/\/$/, "");
  const headers: Record<string, string> = {};
  if (OpenAPI.TOKEN) headers.Authorization = `Bearer ${OpenAPI.TOKEN}`;

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${base}/api/brand`, {
        headers,
        withCredentials: !!OpenAPI.WITH_CREDENTIALS,
      });
      form.setFieldsValue(data);
      // Expect backend to return something like { logo_url: "/media/brand/logo.png", ... }
      const resolved = resolveUrl(data?.logo_url);
      setServerLogoUrl(resolved);
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? "Failed to load brand settings");
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (vals: any) => {
    setLoading(true);
    try {
      // 1) Save JSON settings
      await axios.put(`${base}/api/brand`, vals, {
        headers,
        withCredentials: !!OpenAPI.WITH_CREDENTIALS,
      });

      // 2) If a new logo was picked, upload it now
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        await axios.post(`${base}/api/brand/logo`, fd, {
          headers,
          withCredentials: !!OpenAPI.WITH_CREDENTIALS,
        });
      }

      message.success("Brand settings saved");
      // Refresh from server to reflect persisted values & final logo URL
      await fetchSettings();

      // Clear local pending logo selection after successful save
      setLogoFile(null);
      setLogoPreview(null);
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? "Failed to save brand settings");
    } finally {
      setLoading(false);
    }
  };

  // Prevent Upload from auto-posting; store file locally and show a preview
  const uploadProps: UploadProps = {
    // Do NOT auto upload; we’ll send on Save
    beforeUpload: (file) => {
      setLogoFile(file as File);
      // preview
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Prevent upload
      return false;
    },
    showUploadList: false,
    maxCount: 1,
    accept: "image/*",
  };

  const currentPreview = logoPreview ?? serverLogoUrl ?? null;

  return (
    <Card title="Branding & Watermark">
      <Form
        form={form}
        layout="vertical"
        onFinish={save}
        disabled={initialLoading || loading}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Studio name" name="studio_name">
              <Input placeholder="e.g. Alluring Lens Studio" />
            </Form.Item>

            <Form.Item
              label="Watermark enabled"
              name="wm_enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Use logo watermark"
              name="wm_use_logo"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item label="Watermark text" name="wm_text">
              <Input placeholder="Shown when logo watermark is disabled" />
            </Form.Item>

            <Form.Item
              label="Position"
              name="wm_position"
              initialValue="bottom-right"
            >
              <Select
                options={positions.map((p) => ({ value: p, label: p }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Opacity" name="wm_opacity" initialValue={0.25}>
              <Slider min={0} max={1} step={0.05} />
            </Form.Item>

            <Form.Item
              label="Scale (fraction of long edge)"
              name="wm_scale"
              initialValue={0.2}
            >
              <Slider min={0.05} max={0.6} step={0.05} />
            </Form.Item>

            <Form.Item label="Apply to">
              <div style={{ display: "grid", gap: 8 }}>
                <label>
                  <Form.Item
                    name="wm_apply_previews"
                    valuePropName="checked"
                    noStyle
                  >
                    <Switch />
                  </Form.Item>
                  <span style={{ marginLeft: 8 }}>Previews</span>
                </label>

                <label>
                  <Form.Item
                    name="wm_apply_thumbs"
                    valuePropName="checked"
                    noStyle
                  >
                    <Switch />
                  </Form.Item>
                  <span style={{ marginLeft: 8 }}>Thumbnails</span>
                </label>

                <label>
                  <Form.Item
                    name="wm_apply_downloads"
                    valuePropName="checked"
                    noStyle
                  >
                    <Switch />
                  </Form.Item>
                  <span style={{ marginLeft: 8 }}>Download presets</span>
                </label>
              </div>
            </Form.Item>

            <Form.Item label="Logo">
              {currentPreview && (
                <div
                  style={{
                    marginBottom: 8,
                    width: 220,
                    height: 110,
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fafafa",
                  }}
                >
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img
                    src={currentPreview}
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                  />
                </div>
              )}

              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>Choose logo</Button>
              </Upload>
              {logoFile && (
                <div style={{ marginTop: 8, color: "#888" }}>
                  Selected: {logoFile.name}
                </div>
              )}
            </Form.Item>
          </Col>
        </Row>

        <Button type="primary" htmlType="submit" loading={loading}>
          Save
        </Button>
      </Form>
    </Card>
  );
}
