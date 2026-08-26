import { Platform, StyleSheet } from 'react-native';

/**
 * Money Manager Design Tokens — FROSTED GLASS & ATMOSPHERIC DARK SYSTEM
 *
 * True frosted glass aesthetic (translucent fills + BlurView backdrop blur),
 * hairline subtle borders, soft hero radial glow, and refined typography weights.
 */

export const colors = {
  // Deep obsidian foundation
  background: '#07090e',
  backgroundAlt: '#0c0f17',

  // Semi-transparent frosted glass fills (8-14% opacity)
  surfaceGlass: 'rgba(255, 255, 255, 0.08)',
  surfaceGlassSubtle: 'rgba(255, 255, 255, 0.05)',
  surfaceGlassStrong: 'rgba(255, 255, 255, 0.12)',
  surfaceGlassButton: 'rgba(255, 255, 255, 0.10)',

  // Hairline subtle borders (10-15% opacity)
  border: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderHighlight: 'rgba(255, 255, 255, 0.18)',

  // Text
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Compatibility aliases
  surface: 'rgba(255, 255, 255, 0.08)',
  surfaceStrong: 'rgba(255, 255, 255, 0.12)',
  inputBackground: 'rgba(255, 255, 255, 0.06)',
  secondaryGlow: 'rgba(0, 112, 243, 0.35)',

  // Luminous electric blue & cyan accents
  primary: '#00f0ff',
  primaryGlow: '#0070f3',
  skyGlow: '#38bdf8',
  accentBright: '#e0f7ff',
  electricCyan: '#00f0ff',
  neonBlue: '#0070f3',

  // Semantic
  success: '#3ddc97',
  danger: '#ff5c7a',
  warning: '#ffc55c',

  // Semantic frosted tints
  incomeTint: 'rgba(61, 220, 151, 0.12)',
  incomeBorder: 'rgba(61, 220, 151, 0.25)',
  expenseTint: 'rgba(255, 92, 122, 0.12)',
  expenseBorder: 'rgba(255, 92, 122, 0.25)',
  transferTint: 'rgba(0, 240, 255, 0.12)',
  transferBorder: 'rgba(0, 240, 255, 0.25)',

  // Hero Glow
  ringTrack: 'rgba(255, 255, 255, 0.06)',
  ringGlowInner: 'rgba(0, 240, 255, 0.70)',
  ringGlowOuter: 'rgba(0, 112, 243, 0.40)',
  ringHighlight: '#ffffff',

  primaryText: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  sectionGap: 28,
} as const;

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 } as const;

export const typography = {
  balance: 42,
  heading: 26,
  title: 18,
  body: 15,
  bodySm: 14,
  caption: 12,
} as const;

/** Frosted glass container style fragments. */
export const glass = {
  card: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
  },
  cardStrong: {
    backgroundColor: colors.surfaceGlassStrong,
    borderColor: colors.borderHighlight,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
  },
  button: {
    backgroundColor: colors.surfaceGlassButton,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden' as const,
  },
  pill: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    overflow: 'hidden' as const,
  },
} as const;

export function shadowElevation(level: 1 | 2 | 3) {
  if (Platform.OS === 'android') {
    return { elevation: level * 2 };
  }
  return {
    shadowColor: '#000000',
    shadowOpacity: level * 0.15,
    shadowRadius: level * 8,
    shadowOffset: { width: 0, height: level * 3 },
  };
}
