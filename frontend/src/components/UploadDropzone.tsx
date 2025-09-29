// frontend/src/components/UploadDropzone.tsx
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { GalleryService } from "../api/services/GalleryService";
import { Spin, message, Progress } from "antd";


type Props = {
  galleryId: string;
  onComplete?: () => void;
};

export const UploadDropzone: React.FC<Props> = ({ galleryId, onComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    setPercent(0);

    try {
      // Create FormData and append files[] (generator expects formData)
      const fd = new FormData();
      acceptedFiles.forEach((f) => fd.append("files", f));

      // The generated client types the parameter as a structured FormData type.
      // We cast here to satisfy TypeScript and let the generator handle the request.
        await GalleryService.uploadPhotosFormData(galleryId, fd, {
            onUploadProgress: (ev) => { /* update percent */ },
            withCredentials: true
        });
      // Best-effort progress: show done
      setPercent(100);
      message.success("Upload complete");
      onComplete?.();
    } catch (err: any) {
      console.error("upload error", err);
      message.error(err?.message ?? "Upload failed");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setPercent(null);
      }, 600);
    }
  }, [galleryId, onComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "image/*": [] } });

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: "2px dashed #d9d9d9",
          padding: 18,
          borderRadius: 8,
          textAlign: "center",
          background: isDragActive ? "#fafafa" : undefined,
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: 14, color: "#888" }}>
          {isDragActive ? "Drop images here..." : "Drag & drop images here, or click to browse"}
          <div style={{ marginTop: 8 }}>
            <small>JPEG/PNG recommended. Multiple files allowed.</small>
          </div>
        </div>
      </div>

      {uploading && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <Spin />
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 6 }}>Uploading…</div>
            <Progress percent={percent ?? 0} status={percent === 100 ? "success" : "active"} />
          </div>
        </div>
      )}
    </div>
  );
};
