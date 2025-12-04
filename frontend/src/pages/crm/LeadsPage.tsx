// src/pages/CRM/LeadsPage.tsx
import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Card,
  Row,
  Col,
  Select,
  Input,
  Button,
  Table,
  App,
  Modal,
  Space,
  DatePicker,
  Switch,
  InputNumber,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CrmService } from "../../api/services/CrmService";
import type { ClientRead } from "../../api/models/ClientRead";
import type { LeadRead } from "../../api/models/LeadRead";
import type { LeadCreate } from "../../api/models/LeadCreate";
import type { LeadUpdate } from "../../api/models/LeadUpdate";
import type { LeadStage } from "../../api/models/LeadStage";
import type { LeadType } from "../../api/models/LeadType";
import type { LeadSource } from "../../api/models/LeadSource";
import { LeadDrawer } from "../../components/LeadDrawer";
import { BudgetBand } from "../../api/models/BudgetBand";
import dayjs, { Dayjs } from "dayjs";
import type { LocationType } from "../../api/models/LocationType";


type LeadFormData = LeadCreate & LeadUpdate;
const { Option } = Select;

const leadStages: LeadStage[] = [
  "new",
  "qualifying",
  "qualified",
  "quoted",
  "tentative_booking",
  "booked",
  "shot",
  "delivered",
  "closed_lost",
];

const leadTypes: LeadType[] = [
  "maternity",
  "newborn",
  "maternity_newborn_combo",
  "baby_milestone",
  "family",
  "other",
];

const leadSources: LeadSource[] = [
  "instagram_dm",
  "whatsapp",
  "website_form",
  "referral",
  "facebook",
  "walk_in",
  "other",
];

const budgetBands: BudgetBand[] = [
  "<10k",
  "10k-20k",
  "20k-40k",
  ">40k",
  "unknown",
];

const locationTypes: LocationType[] = ["home", "studio", "outdoor", "undecided"];

const defaultLead: LeadCreate = {
  client_id: 0,
  primary_contact_phone: "",
  primary_contact_name: "",
  stage: "new",
  source: "instagram_dm",
};

export const LeadsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [clients, setClients] = useState<ClientRead[]>([]);
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [stageFilter, setStageFilter] = useState<LeadStage | undefined>();
  const [form, setForm] = useState<LeadFormData>(defaultLead);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const openLeadDrawer = (leadId: number) => {
    setSelectedLeadId(leadId);
    setDrawerOpen(true);
  };

  const loadClients = async () => {
    const data = await CrmService.listClientsApiCrmClientsGet(undefined, 200);
    setClients(data);
  };

  const loadLeads = async (stage?: LeadStage) => {
    setLoading(true);
    try {
      const data = await CrmService.listLeadsApiCrmLeadsGet(stage);
      setLeads(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNewLeadModal = () => {
    setEditId(null);
    setForm(defaultLead);
    setModalOpen(true);
  };

  const openEditLeadModal = (lead: LeadRead) => {
    setEditId(lead.id);
    setForm({
      client_id: lead.client_id ?? 0,
      primary_contact_phone: lead.primary_contact_phone,
      primary_contact_name: lead.primary_contact_name ?? "",
      primary_contact_email: lead.primary_contact_email ?? undefined,
      lead_type: lead.lead_type ?? undefined,
      source: lead.source ?? "instagram_dm",
      source_details: lead.source_details ?? undefined,
      stage: lead.stage ?? "new",
      status_reason: lead.status_reason ?? undefined,
      preferred_month: lead.preferred_month ?? undefined,
      location_type_pref: lead.location_type_pref ?? undefined,
      location_area_pref: lead.location_area_pref ?? undefined,
      budget_band: lead.budget_band ?? "unknown",
      priority_score: lead.priority_score ?? undefined,
      is_pregnant: lead.is_pregnant ?? undefined,
      due_date: lead.due_date ?? undefined,
      gestation_weeks: lead.gestation_weeks ?? undefined,
      baby_dob: lead.baby_dob ?? undefined,
      baby_age_days: lead.baby_age_days ?? undefined,
      baby_age_weeks: lead.baby_age_weeks ?? undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
  };

  // --- helper calculators ---

  const calculateGestationWeeks = (dueDateStr: string | undefined) => {
    if (!dueDateStr) return undefined;
    const today = dayjs().startOf("day");
    const due = dayjs(dueDateStr);
    const diffDays = due.diff(today, "day"); // days until due date
    let gest = 40 - Math.round(diffDays / 7); // approx current weeks pregnant
    if (gest < 0) gest = 0;
    if (gest > 42) gest = 42;
    return gest;
  };

  const calculateBabyAge = (dobStr: string | undefined) => {
    if (!dobStr) return { days: undefined, weeks: undefined };
    const today = dayjs().startOf("day");
    const dob = dayjs(dobStr);
    const diffDays = today.diff(dob, "day");
    if (diffDays < 0) {
      // future DOB, ignore
      return { days: undefined, weeks: undefined };
    }
    const weeks = Math.floor(diffDays / 7);
    return { days: diffDays, weeks };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.client_id) {
      message.warning("Please select a client");
      return;
    }
    if (!form.primary_contact_phone) {
      message.warning("Phone is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await CrmService.updateLeadApiCrmLeadsLeadIdPatch(editId, form);
        message.success("Lead updated");
      } else {
        await CrmService.createLeadApiCrmLeadsPost(form);
        message.success("Lead created");
      }

      closeModal();
      setForm((prev) => ({ ...defaultLead, client_id: prev.client_id || 0 }));
      await loadLeads(stageFilter);
    } catch (err) {
      console.error(err);
      message.error("Failed to save lead");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Delete this lead?",
      content:
        "This will remove the lead from your CRM. Linked messages/sessions may be affected depending on your backend logic.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await CrmService.deleteLeadApiCrmLeadsLeadIdDelete(id);
          message.success("Lead deleted");
          await loadLeads(stageFilter);
        } catch (err) {
          console.error(err);
          message.error("Failed to delete lead");
        }
      },
    });
  };

  // --- Dynamic behaviour based on lead_type ---

  const leadType = form.lead_type;

  const showMaternityBlock =
    !leadType ||
    leadType === "maternity" ||
    leadType === "maternity_newborn_combo";

  const showNewbornBlock =
    leadType === "newborn" ||
    leadType === "baby_milestone" ||
    leadType === "maternity_newborn_combo";

  const handleLeadTypeChange = (val: LeadType | undefined) => {
    setForm((f) => {
      const next: any = { ...f, lead_type: val };

      if (val === "maternity" || val === "maternity_newborn_combo") {
        // Auto-mark pregnant
        next.is_pregnant = true;
        // Clear baby-specific fields for pure maternity
        if (val === "maternity") {
          next.baby_dob = undefined;
          next.baby_age_days = undefined;
          next.baby_age_weeks = undefined;
        }
      } else if (val === "newborn" || val === "baby_milestone") {
        // newborn/milestone: clear pregnancy fields
        next.is_pregnant = undefined;
        next.due_date = undefined;
        next.gestation_weeks = undefined;
      } else if (!val || val === "family" || val === "other") {
        // generic: clear both blocks
        next.is_pregnant = undefined;
        next.due_date = undefined;
        next.gestation_weeks = undefined;
        next.baby_dob = undefined;
        next.baby_age_days = undefined;
        next.baby_age_weeks = undefined;
      }

      return next;
    });
  };

  const columns: ColumnsType<LeadRead> = [
    {
      title: "Client",
      dataIndex: "client_id",
      key: "client",
      render: (client_id: number) => {
        const c = clients.find((cl) => cl.id === client_id);
        return c ? `${c.full_name} (${c.phone})` : client_id;
      },
    },
    { title: "Type", dataIndex: "lead_type", key: "lead_type" },
    { title: "Stage", dataIndex: "stage", key: "stage" },
    { title: "Source", dataIndex: "source", key: "source" },
    { title: "Phone", dataIndex: "primary_contact_phone", key: "phone" },
    {
      title: "Actions",
      key: "actions",
      render: (_, lead) => (
        <Space size="small">
          <Button size="small" onClick={() => openLeadDrawer(lead.id)}>
            View
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => openEditLeadModal(lead)}
          >
            Edit
          </Button>
          <Button
            size="small"
            type="link"
            danger
            onClick={() => handleDelete(lead.id)}
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
          <h2 className="text-xl font-semibold">Leads</h2>
        </Col>
        <Col>
          <Space>
            <Select<LeadStage | undefined>
              allowClear
              placeholder="Filter by stage"
              value={stageFilter}
              onChange={(val) => {
                setStageFilter(val);
                loadLeads(val);
              }}
              style={{ width: 200 }}
              size="small"
            >
              {leadStages.map((s) => (
                <Option key={s} value={s}>
                  {s}
                </Option>
              ))}
            </Select>
            <Button type="primary" size="small" onClick={openNewLeadModal}>
              New lead
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Leads table */}
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={leads}
          size="small"
        />
      </Card>

      {/* Lead details drawer */}
      <LeadDrawer
        open={drawerOpen}
        leadId={selectedLeadId}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Lead create/edit modal */}
      <Modal
        title={editId ? "Edit lead" : "Add new lead"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
      >
        <form onSubmit={handleSubmit}>
          <Row gutter={[12, 12]}>
            {/* Client + primary contact info */}
            <Col xs={24} md={12}>
              <Select
                showSearch
                placeholder="Select client"
                value={form.client_id || undefined}
                onChange={(val) =>
                  setForm((f) => ({ ...f, client_id: val as number }))
                }
                optionFilterProp="children"
                filterOption={(input, option) => {
                  const optionLabel = typeof option?.children === 'string' ? option.children : '';
                  return optionLabel
                    .toLowerCase()
                    .includes(input.toLowerCase());
                }}
                style={{ width: "100%" }}
              >
                {clients.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone})
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={12}>
              <Input
                placeholder="Contact name"
                value={form.primary_contact_name || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primary_contact_name: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={12}>
              <Input
                required
                placeholder="Contact phone"
                value={form.primary_contact_phone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primary_contact_phone: e.target.value,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={12}>
              <Input
                placeholder="Contact email"
                value={form.primary_contact_email || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primary_contact_email: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            {/* Lead type / source / stage */}
            <Col xs={24} md={8}>
              <Select
                placeholder="Lead type"
                value={form.lead_type || undefined}
                onChange={(val) => handleLeadTypeChange(val as LeadType)}
                allowClear
                style={{ width: "100%" }}
              >
                {leadTypes.map((t) => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={8}>
              <Select
                placeholder="Source"
                value={form.source || undefined}
                onChange={(val) =>
                  setForm((f) => ({ ...f, source: val as LeadSource }))
                }
                allowClear
                style={{ width: "100%" }}
              >
                {leadSources.map((s) => (
                  <Option key={s} value={s}>
                    {s}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={8}>
              <Select
                placeholder="Stage"
                value={form.stage || "new"}
                onChange={(val) =>
                  setForm((f) => ({ ...f, stage: val as LeadStage }))
                }
                style={{ width: "100%" }}
              >
                {leadStages.map((s) => (
                  <Option key={s} value={s}>
                    {s}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* Source details + status reason */}
            <Col xs={24}>
              <Input.TextArea
                rows={2}
                placeholder="Source details (e.g. which IG post / referral name)"
                value={form.source_details || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    source_details: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24}>
              <Input.TextArea
                rows={2}
                placeholder="Status reason (e.g. why closed lost / paused)"
                value={form.status_reason || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status_reason: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            {/* Location & budget */}
            <Col xs={24} md={8}>
              <Select
                placeholder="Location type"
                value={form.location_type_pref || undefined}
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    location_type_pref: val as LocationType,
                  }))
                }
                allowClear
                style={{ width: "100%" }}
              >
                {locationTypes.map((lt) => (
                  <Option key={lt} value={lt}>
                    {lt}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={8}>
              <Input
                placeholder="Location area (e.g. Whitefield)"
                value={form.location_area_pref || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    location_area_pref: e.target.value || undefined,
                  }))
                }
              />
            </Col>

            <Col xs={24} md={8}>
              <Select
                placeholder="Budget band"
                value={form.budget_band || undefined}
                onChange={(val) =>
                  setForm((f) => ({ ...f, budget_band: val as BudgetBand }))
                }
                style={{ width: "100%" }}
              >
                {budgetBands.map((b) => (
                  <Option key={b} value={b}>
                    {b}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* Preferred month + priority */}
            <Col xs={24} md={8}>
              <DatePicker
                style={{ width: "100%" }}
                picker="month"
                allowClear
                placeholder="Preferred month"
                value={
                  form.preferred_month
                    ? dayjs(form.preferred_month as string)
                    : undefined
                }
                onChange={(value: Dayjs | null) => {
                  const formatted = value
                    ? value.startOf("month").format("YYYY-MM-DD")
                    : undefined;

                  setForm((f) => ({
                    ...f,
                    preferred_month: formatted,
                  }));
                }}
              />
            </Col>

            <Col xs={24} md={8}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Priority score"
                value={form.priority_score ?? undefined}
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    priority_score: val ?? undefined,
                  }))
                }
              />
            </Col>

            {/* Pregnancy / due date (conditional) */}
            {showMaternityBlock && (
              <>
                {/* Maternity helper chip */}
                {(leadType === "maternity" ||
                  leadType === "maternity_newborn_combo") && (
                  <Col xs={24}>
                    <Tag color="magenta"
                     style={{
                      whiteSpace: "normal",
                      display: "inline-block",
                      height: "auto",
                      maxWidth: "100%",
            }}>
                      Best time for maternity shoot is usually between{" "}
                      <b>28–32 weeks</b> of pregnancy – beautiful bump, mom
                      still comfortable.
                    </Tag>
                  </Col>
                )}

                <Col xs={24} md={8}>
                  <Space>
                    <span>Pregnant?</span>
                    <Switch
                      checked={!!form.is_pregnant}
                      onChange={(checked) =>
                        setForm((f) => ({
                          ...f,
                          is_pregnant: checked,
                        }))
                      }
                    />
                  </Space>
                </Col>

                <Col xs={24} md={8}>
                  <DatePicker
                    style={{ width: "100%" }}
                    allowClear
                    placeholder="Due date"
                    value={
                      form.due_date ? dayjs(form.due_date as string) : undefined
                    }
                    onChange={(value) => {
                      const formatted = value
                        ? value.format("YYYY-MM-DD")
                        : undefined;
                      const gest = calculateGestationWeeks(formatted);
                      let autoPriority = form.priority_score;
                      if (gest !== undefined && gest >= 26 && gest <= 34) {
                          autoPriority = 100; // HIGH priority for maternity best window
                      }
                      setForm((f) => ({
                        ...f,
                        due_date: formatted,
                        gestation_weeks: gest,
                        priority_score: autoPriority,
                      }));
                    }}
                  />
                </Col>

                <Col xs={24} md={8}>
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Gestation weeks"
                    value={form.gestation_weeks ?? undefined}
                    onChange={(val) =>
                      setForm((f) => ({
                        ...f,
                        gestation_weeks: val ?? undefined,
                      }))
                    }
                  />
                </Col>
              </>
            )}

            {/* Baby DOB / age (conditional) */}
            {showNewbornBlock && (
              <>
                {/* Newborn helper chip */}
                {leadType === "newborn" && (
                  <Col xs={24}>
                    <Tag color="processing"
                      style={{
                        whiteSpace: "normal",
                        display: "inline-block",
                        height: "auto",
                        maxWidth: "100%",
                      }}>
                      Newborn best window is typically around{" "}
                      <b>5–15 days</b> after birth – babies are sleepiest and
                      curl up beautifully.
                    </Tag>
                  </Col>
                )}

                <Col xs={24} md={8}>
                  <DatePicker
                    style={{ width: "100%" }}
                    allowClear
                    placeholder="Baby DOB"
                    value={
                      form.baby_dob ? dayjs(form.baby_dob as string) : undefined
                    }
                    onChange={(value) => {
                      const formatted = value
                        ? value.format("YYYY-MM-DD")
                        : undefined;
                      const { days, weeks } = calculateBabyAge(formatted);
                      let autoPriority = form.priority_score;
                      if (days !== undefined && days >= 3 && days <= 20) {
                        autoPriority = 100; // HIGH priority for newborn window
                      }
                      setForm((f) => ({
                        ...f,
                        baby_dob: formatted,
                        baby_age_days: days,
                        baby_age_weeks: weeks,
                        priority_score: autoPriority,
                      }));
                    }}
                  />
                </Col>

                <Col xs={24} md={8}>
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Baby age (days)"
                    value={form.baby_age_days ?? undefined}
                    onChange={(val) =>
                      setForm((f) => ({
                        ...f,
                        baby_age_days: val ?? undefined,
                      }))
                    }
                  />
                </Col>

                <Col xs={24} md={8}>
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="Baby age (weeks)"
                    value={form.baby_age_weeks ?? undefined}
                    onChange={(val) =>
                      setForm((f) => ({
                        ...f,
                        baby_age_weeks: val ?? undefined,
                      }))
                    }
                  />
                </Col>
              </>
            )}

            {/* Actions */}
            <Col xs={24} style={{ marginTop: 8 }}>
              <Space>
                <Button onClick={closeModal}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  {editId ? "Save changes" : "Add lead"}
                </Button>
              </Space>
            </Col>
          </Row>
        </form>
      </Modal>
    </div>
  );
};

export default LeadsPage;
