// src/pages/CRM/PackagesPage.tsx
import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Card,
  Table,
  Button,
  App,
  Modal,
  Input,
  Space,
  Select,
  InputNumber,
  Switch,
  Row,
  Col,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";

import { CrmService } from "../../api/services/CrmService";
import type { PackageRead } from "../../api/models/PackageRead";
import type { PackageCreate } from "../../api/models/PackageCreate";
import type { PackageUpdate } from "../../api/models/PackageUpdate";
import type { PackageCategory } from "../../api/models/PackageCategory";

const { Option } = Select;
const { TextArea } = Input;

const packageCategories: PackageCategory[] = [
  "maternity",
  "newborn",
  "combo",
  "baby_milestone",
  "family",
];

const defaultForm: PackageCreate = {
  code: "",
  name: "",
  category: "maternity",
  description: undefined,
  base_price: 0,
  currency: "INR",
  duration_minutes: undefined,
  num_edited_photos: undefined,
  num_outfits: undefined,
  includes_album: false,
  includes_prints: false,
  is_active: true,
  display_order: undefined,
};

export const PackagesPage: React.FC = () => {
  const { message, modal } = App.useApp();

  const [packages, setPackages] = useState<PackageRead[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PackageCategory | undefined>();
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

  const [form, setForm] = useState<PackageCreate | PackageUpdate>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const loadPackages = async () => {
    setLoading(true);
    try {
      // backend supports q, is_active, category
      let isActiveParam: boolean | undefined;
      if (activeFilter === "active") isActiveParam = true;
      if (activeFilter === "inactive") isActiveParam = false;

      const data = await CrmService.listPackagesApiCrmPackagesGet(
        q || undefined,
        isActiveParam,
        categoryFilter
      );
      setPackages(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNewModal = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEditModal = (pkg: PackageRead) => {
    setEditId(pkg.id);
    setForm({
      code: pkg.code,
      name: pkg.name,
      category: pkg.category,
      description: pkg.description ?? undefined,
      base_price: pkg.base_price,
      currency: pkg.currency ?? "INR",
      duration_minutes: pkg.duration_minutes ?? undefined,
      num_edited_photos: pkg.num_edited_photos ?? undefined,
      num_outfits: pkg.num_outfits ?? undefined,
      includes_album: pkg.includes_album ?? false,
      includes_prints: pkg.includes_prints ?? false,
      is_active: pkg.is_active ?? true,
      display_order: pkg.display_order ?? undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.code || !form.name) {
      message.warning("Code and Name are required");
      return;
    }

    if (!form.category) {
      message.warning("Please select a category");
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await CrmService.updatePackageApiCrmPackagesPackageIdPatch(
          editId,
          form as PackageUpdate
        );
        message.success("Package updated");
      } else {
        await CrmService.createPackageApiCrmPackagesPost(
          form as PackageCreate
        );
        message.success("Package created");
      }

      closeModal();
      await loadPackages();
    } catch (err: any) {
      console.error(err);
      const detail = (err as any)?.body?.detail;
      if (typeof detail === "string") {
        message.error(detail);
      } else {
        message.error("Failed to save package");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (pkg: PackageRead) => {
    modal.confirm({
      title: `Delete package "${pkg.name}"?`,
      content:
        "This will permanently remove the package. Existing sessions referencing it may break unless you handle that in backend.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await CrmService.deletePackageApiCrmPackagesPackageIdDelete(pkg.id);
          message.success("Package deleted");
          await loadPackages();
        } catch (err) {
          console.error(err);
          message.error("Failed to delete package");
        }
      },
    });
  };

  const handleToggleActive = async (pkg: PackageRead, checked: boolean) => {
    try {
      await CrmService.updatePackageApiCrmPackagesPackageIdPatch(pkg.id, {
        is_active: checked,
      } as PackageUpdate);
      message.success(
        `Package "${pkg.name}" marked as ${checked ? "active" : "inactive"}`
      );
      // light refresh
      setPackages((prev) =>
        prev.map((p) =>
          p.id === pkg.id ? { ...p, is_active: checked } : p
        )
      );
    } catch (err) {
      console.error(err);
      message.error("Failed to update active status");
    }
  };

  const columns: ColumnsType<PackageRead> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, row) => (
        <Space direction="vertical" size={0}>
          <span>{name}</span>
          <span style={{ fontSize: 11, color: "#888" }}>
            {row.duration_minutes
              ? `${row.duration_minutes} mins`
              : "Duration: -"}
            {" · "}
            {row.num_edited_photos
              ? `${row.num_edited_photos} edited`
              : "Edited: -"}
          </span>
        </Space>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (cat: PackageCategory) => (
        <Tag color="blue" style={{ textTransform: "capitalize" }}>
          {cat.replace("_", " ")}
        </Tag>
      ),
    },
    {
      title: "Price",
      dataIndex: "base_price",
      key: "base_price",
      render: (base_price: number, row) => (
        <span>
          {row.currency || "INR"} {base_price?.toLocaleString?.() ?? base_price}
        </span>
      ),
    },
    {
      title: "Album / Prints",
      key: "extras",
      render: (_, row) => (
        <Space size={4}>
          {row.includes_album && <Tag color="purple">Album</Tag>}
          {row.includes_prints && <Tag color="gold">Prints</Tag>}
          {!row.includes_album && !row.includes_prints && (
            <span style={{ fontSize: 11, color: "#aaa" }}>None</span>
          )}
        </Space>
      ),
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      render: (is_active: boolean, row) => (
        <Switch
          checked={!!is_active}
          size="small"
          onChange={(checked) => handleToggleActive(row, checked)}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, pkg) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openEditModal(pkg)}>
            Edit
          </Button>
          <Button
            size="small"
            type="link"
            danger
            onClick={() => handleDelete(pkg)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <Row justify="space-between" align="middle">
        <Col>
          <h2 className="text-xl font-semibold">Packages</h2>
        </Col>
        <Col>
          <Space>
            <Input
              placeholder="Search by name or code"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              style={{ width: 220 }}
            />
            <Select<PackageCategory | undefined>
              allowClear
              placeholder="Category"
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val as PackageCategory)}
              size="small"
              style={{ width: 160 }}
            >
              {packageCategories.map((c) => (
                <Option key={c} value={c}>
                  {c.replace("_", " ")}
                </Option>
              ))}
            </Select>
            <Select<"all" | "active" | "inactive">
              value={activeFilter}
              onChange={(val) => setActiveFilter(val)}
              size="small"
              style={{ width: 140 }}
            >
              <Option value="all">All</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
            <Button size="small" onClick={loadPackages}>
              Filter
            </Button>
            <Button type="primary" size="small" onClick={openNewModal}>
              New package
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={packages}
          size="small"
        />
      </Card>

      {/* Create / Edit modal */}
      <Modal
        title={editId ? "Edit package" : "Add new package"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
      >
        <form onSubmit={handleSubmit}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Input
                required
                placeholder="Code (e.g. MAT-GOLD)"
                value={form.code || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
              />
            </Col>
            <Col xs={24} md={16}>
              <Input
                required
                placeholder="Package name (e.g. Maternity Gold)"
                value={form.name || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <Select
                placeholder="Category"
                value={form.category || undefined}
                onChange={(val) =>
                  setForm((f) => ({ ...f, category: val as PackageCategory }))
                }
                style={{ width: "100%" }}
              >
                {packageCategories.map((c) => (
                  <Option key={c} value={c}>
                    {c.replace("_", " ")}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={8}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Base price"
                min={0}
                value={
                  typeof form.base_price === "number"
                    ? form.base_price
                    : Number(form.base_price || 0)
                }
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    base_price: (val ?? 0) as any,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <Input
                placeholder="Currency"
                value={form.currency || "INR"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value || "INR" }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Duration (mins)"
                min={0}
                value={form.duration_minutes ?? undefined}
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    duration_minutes: val ?? undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder="# edited photos"
                min={0}
                value={form.num_edited_photos ?? undefined}
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    num_edited_photos: val ?? undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder="# outfits"
                min={0}
                value={form.num_outfits ?? undefined}
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    num_outfits: val ?? undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24}>
              <TextArea
                rows={3}
                placeholder="Description (what's included, album size, etc.)"
                value={form.description || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    description: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <Space>
                <span>Includes album</span>
                <Switch
                  checked={!!form.includes_album}
                  onChange={(checked) =>
                    setForm((f) => ({ ...f, includes_album: checked }))
                  }
                />
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <Space>
                <span>Includes prints</span>
                <Switch
                  checked={!!form.includes_prints}
                  onChange={(checked) =>
                    setForm((f) => ({ ...f, includes_prints: checked }))
                  }
                />
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <Space>
                <span>Active</span>
                <Switch
                  checked={form.is_active !== false}
                  onChange={(checked) =>
                    setForm((f) => ({ ...f, is_active: checked }))
                  }
                />
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Display order"
                min={0}
                value={form.display_order ?? undefined}
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    display_order: val ?? undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} style={{ marginTop: 8 }}>
              <Space>
                <Button onClick={closeModal}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  {editId ? "Save changes" : "Add package"}
                </Button>
              </Space>
            </Col>
          </Row>
        </form>
      </Modal>
    </div>
  );
};

export default PackagesPage;
