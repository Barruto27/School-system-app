interface HomeViewProps {
  onNewNote: () => void;
  onNewCanvas: () => void;
  onUpload: () => void;
}

export function HomeView({ onNewNote, onNewCanvas, onUpload }: HomeViewProps) {
  const actions = [
    { label: 'New Note', icon: '🗒️', onClick: onNewNote },
    { label: 'New Canvas', icon: '🎨', onClick: onNewCanvas },
    { label: 'Upload', icon: '⬆️', onClick: onUpload },
  ];

  return (
    <div className="home-view">
      <div className="home-hero">
        <h1 className="home-title">welcome.</h1>
        <p className="home-subtitle">Everything you're working on, in one place.</p>
      </div>
      <div className="home-actions">
        {actions.map((a) => (
          <button key={a.label} className="home-action-tile" onClick={a.onClick}>
            <span className="home-action-icon">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
