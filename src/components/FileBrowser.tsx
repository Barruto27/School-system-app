import { useCallback, useEffect, useRef, useState } from 'react';
import { ROOT_ID, type FileEntry, type Folder } from '../storage/types';
import { KIND_ICON } from '../storage/icons';
import {
  addFile,
  createFolder,
  createNote,
  createSlides,
  deleteFile,
  deleteFolder,
  getFileBlob,
  getFolderPath,
  listFiles,
  listFolders,
  moveFile,
  moveFolder,
  renameFile,
  renameFolder,
  searchFilesByName,
  setFileIcon,
  setFolderIcon,
  type SearchResult,
} from '../storage/fileRepo';
import { AddMenu } from './AddMenu';
import { EmojiPicker } from './EmojiPicker';
import { ItemActionsMenu } from './ItemActionsMenu';

interface FileBrowserProps {
  folderId: string;
  onNavigate: (folderId: string) => void;
  onOpenFile: (file: FileEntry, blob: Blob) => void;
  onLibraryChanged: () => void;
  refreshSignal?: number;
  onNewCanvas: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type DragPayload = { kind: 'folder' | 'file'; id: string };

export function FileBrowser({
  folderId: currentFolderId,
  onNavigate,
  onOpenFile,
  onLibraryChanged,
  refreshSignal,
  onNewCanvas,
}: FileBrowserProps) {
  const [path, setPath] = useState<Folder[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [emojiTargetId, setEmojiTargetId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isDraggingOverGrid, setIsDraggingOverGrid] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    const [f, fl, p] = await Promise.all([
      listFolders(currentFolderId),
      listFiles(currentFolderId),
      getFolderPath(currentFolderId),
    ]);
    setFolders(f);
    setFiles(fl);
    setPath(p);
  }, [currentFolderId]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshSignal]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    searchFilesByName(query).then((results) => {
      if (!cancelled) setSearchResults(results);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleImportFiles = async (fileList: FileList | null, folderId = currentFolderId) => {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      await addFile(file, folderId);
    }
    if (folderId === currentFolderId) refresh();
    onLibraryChanged();
  };

  const handleCreateFolder = async (name: string) => {
    await createFolder(name, currentFolderId);
    refresh();
    onLibraryChanged();
  };

  const handleTileOpen = async (file: FileEntry) => {
    const blob = await getFileBlob(file.id);
    if (!blob) return;
    if (file.kind === 'pdf' || file.kind === 'note' || file.kind === 'canvas' || file.kind === 'slides') {
      onOpenFile(file, blob);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleNewNote = async () => {
    const entry = await createNote('Untitled Note', currentFolderId);
    onLibraryChanged();
    refresh();
    const blob = await getFileBlob(entry.id);
    if (blob) onOpenFile(entry, blob);
  };

  const handleNewSlides = async () => {
    const entry = await createSlides('Untitled Slides', currentFolderId);
    onLibraryChanged();
    refresh();
    const blob = await getFileBlob(entry.id);
    if (blob) onOpenFile(entry, blob);
  };

  const commitRename = async (kind: 'folder' | 'file', id: string) => {
    const name = renameValue.trim();
    if (name) {
      if (kind === 'folder') {
        await renameFolder(id, name);
      } else {
        await renameFile(id, name);
      }
      onLibraryChanged();
      refresh();
    }
    setRenamingId(null);
  };

  const handleSetIcon = async (kind: 'folder' | 'file', id: string, icon: string) => {
    if (kind === 'folder') {
      await setFolderIcon(id, icon);
    } else {
      await setFileIcon(id, icon);
    }
    onLibraryChanged();
    refresh();
    setEmojiTargetId(null);
  };

  const handleDelete = async (kind: 'folder' | 'file', id: string) => {
    if (kind === 'folder') await deleteFolder(id);
    else await deleteFile(id);
    onLibraryChanged();
    refresh();
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOverId(null);
    setIsDraggingOverGrid(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleImportFiles(e.dataTransfer.files, targetFolderId);
      return;
    }
    const raw = e.dataTransfer.getData('application/x-pkos-item');
    if (!raw) return;
    const payload: DragPayload = JSON.parse(raw);
    if (payload.kind === 'folder') {
      if (payload.id === targetFolderId) return;
      await moveFolder(payload.id, targetFolderId);
    } else {
      await moveFile(payload.id, targetFolderId);
    }
    onLibraryChanged();
    refresh();
  };

  const startDrag = (e: React.DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData('application/x-pkos-item', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const isSearching = query.trim().length > 0;

  return (
    <div className="file-browser">
      <div className="file-browser-toolbar">
        <input
          type="text"
          className="file-search-input"
          placeholder="Search files by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <AddMenu
          className="ml-auto"
          folderLabel="Category"
          onCreateFolder={handleCreateFolder}
          onUpload={() => fileInputRef.current?.click()}
          onNewNote={handleNewNote}
          onNewCanvas={onNewCanvas}
          onNewSlides={handleNewSlides}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleImportFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {!isSearching && (
        <div className="breadcrumbs">
          <button
            className={`breadcrumb-item ${currentFolderId === ROOT_ID ? 'active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId(ROOT_ID);
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e) => handleDrop(e, ROOT_ID)}
            style={dragOverId === ROOT_ID ? { background: 'var(--accent-bg, #dbeafe)' } : undefined}
            onClick={() => onNavigate(ROOT_ID)}
          >
            <span className="breadcrumb-label">All Files</span>
          </button>
          {path.map((folder) => (
            <span key={folder.id} className="breadcrumb-segment">
              <span className="breadcrumb-sep">/</span>
              <button
                className={`breadcrumb-item ${folder.id === currentFolderId ? 'active' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(folder.id);
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleDrop(e, folder.id)}
                style={dragOverId === folder.id ? { background: 'var(--accent-bg, #dbeafe)' } : undefined}
                onClick={() => onNavigate(folder.id)}
              >
                <span className="breadcrumb-label">{folder.name}</span>
              </button>
            </span>
          ))}
        </div>
      )}

      {isSearching ? (
        <div className="file-grid">
          {searchResults.length === 0 && <div className="file-browser-empty">No files match "{query}".</div>}
          {searchResults.map(({ file, path: resultPath }) => (
            <button key={file.id} className="file-tile" onClick={() => handleTileOpen(file)} title={file.name}>
              <span className="file-tile-icon">{file.icon ?? KIND_ICON[file.kind]}</span>
              <span className="file-tile-name">{file.name}</span>
              <span className="file-tile-meta">
                {resultPath.length > 0 ? resultPath.map((f) => f.name).join(' / ') : 'Home'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div
          className={`file-grid ${isDraggingOverGrid ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOverGrid(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setIsDraggingOverGrid(false);
          }}
          onDrop={(e) => handleDrop(e, currentFolderId)}
        >
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`folder-tile ${dragOverId === folder.id ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => startDrag(e, { kind: 'folder', id: folder.id })}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverId(folder.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => {
                e.stopPropagation();
                handleDrop(e, folder.id);
              }}
              onClick={() => onNavigate(folder.id)}
            >
              <div className="tile-actions">
                <ItemActionsMenu
                  onChangeEmoji={() => setEmojiTargetId(emojiTargetId === folder.id ? null : folder.id)}
                  onRename={() => {
                    setRenamingId(folder.id);
                    setRenameValue(folder.name);
                  }}
                  onDelete={() => handleDelete('folder', folder.id)}
                />
              </div>
              <span className="file-tile-icon">{folder.icon ?? '📁'}</span>
              {emojiTargetId === folder.id && (
                <EmojiPicker
                  onSelect={(icon) => handleSetIcon('folder', folder.id, icon)}
                  onClose={() => setEmojiTargetId(null)}
                />
              )}
              {renamingId === folder.id ? (
                <input
                  autoFocus
                  className="rename-input"
                  value={renameValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename('folder', folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                />
              ) : (
                <span className="file-tile-name">{folder.name}</span>
              )}
            </div>
          ))}
          {files.map((file) => (
            <div
              key={file.id}
              className="file-tile-wrap"
              draggable
              onDragStart={(e) => startDrag(e, { kind: 'file', id: file.id })}
            >
              <div className="tile-actions">
                <ItemActionsMenu
                  onChangeEmoji={() => setEmojiTargetId(emojiTargetId === file.id ? null : file.id)}
                  onRename={() => {
                    setRenamingId(file.id);
                    setRenameValue(file.name);
                  }}
                  onDelete={() => handleDelete('file', file.id)}
                />
              </div>
              <button className="file-tile" onClick={() => handleTileOpen(file)} title={file.name}>
                <span className="file-tile-icon">{file.icon ?? KIND_ICON[file.kind]}</span>
                {renamingId === file.id ? (
                  <input
                    autoFocus
                    className="rename-input"
                    value={renameValue}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename('file', file.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                ) : (
                  <span className="file-tile-name">{file.name}</span>
                )}
                <span className="file-tile-meta">{formatSize(file.size)}</span>
              </button>
              {emojiTargetId === file.id && (
                <EmojiPicker
                  onSelect={(icon) => handleSetIcon('file', file.id, icon)}
                  onClose={() => setEmojiTargetId(null)}
                />
              )}
            </div>
          ))}
          {folders.length === 0 && files.length === 0 && (
            <div className="file-browser-empty">This category is empty. Upload a file or drop it here.</div>
          )}
        </div>
      )}
    </div>
  );
}
