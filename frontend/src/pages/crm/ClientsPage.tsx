// src/pages/CRM/ClientsPage.tsx

import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Card,
  Input,
  Button,
  Table,
  Space,
  App,
  Row,
  Col,
  Modal
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CrmService } from "../../api/services/CrmService";
import type { ClientRead } from "../../api/models/ClientRead";
import type { ClientCreate } from "../../api/models/ClientCreate";
import type { ClientUpdate } from "../../api/models/ClientUpdate";



const defaultForm: ClientCreate = {
  full_name: "",
  phone: "",
  email: undefined,
  city: undefined,
  area: undefined,
  relation: undefined,
};

export const ClientsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [clients, setClients] = useState<ClientRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<ClientCreate | ClientUpdate>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await CrmService.listClientsApiCrmClientsGet(q || undefined);
      setClients(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openNewModal = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEditModal = (record: ClientRead) => {
    setEditId(record.id);
    setForm({
      full_name: record.full_name,
      phone: record.phone,
      email: record.email ?? undefined,
      city: record.city ?? undefined,
      area: record.area ?? undefined,
      relation: record.relation ?? undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editId) {
        await CrmService.updateClientApiCrmClientsClientIdPatch(editId, form);
        message.success("Client updated");
      } else {
        await CrmService.createClientApiCrmClientsPost(form);
        message.success("Client created");
      }

      closeModal();
      setForm(defaultForm);
      await loadClients();
    } catch (err) {
      console.error(err);
      message.error("Failed to save client");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Delete this client?",
      content:
        "This client may be linked to leads/sessions. Make sure you really want to remove them.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await CrmService.deleteClientApiCrmClientsClientIdDelete(id);
          message.success("Client deleted");
          await loadClients();
        } catch (err) {
          console.error(err);
          message.error("Failed to delete client");
        }
      },
    });
  };

  const columns: ColumnsType<ClientRead> = [
    { title: "Name", dataIndex: "full_name", key: "full_name" },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "City / Area",
      key: "city",
      render: (_, c) => (
        <>
          {c.city || "-"}
          {c.area ? ` (${c.area})` : ""}
        </>
      ),
    },
    { title: "Relation", dataIndex: "relation", key: "relation" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(record);
            }}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
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
          <h2 className="text-xl font-semibold">Clients</h2>
        </Col>
        <Col>
          <Space>
            <Input
              placeholder="Search by name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              style={{ width: 220 }}
            />
            <Button size="small" onClick={loadClients}>
              Search
            </Button>

            <Button type="primary" size="small" onClick={openNewModal}>
              New client
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={clients}
          size="small"
          onRow={(record) => ({
            onClick: () => openEditModal(record),
          })}
          style={{ cursor: "pointer" }}
        />
      </Card>

      <Modal
        title={editId ? "Edit client" : "Add new client"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
      >
        <form onSubmit={handleSubmit}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Input
                required
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <Input
                required
                placeholder="Phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <Input
                placeholder="Email"
                value={form.email || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value || undefined }))
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <Input
                placeholder="City"
                value={form.city || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value || undefined }))
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <Input
                placeholder="Area"
                value={form.area || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, area: e.target.value || undefined }))
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <Input
                placeholder="Relation (e.g. Mother)"
                value={form.relation || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    relation: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} style={{ marginTop: 8 }}>
              <Space>
                <Button onClick={closeModal}>Cancel</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                >
                  {editId ? "Save changes" : "Add client"}
                </Button>
              </Space>
            </Col>
          </Row>
        </form>
      </Modal>
    </div>
  );
};

export default ClientsPage;
