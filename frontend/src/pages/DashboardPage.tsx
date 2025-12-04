import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, App, Tag, Progress, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CrmService } from "../api/services/CrmService";
import type { DashboardSummary } from "../api/models/DashboardSummary";
import type { LeadStageCount } from "../api/models/LeadStageCount";
import type { SourceCount } from "../api/models/SourceCount";

const pretty = (val?: string | null) =>
  val ? val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

export const DashboardPage: React.FC = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await CrmService.getDashboardSummaryApiCrmDashboardSummaryGet();
      setData(res);
    } catch (err) {
      console.error(err);
      message.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const leadsByStageColumns: ColumnsType<LeadStageCount> = [
    {
      title: "Stage",
      dataIndex: "stage",
      key: "stage",
      render: (s) => pretty(s),
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
    },
  ];

  const leadsBySourceColumns: ColumnsType<SourceCount> = [
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      render: (s) => pretty(s) || <em>Unknown</em>,
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
    },
  ];

  const totalLeads = data?.total_leads || 0;
  const stageTop = data?.leads_by_stage?.reduce(
    (max, item) => (item.count > max ? item.count : max),
    0
  ) || 0;
  console.log(data)

  return (
    <div className="space-y-4">
      <Row justify="space-between" align="middle">
        <Col>
          <h2 className="text-xl font-semibold">CRM Dashboard</h2>
        </Col>
      </Row>

      {/* Top stats */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Total Leads" value={data?.total_leads ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Total Clients" value={data?.total_clients ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Sessions" value={data?.total_sessions ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Invoices" value={data?.total_invoices ?? 0} />
          </Card>
        </Col>
      </Row>

      {/* Revenue + upcoming */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Revenue (last 30 days)" loading={loading}>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Statistic
                title="Invoiced"
                prefix="₹"
                value={data?.revenue_last_30_days ?? 0}
                precision={0}
              />
              <Statistic
                title="Paid"
                prefix="₹"
                value={data?.paid_last_30_days ?? 0}
                precision={0}
              />
              {data && data.revenue_last_30_days > 0 ? (
                <Progress
                  percent={Number(
                    (Number(data.paid_last_30_days) /
                      Number(data.revenue_last_30_days)) *
                      100
                  ).toFixed(1)}
                  size="small"
                  status="active"
                />
              ) : (
                <span style={{ fontSize: 12, color: "#999" }}>
                  No revenue yet in this period
                </span>
              )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Upcoming sessions" loading={loading}>
            <Space direction="vertical">
              <Statistic
                title="Upcoming (tentative + confirmed)"
                value={data?.upcoming_sessions ?? 0}
              />
              {data && data.upcoming_sessions > 0 && (
                <Tag color="blue">Busy times ahead ✨</Tag>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Funnel / tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Leads by stage" loading={loading}>
            <Table
              size="small"
              pagination={false}
              rowKey={(r) => r.stage}
              dataSource={data?.leads_by_stage || []}
              columns={leadsByStageColumns}
              footer={
                totalLeads
                  ? () => (
                      <span style={{ fontSize: 12 }}>
                        Total: <strong>{totalLeads}</strong>
                      </span>
                    )
                  : undefined
              }
            />
            {data && data.leads_by_stage?.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
                Top stage:{" "}
                <strong>
                  {
                    pretty(
                      data.leads_by_stage.reduce((top, s) =>
                        s.count > top.count ? s : top
                      ).stage
                    )
                  }
                </strong>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Leads by source" loading={loading}>
            <Table
              size="small"
              pagination={false}
              rowKey={(_, idx) => String(idx)}
              dataSource={data?.leads_by_source || []}
              columns={leadsBySourceColumns}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
