import { useEffect, useRef, useState } from 'react';

const EMOJI_OPTIONS = [
  '📁', '📂', '📚', '📝', '📄', '🎨', '🧪', '🔬', '🧬', '🌍', '🎭', '🎵',
  '⚽', '🎮', '💻', '🔧', '📐', '📊', '💡', '🔑', '🏆', '❤️', '⭐', '🔥',
  '🍀', '🚀', '🎯', '🧠', '📷', '🎬',
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [onClose]);

  return (
    <div className="emoji-picker" ref={ref} onPointerDown={(e) => e.stopPropagation()}>
      <div className="emoji-grid">
        {EMOJI_OPTIONS.map((e) => (
          <button key={e} className="emoji-option" onClick={() => onSelect(e)}>
            {e}
          </button>
        ))}
      </div>
      <div className="emoji-custom-row">
        <input
          className="emoji-custom-input"
          placeholder="Or type any emoji"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim()) onSelect(custom.trim());
          }}
        />
        <button
          onClick={() => {
            if (custom.trim()) onSelect(custom.trim());
          }}
        >
          Set
        </button>
      </div>
    </div>
  );
}
