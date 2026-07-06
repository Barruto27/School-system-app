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

export function loadTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'night' || saved === 'white' || saved === 'sepia' || saved === 'gray' ? saved : 'night';
}

export function loadFont(): FontName {
  const saved = localStorage.getItem(FONT_KEY);
  return saved === 'sans' || saved === 'serif' || saved === 'system' ? saved : 'sans';
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
