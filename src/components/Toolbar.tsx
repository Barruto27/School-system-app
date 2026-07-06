import type { AnnotationTool } from '../annotations/types';
import { ColorStrokeGroup } from './ColorStrokeGroup';
import { EditableTitle } from './EditableTitle';

interface ToolbarProps {
  fileName: string;
  onRename: (name: string) => void;
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
  onExport: () => void;
  onToggleFind: () => void;
}

export function Toolbar({
  fileName,
  onRename,
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
  onExport,
  onToggleFind,
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
        <EditableTitle name={fileName} onRename={onRename} />
        <button onClick={onExport} title="Export annotated PDF">
          Export
        </button>
      </div>

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

      <ColorStrokeGroup
        color={color}
        onColorChange={onColorChange}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={onStrokeWidthChange}
      />

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
    </div>
  );
}
