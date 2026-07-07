import { useEffect, useRef, useState } from 'react';
import { getFileBlob, updateFileBlob } from '../storage/fileRepo';
import { EditableTitle } from './EditableTitle';
import { exportDeckToPptx } from '../export/exportPptx';

export interface TextBlock {
  id: string;
  type: 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize: number;
  align: 'left' | 'center' | 'right';
}

export interface ImageBlock {
  id: string;
  type: 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
}

export type SlideBlock = TextBlock | ImageBlock;

export interface Slide {
  id: string;
  blocks: SlideBlock[];
}

export interface Deck {
  slides: Slide[];
}

const SAVE_DEBOUNCE_MS = 500;

function newId(): string {
  return Math.random().toString(36).slice(2);
}

function emptyDeck(): Deck {
  return { slides: [{ id: newId(), blocks: [] }] };
}

interface DragState {
  blockId: string;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

interface SlideViewProps {
  fileId: string;
  fileName: string;
  onRename: (name: string) => void;
}

export function SlideView({ fileId, fileName, onRename }: SlideViewProps) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const saveTimeout = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const dragState = useRef<DragState | null>(null);
  const deckRef = useRef<Deck | null>(null);
  const activeIdxRef = useRef(0);

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  useEffect(() => {
    activeIdxRef.current = activeIdx;
  }, [activeIdx]);

  useEffect(() => {
    let cancelled = false;
    getFileBlob(fileId).then(async (blob) => {
      if (!blob || cancelled) return;
      const text = await blob.text();
      if (!text.trim()) {
        setDeck(emptyDeck());
        return;
      }
      try {
        const parsed = JSON.parse(text);
        setDeck(parsed.slides?.length ? parsed : emptyDeck());
      } catch {
        setDeck(emptyDeck());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    };
  }, []);

  const scheduleSave = (next: Deck) => {
    setDeck(next);
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(() => {
      updateFileBlob(fileId, new Blob([JSON.stringify(next)], { type: 'application/json' }));
    }, SAVE_DEBOUNCE_MS);
  };

  if (!deck) return null;

  const slide = deck.slides[activeIdx];

  const updateSlideAt = (idx: number, updater: (s: Slide) => Slide) => {
    const base = deckRef.current ?? deck;
    const nextSlides = base.slides.map((s, i) => (i === idx ? updater(s) : s));
    scheduleSave({ ...base, slides: nextSlides });
  };

  const updateBlock = (blockId: string, patch: Partial<TextBlock> & Partial<ImageBlock>) => {
    updateSlideAt(activeIdxRef.current, (s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as SlideBlock) : b)),
    }));
  };

  const addTextBlock = () => {
    const block: TextBlock = {
      id: newId(),
      type: 'text',
      x: 0.15,
      y: 0.4,
      w: 0.7,
      h: 0.2,
      text: 'Text',
      fontSize: 28,
      align: 'left',
    };
    updateSlideAt(activeIdx, (s) => ({ ...s, blocks: [...s.blocks, block] }));
    setSelectedBlockId(block.id);
    setEditingTextId(block.id);
  };

  const addImageBlock = (src: string) => {
    const block: ImageBlock = { id: newId(), type: 'image', x: 0.25, y: 0.25, w: 0.5, h: 0.5, src };
    updateSlideAt(activeIdx, (s) => ({ ...s, blocks: [...s.blocks, block] }));
    setSelectedBlockId(block.id);
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlockId) return;
    updateSlideAt(activeIdx, (s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== selectedBlockId) }));
    setSelectedBlockId(null);
  };

  const addSlide = () => {
    const base = deckRef.current ?? deck;
    const next = { ...base, slides: [...base.slides, { id: newId(), blocks: [] }] };
    scheduleSave(next);
    setActiveIdx(next.slides.length - 1);
    setSelectedBlockId(null);
  };

  const deleteSlide = (idx: number) => {
    const base = deckRef.current ?? deck;
    if (base.slides.length <= 1) return;
    const next = { ...base, slides: base.slides.filter((_, i) => i !== idx) };
    scheduleSave(next);
    setActiveIdx((cur) => Math.min(cur, next.slides.length - 1));
    setSelectedBlockId(null);
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const base = deckRef.current ?? deck;
    const target = idx + dir;
    if (target < 0 || target >= base.slides.length) return;
    const slides = [...base.slides];
    [slides[idx], slides[target]] = [slides[target], slides[idx]];
    scheduleSave({ ...base, slides });
    setActiveIdx(target);
  };

  const onDragMove = (e: PointerEvent) => {
    const ds = dragState.current;
    const canvas = canvasRef.current;
    if (!ds || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - ds.startX) / rect.width;
    const dy = (e.clientY - ds.startY) / rect.height;
    if (ds.mode === 'move') {
      updateBlock(ds.blockId, {
        x: Math.max(0, Math.min(1 - ds.origW, ds.origX + dx)),
        y: Math.max(0, Math.min(1 - ds.origH, ds.origY + dy)),
      });
    } else {
      updateBlock(ds.blockId, {
        w: Math.max(0.06, Math.min(1 - ds.origX, ds.origW + dx)),
        h: Math.max(0.06, Math.min(1 - ds.origY, ds.origH + dy)),
      });
    }
  };

  const onDragEnd = () => {
    dragState.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  };

  const beginDrag = (e: React.PointerEvent, block: SlideBlock, mode: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedBlockId(block.id);
    dragState.current = {
      blockId: block.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: block.x,
      origY: block.y,
      origW: block.w,
      origH: block.h,
    };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDeckToPptx(deckRef.current ?? deck, fileName);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="toolbar toolbar-centered">
        <div className="toolbar-group">
          <EditableTitle name={fileName} onRename={onRename} />
        </div>
        <div className="toolbar-center-cluster">
          <div className="toolbar-group">
            <button onClick={addTextBlock} title="Add text box">
              T+
            </button>
            <button onClick={() => imageInputRef.current?.click()} title="Add image">
              🖼
            </button>
            <button onClick={deleteSelectedBlock} disabled={!selectedBlockId} title="Delete selected block">
              Delete
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => addImageBlock(reader.result as string);
                  reader.readAsDataURL(file);
                }
                e.target.value = '';
              }}
            />
          </div>
          <div className="toolbar-group">
            <button onClick={handleExport} disabled={exporting} title="Export as PowerPoint">
              {exporting ? 'Exporting…' : 'Export .pptx'}
            </button>
          </div>
        </div>
      </div>
      <div className="main-area">
        <div className="slide-rail">
          {deck.slides.map((s, idx) => (
            <div
              key={s.id}
              className={`slide-thumb ${idx === activeIdx ? 'active' : ''}`}
              onClick={() => {
                setActiveIdx(idx);
                setSelectedBlockId(null);
              }}
            >
              <div className="slide-thumb-canvas">
                {s.blocks.map((b) => (
                  <div
                    key={b.id}
                    className={`slide-thumb-block ${b.type}`}
                    style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
                  >
                    {b.type === 'image' && <img src={b.src} alt="" />}
                  </div>
                ))}
              </div>
              <div className="slide-thumb-footer">
                <span>{idx + 1}</span>
                <div className="slide-thumb-actions">
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(idx, -1); }} disabled={idx === 0} title="Move up">
                    ↑
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlide(idx, 1); }}
                    disabled={idx === deck.slides.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                    disabled={deck.slides.length <= 1}
                    title="Delete slide"
                  >
                    x
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button className="slide-add-btn" onClick={addSlide} title="Add slide">
            + Slide
          </button>
        </div>
        <div className="viewer-scroll">
          <div
            className="slide-canvas"
            ref={canvasRef}
            onClick={() => {
              setSelectedBlockId(null);
              setEditingTextId(null);
            }}
          >
            {slide.blocks.map((block) => (
              <div
                key={block.id}
                className={`slide-block ${block.type} ${selectedBlockId === block.id ? 'selected' : ''}`}
                style={{
                  left: `${block.x * 100}%`,
                  top: `${block.y * 100}%`,
                  width: `${block.w * 100}%`,
                  height: `${block.h * 100}%`,
                }}
                onPointerDown={(e) => beginDrag(e, block, 'move')}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={() => block.type === 'text' && setEditingTextId(block.id)}
              >
                {block.type === 'text' ? (
                  editingTextId === block.id ? (
                    <div
                      className="slide-text-edit"
                      contentEditable
                      suppressContentEditableWarning
                      ref={(el) => {
                        if (!el) return;
                        requestAnimationFrame(() => {
                          el.focus();
                          const range = document.createRange();
                          range.selectNodeContents(el);
                          const sel = window.getSelection();
                          sel?.removeAllRanges();
                          sel?.addRange(range);
                        });
                      }}
                      style={{ fontSize: (block as TextBlock).fontSize, textAlign: (block as TextBlock).align }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        updateBlock(block.id, { text: e.currentTarget.textContent ?? '' });
                        setEditingTextId(null);
                      }}
                    >
                      {(block as TextBlock).text}
                    </div>
                  ) : (
                    <div
                      className="slide-text-display"
                      style={{ fontSize: (block as TextBlock).fontSize, textAlign: (block as TextBlock).align }}
                    >
                      {(block as TextBlock).text}
                    </div>
                  )
                ) : (
                  <img src={(block as ImageBlock).src} alt="" draggable={false} />
                )}
                {selectedBlockId === block.id && (
                  <div className="slide-resize-handle" onPointerDown={(e) => beginDrag(e, block, 'resize')} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
