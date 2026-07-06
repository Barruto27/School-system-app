interface FindBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  matchCount: number;
  activeIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function FindBar({ query, onQueryChange, matchCount, activeIndex, onNext, onPrev, onClose }: FindBarProps) {
  return (
    <div className="find-bar">
      <input
        autoFocus
        type="text"
        placeholder="Find in document"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
      />
      <span className="find-count">{matchCount > 0 ? `${activeIndex + 1} / ${matchCount}` : query ? '0 / 0' : ''}</span>
      <button onClick={onPrev} disabled={matchCount === 0}>
        Prev
      </button>
      <button onClick={onNext} disabled={matchCount === 0}>
        Next
      </button>
      <button onClick={onClose}>x</button>
    </div>
  );
}
