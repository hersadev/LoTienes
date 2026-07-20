/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111113',
    background: '#ffffff',
    backgroundElement: '#F4F4F6',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // Color de marca (teal): acciones principales y estados positivos
    tint: '#0D9488',
    onTint: '#FFFFFF',
    tintSoft: '#D7F4EF',
    // Estados
    warning: '#A16207',
    warningSoft: '#FBF0D2',
    danger: '#DC2626',
    dangerSoft: '#FCE5E5',
    border: '#E7E8EC',
  },
  dark: {
    text: '#ffffff',
    background: '#0B0B0C',
    backgroundElement: '#1C1D20',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    tint: '#2DD4BF',
    onTint: '#03231F',
    tintSoft: '#11332E',
    warning: '#FBBF24',
    warningSoft: '#33280F',
    danger: '#F87171',
    dangerSoft: '#3A1818',
    border: '#292B2F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// A partir de aquí una pantalla ancha (escritorio) puede permitirse un diseño
// distinto al móvil: más ancho de contenido y, en algunas pantallas, columnas.
// Coincide con el punto de corte de la landing para que la transición al
// entrar en la app no se note.
export const DesktopMinWidth = 960;
export const WideContentWidth = 1180;
