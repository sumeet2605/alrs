// src/pages/CRM/AddOnsPage.tsx
import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Card,
  Table,
  Button,
  App,
  Space,
  Modal,
  Input,
  InputNumber,
  Select,
  Tag,
  Row,
  Col,
} from "antd";
import type { ColumnsType } from "antd/es/table";

import { CrmService } from "../../api/services/CrmService";
import type { AddOnRead } from "../../api/models/AddOnRead";
import type { AddOnCreate } from "../../api/models/AddOnCreate";
import type { AddOnUpdate } from "../../api/models/AddOnUpdate";
import type { AddOnCategory } from "../../api/models/AddOnCategory";

const { Option } = Select;

const addOnCategories: AddOnCategory[] = [
  "print",
  "frame",
  "extra_photos",
  "album_upgrade",
  "video",
  "other",
];

const defaultForm: AddOnCreate = {
  code: "",
  name: "",
  description: "",
  price: 0,
  category: "extra_photos",
  is_active: true,
};

const pretty = (v?: string | null) =>
  v ? v.replace(/_/g, " ") : "";

export const AddOnsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [addOns, setAddOns] = useState<AddOnRead[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AddOnCreate | AddOnUpdate>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const [showInactive, setShowInactive] = useState(false);

  const loadAddOns = async () => {
    setLoading(true);
    try {
      // adjust parameter if your API signature differs
      const data = await CrmService.listAddOnsApiCrmAddOnsGet(
        showInactive ? undefined : true
      );
      setAddOns(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load add-ons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddOns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const openNewModal = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEditModal = (record: AddOnRead) => {
    setEditId(record.id);
    setForm({
      code: record.code,
      name: record.name,
      description: record.description || "",
      price: record.price as any,
      category: record.category,
      is_active: record.is_active,
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
      message.warning("Code and name are required");
      return;
    }

    if (typeof form.price !== "number" || form.price <= 0) {
      message.warning("Price must be a positive number");
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await CrmService.updateAddOnApiCrmAddOnsAddOnIdPatch(
          editId,
          form as AddOnUpdate
        );
        message.success("Add-on updated");
      } else {
        await CrmService.createAddOnApiCrmAddOnsPost(form as AddOnCreate);
        message.success("Add-on created");
      }

      closeModal();
      await loadAddOns();
    } catch (err: any) {
      console.error(err);
      message.error(
        err?.detail || "Failed to save add-on"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (record: AddOnRead, active: boolean) => {
    try {
      await CrmService.updateAddOnApiCrmAddOnsAddOnIdPatch(record.id, {
        is_active: active,
      } as AddOnUpdate);
      setAddOns((prev) =>
        prev.map((a) =>
          a.id === record.id ? { ...a, is_active: active } : a
        )
      );
    } catch (err) {
      console.error(err);
      message.error("Failed to update status");
    }
  };

  const handleDelete = (record: AddOnRead) => {
    modal.confirm({
      title: "Delete this add-on?",
      content: `This will remove "${record.name}". Existing session add-ons may be affected.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await CrmService.deleteAddOnApiCrmAddOnsAddOnIdDelete(record.id);
          message.success("Add-on deleted");
          await loadAddOns();
        } catch (err) {
          console.error(err);
          message.error("Failed to delete add-on");
        }
      },
    });
  };

  const columns: ColumnsType<AddOnRead> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 120,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <span>{name}</span>
          {record.description && (
            <span style={{ fontSize: 11, color: "#888" }}>
              {record.description}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 140,
      render: (cat: AddOnCategory) => (
        <Tag>
          {pretty(cat)}
        </Tag>
      ),
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 120,
      render: (p: any) => `₹${Number(p).toLocaleString()}`,
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      render: (active: boolean, record) => (
        <Button
          size="small"
          type={active ? "primary" : "default"}
          onClick={() => handleToggleActive(record, !active)}
        >
          {active ? "Active" : "Inactive"}
        </Button>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Button
            size="small"
            type="link"
            danger
            onClick={() => handleDelete(record)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Row justify="space-between" align="middle">
        <Col>
          <h2 className="text-xl font-semibold">Add-ons</h2>
        </Col>
        <Col>
          <Space>
            <Button
              size="small"
              onClick={() => setShowInactive((prev) => !prev)}
            >
              {showInactive ? "Hide inactive" : "Show inactive"}
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={openNewModal}
            >
              New add-on
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={addOns}
          size="small"
        />
      </Card>

      <Modal
        title={editId ? "Edit add-on" : "Create add-on"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
      >
        <form onSubmit={handleSubmit}>
          <Space
            direction="vertical"
            style={{ width: "100%" }}
            size="middle"
          >
            <Input
              required
              placeholder="Code (e.g. EXTRA10)"
              value={form.code || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value }))
              }
            />
            <Input
              required
              placeholder="Name (e.g. Extra 10 edited photos)"
              value={form.name || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <Input.TextArea
              rows={3}
              placeholder="Description"
              value={form.description || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  description: e.target.value || "",
                }))
              }
            />
            <InputNumber
              required
              placeholder="Price"
              style={{ width: "100%" }}
              value={
                typeof form.price === "number"
                  ? form.price
                  : form.price
                  ? Number(form.price as any)
                  : undefined
              }
              onChange={(val) =>
                setForm((f) => ({
                  ...f,
                  price: (val ?? 0) as any,
                }))
              }
            />
            <Select
              placeholder="Category"
              style={{ width: "100%" }}
              value={form.category || undefined}
              onChange={(val) =>
                setForm((f) => ({
                  ...f,
                  category: val as AddOnCategory,
                }))
              }
            >
              {addOnCategories.map((cat) => (
                <Option key={cat} value={cat}>
                  {pretty(cat)}
                </Option>
              ))}
            </Select>
            <Select
              style={{ width: "100%" }}
              value={form.is_active ?? true}
              onChange={(val) =>
                setForm((f) => ({
                  ...f,
                  is_active: val as boolean,
                }))
              }
            >
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              <Button onClick={closeModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
              >
                {editId ? "Save changes" : "Create add-on"}
              </Button>
            </Space>
          </Space>
        </form>
      </Modal>
    </div>
  );
};

export default AddOnsPage;
