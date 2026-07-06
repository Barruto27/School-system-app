import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileEntry, Folder } from '../storage/types';
import { AddMenu } from './AddMenu';
import { NavTreeRow, type NavItem } from './NavTreeRow';

export type Nav = { type: 'home' } | { type: 'folder'; id: string };

interface AppSidebarProps {
  topFolders: Folder[];
  topPages: FileEntry[];
  nav: Nav;
  activeTabId: string | null;
  refreshSignal: number;
  onSelectHome: () => void;
  onSelectFolder: (id: string) => void;
  onOpenPage: (file: FileEntry) => void;
  onCreateFolder: (name: string) => void;
  onUpload: () => void;
  onNewNote: () => void;
  onNewCanvas: () => void;
  onRenameItem: (kind: 'folder' | 'file', id: string, name: string) => void;
  onDeleteItem: (kind: 'folder' | 'file', id: string) => void;
  onSetIcon: (kind: 'folder' | 'file', id: string, icon: string) => void;
  onMoveIntoFolder: (kind: 'folder' | 'file', id: string, targetFolderId: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

export function AppSidebar({
  topFolders,
  topPages,
  nav,
  activeTabId,
  refreshSignal,
  onSelectHome,
  onSelectFolder,
  onOpenPage,
  onCreateFolder,
  onUpload,
  onNewNote,
  onNewCanvas,
  onRenameItem,
  onDeleteItem,
  onSetIcon,
  onMoveIntoFolder,
  width,
  onWidthChange,
  collapsed,
  onToggleCollapsed,
  onOpenSettings,
}: AppSidebarProps) {
  const resizing = useRef(false);
  const navRef = useRef<HTMLElement | null>(null);
  const [indicatorY, setIndicatorY] = useState<number | null>(null);

  const items: NavItem[] = [
    ...topFolders.map((f): NavItem => ({ type: 'folder', data: f })),
    ...topPages.map((f): NavItem => ({ type: 'file', data: f })),
  ].sort((a, b) => a.data.name.localeCompare(b.data.name));

  const homeSelected = nav.type === 'home';

  const measureIndicator = useCallback(() => {
    const container = navRef.current;
    if (!container) return;
    const selected = container.querySelector('[data-selected="true"]');
    setIndicatorY(selected instanceof HTMLElement ? selected.offsetTop : null);
  }, []);

  useEffect(() => {
    measureIndicator();
  }, [nav, items, measureIndicator]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizing.current) return;
      onWidthChange(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    };
    const onUp = () => {
      resizing.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onWidthChange]);

  return (
    <>
      {collapsed && (
        <button className="sidebar-expand-toggle" onClick={onToggleCollapsed} title="Show sidebar">
          »
        </button>
      )}
      <div className="app-sidebar" style={{ width: collapsed ? 0 : width }}>
        <div className="app-sidebar-inner" style={{ width }}>
          <div className="app-sidebar-header">
            <span className="app-sidebar-title">Personal Knowledge OS</span>
            <div className="app-sidebar-header-actions">
              <AddMenu
                folderLabel="Category"
                onCreateFolder={onCreateFolder}
                onUpload={onUpload}
                onNewNote={onNewNote}
                onNewCanvas={onNewCanvas}
              />
              <button className="sidebar-collapse-toggle" onClick={onToggleCollapsed} title="Hide sidebar">
                «
              </button>
            </div>
          </div>

          <nav className="app-sidebar-nav" ref={navRef}>
            {indicatorY !== null && (
              <div className="nav-indicator" style={{ transform: `translateY(${indicatorY}px)` }} />
            )}
            <div className="nav-row" data-selected={homeSelected ? 'true' : undefined}>
              <button className={`nav-item ${homeSelected ? 'selected' : ''}`} onClick={onSelectHome}>
                🏠 <span className="nav-item-label">Home</span>
              </button>
            </div>
            {items.map((item) => (
              <NavTreeRow
                key={item.data.id}
                item={item}
                depth={0}
                nav={nav}
                activeTabId={activeTabId}
                refreshSignal={refreshSignal}
                onSelectFolder={onSelectFolder}
                onOpenPage={onOpenPage}
                onRenameItem={onRenameItem}
                onDeleteItem={onDeleteItem}
                onSetIcon={onSetIcon}
                onMoveIntoFolder={onMoveIntoFolder}
                onLayoutChange={measureIndicator}
              />
            ))}
          </nav>

          <button className="sidebar-settings-btn" onClick={onOpenSettings} title="Settings">
            ⚙️ Settings
          </button>
        </div>

        {!collapsed && (
          <div
            className="sidebar-resize-handle"
            onPointerDown={(e) => {
              e.preventDefault();
              resizing.current = true;
            }}
          />
        )}
      </div>
    </>
  );
}
