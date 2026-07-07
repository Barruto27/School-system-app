import { useEffect, useRef, useState } from 'react';

interface ItemActionsMenuProps {
  onChangeEmoji: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function ItemActionsMenu({ onChangeEmoji, onRename, onDelete }: ItemActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [open]);

  return (
    <div className="item-actions-menu" ref={ref}>
      <button
        className="item-actions-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="More actions"
      >
        ⋮
      </button>
      {open && (
        <div className="item-actions-dropdown" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setOpen(false);
              onChangeEmoji();
            }}
          >
            😀 Change emoji
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            ✎ Rename
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            x Delete
          </button>
        </div>
      )}
    </div>
  );
}
