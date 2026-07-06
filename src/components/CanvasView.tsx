import { useState } from 'react';
import { AnnotationProvider } from '../annotations/store';
import type { AnnotationTool } from '../annotations/types';
import { AnnotationLayer } from './AnnotationLayer';
import { ColorStrokeGroup } from './ColorStrokeGroup';
import { EditableTitle } from './EditableTitle';

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 1800;

interface CanvasViewProps {
  fileId: string;
  fileName: string;
  onRename: (name: string) => void;
}

export function CanvasView({ fileId, fileName, onRename }: CanvasViewProps) {
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
          <EditableTitle name={fileName} onRename={onRename} />
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
        <ColorStrokeGroup
          color={color}
          onColorChange={setColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
        />
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
