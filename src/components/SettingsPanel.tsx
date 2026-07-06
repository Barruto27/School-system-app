import { FONTS, THEMES, type FontName, type ThemeName } from '../theme';

interface SettingsPanelProps {
  theme: ThemeName;
  font: FontName;
  onThemeChange: (theme: ThemeName) => void;
  onFontChange: (font: FontName) => void;
  onClose: () => void;
}

const THEME_SWATCH: Record<ThemeName, string> = {
  night: '#0a0a0b',
  white: '#ffffff',
  sepia: '#f2e8d5',
  gray: '#c9c9cd',
};

export function SettingsPanel({ theme, font, onThemeChange, onFontChange, onClose }: SettingsPanelProps) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose} title="Close">
            x
          </button>
        </div>

        <div className="settings-section">
          <h3>Theme</h3>
          <div className="theme-options">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-option ${theme === t.id ? 'active' : ''}`}
                onClick={() => onThemeChange(t.id)}
              >
                <span className="theme-swatch" style={{ background: THEME_SWATCH[t.id] }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3>Font</h3>
          <div className="font-options">
            {FONTS.map((f) => (
              <button
                key={f.id}
                className={`font-option ${font === f.id ? 'active' : ''}`}
                onClick={() => onFontChange(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
