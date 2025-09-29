// frontend/src/components/GalleryCard.tsx
import React from "react";
import { Card } from "antd";
import Meta from "antd/es/card/Meta";
import { Link } from "react-router-dom";
import { OpenAPI } from "../api/core/OpenAPI";

type Props = {
  id: string;
  title: string;
  coverUrl?: string | null;
  description?: string;
};

export const GalleryCard: React.FC<Props> = ({ id, title, coverUrl, description }) => {
    const resolveUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = (OpenAPI.BASE ?? "").replace(/\/$/, ""); // strip trailing slash
    return `${base}${url}`;
  };
  return (
    <Card
      hoverable
      style={{ width: 260 }}
      cover={
        coverUrl ? (
          <img
            alt={title}
            src={resolveUrl(coverUrl) ?? ""}
            style={{ height: 160, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              height: 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f5f5f5",
            }}
          >
            <span style={{ color: "#999" }}>No cover</span>
          </div>
        )
      }
    >
      <Card.Meta
        title={<Link to={`/dashboard/galleries/${id}`}>{title}</Link>}
        description={description ?? ""}
      />
    </Card>
  );
};