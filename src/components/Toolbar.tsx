import type { AnnotationTool } from '../annotations/types';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#111827'];

interface ToolbarProps {
  tool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  page: number;
  numPages: number;
  onPageChange: (page: number) => void;
  onOpenFile: () => void;
  onExport: () => void;
  onToggleFind: () => void;
  hasDoc: boolean;
}

export function Toolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  page,
  numPages,
  onPageChange,
  onOpenFile,
  onExport,
  onToggleFind,
  hasDoc,
}: ToolbarProps) {
  const tools: { id: AnnotationTool; label: string; title: string }[] = [
    { id: 'select', label: '←', title: 'Select / delete' },
    { id: 'draw', label: '✎', title: 'Draw' },
    { id: 'highlight', label: '⬜', title: 'Highlight' },
    { id: 'text', label: 'T', title: 'Add text' },
    { id: 'comment', label: '💬', title: 'Add comment' },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={onOpenFile} title="Open PDF">
          Open
        </button>
        <button onClick={onExport} disabled={!hasDoc} title="Export annotated PDF">
          Export
        </button>
      </div>

      {hasDoc && (
        <>
          <div className="toolbar-group">
            {tools.map((t) => (
              <button
                key={t.id}
                className={tool === t.id ? 'active' : ''}
                onClick={() => onToolChange(t.id)}
                title={t.title}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="toolbar-group">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => onColorChange(c)}
                aria-label={`Color ${c}`}
              />
            ))}
            <input
              type="range"
              min={0.002}
              max={0.03}
              step={0.001}
              value={strokeWidth}
              onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
              title="Stroke width"
            />
          </div>

          <div className="toolbar-group">
            <button onClick={onZoomOut} title="Zoom out">
              -
            </button>
            <span className="zoom-label">{Math.round(scale * 100)}%</span>
            <button onClick={onZoomIn} title="Zoom in">
              +
            </button>
            <button onClick={onZoomReset} title="Reset zoom">
              Reset
            </button>
          </div>

          <div className="toolbar-group">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              Prev
            </button>
            <input
              type="number"
              className="page-input"
              value={page}
              min={1}
              max={numPages}
              onChange={(e) => onPageChange(Number(e.target.value))}
            />
            <span> / {numPages}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= numPages}>
              Next
            </button>
          </div>

          <div className="toolbar-group">
            <button onClick={onToggleFind} title="Find in document">
              Find
            </button>
          </div>
        </>
      )}
    </div>
  );
}
