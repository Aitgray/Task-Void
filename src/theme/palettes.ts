export type PaletteKey = 'light' | 'dark' | 'terminal' | 'navy' | 'warm' | 'cool';

export type Palette = {
  key: PaletteKey;
  name: string;
  bg: string;
  surface: string;
  text: string;
  subtext: string;
  border: string;
  accent: string;
  inputBg: string;
  statusBar: 'light' | 'dark';
};

export const palettes: Record<PaletteKey, Palette> = {
  light: {
    key: 'light',
    name: 'Light',
    bg: '#ffffff',
    surface: '#f5f5f5',
    text: '#000000',
    subtext: '#666666',
    border: '#dddddd',
    accent: '#000000',
    inputBg: '#ffffff',
    statusBar: 'dark',
  },
  dark: {
    key: 'dark',
    name: 'Dark',
    bg: '#0d0d0d',
    surface: '#1c1c1c',
    text: '#ffffff',
    subtext: '#888888',
    border: '#333333',
    accent: '#ffffff',
    inputBg: '#1c1c1c',
    statusBar: 'light',
  },
  terminal: {
    key: 'terminal',
    name: 'Terminal',
    bg: '#000000',
    surface: '#0a1a0a',
    text: '#00ff41',
    subtext: '#00aa2c',
    border: '#004d12',
    accent: '#00ff41',
    inputBg: '#0a1a0a',
    statusBar: 'light',
  },
  navy: {
    key: 'navy',
    name: 'Navy',
    bg: '#0a1628',
    surface: '#162035',
    text: '#e8f0fe',
    subtext: '#a0b4cc',
    border: '#253550',
    accent: '#4a9eff',
    inputBg: '#162035',
    statusBar: 'light',
  },
  warm: {
    key: 'warm',
    name: 'Warm',
    bg: '#fdf6e3',
    surface: '#f5e6c8',
    text: '#4a3728',
    subtext: '#8b6a56',
    border: '#d4b896',
    accent: '#c0392b',
    inputBg: '#fff8ed',
    statusBar: 'dark',
  },
  cool: {
    key: 'cool',
    name: 'Frost',
    bg: '#1a2535',
    surface: '#232f42',
    text: '#c8e0f0',
    subtext: '#6a9ab0',
    border: '#334a63',
    accent: '#00c8e0',
    inputBg: '#232f42',
    statusBar: 'light',
  },
};

export const paletteOrder: PaletteKey[] = ['light', 'dark', 'terminal', 'navy', 'warm', 'cool'];
