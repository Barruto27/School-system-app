import { useEffect, useState } from 'react';
import { getBacklinks } from '../storage/fileRepo';
import type { FileEntry } from '../storage/types';
import { KIND_ICON } from '../storage/icons';

interface BacklinksPanelProps {
  fileId: string;
  active: boolean;
  onOpenFile: (id: string) => void;
}

export function BacklinksPanel({ fileId, active, onOpenFile }: BacklinksPanelProps) {
  const [open, setOpen] = useState(false);
  const [backlinks, setBacklinks] = useState<FileEntry[]>([]);

  const refresh = () => {
    getBacklinks(fileId).then(setBacklinks);
  };

  useEffect(() => {
    if (active) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, active]);

  return (
    <div className="backlinks-wrap">
      <button
        className="backlinks-toggle"
        onClick={() => {
          setOpen((v) => !v);
          refresh();
        }}
        title="Linked mentions"
      >
        🔗 {backlinks.length}
      </button>
      {open && (
        <div className="backlinks-panel">
          <div className="backlinks-panel-header">Linked mentions</div>
          {backlinks.length === 0 ? (
            <p className="backlinks-empty">No files link here yet.</p>
          ) : (
            backlinks.map((f) => (
              <button key={f.id} className="backlinks-item" onClick={() => onOpenFile(f.id)}>
                <span className="backlinks-item-icon">{f.icon ?? KIND_ICON[f.kind]}</span>
                <span className="backlinks-item-name">{f.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
