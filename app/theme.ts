import type { TextStyle } from 'react-native';

/**
 * The one place the look is defined: a dark, high-contrast theme in the spirit of modern fitness
 * apps. It borrows no brand assets: no logo, wordmark or typeface. Screens use these tokens, not
 * hex code; app/theme.test.ts checks the contrast of every pairing that carries text. app.json repeats
 * `bg` as the root and web background (JSON cannot import it), and a test keeps the two in step.
 */
export const colors = {
  bg: '#0A0B0D',
  card: '#14171A',
  raised: '#1D2126',
  border: '#2C3238',

  text: '#F5F6F7',
  dim: '#B9C0C7',
  muted: '#8E97A0',

  accent: '#3BB4F2',
  onAccent: '#04141D',
  accentSoft: '#0F2A38',
  accentFill: '#123245',

  // Soreness bands. The text next to every color always names the band too.
  low: '#1F7A63',
  moderate: '#F2B233',
  high: '#FF5B4D',

  bodyFill: '#262B31',
  // Lighter gradient stops for the body map's soft, dimensional look. Each pairs with its base tone
  // above (bodyFill, low, moderate, high) as the light end of a top-to-bottom gradient; the base
  // tones stay the ones app/theme.test.ts checks for contrast, so this file is still the one place to
  // change a soreness color.
  bodyFillTint: '#2E343B',
  lowTint: '#33A186',
  moderateTint: '#F6C34D',
  highTint: '#FF8A75',
  selectedOutline: '#FFFFFF',
  shadow: '#000000',

  warnBg: '#2A1D0B',
  warnBorder: '#5A3B0F',
  warnText: '#F6C77A',
  banner: '#F6C77A',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 10, md: 16, pill: 999 } as const;

/** Text presets: bold numerals, small spaced-out uppercase labels, the system font. */
export const type = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.2, color: colors.text },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.dim },
  strong: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.text },
  small: { fontSize: 12, lineHeight: 17, color: colors.muted },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted },
} satisfies Record<string, TextStyle>;
