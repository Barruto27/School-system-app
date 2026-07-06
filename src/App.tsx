import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { usePdfDocument } from './hooks/usePdfDocument';
import { useSearch } from './hooks/useSearch';
import { AnnotationProvider, useAnnotations } from './annotations/store';
import type { AnnotationTool } from './annotations/types';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PageView } from './components/PageView';
import { FindBar } from './components/FindBar';
import { exportAnnotatedPdf } from './export/exportPdf';

interface OpenFile {
  name: string;
  key: string;
  data: ArrayBuffer;
}

function ViewerBody({
  file,
  scale,
  tool,
  color,
  strokeWidth,
  onPageEls,
  matchesForPage,
}: {
  file: OpenFile;
  scale: number;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  onPageEls: (pageIndex: number, el: HTMLDivElement | null) => void;
  matchesForPage: (pageIndex: number) => { x: number; y: number; w: number; h: number }[];
}) {
  const { doc, numPages } = usePdfDocument(file.data);
  if (!doc) return <div className="loading">Loading PDF...</div>;
  return (
    <>
      {Array.from({ length: numPages }, (_, i) => (
        <PageView
          key={i}
          doc={doc}
          pageIndex={i}
          scale={scale}
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          registerPageEl={onPageEls}
          searchRects={matchesForPage(i)}
        />
      ))}
    </>
  );
}

function ExportButtonHandler({ file }: { file: OpenFile }) {
  const { annotations } = useAnnotations();
  useEffect(() => {
    (window as unknown as { __exportCurrent?: () => Promise<void> }).__exportCurrent = async () => {
      const bytes = await exportAnnotatedPdf(file.data, annotations);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = file.name.replace(/\.pdf$/i, '');
      a.download = `${base}-annotated.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    };
  }, [file, annotations]);
  return null;
}

export default function App() {
  const [file, setFile] = useState<OpenFile | null>(null);
  const [tool, setTool] = useState<AnnotationTool>('select');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(0.006);
  const [scale, setScale] = useState(1.2);
  const [currentPage, setCurrentPage] = useState(1);
  const [findOpen, setFindOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { doc, numPages } = usePdfDocument(file?.data ?? null);
  const search = useSearch(doc, numPages);

  const handleOpenFile = () => fileInputRef.current?.click();

  const handleFileChosen = async (f: File) => {
    const data = await f.arrayBuffer();
    setFile({ name: f.name, key: `${f.name}:${f.size}:${f.lastModified}`, data });
    setCurrentPage(1);
    pageElsRef.current.clear();
  };

  const registerPageEl = useCallback((pageIndex: number, el: HTMLDivElement | null) => {
    if (el) pageElsRef.current.set(pageIndex, el);
    else pageElsRef.current.delete(pageIndex);
  }, []);

  const scrollToPage = useCallback((pageIndex: number) => {
    const el = pageElsRef.current.get(pageIndex);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handlePageChange = (page: number) => {
    const clamped = Math.max(1, Math.min(numPages, page));
    setCurrentPage(clamped);
    scrollToPage(clamped - 1);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !doc) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { ratio: number; index: number } | null = null;
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.pageIndex);
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.ratio)) {
            best = { ratio: entry.intersectionRatio, index: idx };
          }
        }
        if (best) setCurrentPage(best.index + 1);
      },
      { root: container, threshold: [0.1, 0.25, 0.5, 0.75] },
    );
    pageElsRef.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [doc, numPages]);

  const matchesForPage = useCallback(
    (pageIndex: number) => search.matches.filter((m) => m.pageIndex === pageIndex).map((m) => m.rect),
    [search.matches],
  );

  useEffect(() => {
    if (search.matches.length === 0) return;
    const active = search.matches[search.activeIndex];
    if (active) scrollToPage(active.pageIndex);
  }, [search.activeIndex, search.matches, scrollToPage]);

  const docKey = file?.key ?? 'none';

  const exportHandler = async () => {
    const fn = (window as unknown as { __exportCurrent?: () => Promise<void> }).__exportCurrent;
    if (fn) await fn();
  };

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileChosen(f);
          e.target.value = '';
        }}
      />
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        scale={scale}
        onZoomIn={() => setScale((s) => Math.min(3, s + 0.15))}
        onZoomOut={() => setScale((s) => Math.max(0.4, s - 0.15))}
        onZoomReset={() => setScale(1.2)}
        page={currentPage}
        numPages={numPages}
        onPageChange={handlePageChange}
        onOpenFile={handleOpenFile}
        onExport={exportHandler}
        onToggleFind={() => setFindOpen((v) => !v)}
        hasDoc={!!file}
      />
      {findOpen && file && (
        <FindBar
          query={search.query}
          onQueryChange={search.search}
          matchCount={search.matches.length}
          activeIndex={search.activeIndex}
          onNext={search.next}
          onPrev={search.prev}
          onClose={() => setFindOpen(false)}
        />
      )}
      <div className="main-area">
        {file && doc && (
          <Sidebar doc={doc} numPages={numPages} currentPage={currentPage} onNavigate={scrollToPage} />
        )}
        <div className="viewer-scroll" ref={scrollContainerRef}>
          {!file && (
            <div className="empty-state">
              <p>Open a PDF to start viewing and annotating.</p>
              <button onClick={handleOpenFile}>Open PDF</button>
            </div>
          )}
          {file && (
            <AnnotationProvider docKey={docKey}>
              <ExportButtonHandler file={file} />
              <ViewerBody
                file={file}
                scale={scale}
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
                onPageEls={registerPageEl}
                matchesForPage={matchesForPage}
              />
            </AnnotationProvider>
          )}
        </div>
      </div>
    </div>
  );
}
