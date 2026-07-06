import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from '../pdf/pdfjs';
import { useAnnotations } from '../annotations/store';
import { newId } from '../annotations/id';
import type { Annotation, AnnotationTool, Point, StrokeAnnotation } from '../annotations/types';

export interface SearchRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A textarea that focuses itself after the mounting click's native event
 * sequence (pointerdown, mousedown, mouseup, click) has fully settled.
 * Using the `autoFocus` attribute instead races that sequence: the click that
 * creates the annotation can land on its edge, so the trailing native
 * `mousedown` hit-tests against the parent (not yet aware of the new
 * element at pointerdown time) and blurs the textarea before it's usable.
 */
function DeferredFocusTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);
  return <textarea ref={ref} {...props} />;
}

interface PageViewProps {
  doc: PDFDocumentProxy;
  pageIndex: number;
  scale: number;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  registerPageEl: (pageIndex: number, el: HTMLDivElement | null) => void;
  searchRects: SearchRect[];
}

const HIT_RADIUS = 10;

function isStroke(a: Annotation): a is StrokeAnnotation {
  return a.type === 'draw' || a.type === 'highlight';
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export function PageView({
  doc,
  pageIndex,
  scale,
  tool,
  color,
  strokeWidth,
  registerPageEl,
  searchRects,
}: PageViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { byPage, addAnnotation, updateAnnotation, removeAnnotation } = useAnnotations();
  const annotations = byPage(pageIndex);

  const drawingRef = useRef<{ points: Point[] } | null>(null);
  const [liveStroke, setLiveStroke] = useState<Point[] | null>(null);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Render the PDF page itself.
  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<import('../pdf/pdfjs').PDFPageProxy['render']> | null = null;
    doc.getPage(pageIndex + 1).then(async (page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setSize({ width: viewport.width, height: viewport.height });
      renderTask = page.render({ canvasContext: ctx, viewport });
      try {
        await renderTask.promise;
      } catch {
        // cancelled render, ignore
      }
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageIndex, scale]);

  // Draw stroke annotations + live in-progress stroke onto overlay canvas.
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const strokes = annotations.filter(
      (a): a is StrokeAnnotation => a.type === 'draw' || a.type === 'highlight',
    );

    const renderStroke = (points: Point[], strokeColor: string, width: number, isHighlight: boolean, selected: boolean) => {
      if (points.length === 0) return;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = isHighlight ? 0.35 : 1;
      ctx.lineWidth = Math.max(1, width * size.width);
      if (selected) {
        ctx.shadowColor = 'rgba(37, 99, 235, 0.9)';
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = p.x * size.width;
        const y = p.y * size.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    };

    for (const s of strokes) {
      renderStroke(s.points, s.color, s.strokeWidth, s.type === 'highlight', s.id === selectedId);
    }

    if (liveStroke) {
      renderStroke(liveStroke, color, strokeWidth, tool === 'highlight', false);
    }

    // Search result highlight rects.
    for (const r of searchRects) {
      ctx.save();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.fillRect(r.x * size.width, r.y * size.height, r.w * size.width, r.h * size.height);
      ctx.restore();
    }
  }, [annotations, liveStroke, size, color, strokeWidth, tool, selectedId, searchRects]);

  const toNormalized = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      };
    },
    [],
  );

  const hitTest = useCallback(
    (p: Point): Annotation | null => {
      for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i];
        if (isStroke(a)) {
          const pxPoint = { x: p.x * size.width, y: p.y * size.height };
          const pts = a.points.map((pt) => ({ x: pt.x * size.width, y: pt.y * size.height }));
          for (let j = 0; j < pts.length - 1; j++) {
            if (distToSegment(pxPoint, pts[j], pts[j + 1]) < HIT_RADIUS) return a;
          }
          if (pts.length === 1 && Math.hypot(pxPoint.x - pts[0].x, pxPoint.y - pts[0].y) < HIT_RADIUS) return a;
        } else {
          const dx = (a.position.x - p.x) * size.width;
          const dy = (a.position.y - p.y) * size.height;
          if (Math.hypot(dx, dy) < 16) return a;
        }
      }
      return null;
    },
    [annotations, size],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === 'draw' || tool === 'highlight') {
      const p = toNormalized(e.clientX, e.clientY);
      drawingRef.current = { points: [p] };
      setLiveStroke([p]);
      (e.target as Element).setPointerCapture(e.pointerId);
    } else if (tool === 'select') {
      const p = toNormalized(e.clientX, e.clientY);
      const hit = hitTest(p);
      setSelectedId(hit ? hit.id : null);
    } else if (tool === 'text') {
      const p = toNormalized(e.clientX, e.clientY);
      const id = newId();
      addAnnotation({
        id,
        type: 'text',
        page: pageIndex,
        color,
        position: p,
        text: '',
        fontSize: 0.02,
        createdAt: Date.now(),
      });
      setEditingTextId(id);
    } else if (tool === 'comment') {
      const p = toNormalized(e.clientX, e.clientY);
      const id = newId();
      addAnnotation({
        id,
        type: 'comment',
        page: pageIndex,
        color,
        position: p,
        text: '',
        createdAt: Date.now(),
      });
      setOpenCommentId(id);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current) return;
    const p = toNormalized(e.clientX, e.clientY);
    drawingRef.current.points.push(p);
    setLiveStroke([...drawingRef.current.points]);
  };

  const handlePointerUp = () => {
    if (drawingRef.current) {
      const points = drawingRef.current.points;
      drawingRef.current = null;
      setLiveStroke(null);
      if (points.length > 1) {
        addAnnotation({
          id: newId(),
          type: tool === 'highlight' ? 'highlight' : 'draw',
          page: pageIndex,
          color,
          points,
          strokeWidth,
          createdAt: Date.now(),
        });
      }
    }
  };

  useEffect(() => {
    if (tool !== 'select') setSelectedId(null);
  }, [tool]);

  const cursorClass =
    tool === 'select' ? 'cursor-default' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair';

  return (
    <div
      className="page-view"
      ref={(el) => {
        containerRef.current = el;
        registerPageEl(pageIndex, el);
      }}
      style={{ width: size.width || undefined, height: size.height || undefined }}
      data-page-index={pageIndex}
    >
      <canvas ref={pdfCanvasRef} className="pdf-canvas" />
      <div
        className={`interaction-layer ${cursorClass}`}
        style={{ width: size.width, height: size.height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <canvas ref={overlayCanvasRef} className="overlay-canvas" />
        {annotations
          .filter((a) => a.type === 'text')
          .map((a) => (
            <div
              key={a.id}
              className="text-annotation"
              style={{
                left: `${a.position.x * 100}%`,
                top: `${a.position.y * 100}%`,
                fontSize: `${a.fontSize * size.height}px`,
                color: a.color,
                outline: selectedId === a.id ? '2px solid #2563eb' : 'none',
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingTextId(a.id);
              }}
            >
              {editingTextId === a.id ? (
                <DeferredFocusTextarea
                  defaultValue={a.text}
                  className="text-annotation-input"
                  style={{ fontSize: `${a.fontSize * size.height}px`, color: a.color }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value) updateAnnotation(a.id, { text: value } as Partial<Annotation>);
                    else removeAnnotation(a.id);
                    setEditingTextId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                />
              ) : (
                <span onPointerDown={(e) => e.stopPropagation()}>{a.text || ' '}</span>
              )}
            </div>
          ))}
        {annotations
          .filter((a) => a.type === 'comment')
          .map((a) => (
            <div
              key={a.id}
              className="comment-pin-wrap"
              style={{ left: `${a.position.x * 100}%`, top: `${a.position.y * 100}%` }}
            >
              <button
                className="comment-pin"
                style={{ background: a.color, outline: selectedId === a.id ? '2px solid #2563eb' : 'none' }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenCommentId(openCommentId === a.id ? null : a.id);
                }}
                aria-label="Comment"
              />
              {openCommentId === a.id && (
                <div className="comment-popup" onPointerDown={(e) => e.stopPropagation()}>
                  <DeferredFocusTextarea
                    defaultValue={a.text}
                    placeholder="Add a comment..."
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value) updateAnnotation(a.id, { text: value } as Partial<Annotation>);
                      else removeAnnotation(a.id);
                      setOpenCommentId(null);
                    }}
                  />
                  <div className="comment-popup-actions">
                    <button
                      onClick={() => {
                        removeAnnotation(a.id);
                        setOpenCommentId(null);
                      }}
                    >
                      Delete
                    </button>
                    <button onClick={() => setOpenCommentId(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        {tool === 'select' && selectedId && (
          <button
            className="delete-selected-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              removeAnnotation(selectedId);
              setSelectedId(null);
            }}
            style={(() => {
              const a = annotations.find((x) => x.id === selectedId);
              if (!a) return { display: 'none' };
              const pos = isStroke(a) ? a.points[0] : a.position;
              return { left: `${pos.x * 100}%`, top: `${pos.y * 100}%` };
            })()}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
