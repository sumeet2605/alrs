// src/components/SizePicker.tsx
import React from "react";
import { Modal, Radio } from "antd";

type Props = {
  open: boolean;
  onCancel: () => void;
  onSelect: (size: 'original' | 'large' | 'medium' | 'web') => void;
};

const SizePicker: React.FC<Props> = ({ open, onCancel, onSelect }) => {
  const [value, setValue] = React.useState<'original' | 'large' | 'medium' | 'web'>('original');

  return (
    <Modal
      title="Choose download size"
      open={open}
      onCancel={onCancel}
      onOk={() => onSelect(value)} // ✅ returns a plain string
      okText="Download"
    >
      <Radio.Group
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <Radio value="original">Original</Radio>
        <Radio value="large">Large (2048px)</Radio>
        <Radio value="medium">Medium (1200px)</Radio>
        <Radio value="web">Web (1024px)</Radio>
      </Radio.Group>
    </Modal>
  );
};

export default SizePicker;
