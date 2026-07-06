export const ANNOTATION_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#111827'];

interface ColorStrokeGroupProps {
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
}

export function ColorStrokeGroup({ color, onColorChange, strokeWidth, onStrokeWidthChange }: ColorStrokeGroupProps) {
  return (
    <div className="color-stroke-group">
      <div className="color-swatch-row">
        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c}
            className={`color-swatch ${color === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => onColorChange(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <div className="stroke-slider-row">
        <span className="stroke-dot" style={{ width: 4, height: 4, background: 'currentColor' }} />
        <input
          type="range"
          min={0.002}
          max={0.03}
          step={0.001}
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          title="Stroke width"
        />
        <span className="stroke-dot" style={{ width: 10, height: 10, background: 'currentColor' }} />
      </div>
    </div>
  );
}
