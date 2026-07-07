import { useEffect, useState } from 'react';
import type { FileEntry, Folder } from '../storage/types';
import { KIND_ICON } from '../storage/icons';
import { listFiles, listFolders } from '../storage/fileRepo';
import { EmojiPicker } from './EmojiPicker';
import { ItemActionsMenu } from './ItemActionsMenu';
import type { Nav } from './AppSidebar';

export type NavItem = { type: 'folder'; data: Folder } | { type: 'file'; data: FileEntry };

interface NavTreeRowProps {
  item: NavItem;
  depth: number;
  nav: Nav;
  activeTabId: string | null;
  refreshSignal: number;
  onSelectFolder: (id: string) => void;
  onOpenPage: (file: FileEntry) => void;
  onRenameItem: (kind: 'folder' | 'file', id: string, name: string) => void;
  onDeleteItem: (kind: 'folder' | 'file', id: string) => void;
  onSetIcon: (kind: 'folder' | 'file', id: string, icon: string) => void;
  onMoveIntoFolder: (kind: 'folder' | 'file', id: string, targetFolderId: string) => void;
  onLayoutChange: () => void;
}

export function NavTreeRow({
  item,
  depth,
  nav,
  activeTabId,
  refreshSignal,
  onSelectFolder,
  onOpenPage,
  onRenameItem,
  onDeleteItem,
  onSetIcon,
  onMoveIntoFolder,
  onLayoutChange,
}: NavTreeRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.data.name);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<{ folders: Folder[]; files: FileEntry[] } | null>(null);

  const isFolder = item.type === 'folder';
  const isSelected = isFolder && nav.type === 'folder' && nav.id === item.data.id;
  const isActiveFile = !isFolder && activeTabId === item.data.id;
  const icon = item.data.icon ?? (isFolder ? '📁' : KIND_ICON[(item.data as FileEntry).kind]);

  useEffect(() => {
    if (!isFolder || !expanded) return;
    let cancelled = false;
    Promise.all([listFolders(item.data.id), listFiles(item.data.id)]).then(([folders, files]) => {
      if (!cancelled) setChildren({ folders, files });
    });
    return () => {
      cancelled = true;
    };
  }, [isFolder, expanded, item.data.id, refreshSignal]);

  useEffect(() => {
    onLayoutChange();
  }, [expanded, children, onLayoutChange]);

  const startDrag = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-pkos-item', JSON.stringify({ kind: item.type, id: item.data.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!isFolder) return;
    const raw = e.dataTransfer.getData('application/x-pkos-item');
    if (!raw) return;
    const payload = JSON.parse(raw) as { kind: 'folder' | 'file'; id: string };
    if (payload.kind === 'folder' && payload.id === item.data.id) return;
    onMoveIntoFolder(payload.kind, payload.id, item.data.id);
  };

  const commitRename = () => {
    const name = renameValue.trim();
    if (name) onRenameItem(item.type, item.data.id, name);
    setRenaming(false);
  };

  const childItems: NavItem[] = children
    ? [
        ...children.folders.map((f): NavItem => ({ type: 'folder', data: f })),
        ...children.files.map((f): NavItem => ({ type: 'file', data: f })),
      ].sort((a, b) => a.data.name.localeCompare(b.data.name))
    : [];

  return (
    <div className="tree-node">
      <div
        className={`nav-row ${dragOver ? 'nav-row-drag-over' : ''}`}
        data-selected={isSelected ? 'true' : undefined}
        draggable
        onDragStart={startDrag}
        onDragOver={(e) => {
          if (!isFolder) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {isFolder && (
          <button
            className={`tree-chevron ${expanded ? 'expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            ▶
          </button>
        )}
        {renaming ? (
          <input
            autoFocus
            className="nav-create-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <button
            className={`nav-item ${isSelected ? 'selected' : ''}`}
            onClick={() => (isFolder ? onSelectFolder(item.data.id) : onOpenPage(item.data as FileEntry))}
          >
            {icon} <span className={`nav-item-label ${isActiveFile ? 'active-file' : ''}`}>{item.data.name}</span>
          </button>
        )}
        <div className="nav-row-actions">
          <ItemActionsMenu
            onChangeEmoji={() => setEmojiOpen((v) => !v)}
            onRename={() => {
              setRenameValue(item.data.name);
              setRenaming(true);
            }}
            onDelete={() => onDeleteItem(item.type, item.data.id)}
          />
        </div>
        {emojiOpen && (
          <EmojiPicker
            onSelect={(newIcon) => {
              onSetIcon(item.type, item.data.id, newIcon);
              setEmojiOpen(false);
            }}
            onClose={() => setEmojiOpen(false)}
          />
        )}
      </div>
      {isFolder && (
        <div className={`tree-children ${expanded ? 'expanded' : ''}`}>
          <div className="tree-children-inner">
            {children && childItems.length === 0 && <div className="tree-empty">Empty</div>}
            {childItems.map((child) => (
              <NavTreeRow
                key={child.data.id}
                item={child}
                depth={depth + 1}
                nav={nav}
                activeTabId={activeTabId}
                refreshSignal={refreshSignal}
                onSelectFolder={onSelectFolder}
                onOpenPage={onOpenPage}
                onRenameItem={onRenameItem}
                onDeleteItem={onDeleteItem}
                onSetIcon={onSetIcon}
                onMoveIntoFolder={onMoveIntoFolder}
                onLayoutChange={onLayoutChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
