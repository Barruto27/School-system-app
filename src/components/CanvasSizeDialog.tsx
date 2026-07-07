import { useState } from 'react';

interface Preset {
  label: string;
  width: number;
  height: number;
}

const PRESETS: Preset[] = [
  { label: 'Default (4:5)', width: 1400, height: 1800 },
  { label: 'Letter', width: 850, height: 1100 },
  { label: 'A4', width: 794, height: 1123 },
  { label: 'Square', width: 1400, height: 1400 },
  { label: 'Widescreen (16:9)', width: 1920, height: 1080 },
  { label: 'Portrait HD (9:16)', width: 1080, height: 1920 },
];

interface CanvasSizeDialogProps {
  onCancel: () => void;
  onConfirm: (width: number, height: number) => void;
}

export function CanvasSizeDialog({ onCancel, onConfirm }: CanvasSizeDialogProps) {
  const [selected, setSelected] = useState<Preset>(PRESETS[0]);
  const [customWidth, setCustomWidth] = useState(String(PRESETS[0].width));
  const [customHeight, setCustomHeight] = useState(String(PRESETS[0].height));
  const [useCustom, setUseCustom] = useState(false);

  const selectPreset = (preset: Preset) => {
    setSelected(preset);
    setUseCustom(false);
    setCustomWidth(String(preset.width));
    setCustomHeight(String(preset.height));
  };

  const confirm = () => {
    const width = Math.max(100, Math.round(Number(customWidth)) || selected.width);
    const height = Math.max(100, Math.round(Number(customHeight)) || selected.height);
    onConfirm(width, height);
  };

  return (
    <div className="settings-overlay" onClick={onCancel}>
      <div className="canvas-size-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>New Canvas Size</h2>
          <button className="settings-close" onClick={onCancel} title="Close">
            x
          </button>
        </div>

        <div className="canvas-size-presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className={`canvas-size-preset ${!useCustom && selected.label === p.label ? 'active' : ''}`}
              onClick={() => selectPreset(p)}
            >
              <span className="canvas-size-preset-label">{p.label}</span>
              <span className="canvas-size-preset-dims">
                {p.width} × {p.height}
              </span>
            </button>
          ))}
        </div>

        <div className="canvas-size-custom">
          <span className="canvas-size-custom-label">Custom</span>
          <input
            type="number"
            className="canvas-size-input"
            min={100}
            value={customWidth}
            onChange={(e) => {
              setUseCustom(true);
              setCustomWidth(e.target.value);
            }}
          />
          <span>×</span>
          <input
            type="number"
            className="canvas-size-input"
            min={100}
            value={customHeight}
            onChange={(e) => {
              setUseCustom(true);
              setCustomHeight(e.target.value);
            }}
          />
          <span className="canvas-size-custom-label">px</span>
        </div>

        <div className="canvas-size-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="active" onClick={confirm}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
