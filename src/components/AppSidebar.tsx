import { useEffect, useRef, useState } from 'react';
import type { FileEntry, Folder } from '../storage/types';
import { KIND_ICON } from '../storage/icons';
import { AddMenu } from './AddMenu';
import { EmojiPicker } from './EmojiPicker';

export type Nav = { type: 'home' } | { type: 'folder'; id: string };

type NavItem = { type: 'folder'; data: Folder } | { type: 'file'; data: FileEntry };

interface AppSidebarProps {
  topFolders: Folder[];
  topPages: FileEntry[];
  nav: Nav;
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

const ROW_H = 36;
const ROW_GAP = 2;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

export function AppSidebar({
  topFolders,
  topPages,
  nav,
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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [emojiTargetId, setEmojiTargetId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const resizing = useRef(false);

  const items: NavItem[] = [
    ...topFolders.map((f): NavItem => ({ type: 'folder', data: f })),
    ...topPages.map((f): NavItem => ({ type: 'file', data: f })),
  ].sort((a, b) => a.data.name.localeCompare(b.data.name));

  const homeSelected = nav.type === 'home';
  const selectedFolderIndex = items.findIndex(
    (item) => item.type === 'folder' && nav.type === 'folder' && item.data.id === nav.id,
  );
  const selectedIndex = homeSelected ? 0 : selectedFolderIndex + 1;

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

  const startDrag = (e: React.DragEvent, item: NavItem) => {
    e.dataTransfer.setData('application/x-pkos-item', JSON.stringify({ kind: item.type, id: item.data.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const raw = e.dataTransfer.getData('application/x-pkos-item');
    if (!raw) return;
    const payload = JSON.parse(raw) as { kind: 'folder' | 'file'; id: string };
    if (payload.kind === 'folder' && payload.id === targetFolderId) return;
    onMoveIntoFolder(payload.kind, payload.id, targetFolderId);
  };

  const commitRename = (item: NavItem) => {
    const name = renameValue.trim();
    if (name) onRenameItem(item.type, item.data.id, name);
    setRenamingId(null);
  };

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

          <nav className="app-sidebar-nav">
            {(homeSelected || selectedFolderIndex >= 0) && (
              <div
                className="nav-indicator"
                style={{ transform: `translateY(${selectedIndex * (ROW_H + ROW_GAP)}px)` }}
              />
            )}
            <div className="nav-row">
              <button className={`nav-item ${homeSelected ? 'selected' : ''}`} onClick={onSelectHome}>
                🏠 <span className="nav-item-label">Home</span>
              </button>
            </div>
            {items.map((item) => {
              const isSelected = item.type === 'folder' && nav.type === 'folder' && nav.id === item.data.id;
              const icon = item.data.icon ?? (item.type === 'folder' ? '📁' : KIND_ICON[item.data.kind]);
              return (
                <div
                  key={item.data.id}
                  className={`nav-row ${dragOverId === item.data.id ? 'nav-row-drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => startDrag(e, item)}
                  onDragOver={(e) => {
                    if (item.type !== 'folder') return;
                    e.preventDefault();
                    setDragOverId(item.data.id);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => item.type === 'folder' && handleDropOnFolder(e, item.data.id)}
                >
                  {renamingId === item.data.id ? (
                    <input
                      autoFocus
                      className="nav-create-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <button
                      className={`nav-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => (item.type === 'folder' ? onSelectFolder(item.data.id) : onOpenPage(item.data))}
                    >
                      {icon} <span className="nav-item-label">{item.data.name}</span>
                    </button>
                  )}
                  <div className="nav-row-actions">
                    <button
                      className="tile-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmojiTargetId(emojiTargetId === item.data.id ? null : item.data.id);
                      }}
                      title="Change emoji"
                    >
                      😀
                    </button>
                    <button
                      className="tile-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(item.data.id);
                        setRenameValue(item.data.name);
                      }}
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      className="tile-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.type, item.data.id);
                      }}
                      title="Delete"
                    >
                      x
                    </button>
                  </div>
                  {emojiTargetId === item.data.id && (
                    <EmojiPicker
                      onSelect={(icon) => {
                        onSetIcon(item.type, item.data.id, icon);
                        setEmojiTargetId(null);
                      }}
                      onClose={() => setEmojiTargetId(null)}
                    />
                  )}
                </div>
              );
            })}
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
