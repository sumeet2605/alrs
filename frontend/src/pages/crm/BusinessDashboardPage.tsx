// src/pages/CRM/BusinessDashboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Row,
  Col,
  DatePicker,
  Segmented,
  Space,
  Button,
  App,
  Drawer,
  Table,
  Tag,
} from "antd";
import { DownloadOutlined, FileExcelOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { CrmService } from "../../api/services/CrmService";
import type { SessionRead } from "../../api/models/SessionRead";
import type { InvoiceRead } from "../../api/models/InvoiceRead";

const { RangePicker } = DatePicker;

type RangePreset = "this_month" | "last_3_months" | "this_fy" | "custom";

interface BusinessDashboardApiResponse {
  revenue_monthly: { month: string; revenue: number }[];
  lead_sources: {
    source: string;
    leads: number;
    quoted: number;
    booked: number;
    delivered: number;
    revenue: number;
  }[];
  funnel: {
    leads: number;
    quoted: number;
    booked: number;
    delivered: number;
  };
  gst_summary: {
    total_taxable: number;
    total_gst: number;
    invoices_count: number;
    gross_revenue: number;
  };
}

type DrillType = "sessions" | "invoices" | null;

const getPresetRange = (preset: RangePreset): [Dayjs, Dayjs] => {
  const today = dayjs();
  switch (preset) {
    case "this_month":
      return [today.startOf("month"), today.endOf("month")];
    case "last_3_months":
      return [today.subtract(2, "month").startOf("month"), today.endOf("month")];
    case "this_fy": {
      // India FY: Apr 1 – Mar 31
      const fyStartYear = today.month() >= 3 ? today.year() : today.year() - 1; // month index 0=Jan
      const from = dayjs(`${fyStartYear}-04-01`).startOf("day");
      const to = dayjs(`${fyStartYear + 1}-03-31`).endOf("day");
      return [from, to];
    }
    default:
      return [today.startOf("month"), today.endOf("month")];
  }
};

export const BusinessDashboardPage: React.FC = () => {
  const { message } = App.useApp();

  const [preset, setPreset] = useState<RangePreset>("this_fy");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(getPresetRange("this_fy"));

  const [data, setData] = useState<BusinessDashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Drill-down Drawer state
  const [drillType, setDrillType] = useState<DrillType>(null);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillData, setDrillData] = useState<(SessionRead | InvoiceRead)[]>([]);
  const [drillRange, setDrillRange] = useState<{ from: string; to: string } | null>(null);

  // ---------- Fetch dashboard ----------
 const fetchDashboard = async (from: Dayjs, to: Dayjs) => {
  setLoading(true);
  try {
    const res: BusinessDashboardApiResponse =
      await CrmService.getBusinessDashboardApiCrmDashboardBusinessGet(
        from.toISOString(),
        to.toISOString()
      );

    // Map API shape -> UI shape
    const mapped: BusinessDashboard = {
      date_from: from.toISOString(),
      date_to: to.toISOString(),
      revenue_monthly: res.revenue_monthly || [],

      // map lead_sources -> lead_source_effectiveness
      lead_source_effectiveness: (res.lead_sources || []).map((s) => ({
        source: s.source.replace("LeadSource.", "").replace(/_/g, " "), // "LeadSource.WHATSAPP" -> "WHATSAPP"
        leads: s.leads,
        booked: s.booked,
        delivered: s.delivered,
      })),

      // map funnel -> conversion_funnel
      conversion_funnel: {
        leads: res.funnel?.leads ?? 0,
        quoted: res.funnel?.quoted ?? 0,
        booked: res.funnel?.booked ?? 0,
        delivered: res.funnel?.delivered ?? 0,
      },

      // backend doesn’t send these yet → default empty
      package_performance: [],
      add_on_revenue: [],

      // map gst_summary fields
      gst_summary: {
        taxable_value: res.gst_summary?.total_taxable ?? 0,
        gst_amount: res.gst_summary?.total_gst ?? 0,
        gross_revenue: res.gst_summary?.gross_revenue ?? 0,
      },
    };

    setData(mapped);
  } catch (err) {
    console.error(err);
    message.error("Failed to load business dashboard");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchDashboard(range[0], range[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const funnel = data?.conversion_funnel;

  // Proper funnel chart data (always safe with ?? 0)
  const funnelChartData = [
    { key: "leads", label: "Leads", value: funnel?.leads ?? 0 },
    { key: "quoted", label: "Quoted", value: funnel?.quoted ?? 0 },
    { key: "booked", label: "Booked", value: funnel?.booked ?? 0 },
    { key: "delivered", label: "Delivered", value: funnel?.delivered ?? 0 },
  ];

  const handlePresetChange = (val: string | number) => {
    const p = val as RangePreset;
    setPreset(p);
    if (p === "custom") return;
    const r = getPresetRange(p);
    setRange(r);
    fetchDashboard(r[0], r[1]);
  };

  const handleRangeChange = (val: null | [Dayjs, Dayjs]) => {
    if (!val) return;
    setRange(val);
    setPreset("custom");
    fetchDashboard(val[0], val[1]);
  };

  // ---------- Export helpers ----------
  const buildCsv = (): string => {
    if (!data) return "";

    const lines: string[] = [];

    const addSection = (title: string) => {
      lines.push(title);
    };
    const addHeader = (cols: string[]) => {
      lines.push(cols.join(","));
    };
    const addRows = (rows: (string | number)[][]) => {
      rows.forEach((r) => lines.push(r.join(",")));
      lines.push(""); // blank line between sections
    };

    addSection("Revenue monthly");
    addHeader(["Month", "Revenue"]);
    addRows(
      (data.revenue_monthly || []).map((r) => [r.month, r.revenue.toFixed(2)])
    );

    addSection("Lead source effectiveness");
    addHeader(["Source", "Leads", "Booked", "Delivered"]);
    addRows(
      (data.lead_sources || []).map((r) => [
        r.source,
        r.leads,
        r.booked,
        r.delivered,
      ])
    );

    addSection("Conversion funnel");
    addHeader(["Stage", "Count"]);
    const f = data.funnel;
    addRows([
      ["Leads", f.leads],
      ["Quoted", f.quoted],
      ["Booked", f.booked],
      ["Delivered", f.delivered],
    ]);

    addSection("GST summary");
    addHeader(["Taxable value", "GST amount", "Gross revenue"]);
    addRows([
      [
        (data.gst_summary?.total_taxable ?? 0).toFixed(2),
        (data.gst_summary?.total_gst ?? 0).toFixed(2),
        (data.gst_summary?.gross_revenue ?? 0).toFixed(2),
      ],
    ]);

    return lines.join("\n");
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!data) return;
    const csv = buildCsv();
    triggerDownload(csv, "business-dashboard.csv", "text/csv;charset=utf-8;");
  };

  const handleExportExcel = () => {
    if (!data) return;
    // Simple: Excel-ready CSV with .xlsx extension
    const csv = buildCsv();
    triggerDownload(csv, "business-dashboard.xlsx", "text/csv;charset=utf-8;");
  };

  // ---------- Drill-down ----------
  const openSessionsDrilldown = async (title: string, from: Dayjs, to: Dayjs) => {
    setDrillType("sessions");
    setDrillTitle(title);
    setDrillLoading(true);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    setDrillRange({ from: fromIso, to: toIso });

    try {
      const sessions: SessionRead[] =
        await CrmService.listSessionsApiCrmSessionsGet(500, 0);
      const filtered = sessions.filter((s) => {
        if (!s.scheduled_start) return false;
        const d = dayjs(s.scheduled_start);
        return d.isAfter(from) && d.isBefore(to);
      });
      setDrillData(filtered);
    } catch (err) {
      console.error(err);
      message.error("Failed to load sessions for drill-down");
    } finally {
      setDrillLoading(false);
    }
  };

  const openInvoicesDrilldown = async (title: string, from: Dayjs, to: Dayjs) => {
    setDrillType("invoices");
    setDrillTitle(title);
    setDrillLoading(true);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    setDrillRange({ from: fromIso, to: toIso });

    try {
      const invoices: InvoiceRead[] =
        await CrmService.listInvoicesApiCrmInvoicesGet(500, 0);
      const filtered = invoices.filter((inv) => {
        if (!inv.paid_at) return false;
        const d = dayjs(inv.paid_at);
        return d.isAfter(from) && d.isBefore(to);
      });
      setDrillData(filtered);
    } catch (err) {
      console.error(err);
      message.error("Failed to load invoices for drill-down");
    } finally {
      setDrillLoading(false);
    }
  };

  const closeDrilldown = () => {
    setDrillType(null);
    setDrillTitle("");
    setDrillData([]);
    setDrillRange(null);
  };

  const sessionColumns: ColumnsType<SessionRead> = [
    {
      title: "Client",
      dataIndex: "client_full_name",
      key: "client",
      render: (_: any, s) => s.client_full_name || `#${s.client_id}`,
    },
    {
      title: "Session type",
      dataIndex: "session_type",
      key: "session_type",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag>{status}</Tag>,
    },
    {
      title: "Scheduled",
      dataIndex: "scheduled_start",
      key: "scheduled_start",
      render: (val: string | null) =>
        val ? dayjs(val).format("DD MMM YYYY, HH:mm") : "-",
    },
    {
      title: "Final price",
      dataIndex: "final_price",
      key: "final_price",
      render: (v: any) =>
        v != null ? `₹${Number(v).toLocaleString()}` : "-",
    },
  ];

  const invoiceColumns: ColumnsType<InvoiceRead> = [
    {
      title: "Invoice #",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Client",
      dataIndex: "client_name",
      key: "client_name",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag>{status}</Tag>,
    },
    {
      title: "Paid at",
      dataIndex: "paid_at",
      key: "paid_at",
      render: (val: string | null) =>
        val ? dayjs(val).format("DD MMM YYYY") : "-",
    },
    {
      title: "Total amount",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (v: any) =>
        v != null ? `₹${Number(v).toLocaleString()}` : "-",
    },
  ];

  const revenueData = useMemo(() => data?.revenue_monthly || [], [data]);
  const pkgData = useMemo(() => data?.package_performance || [], [data]);
  const leadSourceData = useMemo(
    () => data?.lead_source_effectiveness || [],
    [data]
  );

  // Optional: simple loading guard to avoid rendering charts before data
  // (not strictly required, but keeps the UI clean)
  // if (!data && loading) {
  //   return <div className="p-4 text-sm text-slate-500">Loading dashboard...</div>;
  // }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Row justify="space-between" align="middle">
        <Col>
          <div className="text-lg font-semibold">Business Dashboard</div>
          <div className="text-xs text-slate-500">
            CFO view – revenue, conversion, GST, package performance.
          </div>
        </Col>
        <Col>
          <Space size="small">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExportCsv}
              disabled={!data}
            >
              Export CSV
            </Button>
            <Button
              size="small"
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              disabled={!data}
            >
              Export Excel
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small">
        <Row gutter={[16, 8]} align="middle" justify="space-between">
          <Col>
            <div className="text-xs font-medium text-slate-600 mb-1">
              Date range
            </div>
            <RangePicker
              size="small"
              value={range}
              onChange={(vals) =>
                vals && handleRangeChange(vals as [Dayjs, Dayjs])
              }
              allowClear={false}
            />
          </Col>
          <Col>
            <Segmented
              size="small"
              value={preset}
              onChange={handlePresetChange}
              options={[
                { label: "This month", value: "this_month" },
                { label: "Last 3 months", value: "last_3_months" },
                { label: "This FY", value: "this_fy" },
                { label: "Custom", value: "custom" },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Top metrics: GST summary & funnel */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="GST Summary" size="small" loading={loading}>
            {data && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Taxable value</span>
                  <span className="font-semibold">
                    ₹{(data.gst_summary?.taxable_value ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST amount</span>
                  <span className="font-semibold">
                    ₹{(data.gst_summary?.gst_amount ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gross revenue</span>
                  <span className="font-semibold">
                    ₹{(data.gst_summary?.gross_revenue ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="Conversion funnel" size="small" loading={loading}>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnelChartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts row 1 – Revenue + Lead source */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Revenue by month"
            size="small"
            loading={loading}
            extra={
              <span className="text-xs text-slate-400">
                Click bar → Sessions
              </span>
            }
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  onClick={(chartEvent) => {
                    const payload = chartEvent?.activePayload?.[0]?.payload as
                      | { month: string; revenue: number }
                      | undefined;
                    if (!payload) return;
                    const m = dayjs(payload.month + "-01");
                    openSessionsDrilldown(
                      `Sessions in ${m.format("MMM YYYY")}`,
                      m.startOf("month"),
                      m.endOf("month")
                    );
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    angle={-40}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="Lead source effectiveness"
            size="small"
            loading={loading}
            extra={
              <span className="text-xs text-slate-400">
                Click bar → Invoices
              </span>
            }
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leadSourceData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  onClick={(chartEvent) => {
                    const payload = chartEvent?.activePayload?.[0]?.payload as
                      | { source: string }
                      | undefined;
                    if (!payload) return;
                    openInvoicesDrilldown(
                      `Invoices – ${payload.source}`,
                      range[0],
                      range[1]
                    );
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="source"
                    angle={-40}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" />
                  <Bar dataKey="booked" name="Booked" />
                  <Bar dataKey="delivered" name="Delivered" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts row 2 – Packages + Add-ons */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Package performance"
            size="small"
            loading={loading}
            extra={
              <span className="text-xs text-slate-400">
                Click bar → Sessions
              </span>
            }
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pkgData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                  onClick={(chartEvent) => {
                    const payload = chartEvent?.activePayload?.[0]?.payload as
                      | { package_name: string; revenue: number }
                      | undefined;
                    if (!payload) return;
                    // Drilldown: show sessions in date range; frontend filter by package name
                    openSessionsDrilldown(
                      `Sessions – ${payload.package_name}`,
                      range[0],
                      range[1]
                    );
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="package_name"
                    angle={-40}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sessions" name="Sessions" />
                  <Bar dataKey="revenue" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Add-on revenue" size="small" loading={loading}>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.add_on_revenue || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="add_on_name"
                    angle={-40}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Drill-down Drawer */}
      <Drawer
        title={drillTitle}
        open={!!drillType}
        width={900}
        onClose={closeDrilldown}
      >
        {drillRange && (
          <div className="mb-3 text-xs text-slate-500">
            Range: {dayjs(drillRange.from).format("DD MMM YYYY")} –{" "}
            {dayjs(drillRange.to).format("DD MMM YYYY")}
          </div>
        )}
        <Table
          rowKey="id"
          loading={drillLoading}
          size="small"
          columns={
            drillType === "sessions"
              ? (sessionColumns as any)
              : (invoiceColumns as any)
          }
          dataSource={drillData}
        />
      </Drawer>
    </div>
  );
};

export default BusinessDashboardPage;
