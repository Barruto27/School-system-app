import { useEffect, useRef, useState } from 'react';
import { searchFilesByName, type SearchResult } from '../storage/fileRepo';
import { KIND_ICON } from '../storage/icons';

interface FileLinkPickerProps {
  excludeFileId: string;
  onPick: (file: { id: string; name: string; kind: string }) => void;
  onClose: () => void;
}

export function FileLinkPicker({ excludeFileId, onPick, onClose }: FileLinkPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    searchFilesByName(query).then((all) => {
      if (cancelled) return;
      setResults(all.filter((r) => r.file.id !== excludeFileId).slice(0, 8));
    });
    return () => {
      cancelled = true;
    };
  }, [query, excludeFileId]);

  return (
    <div className="file-link-picker" ref={ref} onPointerDown={(e) => e.stopPropagation()}>
      <input
        autoFocus
        className="file-link-picker-input"
        placeholder="Search files to link…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="file-link-picker-results">
        {results.length === 0 && <div className="file-link-picker-empty">Type to search files…</div>}
        {results.map(({ file, path }) => (
          <button
            key={file.id}
            className="file-link-picker-result"
            onClick={() => onPick({ id: file.id, name: file.name, kind: file.kind })}
          >
            <span className="file-link-picker-icon">{file.icon ?? KIND_ICON[file.kind]}</span>
            <span className="file-link-picker-text">
              <span className="file-link-picker-name">{file.name}</span>
              <span className="file-link-picker-path">{path.length > 0 ? path.map((f) => f.name).join(' / ') : 'Home'}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
