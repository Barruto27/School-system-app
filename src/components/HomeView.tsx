import { useState } from 'react';
import type { RecentFile } from '../App';
import { KIND_ICON } from '../storage/icons';
import { AddMenu } from './AddMenu';

interface HomeViewProps {
  onNewNote: () => void;
  onNewCanvas: () => void;
  onUpload: () => void;
  onCreateFolder: (name: string) => void;
  recentFiles: RecentFile[];
  onOpenRecent: (file: RecentFile) => void;
}

const MESSAGE_KEY = 'pkos:homeMessage';
const DEFAULT_MESSAGE = "Everything you're working on, in one place.";

export function HomeView({
  onNewNote,
  onNewCanvas,
  onUpload,
  onCreateFolder,
  recentFiles,
  onOpenRecent,
}: HomeViewProps) {
  const [message, setMessage] = useState(() => localStorage.getItem(MESSAGE_KEY) ?? DEFAULT_MESSAGE);
  const [editingMessage, setEditingMessage] = useState(false);
  const [draft, setDraft] = useState(message);

  const actions = [
    { label: 'New Note', icon: '🗒️', onClick: onNewNote },
    { label: 'New Canvas', icon: '🎨', onClick: onNewCanvas },
    { label: 'Upload', icon: '⬆️', onClick: onUpload },
  ];

  const commitMessage = () => {
    const trimmed = draft.trim() || DEFAULT_MESSAGE;
    setMessage(trimmed);
    localStorage.setItem(MESSAGE_KEY, trimmed);
    setEditingMessage(false);
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
          <h2>Quick Access</h2>
          <AddMenu onCreateFolder={onCreateFolder} onUpload={onUpload} onNewNote={onNewNote} onNewCanvas={onNewCanvas} />
        </div>
        {recentFiles.length === 0 ? (
          <p className="home-quick-access-empty">Files you open will show up here for fast access.</p>
        ) : (
          <div className="home-quick-access-grid">
            {recentFiles.map((f) => (
              <button key={f.id} className="home-recent-tile" onClick={() => onOpenRecent(f)} title={f.name}>
                <span className="home-recent-icon">{f.icon ?? KIND_ICON[f.kind]}</span>
                <span className="home-recent-name">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
