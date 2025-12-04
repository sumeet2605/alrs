// src/pages/CRM/SessionsPage.tsx
import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Card,
  Row,
  Col,
  Select,
  InputNumber,
  DatePicker,
  Table,
  Button,
  App,
  Space,
  Modal,
  Input,
  Tag,
  Calendar,
  Badge,
  Segmented,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

import { CrmService } from "../../api/services/CrmService";
import type { SessionRead } from "../../api/models/SessionRead";
import type { SessionCreate } from "../../api/models/SessionCreate";
import type { SessionUpdate } from "../../api/models/SessionUpdate";
import type { ClientRead } from "../../api/models/ClientRead";
import type { LeadRead } from "../../api/models/LeadRead";
import type { PackageRead } from "../../api/models/PackageRead";
import type { SessionType } from "../../api/models/SessionType";
import type { SessionStatus } from "../../api/models/SessionStatus";
import type { LocationType } from "../../api/models/LocationType";
import type { LeadType } from "../../api/models/LeadType";
import type { PackageCategory } from "../../api/models/PackageCategory";
import type { AddOnRead } from "../../api/models/AddOnRead";
import type { SessionAddOnUpsert } from "../../api/models/SessionAddOnUpsert";
import { SessionGalleryManager } from "../../components/SessionGalleryManager";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// session enums are lowercase strings in your Python model
const sessionTypes: SessionType[] = [
  "maternity",
  "newborn",
  "combo",
  "baby_milestone",
  "family",
];

const locationTypes: LocationType[] = ["home", "studio", "outdoor", "undecided"];

const sessionStatuses: SessionStatus[] = [
  "tentative",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
];

const defaultSession: SessionCreate = {
  lead_id: 0,
  client_id: 0,
  package_id: 0,
  session_type: "maternity",
  status: "tentative",
  location_type: "studio",
};

// Map lead_type → default session_type
const mapLeadTypeToSessionType = (
  leadType?: LeadType | null
): SessionType | undefined => {
  if (!leadType) return undefined;
  switch (leadType) {
    case "maternity":
      return "maternity";
    case "newborn":
      return "newborn";
    case "maternity_newborn_combo":
      return "combo";
    case "baby_milestone":
      return "baby_milestone";
    case "family":
      return "family";
    default:
      return undefined;
  }
};

// Local TS type for session add-ons
interface SessionAddOnItem {
  add_on_id: number;
  quantity: number;
  price_per_unit: number;
  total_price: number;
}

export const SessionsPage: React.FC = () => {
  const { message, modal } = App.useApp();

  const [sessions, setSessions] = useState<SessionRead[]>([]);
  const [clients, setClients] = useState<ClientRead[]>([]);
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [packages, setPackages] = useState<PackageRead[]>([]);
  const [addOns, setAddOns] = useState<AddOnRead[]>([]);

  const [loading, setLoading] = useState(false);

  // form state
  const [form, setForm] = useState<SessionCreate | SessionUpdate>(defaultSession);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // add-ons per session
  const [sessionAddOns, setSessionAddOns] = useState<SessionAddOnItem[]>([]);
  const [newAddOnId, setNewAddOnId] = useState<number | undefined>(undefined);
  const [newAddOnQty, setNewAddOnQty] = useState<number>(1);
  const [finalPriceTouched, setFinalPriceTouched] = useState(false);

  // filters (for API)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(
    null
  );
  const [typeFilter, setTypeFilter] = useState<SessionType | undefined>();
  const [statusFilter, setStatusFilter] = useState<SessionStatus | undefined>();

  // calendar view (for visual overview)
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs());

  const prettyEnum = (val: string | null | undefined) =>
    val ? val.replace(/_/g, " ") : "";

  const addOnsTotal = sessionAddOns.reduce(
    (sum, item) => sum + (item.total_price || 0),
    0
  );

  const resolveAddOnName = (id: number) => {
    const a = addOns.find((x) => x.id === id);
    return a ? a.name : `Add-on #${id}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sess, cls, lds, pkgs, aos] = await Promise.all([
        CrmService.listSessionsApiCrmSessionsGet(
          100,
          0
        ),
        CrmService.listClientsApiCrmClientsGet(undefined, 200),
        CrmService.listLeadsApiCrmLeadsGet(),
        CrmService.listPackagesApiCrmPackagesGet(),
        CrmService.listAddOnsApiCrmAddOnsGet(), // new
      ]);
      setSessions(sess);
      setClients(cls);
      setLeads(lds);
      setPackages(pkgs);
      setAddOns(aos);
    } catch (err) {
      console.error(err);
      message.error("Failed to load sessions data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-suggest final_price = total_price + addOnsTotal unless user manually edits
  useEffect(() => {
    if (finalPriceTouched) return;

    const base =
      form.total_price != null ? Number(form.total_price as any) : 0;
    const suggested = base + addOnsTotal;

    setForm((f) => ({
      ...f,
      final_price: (suggested || undefined) as any,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.total_price, addOnsTotal, finalPriceTouched]);

  const openNewSessionModal = () => {
    setEditId(null);
    setForm(defaultSession);
    setSessionAddOns([]);
    setNewAddOnId(undefined);
    setNewAddOnQty(1);
    setFinalPriceTouched(false);
    setModalOpen(true);
  };

  const openEditSessionModal = async (s: SessionRead) => {
    setEditId(s.id);
    setForm({
      lead_id: s.lead_id,
      client_id: s.client_id,
      package_id: s.package_id,
      session_type: s.session_type,
      status: s.status,
      location_type: s.location_type,
      location_address: s.location_address ?? undefined,
      scheduled_start: s.scheduled_start ?? undefined,
      scheduled_end: s.scheduled_end ?? undefined,
      total_price: s.total_price ?? undefined,
      discount_amount: s.discount_amount ?? undefined,
      final_price: s.final_price ?? undefined,
      notes_photographer: s.notes_photographer ?? undefined,
      notes_client_visible: s.notes_client_visible ?? undefined,
    });

    setFinalPriceTouched(false);
    setNewAddOnId(undefined);
    setNewAddOnQty(1);

    try {
      const items =
        await CrmService.getSessionAddOnsApiCrmSessionsSessionIdAddOnsGet(s.id);
      const mapped: SessionAddOnItem[] = items.map((it: any) => ({
        add_on_id: it.add_on_id,
        quantity: it.quantity,
        price_per_unit: Number(it.price_per_unit as any),
        total_price: Number(it.total_price as any),
      }));
      setSessionAddOns(mapped);
    } catch (err) {
      console.error(err);
      setSessionAddOns([]);
    }

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
      let sessionId: number;

      if (editId) {
        const updated =
          await CrmService.updateSessionApiCrmSessionsSessionIdPatch(
            editId,
            form as SessionUpdate
          );
        sessionId = updated.id;
        message.success("Session updated");
      } else {
        const created =
          await CrmService.createSessionApiCrmSessionsPost(
            form as SessionCreate
          );
        sessionId = created.id;
        message.success("Session created");
      }

      // Upsert session add-ons
      const payload: SessionAddOnUpsert = {
        items: sessionAddOns.map((item) => ({
          add_on_id: item.add_on_id,
          quantity: item.quantity,
        })),
      };
      await CrmService.setSessionAddOnsApiCrmSessionsSessionIdAddOnsPut(
        sessionId,
        payload
      );

      closeModal();
      setForm((prev) => ({
        ...defaultSession,
        client_id: "client_id" in prev ? prev.client_id || 0 : 0,
        lead_id: "lead_id" in prev ? prev.lead_id || 0 : 0,
      }));
      setSessionAddOns([]);
      setNewAddOnId(undefined);
      setNewAddOnQty(1);
      setFinalPriceTouched(false);
      await loadData();
    } catch (err) {
      console.error(err);
      message.error("Failed to save session");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (_s: SessionRead) => {
    modal.confirm({
      title: "Delete this session?",
      content:
        "This will remove the session booking. Make sure any invoices or galleries are handled.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
          message.error("Session deletion not implemented yet");
      },
    });
  };

  const getClientLabel = (client_id: number) => {
    const c = clients.find((cl) => cl.id === client_id);
    return c ? `${c.full_name} (${c.phone})` : client_id;
  };

  const getPackageLabel = (package_id: number) => {
    const p = packages.find((pkg) => pkg.id === package_id);
    if (!p) return package_id;
    return `${p.name} – ₹${Number(p.base_price).toLocaleString()}`;
  };

  // Filter packages by current session type so dropdown stays relevant
  const filteredPackages: PackageRead[] =
    "session_type" in form && form.session_type
      ? packages.filter(
          (p) => p.category === (form.session_type as PackageCategory)
        )
      : packages;

  // 🔁 When lead is selected → auto-suggest session_type + package
  const handleLeadChange = (val: number) => {
    const leadId = val as number;
    const selectedLead = leads.find((l) => l.id === leadId);

    let suggestedSessionType: SessionType | undefined =
      mapLeadTypeToSessionType(selectedLead?.lead_type as LeadType | undefined);

    // If we got a session type, try auto pick a matching package
    let suggestedPackageId: number | undefined = form.package_id;
    if (suggestedSessionType) {
      const matchedPkg = packages.find(
        (p) => p.category === (suggestedSessionType as PackageCategory)
      );
      if (matchedPkg) {
        suggestedPackageId = matchedPkg.id;
      }
    }

    setForm((f) => ({
      ...f,
      lead_id: leadId,
      session_type: suggestedSessionType || (f as any).session_type,
      package_id: suggestedPackageId || (f as any).package_id,
    }));
  };

  // If user manually changes session_type, we can also auto-suggest package
  const handleSessionTypeChange = (val: SessionType) => {
    const newType = val;
    const matchedPkg = packages.find(
      (p) => p.category === (newType as PackageCategory)
    );

    setForm((f) => ({
      ...f,
      session_type: newType,
      package_id: matchedPkg ? matchedPkg.id : f.package_id,
    }));
  };

  // 📅 Calendar helpers
  const dateCellRender = (date: Dayjs) => {
    const daySessions = sessions.filter(
      (s) =>
        s.scheduled_start &&
        dayjs(s.scheduled_start).isSame(date, "day")
    );
    if (!daySessions.length) return null;

    return (
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {daySessions.slice(0, 3).map((s) => (
          <li key={s.id}>
            <Badge
              status="processing"
              text={`${dayjs(s.scheduled_start).format("HH:mm")} · ${prettyEnum(
                s.session_type
              )}`}
            />
          </li>
        ))}
        {daySessions.length > 3 && (
          <li>
            <span style={{ fontSize: 11, color: "#888" }}>
              +{daySessions.length - 3} more
            </span>
          </li>
        )}
      </ul>
    );
  };

  const columns: ColumnsType<SessionRead> = [
    {
      title: "Client",
      dataIndex: "client_id",
      key: "client",
      render: (client_id: number) => getClientLabel(client_id),
    },
    {
      title: "Session",
      key: "session",
      render: (_, s) => (
        <Space direction="vertical" size={0}>
          <span style={{ textTransform: "capitalize" }}>
            {prettyEnum(s.session_type)}
          </span>
          <span style={{ fontSize: 11, color: "#888" }}>
            Package: {getPackageLabel(s.package_id)}
          </span>
        </Space>
      ),
    },
    {
      title: "When",
      key: "time",
      render: (_, s) =>
        s.scheduled_start
          ? dayjs(s.scheduled_start).format("DD MMM YYYY, HH:mm")
          : "-",
    },
    {
      title: "Location",
      key: "location",
      render: (_, s) => (
        <Space direction="vertical" size={0}>
          <span style={{ textTransform: "capitalize" }}>
            {prettyEnum(s.location_type)}
          </span>
          {s.location_address && (
            <span style={{ fontSize: 11, color: "#888" }}>
              {s.location_address}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: SessionStatus) => {
        let color: string = "default";
        if (status === "confirmed") color = "green";
        else if (status === "tentative") color = "gold";
        else if (status === "completed") color = "blue";
        else if (status === "cancelled" || status === "no_show") color = "red";

        return (
          <Tag color={color} style={{ textTransform: "capitalize" }}>
            {prettyEnum(status)}
          </Tag>
        );
      },
    },
    {
      title: "Price",
      key: "price",
      render: (_, s) =>
        s.final_price ?? s.total_price
          ? `₹${Number(
              (s.final_price ?? s.total_price) as any
            ).toLocaleString()}`
          : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, s) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openEditSessionModal(s)}>
            Edit
          </Button>
          <Button
            size="small"
            type="link"
            danger
            onClick={() => handleDelete(s)}
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
          <h2 className="text-xl font-semibold">Sessions</h2>
        </Col>
        <Col>
          <Space>
            <RangePicker
              showTime
              size="small"
              value={dateRange || undefined}
              onChange={(val) =>
                setDateRange(val as [Dayjs | null, Dayjs | null] | null)
              }
            />
            <Select<SessionType | undefined>
              allowClear
              placeholder="Type"
              size="small"
              style={{ width: 140 }}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as SessionType)}
            >
              {sessionTypes.map((t) => (
                <Option key={t} value={t}>
                  {prettyEnum(t)}
                </Option>
              ))}
            </Select>
            <Select<SessionStatus | undefined>
              allowClear
              placeholder="Status"
              size="small"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as SessionStatus)}
            >
              {sessionStatuses.map((s) => (
                <Option key={s} value={s}>
                  {prettyEnum(s)}
                </Option>
              ))}
            </Select>
            <Button size="small" onClick={loadData}>
              Filter
            </Button>
            <Button type="primary" size="small" onClick={openNewSessionModal}>
              New session
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 📅 Calendar view (month/week) */}
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
          <Col>
            <span className="font-medium">Calendar view</span>
          </Col>
          <Col>
            <Segmented
              size="small"
              value={calendarView}
              onChange={(val) => setCalendarView(val as "month" | "week")}
              options={[
                { label: "Month", value: "month" },
                { label: "Week", value: "week" },
              ]}
            />
          </Col>
        </Row>

        {calendarView === "month" ? (
          <Calendar
            fullscreen={false}
            value={calendarValue}
            onSelect={(val) => setCalendarValue(val)}
            dateCellRender={dateCellRender}
          />
        ) : (
          <Row gutter={8}>
            {Array.from({ length: 7 }).map((_, idx) => {
              const day = calendarValue.startOf("week").add(idx, "day");
              const daySessions = sessions.filter(
                (s) =>
                  s.scheduled_start &&
                  dayjs(s.scheduled_start).isSame(day, "day")
              );
              return (
                <Col xs={24} md={24 / 7} key={idx}>
                  <Card size="small" bodyStyle={{ padding: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>
                      {day.format("ddd DD")}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {daySessions.length === 0 && (
                        <span style={{ fontSize: 11, color: "#aaa" }}>
                          No sessions
                        </span>
                      )}
                      {daySessions.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          style={{ fontSize: 11, marginBottom: 2 }}
                        >
                          {dayjs(s.scheduled_start).format("HH:mm")} ·{" "}
                          {prettyEnum(s.session_type)}
                        </div>
                      ))}
                      {daySessions.length > 3 && (
                        <div style={{ fontSize: 11, color: "#888" }}>
                          +{daySessions.length - 3} more
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* Sessions table */}
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={sessions}
          size="small"
        />
      </Card>

      {/* Create / Edit session modal */}
      <Modal
        title={editId ? "Edit session" : "Add new session"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
      >
        <form onSubmit={handleSubmit}>
          <Row gutter={[12, 12]}>
            {/* Client / Lead / Package */}
            <Col xs={24} md={12}>
              <Select
                showSearch
                placeholder="Client"
                value={("client_id" in form ? form.client_id : undefined) || undefined}
                onChange={(val) =>
                  setForm((f) => ({ ...f, client_id: val as number }))
                }
                style={{ width: "100%" }}
                optionFilterProp="children"
              >
                {clients.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone})
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={12}>
              <Select
                showSearch
                placeholder="Lead"
                value={"lead_id" in form ? form.lead_id || undefined : undefined}
                onChange={(val) => handleLeadChange(val as number)}
                style={{ width: "100%" }}
                optionFilterProp="children"
              >
                {leads.map((l) => (
                  <Option key={l.id} value={l.id}>
                    #{l.id} – {l.lead_type || "lead"} ({l.primary_contact_phone})
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24}>
              <Select
                showSearch
                placeholder="Package"
                value={form.package_id || undefined}
                onChange={(val) =>
                  setForm((f) => ({ ...f, package_id: val as number }))
                }
                style={{ width: "100%" }}
                optionFilterProp="children"
              >
                {filteredPackages.map((p) => (
                  <Option key={p.id} value={p.id}>
                    {p.name} – ₹{Number(p.base_price).toLocaleString()}
                  </Option>
                ))}
                {filteredPackages.length === 0 &&
                  packages.map((p) => (
                    <Option key={p.id} value={p.id}>
                      {p.name} – ₹{Number(p.base_price).toLocaleString()}
                    </Option>
                  ))}
              </Select>
            </Col>

            {/* Session type, status, location */}
            <Col xs={24} md={8}>
              <Select
                placeholder="Session type"
                value={"session_type" in form ? form.session_type : undefined}
                onChange={(val) => handleSessionTypeChange(val as SessionType)}
                style={{ width: "100%" }}
              >
                {sessionTypes.map((t) => (
                  <Option key={t} value={t}>
                    {prettyEnum(t)}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={8}>
              <Select
                placeholder="Status"
                value={form.status || "tentative"}
                onChange={(val) =>
                  setForm((f) => ({ ...f, status: val as SessionStatus }))
                }
                style={{ width: "100%" }}
              >
                {sessionStatuses.map((s) => (
                  <Option key={s} value={s}>
                    {prettyEnum(s)}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={8}>
              <Select
                placeholder="Location type"
                value={form.location_type}
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    location_type: val as LocationType,
                  }))
                }
                style={{ width: "100%" }}
              >
                {locationTypes.map((lt) => (
                  <Option key={lt} value={lt}>
                    {prettyEnum(lt)}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24}>
              <TextArea
                rows={2}
                placeholder="Location address"
                value={form.location_address || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    location_address: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            {/* Time */}
            <Col xs={24} md={12}>
              <DatePicker
                showTime
                placeholder="Start"
                style={{ width: "100%" }}
                value={
                  form.scheduled_start
                    ? dayjs(form.scheduled_start as string)
                    : undefined
                }
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    scheduled_start: val
                      ? val.format("YYYY-MM-DDTHH:mm:ssZ")
                      : undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={12}>
              <DatePicker
                showTime
                placeholder="End (optional)"
                style={{ width: "100%" }}
                value={
                  form.scheduled_end
                    ? dayjs(form.scheduled_end as string)
                    : undefined
                }
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    scheduled_end: val
                      ? val.format("YYYY-MM-DDTHH:mm:ssZ")
                      : undefined,
                  }))
                }
              />
            </Col>

            {/* Add-ons */}
            <Col xs={24}>
              <Card
                size="small"
                title="Add-ons"
                style={{ background: "#fafafa", borderRadius: 8 }}
              >
                <Row gutter={[8, 8]} align="middle">
                  <Col xs={24} md={10}>
                    <Select
                      placeholder="Select add-on"
                      value={newAddOnId}
                      onChange={(val) => setNewAddOnId(val as number)}
                      style={{ width: "100%" }}
                      showSearch
                      optionFilterProp="children"
                    >
                      {addOns.map((ao) => (
                        <Option key={ao.id} value={ao.id}>
                          {ao.name} – ₹
                          {Number(ao.price as any).toLocaleString()}
                        </Option>
                      ))}
                    </Select>
                  </Col>
                  <Col xs={12} md={4}>
                    <InputNumber
                      min={1}
                      value={newAddOnQty}
                      onChange={(val) =>
                        setNewAddOnQty((val ?? 1) as number)
                      }
                      style={{ width: "100%" }}
                    />
                  </Col>
                  <Col xs={12} md={4}>
                    <Button
                      type="dashed"
                      block
                      onClick={() => {
                        if (!newAddOnId) {
                          message.warning("Choose an add-on first");
                          return;
                        }
                        const existing = sessionAddOns.find(
                          (item) => item.add_on_id === newAddOnId
                        );
                        const ao = addOns.find((a) => a.id === newAddOnId);
                        if (!ao) {
                          message.error("Add-on not found");
                          return;
                        }
                        const pricePerUnit = Number(ao.price as any);
                        const qty = newAddOnQty || 1;

                        if (existing) {
                          const updated = sessionAddOns.map((item) =>
                            item.add_on_id === newAddOnId
                              ? {
                                  ...item,
                                  quantity: item.quantity + qty,
                                  total_price:
                                    pricePerUnit *
                                    (item.quantity + qty),
                                }
                              : item
                          );
                          setSessionAddOns(updated);
                        } else {
                          setSessionAddOns((prev) => [
                            ...prev,
                            {
                              add_on_id: newAddOnId,
                              quantity: qty,
                              price_per_unit: pricePerUnit,
                              total_price: pricePerUnit * qty,
                            },
                          ]);
                        }
                      }}
                    >
                      Add
                    </Button>
                  </Col>
                </Row>

                {sessionAddOns.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {sessionAddOns.map((item) => (
                      <Row
                        gutter={8}
                        align="middle"
                        key={item.add_on_id}
                        style={{ marginBottom: 4 }}
                      >
                        <Col xs={24} md={10}>
                          <span style={{ fontSize: 13 }}>
                            {resolveAddOnName(item.add_on_id)}
                          </span>
                        </Col>
                        <Col xs={8} md={4}>
                          <InputNumber
                            min={1}
                            value={item.quantity}
                            onChange={(val) => {
                              const qty = (val ?? 1) as number;
                              setSessionAddOns((prev) =>
                                prev.map((it) =>
                                  it.add_on_id === item.add_on_id
                                    ? {
                                        ...it,
                                        quantity: qty,
                                        total_price:
                                          it.price_per_unit * qty,
                                      }
                                    : it
                                )
                              );
                            }}
                            style={{ width: "100%" }}
                          />
                        </Col>
                        <Col xs={8} md={4}>
                          <span style={{ fontSize: 13 }}>
                            ₹{item.total_price.toLocaleString()}
                          </span>
                        </Col>
                        <Col xs={8} md={4}>
                          <Button
                            size="small"
                            type="link"
                            danger
                            onClick={() =>
                              setSessionAddOns((prev) =>
                                prev.filter(
                                  (it) =>
                                    it.add_on_id !== item.add_on_id
                                )
                              )
                            }
                          >
                            Remove
                          </Button>
                        </Col>
                      </Row>
                    ))}
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      Add-ons total: ₹{addOnsTotal.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        marginTop: 2,
                        wordBreak: "break-word",
                      }}
                    >
                      {sessionAddOns
                        .map(
                          (item) =>
                            `${resolveAddOnName(
                              item.add_on_id
                            )} x${item.quantity}`
                        )
                        .join(", ")}
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            {/* Pricing */}
            <Col xs={24} md={8}>
              <InputNumber
                placeholder="Total price"
                style={{ width: "100%" }}
                value={
                  typeof form.total_price === "number"
                    ? form.total_price
                    : form.total_price
                    ? Number(form.total_price as any)
                    : undefined
                }
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    total_price: (val ?? undefined) as any,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <InputNumber
                placeholder="Discount"
                style={{ width: "100%" }}
                value={
                  typeof form.discount_amount === "number"
                    ? form.discount_amount
                    : form.discount_amount
                    ? Number(form.discount_amount as any)
                    : undefined
                }
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    discount_amount: (val ?? undefined) as any,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <InputNumber
                placeholder="Final price"
                style={{ width: "100%" }}
                value={
                  typeof form.final_price === "number"
                    ? form.final_price
                    : form.final_price
                    ? Number(form.final_price as any)
                    : undefined
                }
                onChange={(val) => {
                  setFinalPriceTouched(true);
                  setForm((f) => ({
                    ...f,
                    final_price: (val ?? undefined) as any,
                  }));
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "#888",
                  marginTop: 4,
                  wordBreak: "break-word",
                }}
              >
                Base: ₹
                {form.total_price
                  ? Number(form.total_price as any).toLocaleString()
                  : "0"}{" "}
                + Add-ons: ₹{addOnsTotal.toLocaleString()} = Suggested: ₹
                {(
                  (form.total_price
                    ? Number(form.total_price as any)
                    : 0) + addOnsTotal
                ).toLocaleString()}
              </div>
            </Col>

            {/* Notes */}
            <Col xs={24}>
              <TextArea
                rows={2}
                placeholder="Photographer notes (internal)"
                value={form.notes_photographer || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    notes_photographer: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24}>
              <TextArea
                rows={2}
                placeholder="Notes visible to client (optional)"
                value={form.notes_client_visible || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    notes_client_visible: e.target.value || undefined,
                  }))
                }
              />
            </Col>
            {/* Session galleries – only show when editing an existing session */}
            {editId !== null && (
              <Col xs={24}>
                <SessionGalleryManager sessionId={editId as number} />
              </Col>
            )}
            {/* Actions */}
            <Col xs={24} style={{ marginTop: 8 }}>
              <Space>
                <Button onClick={closeModal}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  {editId ? "Save changes" : "Add session"}
                </Button>
              </Space>
            </Col>
          </Row>
        </form>
      </Modal>
    </div>
  );
};

export default SessionsPage;
