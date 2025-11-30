import React, { useEffect, useState } from "react";
import { Drawer, Spin, Timeline, Tag, Typography, Card } from "antd";
import { CrmService } from "../api/services/CrmService";

const { Text, Title } = Typography;

export const LeadDrawer = ({ open, leadId, onClose }: any) => {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<any>(null);

  useEffect(() => {
    if (open && leadId) {
      setLoading(true);
      CrmService.getLeadTimelineApiCrmLeadsLeadIdTimelineGet(leadId)
        .then((d) => setTimeline(d))
        .finally(() => setLoading(false));
    }
  }, [open, leadId]);

  return (
    <Drawer
      title={`Lead #${leadId} Timeline`}
      width={500}
      onClose={onClose}
      open={open}
    >
      {loading && <Spin />}

      {!loading && timeline && (
        <>
          <Card size="small" className="mb-3">
            <Title level={5}>Lead Info</Title>
            <Text>
              <b>Name:</b> {timeline.client.full_name}
            </Text>
            <br />
            <Text>
              <b>Phone:</b> {timeline.client.phone}
            </Text>
            <br />
            <Text>
              <b>Stage:</b>{" "}
              <Tag color="blue">{timeline.lead.stage}</Tag>
            </Text>
          </Card>

          <Timeline mode="left">
            {timeline.events.map((ev: any, i: number) => (
              <Timeline.Item key={i} color={getColor(ev.type)}>
                <b>{formatEventTitle(ev)}</b>
                <div>{formatEventText(ev)}</div>
                <small style={{ color: "#888" }}>
                  {new Date(ev.timestamp).toLocaleString()}
                </small>
              </Timeline.Item>
            ))}
          </Timeline>
        </>
      )}
    </Drawer>
  );
};

// Helpers
function getColor(type: string) {
  if (type === "message") return "green";
  if (type === "session") return "purple";
  if (type === "followup") return "orange";
  return "blue";
}

function formatEventTitle(ev: any) {
  switch (ev.type) {
    case "lead_created":
      return "Lead created";
    case "lead_updated":
      return "Lead updated";
    case "message":
      return ev.data.direction === "incoming"
        ? "Client message"
        : "Your reply";
    case "session":
      return "Session created";
    case "followup":
      return "Follow-up scheduled";
    default:
      return ev.type;
  }
}

function formatEventText(ev: any) {
  if (ev.type === "message") return ev.data.text;
  if (ev.type === "session")
    return `Session ${ev.data.session_type} at ${ev.data.scheduled_start}`;
  if (ev.type === "followup")
    return `Status: ${ev.data.status}, Type: ${ev.data.type}`;
  return "";
}
