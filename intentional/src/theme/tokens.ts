/**
 * Calm, low-contrast-chrome / high-contrast-text palette. Text colours meet
 * WCAG AA (≥ 4.5:1) against both background and surface.
 */
export const colors = {
  background: '#F6F3EC', // warm off-white
  surface: '#FCFAF6',
  surfaceSunken: '#EFEBE2',
  line: '#E3DDD0',
  text: '#23271F',
  textMuted: '#5B6157',
  accent: '#3E5C47', // muted forest green
  accentSoft: '#E2E9DF',
  onAccent: '#FFFFFF',
  warning: '#8A5A1F',
  warningSoft: '#F3E8D6',
  danger: '#9A4434',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '600' as const, letterSpacing: -0.3 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, letterSpacing: 0.4 },
};

/** Minimum touch target (Apple HIG / Material). */
export const MIN_TOUCH = 44;
