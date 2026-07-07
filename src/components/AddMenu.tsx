import { useEffect, useRef, useState } from 'react';

interface AddMenuProps {
  onCreateFolder: (name: string) => void;
  onUpload: () => void;
  onNewNote: () => void;
  onNewCanvas: () => void;
  onNewSlides: () => void;
  folderLabel?: string;
  className?: string;
}

export function AddMenu({
  onCreateFolder,
  onUpload,
  onNewNote,
  onNewCanvas,
  onNewSlides,
  folderLabel = 'Category',
  className,
}: AddMenuProps) {
  const [open, setOpen] = useState(false);
  const [namingFolder, setNamingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  const closeAll = () => {
    setOpen(false);
    setNamingFolder(false);
    setFolderName('');
  };

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeAll();
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [open]);

  const commitFolder = () => {
    const name = folderName.trim();
    if (name) onCreateFolder(name);
    closeAll();
  };

  return (
    <div className={`add-menu ${className ?? ''}`} ref={ref}>
      <button className="add-menu-trigger" onClick={() => setOpen((v) => !v)} title="Add">
        +
      </button>
      {open && (
        <div className="add-menu-dropdown">
          {namingFolder ? (
            <input
              autoFocus
              className="add-menu-input"
              value={folderName}
              placeholder={`${folderLabel} name`}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitFolder();
                if (e.key === 'Escape') closeAll();
              }}
              onBlur={commitFolder}
            />
          ) : (
            <>
              <button
                onClick={() => {
                  setNamingFolder(true);
                  setFolderName('');
                }}
              >
                📁 {folderLabel}
              </button>
              <button
                onClick={() => {
                  onUpload();
                  closeAll();
                }}
              >
                ⬆️ Upload
              </button>
              <button
                onClick={() => {
                  onNewNote();
                  closeAll();
                }}
              >
                🗒️ Note
              </button>
              <button
                onClick={() => {
                  onNewCanvas();
                  closeAll();
                }}
              >
                🎨 Canvas
              </button>
              <button
                onClick={() => {
                  onNewSlides();
                  closeAll();
                }}
              >
                📊 Slides
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
