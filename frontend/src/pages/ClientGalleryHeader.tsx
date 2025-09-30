import {
  HeartOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { useContext } from "react";
import { ThemeContext } from "../main"; // ✅ adjust path if needed

interface GalleryHeaderProps {
  clientName: string;
  studioName: string;
  onDownloadAll: () => void;
  onShare: () => void;
  onSlideshow: () => void;
}

export default function GalleryHeader({
  clientName,
  studioName,
  onDownloadAll,
  onShare,
  onSlideshow,
}: GalleryHeaderProps) {
  const { darkMode } = useContext(ThemeContext);

  const bgColor = darkMode ? "#1f1f1f" : "#fff";
  const textColor = darkMode ? "#f5f5f5" : "#333";
  const subTextColor = darkMode ? "#aaa" : "#999";
  const iconColor = darkMode ? "#ddd" : "#666";
  const borderColor = darkMode ? "#333" : "#f0f0f0";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 32px",
        borderBottom: `1px solid ${borderColor}`,
        background: bgColor,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left: Client + Studio */}
      <div>
        <h2
          style={{
            margin: 0,
            fontWeight: 600,
            color: textColor,
            fontSize: 20,
          }}
        >
          {clientName}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: subTextColor,
          }}
        >
          {studioName}
        </p>
      </div>

      {/* Right: Dynamic Icons */}
      <div style={{ display: "flex", gap: "20px", fontSize: "20px" }}>
        <Tooltip title="Favorites">
          <HeartOutlined
            style={{ cursor: "pointer", color: iconColor }}
          />
        </Tooltip>
        <Tooltip title="Download All">
          <DownloadOutlined
            style={{ cursor: "pointer", color: iconColor }}
            onClick={onDownloadAll}
          />
        </Tooltip>
        <Tooltip title="Share Gallery">
          <ShareAltOutlined
            style={{ cursor: "pointer", color: iconColor }}
            onClick={onShare}
          />
        </Tooltip>
        <Tooltip title="Slideshow">
          <PlayCircleOutlined
            style={{ cursor: "pointer", color: iconColor }}
            onClick={onSlideshow}
          />
        </Tooltip>
      </div>
    </div>
  );
}
