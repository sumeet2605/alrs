// frontend/src/components/GalleryHeader.tsx
import {
  HeartOutlined,
  HeartFilled,
  DownloadOutlined,
  ShareAltOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { Tooltip, Badge } from "antd";
import { useContext } from "react";
import { ThemeContext } from "../main"; // adjust path if needed

interface GalleryHeaderProps {
  clientName: string;
  studioName: string;
  e: any;
  /**
   * Toggle favorites-only view. Called when heart icon is clicked.
   * (Kept compatible with older prop name `showOnlyFavorites`.)
   */
  onToggleFavorites?: () => void;
  /**
   * If true, show the heart as active (filled + primary).
   */
  isFavoritesOnly?: boolean;
  /**
   * Optional small badge count to display beside the heart.
   */
  favoriteCount?: number;
  onDownloadAll: () => void;
  onShare: () => void;
  onSlideshow: () => void;
}

export default function GalleryHeader(props: GalleryHeaderProps) {
  const {
    clientName,
    studioName,
    e,
    onToggleFavorites,
    isFavoritesOnly = false,
    favoriteCount = 0,
    onDownloadAll,
    onShare,
    onSlideshow,
  } = props;

  const { darkMode } = useContext(ThemeContext);

  const bgColor = darkMode ? "#1f1f1f" : "#fff";
  const textColor = darkMode ? "#f5f5f5" : "#333";
  const subTextColor = darkMode ? "#aaa" : "#999";
  const iconColor = darkMode ? "#ddd" : "#666";
  const borderColor = darkMode ? "#333" : "#f0f0f0";
  console.log(e)
  const heartStyle = {
    cursor: "pointer",
    color: isFavoritesOnly ? "#ff4d4f" : iconColor,
    fontSize: 20,
    display: "inline-flex",
    alignItems: "center",
  } as const;

  return (
    <div
      style={{
        display: "flex",
        // Changed to space-between to avoid crushing the center element
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
      {/* Left: Client + Studio (Fixed Width Placeholder) */}
      <div style={{ flexBasis: '33%', minWidth: '150px' }}> {/* New style added */}
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

      {/* Center: Expiry Information (New Style: flex-grow) */}
      {e && (
        <div style={{ flexGrow: 1, textAlign: 'center', margin: '0 10px' }}> {/* New style added */}
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              color: textColor,
              fontSize: 14,
            }}
          >
            Gallery Expires
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: subTextColor,
            }}
          >
            {e}
          </p>
        </div>
      )}

      {/* Right: Dynamic Icons */}
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <Tooltip title={isFavoritesOnly ? "Show all photos" : "Show favorites only"}>
          <div onClick={() => onToggleFavorites?.()} style={{ display: "inline-flex", alignItems: "center" }}>
            <Badge
              count={favoriteCount > 0 ? favoriteCount : 0}
              offset={[6, -8]}
              size="small"
              style={{ backgroundColor: "#ff4d4f", boxShadow: "none" }}
            >
              {isFavoritesOnly ? (
                <HeartFilled style={heartStyle} />
              ) : (
                <HeartOutlined style={heartStyle} />
              )}
            </Badge>
          </div>
        </Tooltip>

        <Tooltip title="Download All">
          <DownloadOutlined
            style={{ cursor: "pointer", color: iconColor, fontSize: 20 }}
            onClick={onDownloadAll}
          />
        </Tooltip>

        <Tooltip title="Share Gallery">
          <ShareAltOutlined
            style={{ cursor: "pointer", color: iconColor, fontSize: 20 }}
            onClick={onShare}
          />
        </Tooltip>

        <Tooltip title="Slideshow">
          <PlayCircleOutlined
            style={{ cursor: "pointer", color: iconColor, fontSize: 20 }}
            onClick={onSlideshow}
          />
        </Tooltip>
      </div>
    </div>
  );
}