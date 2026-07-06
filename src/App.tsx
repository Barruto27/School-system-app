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
import { NoteView } from './components/NoteView';
import { CanvasView } from './components/CanvasView';
import { AppSidebar, type Nav } from './components/AppSidebar';
import { HomeView } from './components/HomeView';
import { SettingsPanel } from './components/SettingsPanel';
import { exportAnnotatedPdf } from './export/exportPdf';
import { ROOT_ID, type FileEntry, type Folder } from './storage/types';
import {
  addFile,
  createCanvas,
  createFolder,
  createNote,
  deleteFile,
  deleteFolder,
  getFileBlob,
  listFiles,
  listFolders,
  moveFile,
  moveFolder,
  renameFile,
  renameFolder,
  setFileIcon,
  setFolderIcon,
} from './storage/fileRepo';
import {
  applyAccent,
  applyFont,
  applyTheme,
  loadAccent,
  loadFont,
  loadTheme,
  resetAccent,
  type FontName,
  type ThemeName,
} from './theme';

export interface RecentFile {
  id: string;
  name: string;
  kind: FileEntry['kind'];
  icon?: string;
}

const RECENT_KEY = 'pkos:recentFiles';
const MAX_RECENTS = 6;

function loadRecents(): RecentFile[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface OpenFile {
  id: string;
  name: string;
  data: ArrayBuffer;
}

type OpenDoc =
  | { kind: 'pdf'; id: string; name: string; data: ArrayBuffer }
  | { kind: 'note'; id: string; name: string }
  | { kind: 'canvas'; id: string; name: string };

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

function ViewerView({ file }: { file: OpenFile }) {
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

const SIDEBAR_WIDTH_KEY = 'pkos:sidebarWidth';

export default function App() {
  const [openDoc, setOpenDoc] = useState<OpenDoc | null>(null);
  const [nav, setNav] = useState<Nav>({ type: 'home' });
  const [topFolders, setTopFolders] = useState<Folder[]>([]);
  const [topPages, setTopPages] = useState<FileEntry[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return saved >= 180 && saved <= 360 ? saved : 240;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(loadTheme);
  const [font, setFont] = useState<FontName>(loadFont);
  const [accent, setAccent] = useState<string | null>(loadAccent);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecents);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyFont(font);
  }, [font]);

  useEffect(() => {
    if (accent) applyAccent(accent);
    else resetAccent();
  }, [accent]);

  const refreshTopLevel = useCallback(() => {
    listFolders(ROOT_ID).then(setTopFolders);
    listFiles(ROOT_ID).then(setTopPages);
  }, []);

  useEffect(() => {
    refreshTopLevel();
  }, [refreshTopLevel]);

  const handleWidthChange = (w: number) => {
    setSidebarWidth(w);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
  };

  const pushRecent = useCallback((file: FileEntry) => {
    setRecentFiles((prev) => {
      const next = [
        { id: file.id, name: file.name, kind: file.kind, icon: file.icon },
        ...prev.filter((r) => r.id !== file.id),
      ].slice(0, MAX_RECENTS);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleOpenFile = async (file: FileEntry, blob: Blob) => {
    if (file.kind === 'pdf') {
      const data = await blob.arrayBuffer();
      setOpenDoc({ kind: 'pdf', id: file.id, name: file.name, data });
    } else if (file.kind === 'note') {
      setOpenDoc({ kind: 'note', id: file.id, name: file.name });
    } else if (file.kind === 'canvas') {
      setOpenDoc({ kind: 'canvas', id: file.id, name: file.name });
    } else {
      return;
    }
    pushRecent(file);
  };

  const handleOpenPage = async (file: FileEntry) => {
    const blob = await getFileBlob(file.id);
    if (blob) handleOpenFile(file, blob);
  };

  const handleOpenRecent = (recent: RecentFile) => handleOpenPage(recent as FileEntry);

  const onBack = () => setOpenDoc(null);

  const handleNewFolderAtRoot = async (name: string) => {
    await createFolder(name, ROOT_ID);
    refreshTopLevel();
  };

  const handleNewNoteAtRoot = async () => {
    const entry = await createNote('Untitled Note', ROOT_ID);
    refreshTopLevel();
    const blob = await getFileBlob(entry.id);
    if (blob) handleOpenFile(entry, blob);
  };

  const handleNewCanvasAtRoot = async () => {
    const entry = await createCanvas('Untitled Canvas', ROOT_ID);
    refreshTopLevel();
    const blob = await getFileBlob(entry.id);
    if (blob) handleOpenFile(entry, blob);
  };

  const handleRenameItem = async (kind: 'folder' | 'file', id: string, name: string) => {
    if (kind === 'folder') await renameFolder(id, name);
    else await renameFile(id, name);
    refreshTopLevel();
  };

  const handleDeleteItem = async (kind: 'folder' | 'file', id: string) => {
    if (kind === 'folder') await deleteFolder(id);
    else await deleteFile(id);
    if (kind === 'folder' && nav.type === 'folder' && nav.id === id) setNav({ type: 'home' });
    refreshTopLevel();
  };

  const handleSetIcon = async (kind: 'folder' | 'file', id: string, icon: string) => {
    if (kind === 'folder') await setFolderIcon(id, icon);
    else await setFileIcon(id, icon);
    refreshTopLevel();
  };

  const handleMoveIntoFolder = async (kind: 'folder' | 'file', id: string, targetFolderId: string) => {
    if (kind === 'folder') await moveFolder(id, targetFolderId);
    else await moveFile(id, targetFolderId);
    refreshTopLevel();
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [docMounted, setDocMounted] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [renderedDoc, setRenderedDoc] = useState<OpenDoc | null>(null);

  useEffect(() => {
    if (openDoc) {
      setRenderedDoc(openDoc);
      setDocMounted(true);
      const raf = requestAnimationFrame(() => setDocOpen(true));
      return () => cancelAnimationFrame(raf);
    }
    setDocOpen(false);
    const t = window.setTimeout(() => {
      setDocMounted(false);
      setRenderedDoc(null);
    }, 340);
    return () => window.clearTimeout(t);
  }, [openDoc]);

  const navKey = nav.type === 'home' ? 'home' : `folder:${nav.id}`;

  return (
    <div className="app">
      <div className="app-body">
        <AppSidebar
          topFolders={topFolders}
          topPages={topPages}
          nav={nav}
          onSelectHome={() => setNav({ type: 'home' })}
          onSelectFolder={(id) => setNav({ type: 'folder', id })}
          onOpenPage={handleOpenPage}
          onCreateFolder={handleNewFolderAtRoot}
          onUpload={() => fileInputRef.current?.click()}
          onNewNote={handleNewNoteAtRoot}
          onNewCanvas={handleNewCanvasAtRoot}
          onRenameItem={handleRenameItem}
          onDeleteItem={handleDeleteItem}
          onSetIcon={handleSetIcon}
          onMoveIntoFolder={handleMoveIntoFolder}
          width={sidebarWidth}
          onWidthChange={handleWidthChange}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="app-main">
          <div className="app-content">
            <div className="browse-pane">
              <div key={navKey} className="browse-pane-content">
                {nav.type === 'home' && (
                  <HomeView
                    onNewNote={handleNewNoteAtRoot}
                    onNewCanvas={handleNewCanvasAtRoot}
                    onUpload={() => fileInputRef.current?.click()}
                    onCreateFolder={handleNewFolderAtRoot}
                    recentFiles={recentFiles}
                    onOpenRecent={handleOpenRecent}
                  />
                )}
                {nav.type === 'folder' && (
                  <FileBrowser
                    folderId={nav.id}
                    onNavigate={(id) => setNav({ type: 'folder', id })}
                    onOpenFile={handleOpenFile}
                    onLibraryChanged={refreshTopLevel}
                  />
                )}
              </div>
            </div>
            {docMounted && renderedDoc && (
              <div className={`doc-pane ${docOpen ? 'open' : ''}`}>
                <button className="doc-pane-tab" onClick={onBack} title="Back to files">
                  ❮
                </button>
                <div className="doc-pane-inner">
                  {renderedDoc.kind === 'pdf' && (
                    <ViewerView file={{ id: renderedDoc.id, name: renderedDoc.name, data: renderedDoc.data }} />
                  )}
                  {renderedDoc.kind === 'note' && <NoteView fileId={renderedDoc.id} fileName={renderedDoc.name} />}
                  {renderedDoc.kind === 'canvas' && (
                    <CanvasView fileId={renderedDoc.id} fileName={renderedDoc.name} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {settingsOpen && (
        <SettingsPanel
          theme={theme}
          font={font}
          accent={accent}
          onThemeChange={setTheme}
          onFontChange={setFont}
          onAccentChange={setAccent}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={async (e) => {
          const files = e.target.files;
          if (files) {
            for (const file of Array.from(files)) await addFile(file, ROOT_ID);
            refreshTopLevel();
            setNav({ type: 'folder', id: ROOT_ID });
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
