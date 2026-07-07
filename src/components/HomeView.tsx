import { useMemo, useState } from 'react';
import type { RecentFile } from '../App';
import type { FileEntry, Folder } from '../storage/types';
import { KIND_ICON } from '../storage/icons';
import { AddMenu } from './AddMenu';
import { EmojiPicker } from './EmojiPicker';
import { ItemActionsMenu } from './ItemActionsMenu';

type LibItem = { type: 'folder'; data: Folder } | { type: 'file'; data: FileEntry };
type SortKey = 'name' | 'modified' | 'created' | 'size';
type ViewMode = 'grid' | 'list';
type TileSize = 'small' | 'medium' | 'large';

interface HomeViewProps {
  onNewNote: () => void;
  onNewCanvas: () => void;
  onNewSlides: () => void;
  onUpload: () => void;
  onCreateFolder: (name: string) => void;
  recentFiles: RecentFile[];
  onOpenRecent: (file: RecentFile) => void;
  topFolders: Folder[];
  topPages: FileEntry[];
  onSelectFolder: (id: string) => void;
  onOpenFileEntry: (file: FileEntry) => void;
  onRenameItem: (kind: 'folder' | 'file', id: string, name: string) => void;
  onDeleteItem: (kind: 'folder' | 'file', id: string) => void;
  onSetIcon: (kind: 'folder' | 'file', id: string, icon: string) => void;
  onMoveIntoFolder: (kind: 'folder' | 'file', id: string, targetFolderId: string) => void;
}

const MESSAGE_KEY = 'pkos:homeMessage';
const DEFAULT_MESSAGE = "Everything you're working on, in one place.";
const VIEW_MODE_KEY = 'pkos:homeViewMode';
const SORT_KEY_KEY = 'pkos:homeSortKey';
const TILE_SIZE_KEY = 'pkos:homeTileSize';

function loadStored<T extends string>(key: string, valid: T[], fallback: T): T {
  const saved = localStorage.getItem(key);
  return (valid as string[]).includes(saved ?? '') ? (saved as T) : fallback;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function itemCreated(item: LibItem): number {
  return item.type === 'folder' ? item.data.createdAt : item.data.dateAdded;
}

function itemModified(item: LibItem): number {
  return item.type === 'folder' ? item.data.createdAt : item.data.dateModified ?? item.data.dateAdded;
}

function itemSize(item: LibItem): number {
  return item.type === 'file' ? item.data.size : -1;
}

function sortItems(items: LibItem[], sortKey: SortKey): LibItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sortKey) {
      case 'size':
        return itemSize(b) - itemSize(a);
      case 'created':
        return itemCreated(b) - itemCreated(a);
      case 'modified':
        return itemModified(b) - itemModified(a);
      default:
        return a.data.name.localeCompare(b.data.name);
    }
  });
  return copy;
}

export function HomeView({
  onNewNote,
  onNewCanvas,
  onNewSlides,
  onUpload,
  onCreateFolder,
  recentFiles,
  onOpenRecent,
  topFolders,
  topPages,
  onSelectFolder,
  onOpenFileEntry,
  onRenameItem,
  onDeleteItem,
  onSetIcon,
  onMoveIntoFolder,
}: HomeViewProps) {
  const [message, setMessage] = useState(() => localStorage.getItem(MESSAGE_KEY) ?? DEFAULT_MESSAGE);
  const [editingMessage, setEditingMessage] = useState(false);
  const [draft, setDraft] = useState(message);

  const [viewMode, setViewMode] = useState<ViewMode>(() => loadStored(VIEW_MODE_KEY, ['grid', 'list'], 'grid'));
  const [sortKey, setSortKey] = useState<SortKey>(() =>
    loadStored(SORT_KEY_KEY, ['name', 'modified', 'created', 'size'], 'name'),
  );
  const [tileSize, setTileSize] = useState<TileSize>(() =>
    loadStored(TILE_SIZE_KEY, ['small', 'medium', 'large'], 'medium'),
  );

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [emojiTargetId, setEmojiTargetId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };
  const changeSortKey = (key: SortKey) => {
    setSortKey(key);
    localStorage.setItem(SORT_KEY_KEY, key);
  };
  const changeTileSize = (size: TileSize) => {
    setTileSize(size);
    localStorage.setItem(TILE_SIZE_KEY, size);
  };

  const items: LibItem[] = useMemo(
    () =>
      sortItems(
        [
          ...topFolders.map((f): LibItem => ({ type: 'folder', data: f })),
          ...topPages.map((f): LibItem => ({ type: 'file', data: f })),
        ],
        sortKey,
      ),
    [topFolders, topPages, sortKey],
  );

  const actions = [
    { label: 'New Note', icon: '🗒️', onClick: onNewNote },
    { label: 'New Canvas', icon: '🎨', onClick: onNewCanvas },
    { label: 'New Slides', icon: '📊', onClick: onNewSlides },
    { label: 'Upload', icon: '⬆️', onClick: onUpload },
  ];

  const commitMessage = () => {
    const trimmed = draft.trim() || DEFAULT_MESSAGE;
    setMessage(trimmed);
    localStorage.setItem(MESSAGE_KEY, trimmed);
    setEditingMessage(false);
  };

  const startDrag = (e: React.DragEvent, item: LibItem) => {
    e.dataTransfer.setData('application/x-pkos-item', JSON.stringify({ kind: item.type, id: item.data.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const raw = e.dataTransfer.getData('application/x-pkos-item');
    if (!raw) return;
    const payload = JSON.parse(raw) as { kind: 'folder' | 'file'; id: string };
    if (payload.kind === 'folder' && payload.id === targetFolderId) return;
    onMoveIntoFolder(payload.kind, payload.id, targetFolderId);
  };

  const commitRename = (item: LibItem) => {
    const name = renameValue.trim();
    if (name) onRenameItem(item.type, item.data.id, name);
    setRenamingId(null);
  };

  const openItem = (item: LibItem) => {
    if (item.type === 'folder') onSelectFolder(item.data.id);
    else onOpenFileEntry(item.data);
  };

  return (
    <div className="home-view">
      <div className="home-hero">
        <h1 className="home-title">welcome.</h1>
        {editingMessage ? (
          <input
            autoFocus
            className="home-subtitle-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitMessage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setDraft(message);
                setEditingMessage(false);
              }
            }}
          />
        ) : (
          <p
            className="home-subtitle home-subtitle-editable"
            onClick={() => {
              setDraft(message);
              setEditingMessage(true);
            }}
            title="Click to edit"
          >
            {message}
          </p>
        )}
      </div>
      <div className="home-actions">
        {actions.map((a) => (
          <button key={a.label} className="home-action-tile" onClick={a.onClick}>
            <span className="home-action-icon">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      <div className="home-quick-access">
        <div className="home-quick-access-header">
          <h2>Recently Opened</h2>
          <AddMenu
            onCreateFolder={onCreateFolder}
            onUpload={onUpload}
            onNewNote={onNewNote}
            onNewCanvas={onNewCanvas}
            onNewSlides={onNewSlides}
          />
        </div>
        {recentFiles.length === 0 ? (
          <p className="home-quick-access-empty">Files you open will show up here for fast access.</p>
        ) : (
          <div className="home-quick-access-grid">
            {recentFiles.slice(0, 5).map((f) => (
              <button key={f.id} className="home-recent-tile" onClick={() => onOpenRecent(f)} title={f.name}>
                <span className="home-recent-icon">{f.icon ?? KIND_ICON[f.kind]}</span>
                <span className="home-recent-name">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="home-library">
        <div className="home-library-header">
          <h2>My Files</h2>
          <div className="home-library-controls">
            <select
              className="home-sort-select"
              value={sortKey}
              onChange={(e) => changeSortKey(e.target.value as SortKey)}
              title="Sort by"
            >
              <option value="name">Name</option>
              <option value="modified">Date modified</option>
              <option value="created">Date created</option>
              <option value="size">Size</option>
            </select>
            {viewMode === 'grid' && (
              <div className="home-tile-size-group">
                {(['small', 'medium', 'large'] as TileSize[]).map((s) => (
                  <button
                    key={s}
                    className={tileSize === s ? 'active' : ''}
                    onClick={() => changeTileSize(s)}
                    title={`${s[0].toUpperCase()}${s.slice(1)} tiles`}
                  >
                    {s === 'small' ? 'S' : s === 'medium' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
            )}
            <div className="home-view-mode-group">
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => changeViewMode('grid')}
                title="Grid view"
              >
                ▦
              </button>
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => changeViewMode('list')}
                title="List view"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="home-quick-access-empty">Your files and categories will show up here.</p>
        ) : viewMode === 'grid' ? (
          <div className={`home-file-grid tile-size-${tileSize}`}>
            {items.map((item) => {
              const isFolder = item.type === 'folder';
              const icon = item.data.icon ?? (isFolder ? '📁' : KIND_ICON[(item.data as FileEntry).kind]);
              const isRenaming = renamingId === item.data.id;
              return (
                <div
                  key={item.data.id}
                  className={`folder-tile ${dragOverId === item.data.id ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => startDrag(e, item)}
                  onDragOver={(e) => {
                    if (!isFolder) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverId(item.data.id);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => isFolder && handleDrop(e, item.data.id)}
                  onClick={() => openItem(item)}
                >
                  <div className="tile-actions">
                    <ItemActionsMenu
                      onChangeEmoji={() => setEmojiTargetId(emojiTargetId === item.data.id ? null : item.data.id)}
                      onRename={() => {
                        setRenamingId(item.data.id);
                        setRenameValue(item.data.name);
                      }}
                      onDelete={() => onDeleteItem(item.type, item.data.id)}
                    />
                  </div>
                  <span className="file-tile-icon">{icon}</span>
                  {emojiTargetId === item.data.id && (
                    <EmojiPicker
                      onSelect={(newIcon) => {
                        onSetIcon(item.type, item.data.id, newIcon);
                        setEmojiTargetId(null);
                      }}
                      onClose={() => setEmojiTargetId(null)}
                    />
                  )}
                  {isRenaming ? (
                    <input
                      autoFocus
                      className="rename-input"
                      value={renameValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <span className="file-tile-name">{item.data.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="home-file-list">
            <div className="home-file-list-row home-file-list-head">
              <span>Name</span>
              <span>Kind</span>
              <span>Modified</span>
              <span>Size</span>
              <span />
            </div>
            {items.map((item) => {
              const isFolder = item.type === 'folder';
              const icon = item.data.icon ?? (isFolder ? '📁' : KIND_ICON[(item.data as FileEntry).kind]);
              const isRenaming = renamingId === item.data.id;
              return (
                <div
                  key={item.data.id}
                  className={`home-file-list-row ${dragOverId === item.data.id ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => startDrag(e, item)}
                  onDragOver={(e) => {
                    if (!isFolder) return;
                    e.preventDefault();
                    setDragOverId(item.data.id);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => isFolder && handleDrop(e, item.data.id)}
                  onClick={() => openItem(item)}
                >
                  <span className="home-file-list-name">
                    <span className="file-tile-icon home-file-list-icon">{icon}</span>
                    {isRenaming ? (
                      <input
                        autoFocus
                        className="rename-input"
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                      />
                    ) : (
                      item.data.name
                    )}
                  </span>
                  <span>{isFolder ? 'Folder' : item.data.kind}</span>
                  <span>{formatDate(itemModified(item))}</span>
                  <span>{item.type === 'file' ? formatSize(item.data.size) : '—'}</span>
                  <span className="home-file-list-actions" onClick={(e) => e.stopPropagation()}>
                    <ItemActionsMenu
                      onChangeEmoji={() => setEmojiTargetId(emojiTargetId === item.data.id ? null : item.data.id)}
                      onRename={() => {
                        setRenamingId(item.data.id);
                        setRenameValue(item.data.name);
                      }}
                      onDelete={() => onDeleteItem(item.type, item.data.id)}
                    />
                    {emojiTargetId === item.data.id && (
                      <EmojiPicker
                        onSelect={(newIcon) => {
                          onSetIcon(item.type, item.data.id, newIcon);
                          setEmojiTargetId(null);
                        }}
                        onClose={() => setEmojiTargetId(null)}
                      />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
