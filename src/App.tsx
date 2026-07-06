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
import { FileBrowser } from './components/FileBrowser';
import { exportAnnotatedPdf } from './export/exportPdf';

interface OpenFile {
  id: string;
  name: string;
  data: ArrayBuffer;
}

function ViewerBody({
  data,
  scale,
  tool,
  color,
  strokeWidth,
  onPageEls,
  matchesForPage,
  onDocReady,
}: {
  data: ArrayBuffer;
  scale: number;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  onPageEls: (pageIndex: number, el: HTMLDivElement | null) => void;
  matchesForPage: (pageIndex: number) => { x: number; y: number; w: number; h: number }[];
  onDocReady: (doc: ReturnType<typeof usePdfDocument>['doc'], numPages: number) => void;
}) {
  const { doc, numPages } = usePdfDocument(data);
  useEffect(() => {
    onDocReady(doc, numPages);
  }, [doc, numPages, onDocReady]);
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

function ViewerView({ file, onBack }: { file: OpenFile; onBack: () => void }) {
  const [tool, setTool] = useState<AnnotationTool>('select');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(0.006);
  const [scale, setScale] = useState(1.2);
  const [currentPage, setCurrentPage] = useState(1);
  const [findOpen, setFindOpen] = useState(false);
  const [doc, setDoc] = useState<ReturnType<typeof usePdfDocument>['doc']>(null);
  const [numPages, setNumPages] = useState(0);

  const pageElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const search = useSearch(doc, numPages);

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

  const exportHandler = async () => {
    const fn = (window as unknown as { __exportCurrent?: () => Promise<void> }).__exportCurrent;
    if (fn) await fn();
  };

  const handleDocReady = useCallback((d: typeof doc, n: number) => {
    setDoc(d);
    setNumPages(n);
  }, []);

  return (
    <>
      <Toolbar
        fileName={file.name}
        onBack={onBack}
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
        onExport={exportHandler}
        onToggleFind={() => setFindOpen((v) => !v)}
      />
      {findOpen && (
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
        {doc && <Sidebar doc={doc} numPages={numPages} currentPage={currentPage} onNavigate={scrollToPage} />}
        <div className="viewer-scroll" ref={scrollContainerRef}>
          <AnnotationProvider docKey={file.id}>
            <ExportButtonHandler file={file} />
            <ViewerBody
              data={file.data}
              scale={scale}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              onPageEls={registerPageEl}
              matchesForPage={matchesForPage}
              onDocReady={handleDocReady}
            />
          </AnnotationProvider>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [file, setFile] = useState<OpenFile | null>(null);

  const handleOpenPdf = async (fileId: string, name: string, blob: Blob) => {
    const data = await blob.arrayBuffer();
    setFile({ id: fileId, name, data });
  };

  return (
    <div className="app">
      {file ? (
        <ViewerView file={file} onBack={() => setFile(null)} />
      ) : (
        <FileBrowser onOpenPdf={handleOpenPdf} />
      )}
    </div>
  );
}
