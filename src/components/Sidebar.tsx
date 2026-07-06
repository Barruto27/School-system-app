import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from '../pdf/pdfjs';

interface OutlineNode {
  title: string;
  pageIndex: number | null;
  items?: OutlineNode[];
}

interface SidebarProps {
  doc: PDFDocumentProxy;
  numPages: number;
  currentPage: number;
  onNavigate: (pageIndex: number) => void;
}

function ThumbnailItem({
  doc,
  pageIndex,
  active,
  onClick,
}: {
  doc: PDFDocumentProxy;
  pageIndex: number;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    doc.getPage(pageIndex + 1).then(async (page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1 });
      const targetWidth = 120;
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      try {
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      } catch {
        // ignore cancelled render
      }
    });
    return () => {
      cancelled = true;
    };
  }, [doc, pageIndex]);

  return (
    <button className={`thumbnail ${active ? 'active' : ''}`} onClick={onClick}>
      <canvas ref={canvasRef} />
      <span>{pageIndex + 1}</span>
    </button>
  );
}

function OutlineList({
  items,
  onNavigate,
}: {
  items: OutlineNode[];
  onNavigate: (pageIndex: number) => void;
}) {
  return (
    <ul className="outline-list">
      {items.map((item, i) => (
        <li key={i}>
          <button
            className="outline-item"
            disabled={item.pageIndex === null}
            onClick={() => item.pageIndex !== null && onNavigate(item.pageIndex)}
          >
            {item.title}
          </button>
          {item.items && item.items.length > 0 && (
            <OutlineList items={item.items} onNavigate={onNavigate} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function Sidebar({ doc, numPages, currentPage, onNavigate }: SidebarProps) {
  const [tab, setTab] = useState<'thumbnails' | 'outline'>('thumbnails');
  const [outline, setOutline] = useState<OutlineNode[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOutline(null);

    async function resolveDest(dest: unknown): Promise<number | null> {
      try {
        let explicitDest = dest;
        if (typeof dest === 'string') {
          explicitDest = await doc.getDestination(dest);
        }
        if (!Array.isArray(explicitDest)) return null;
        const ref = explicitDest[0];
        const index = await doc.getPageIndex(ref);
        return index;
      } catch {
        return null;
      }
    }

    async function convert(items: any[]): Promise<OutlineNode[]> {
      const result: OutlineNode[] = [];
      for (const item of items) {
        const pageIndex = item.dest ? await resolveDest(item.dest) : null;
        result.push({
          title: item.title,
          pageIndex,
          items: item.items && item.items.length ? await convert(item.items) : undefined,
        });
      }
      return result;
    }

    doc.getOutline().then(async (raw) => {
      if (cancelled) return;
      if (!raw || raw.length === 0) {
        setOutline([]);
        return;
      }
      const converted = await convert(raw);
      if (!cancelled) setOutline(converted);
    });

    return () => {
      cancelled = true;
    };
  }, [doc]);

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button className={tab === 'thumbnails' ? 'active' : ''} onClick={() => setTab('thumbnails')}>
          Pages
        </button>
        <button className={tab === 'outline' ? 'active' : ''} onClick={() => setTab('outline')}>
          Outline
        </button>
      </div>
      <div className="sidebar-content">
        {tab === 'thumbnails' &&
          Array.from({ length: numPages }, (_, i) => (
            <ThumbnailItem
              key={i}
              doc={doc}
              pageIndex={i}
              active={currentPage === i + 1}
              onClick={() => onNavigate(i)}
            />
          ))}
        {tab === 'outline' && (
          <>
            {outline === null && <div className="sidebar-empty">Loading...</div>}
            {outline !== null && outline.length === 0 && (
              <div className="sidebar-empty">No table of contents in this PDF.</div>
            )}
            {outline !== null && outline.length > 0 && (
              <OutlineList items={outline} onNavigate={onNavigate} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
