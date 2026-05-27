import { createContext, ReactNode, useContext } from 'react';
import { type Palette, type PaletteKey, palettes } from './palettes';

export { type Palette, type PaletteKey, palettes, paletteOrder } from './palettes';

const ThemeContext = createContext<Palette>(palettes.light);

export function ThemeProvider({
  paletteKey,
  children,
}: {
  paletteKey: PaletteKey;
  children: ReactNode;
}) {
  return (
    <ThemeContext.Provider value={palettes[paletteKey]}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
