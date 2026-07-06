import { useState } from 'react';
import { AnnotationProvider } from '../annotations/store';
import type { AnnotationTool } from '../annotations/types';
import { AnnotationLayer } from './AnnotationLayer';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#111827'];

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 1800;

interface CanvasViewProps {
  fileId: string;
  fileName: string;
  onBack: () => void;
}

export function CanvasView({ fileId, fileName, onBack }: CanvasViewProps) {
  const [tool, setTool] = useState<AnnotationTool>('draw');
  const [color, setColor] = useState('#111827');
  const [strokeWidth, setStrokeWidth] = useState(0.004);

  const tools: { id: AnnotationTool; label: string; title: string }[] = [
    { id: 'select', label: '←', title: 'Select / delete' },
    { id: 'draw', label: '✎', title: 'Draw' },
    { id: 'highlight', label: '⬜', title: 'Highlight' },
    { id: 'text', label: 'T', title: 'Add text' },
    { id: 'comment', label: '💬', title: 'Add comment' },
  ];

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-group">
          <button onClick={onBack} title="Back to files">
            Files
          </button>
          <span className="toolbar-filename" title={fileName}>
            {fileName}
          </span>
        </div>
        <div className="toolbar-group">
          {tools.map((t) => (
            <button
              key={t.id}
              className={tool === t.id ? 'active' : ''}
              onClick={() => setTool(t.id)}
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
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
          <input
            type="range"
            min={0.002}
            max={0.03}
            step={0.001}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            title="Stroke width"
          />
        </div>
      </div>
      <div className="main-area">
        <div className="viewer-scroll">
          <AnnotationProvider docKey={fileId}>
            <div className="page-view" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
              <AnnotationLayer
                pageIndex={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
              />
            </div>
          </AnnotationProvider>
        </div>
      </div>
    </>
  );
}
