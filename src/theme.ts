export type ThemeName = 'night' | 'white' | 'sepia' | 'gray';
export type FontName = 'sans' | 'serif' | 'system';

export const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'night', label: 'Night' },
  { id: 'white', label: 'White' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'gray', label: 'Gray' },
];

export const FONTS: { id: FontName; label: string }[] = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'system', label: 'System' },
];

const FONT_STACKS: Record<FontName, string> = {
  sans: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
  serif: "'Lora Variable', Georgia, 'Times New Roman', serif",
  system: 'system-ui, sans-serif',
};

const THEME_KEY = 'pkos:theme';
const FONT_KEY = 'pkos:font';
const ACCENT_KEY = 'pkos:accent';

export const ACCENT_PRESETS = ['#ff6a4d', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#eab308'];

export function loadTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'night' || saved === 'white' || saved === 'sepia' || saved === 'gray' ? saved : 'night';
}

export function loadFont(): FontName {
  const saved = localStorage.getItem(FONT_KEY);
  return saved === 'sans' || saved === 'serif' || saved === 'system' ? saved : 'sans';
}

export function loadAccent(): string | null {
  return localStorage.getItem(ACCENT_KEY);
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function applyFont(font: FontName) {
  document.documentElement.style.setProperty('--font-heading', FONT_STACKS[font]);
  document.documentElement.style.setProperty('--font-reading', FONT_STACKS[font]);
  localStorage.setItem(FONT_KEY, font);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function applyAccent(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.14)`);
  document.documentElement.style.setProperty('--on-accent', luminance > 0.6 ? '#1a0906' : '#fdf6ec');
  localStorage.setItem(ACCENT_KEY, hex);
}

export function resetAccent() {
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--accent-soft');
  document.documentElement.style.removeProperty('--on-accent');
  localStorage.removeItem(ACCENT_KEY);
}
