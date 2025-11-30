// src/pages/CRM/InvoicesPage.tsx
import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  App,
  Space,
  Select,
  DatePicker,
  InputNumber,
  Modal,
  Tag,
  Input,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { apiUrl } from "../../api/core/OpenAPI";

import { CrmService } from "../../api/services/CrmService";
import type { InvoiceRead } from "../../api/models/InvoiceRead";
import type { InvoiceCreate } from "../../api/models/InvoiceCreate";
import type { InvoiceUpdate } from "../../api/models/InvoiceUpdate";
import type { PaymentRead } from "../../api/models/PaymentRead";
import type { PaymentCreate } from "../../api/models/PaymentCreate";
import type { SessionRead } from "../../api/models/SessionRead";
import type { ClientRead } from "../../api/models/ClientRead";
import type { InvoiceStatus } from "../../api/models/InvoiceStatus";
import type { PaymentStatus } from "../../api/models/PaymentStatus";
import type { PaymentType } from "../../api/models/PaymentType";
import type { PaymentGateway } from "../../api/models/PaymentGateway";

const { Option } = Select;

// Enums as lowercase strings based on your Python models
const invoiceStatuses: InvoiceStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "cancelled",
];

const paymentStatuses: PaymentStatus[] = [
  "pending",
  "success",
  "failed",
  "refunded",
];

const paymentTypes: PaymentType[] = [
  "booking_advance",
  "balance",
  "add_on",
  "other",
];

const paymentGateways: PaymentGateway[] = [
  "razorpay",
  "stripe",
  "cash",
  "upi",
  "bank_transfer",
  "other",
];

type InvoiceFormState = InvoiceCreate & { id?: number };
type PaymentFormState = Omit<PaymentCreate, "invoice_id">;

const defaultInvoiceForm: InvoiceFormState = {
  session_id: 0,
  total_amount: 0 as any,
  currency: "INR",
  status: "draft",
  issued_at: undefined as any,
  due_at: undefined as any,
};

const defaultPaymentForm: PaymentFormState = {
  amount: 0 as any,
  currency: "INR",
  status: "success",
  type: "balance",
  gateway: "upi",
  gateway_ref: "",
  paid_at: undefined as any,
};

export const InvoicesPage: React.FC = () => {
  const { message, modal } = App.useApp();

  const [invoices, setInvoices] = useState<InvoiceRead[]>([]);
  const [sessions, setSessions] = useState<SessionRead[]>([]);
  const [clients, setClients] = useState<ClientRead[]>([]);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>();

  // modal + form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(defaultInvoiceForm);

  // payments for current invoice
  const [payments, setPayments] = useState<PaymentRead[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(
    defaultPaymentForm
  );
  const [addingPayment, setAddingPayment] = useState(false);

  const prettyEnum = (val: string | null | undefined) =>
    val ? val.replace(/_/g, " ") : "";

  const loadData = async () => {
    setLoading(true);
    try {
      // adjust args of listInvoicesApiCrmInvoicesGet if your client signature differs
      const [invs, sess, cls] = await Promise.all([
        CrmService.listInvoicesApiCrmInvoicesGet(statusFilter),
        CrmService.listSessionsApiCrmSessionsGet(),
        CrmService.listClientsApiCrmClientsGet(undefined, 200),
      ]);
      setInvoices(invs);
      setSessions(sess);
      setClients(cls);
    } catch (err) {
      console.error(err);
      message.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadInvoicesOnly = async () => {
    try {
      const invs = await CrmService.listInvoicesApiCrmInvoicesGet(statusFilter);
      setInvoices(invs);
    } catch (err) {
      console.error(err);
      message.error("Failed to refresh invoices");
    }
  };

  const getSessionLabel = (session_id: number) => {
    const s = sessions.find((ss) => ss.id === session_id);
    if (!s) return `Session #${session_id}`;
    const c = clients.find((cl) => cl.id === s.client_id);
    const when = s.scheduled_start
      ? dayjs(s.scheduled_start).format("DD MMM")
      : "No date";
    if (c) {
      return `#${s.id} · ${c.full_name} (${when})`;
    }
    return `#${s.id} (${when})`;
  };

  const getClientForInvoice = (inv: InvoiceRead) => {
    const s = sessions.find((ss) => ss.id === inv.session_id);
    if (!s) return undefined;
    return clients.find((cl) => cl.id === s.client_id);
  };

  const openNewInvoiceModal = () => {
    setEditId(null);
    setForm(defaultInvoiceForm);
    setPayments([]);
    setPaymentForm(defaultPaymentForm);
    setModalOpen(true);
  };

  const loadPaymentsForInvoice = async (invoiceId: number) => {
    try {
      const pays =
        await CrmService.listPaymentsForInvoiceApiCrmInvoicesInvoiceIdPaymentsGet(
          invoiceId
        );
      setPayments(pays);
    } catch (err) {
      console.error(err);
      message.error("Failed to load payments");
    }
  };

  const openEditInvoiceModal = async (inv: InvoiceRead) => {
    setEditId(inv.id);
    setForm({
      id: inv.id,
      session_id: inv.session_id,
      total_amount: inv.total_amount as any,
      currency: inv.currency || "INR",
      status: inv.status,
      issued_at: inv.issued_at as any,
      due_at: inv.due_at as any,
    });
    setPaymentForm(defaultPaymentForm);
    setModalOpen(true);
    await loadPaymentsForInvoice(inv.id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setPayments([]);
    setPaymentForm(defaultPaymentForm);
  };

  const handleInvoiceSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.session_id || !form.total_amount) {
      message.warning("Session and total amount are required");
      return;
    }

    try {
      if (editId) {
        const payload: InvoiceUpdate = {
          total_amount: form.total_amount,
          currency: form.currency,
          status: form.status,
          issued_at: form.issued_at as any,
          due_at: form.due_at as any,
        };
        await CrmService.updateInvoiceApiCrmInvoicesInvoiceIdPatch(
          editId,
          payload
        );
        message.success("Invoice updated");
      } else {
        // creating via /sessions/{session_id}/invoice
        const payload: InvoiceCreate = {
          session_id: form.session_id,
          total_amount: form.total_amount,
          currency: form.currency,
          status: form.status,
          issued_at: form.issued_at as any,
          due_at: form.due_at as any,
        };
        await CrmService.createInvoiceForSessionApiCrmSessionsSessionIdInvoicePost(
          form.session_id,
          payload
        );
        message.success("Invoice created");
      }

      closeModal();
      await loadData();
    } catch (err) {
      console.error(err);
      message.error("Failed to save invoice");
    }
  };

  const handleDeleteInvoice = (inv: InvoiceRead) => {
    modal.confirm({
      title: "Delete invoice?",
      content:
        "This will remove the invoice and might affect payment & accounting records.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await CrmService.deleteInvoiceApiCrmInvoicesInvoiceIdDelete(inv.id);
          message.success("Invoice deleted");
          await loadData();
        } catch (err) {
          console.error(err);
          message.error("Failed to delete invoice");
        }
      },
    });
  };

  // Payments handling
  const totalPaid = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + Number(p.amount as any), 0);

  const invoiceTotal = form.total_amount ? Number(form.total_amount as any) : 0;
  const balance = Math.max(invoiceTotal - totalPaid, 0);

  const handleAddPayment = async () => {
    if (!editId) {
      message.warning("You can add payments only after invoice is created");
      return;
    }
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      message.warning("Amount must be greater than 0");
      return;
    }

    setAddingPayment(true);
    try {
      const payload: PaymentCreate = {
        invoice_id: editId,
        amount: paymentForm.amount,
        currency: paymentForm.currency,
        status: paymentForm.status,
        type: paymentForm.type,
        gateway: paymentForm.gateway,
        gateway_ref: paymentForm.gateway_ref || undefined,
        paid_at: paymentForm.paid_at as any,
      };

      await CrmService.addPaymentApiCrmInvoicesInvoiceIdPaymentsPost(
        editId,
        payload
      );
      message.success("Payment added");

      setPaymentForm(defaultPaymentForm);
      await loadPaymentsForInvoice(editId);
      await reloadInvoicesOnly();
    } catch (err) {
      console.error(err);
      message.error("Failed to add payment");
    } finally {
      setAddingPayment(false);
    }
  };

  const paymentColumns: ColumnsType<PaymentRead> = [
    {
      title: "Date",
      dataIndex: "paid_at",
      key: "paid_at",
      render: (val: string | null) =>
        val ? dayjs(val).format("DD MMM YYYY, HH:mm") : "-",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amt: any, p) =>
        `₹${Number(amt ?? 0).toLocaleString()} ${p.currency || ""}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: PaymentStatus) => {
        let color: string = "default";
        if (status === "success") color = "green";
        else if (status === "pending") color = "gold";
        else if (status === "failed") color = "red";
        else if (status === "refunded") color = "blue";
        return (
          <Tag color={color} style={{ textTransform: "capitalize" }}>
            {prettyEnum(status)}
          </Tag>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (t: PaymentType) => (
        <span style={{ textTransform: "capitalize" }}>{prettyEnum(t)}</span>
      ),
    },
    {
      title: "Gateway",
      dataIndex: "gateway",
      key: "gateway",
      render: (g: PaymentGateway) => prettyEnum(g),
    },
    {
      title: "Ref",
      dataIndex: "gateway_ref",
      key: "gateway_ref",
      render: (ref: string | null) => ref || "-",
    },
  ];

  const invoiceColumns: ColumnsType<InvoiceRead> = [
    {
      title: "Invoice #",
      dataIndex: "invoice_number",
      key: "invoice_number",
    },
    {
      title: "Client / Session",
      key: "client_session",
      render: (_, inv) => {
        const client = getClientForInvoice(inv);
        return (
          <Space direction="vertical" size={0}>
            <span>{client ? client.full_name : "Unknown client"}</span>
            <span style={{ fontSize: 11, color: "#888" }}>
              {getSessionLabel(inv.session_id)}
            </span>
          </Space>
        );
      },
    },
    {
      title: "Amount",
      key: "amount",
      render: (_, inv) =>
        `₹${Number(inv.total_amount as any).toLocaleString()} ${
          inv.currency || ""
        }`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (st: InvoiceStatus) => {
        let color: string = "default";
        if (st === "draft") color = "default";
        else if (st === "sent") color = "gold";
        else if (st === "partially_paid") color = "blue";
        else if (st === "paid") color = "green";
        else if (st === "cancelled") color = "red";
        return (
          <Tag color={color} style={{ textTransform: "capitalize" }}>
            {prettyEnum(st)}
          </Tag>
        );
      },
    },
    {
      title: "Issued / Due",
      key: "dates",
      render: (_, inv) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontSize: 11 }}>
            Issued:{" "}
            {inv.issued_at
              ? dayjs(inv.issued_at).format("DD MMM YYYY")
              : "-"}
          </span>
          <span style={{ fontSize: 11 }}>
            Due: {inv.due_at ? dayjs(inv.due_at).format("DD MMM YYYY") : "-"}
          </span>
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, inv) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openEditInvoiceModal(inv)}>
            Edit
              </Button>
               <a
        href={`${apiUrl}/api/crm/invoices/${inv.id}/pdf`}
        target="_blank"
        rel="noreferrer"
      >
        <Button size="small" type="link">
          PDF
        </Button>
      </a>
          <Button
            size="small"
            type="link"
            danger
            onClick={() => handleDeleteInvoice(inv)}
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
          <h2 className="text-xl font-semibold">Invoices</h2>
        </Col>
        <Col>
          <Space>
            <Select<InvoiceStatus | undefined>
              allowClear
              size="small"
              placeholder="Filter by status"
              style={{ width: 180 }}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as InvoiceStatus)}
            >
              {invoiceStatuses.map((st) => (
                <Option key={st} value={st}>
                  {prettyEnum(st)}
                </Option>
              ))}
            </Select>
            <Button size="small" onClick={loadData}>
              Apply
            </Button>
            <Button type="primary" size="small" onClick={openNewInvoiceModal}>
              New invoice
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={invoiceColumns}
          dataSource={invoices}
          size="small"
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editId ? "Edit invoice" : "Add new invoice"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
      >
        <form onSubmit={handleInvoiceSubmit}>
          <Row gutter={[12, 12]}>
            {/* Session */}
            <Col xs={24}>
            <Select
                showSearch
                placeholder="Session"
                value={form.session_id || undefined}
                onChange={(val) => {
                const sessionId = val as number;
                const s = sessions.find((ss) => ss.id === sessionId);

                // Prefer final_price, then total_price, else keep whatever is already in the form
                const autoAmount =
                    (s?.final_price as any) ??
                    (s?.total_price as any) ??
                    form.total_amount;

                setForm((f) => ({
                    ...f,
                    session_id: sessionId,
                    total_amount: autoAmount,
                }));
                }}
                style={{ width: "100%" }}
                optionFilterProp="children"
            >
                {sessions.map((s) => {
                const c = clients.find((cl) => cl.id === s.client_id);
                return (
                    <Option key={s.id} value={s.id}>
                    #{s.id} · {c ? c.full_name : "Unknown"} ·{" "}
                    {s.scheduled_start
                        ? dayjs(s.scheduled_start).format("DD MMM, HH:mm")
                        : "No date"}
                    </Option>
                );
                })}
                </Select>
            </Col>
            {/* Amount + status */}
            <Col xs={24} md={12}>
              <InputNumber
                placeholder="Total amount"
                style={{ width: "100%" }}
                value={
                  typeof form.total_amount === "number"
                    ? form.total_amount
                    : form.total_amount
                    ? Number(form.total_amount as any)
                    : undefined
                }
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    total_amount: (val ?? undefined) as any,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={12}>
              <Select
                placeholder="Status"
                value={form.status || "draft"}
                onChange={(val) =>
                  setForm((f) => ({ ...f, status: val as InvoiceStatus }))
                }
                style={{ width: "100%" }}
              >
                {invoiceStatuses.map((st) => (
                  <Option key={st} value={st}>
                    {prettyEnum(st)}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* Dates */}
            <Col xs={24} md={12}>
              <DatePicker
                style={{ width: "100%" }}
                placeholder="Issued at"
                value={
                  form.issued_at
                    ? dayjs(form.issued_at as string)
                    : undefined
                }
                onChange={(val: Dayjs | null) =>
                  setForm((f) => ({
                    ...f,
                    issued_at: val ? (val.toISOString() as any) : undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={12}>
              <DatePicker
                style={{ width: "100%" }}
                placeholder="Due date"
                value={
                  form.due_at ? dayjs(form.due_at as string) : undefined
                }
                onChange={(val: Dayjs | null) =>
                  setForm((f) => ({
                    ...f,
                    due_at: val ? (val.toISOString() as any) : undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24}>
              <Space>
                <Button onClick={closeModal}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  {editId ? "Save changes" : "Create invoice"}
                </Button>
              </Space>
            </Col>
          </Row>
        </form>

        {/* Payments block (only when editing existing invoice) */}
        {editId && (
          <Card
            size="small"
            title="Payments"
            style={{ marginTop: 16 }}
            extra={
              <span style={{ fontSize: 12 }}>
                Total: ₹{invoiceTotal.toLocaleString()} · Paid: ₹
                {totalPaid.toLocaleString()} · Balance: ₹
                {balance.toLocaleString()}
              </span>
            }
          >
            {/* Payments table */}
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              columns={paymentColumns}
              dataSource={payments}
            />

            {/* Add payment form */}
            <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
              <Row gutter={[8, 8]} align="middle">
                <Col xs={24} md={6}>
                  <InputNumber
                    placeholder="Amount"
                    style={{ width: "100%" }}
                    value={
                      typeof paymentForm.amount === "number"
                        ? paymentForm.amount
                        : paymentForm.amount
                        ? Number(paymentForm.amount as any)
                        : undefined
                    }
                    onChange={(val) =>
                      setPaymentForm((f) => ({
                        ...f,
                        amount: (val ?? undefined) as any,
                      }))
                    }
                  />
                </Col>

                <Col xs={24} md={6}>
                  <Select
                    placeholder="Status"
                    value={paymentForm.status}
                    onChange={(val) =>
                      setPaymentForm((f) => ({
                        ...f,
                        status: val as PaymentStatus,
                      }))
                    }
                    style={{ width: "100%" }}
                  >
                    {paymentStatuses.map((st) => (
                      <Option key={st} value={st}>
                        {prettyEnum(st)}
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} md={6}>
                  <Select
                    placeholder="Type"
                    value={paymentForm.type}
                    onChange={(val) =>
                      setPaymentForm((f) => ({
                        ...f,
                        type: val as PaymentType,
                      }))
                    }
                    style={{ width: "100%" }}
                  >
                    {paymentTypes.map((t) => (
                      <Option key={t} value={t}>
                        {prettyEnum(t)}
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} md={6}>
                  <Select
                    placeholder="Gateway"
                    value={paymentForm.gateway}
                    onChange={(val) =>
                      setPaymentForm((f) => ({
                        ...f,
                        gateway: val as PaymentGateway,
                      }))
                    }
                    style={{ width: "100%" }}
                  >
                    {paymentGateways.map((g) => (
                      <Option key={g} value={g}>
                        {prettyEnum(g)}
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} md={8}>
                  <Input
                    placeholder="Reference (txn id / order id)"
                    value={paymentForm.gateway_ref || ""}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        gateway_ref: e.target.value || "",
                      }))
                    }
                  />
                </Col>

                <Col xs={24} md={8}>
                  <DatePicker
                    showTime
                    placeholder="Paid at"
                    style={{ width: "100%" }}
                    value={
                      paymentForm.paid_at
                        ? dayjs(paymentForm.paid_at as string)
                        : undefined
                    }
                    onChange={(val) =>
                      setPaymentForm((f) => ({
                        ...f,
                        paid_at: val ? (val.toISOString() as any) : undefined,
                      }))
                    }
                  />
                </Col>

                <Col xs={24} md={8}>
                  <Button
                    type="primary"
                    block
                    loading={addingPayment}
                    onClick={handleAddPayment}
                  >
                    Add payment
                  </Button>
                </Col>
              </Row>
            </div>
          </Card>
        )}
      </Modal>
    </div>
  );
};

export default InvoicesPage;
