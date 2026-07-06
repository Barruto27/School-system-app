import { useState } from 'react';

interface EditableTitleProps {
  name: string;
  onRename: (name: string) => void;
}

export function EditableTitle({ name, onRename }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="toolbar-filename-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className="toolbar-filename toolbar-filename-editable"
      title="Click to rename"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
    >
      {name}
    </span>
  );
}
