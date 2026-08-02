/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17231f',
    textSecondary: '#57645c',
    background: '#ece8dd',
    backgroundElement: '#fffdf8',
    backgroundSelected: '#dbe8e2',
    accent: '#1f5c52',
    accentStrong: '#123c35',
    brass: '#a97c3f',
    danger: '#a85639',
    line: '#d9d3c1',
  },
  dark: {
    text: '#eef1ea',
    textSecondary: '#a7b2a9',
    background: '#10201c',
    backgroundElement: '#172c26',
    backgroundSelected: '#1d4239',
    accent: '#6fcbb8',
    accentStrong: '#a4e4d4',
    brass: '#d9b787',
    danger: '#dd8f6f',
    line: '#294038',
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
