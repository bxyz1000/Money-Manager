import { Platform } from 'react-native';

/**
 * Money Manager design tokens — HYPER-LUMINOUS ELECTRIC GLASS SYSTEM.
 *
 * Single source of truth for color/spacing/radius/typography.
 * Blends obsidian foundation with electric cyan / neon blue / sky glow accents,
 * specular top-lit glass cards, and multi-layered glow depth matching the reference.
 */

export const colors = {
  // Foundation
  background: '#04060c',
  backgroundAlt: '#080c16',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceSubtle: 'rgba(255, 255, 255, 0.03)',
  surfaceStrong: 'rgba(15, 22, 38, 0.75)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.12)',
  border: 'rgba(255, 255, 255, 0.10)',
  borderHighlight: 'rgba(255, 255, 255, 0.20)',
  inputBackground: 'rgba(255, 255, 255, 0.06)',

  // Specular Top-Lit Glass Borders & Backlight
  specularBorder: 'rgba(255, 255, 255, 0.22)',
  specularBorderTop: 'rgba(0, 240, 255, 0.65)',
  specularBorderBottom: 'rgba(0, 0, 0, 0.45)',
  cardGlassBg: 'rgba(12, 18, 32, 0.78)',

  // Text
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Electric Cyan & Neon Blue Accents
  primary: '#00f0ff', // electric cyan
  primaryGlow: '#0070f3', // neon electric blue
  secondaryGlow: '#38bdf8', // sky glow
  accentBright: '#e0f7ff',
  electricCyan: '#00f0ff',
  neonBlue: '#0070f3',
  skyGlow: '#38bdf8',

  // Semantic
  success: '#3ddc97',
  danger: '#ff5c7a',
  warning: '#ffc55c',

  // Semantic card tints & glows
  incomeTint: 'rgba(61, 220, 151, 0.14)',
  incomeBorder: 'rgba(61, 220, 151, 0.35)',
  expenseTint: 'rgba(255, 92, 122, 0.14)',
  expenseBorder: 'rgba(255, 92, 122, 0.35)',
  transferTint: 'rgba(0, 240, 255, 0.14)',
  transferBorder: 'rgba(0, 240, 255, 0.35)',

  // Hyper-Luminous Ring Accents
  ringTrack: 'rgba(255, 255, 255, 0.06)',
  ringGlowInner: 'rgba(0, 240, 255, 0.75)',
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
} as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const typography = {
  balance: 38,
  heading: 26,
  title: 18,
  body: 15,
  bodySm: 14,
  caption: 12,
} as const;

/** Translucent glass card style fragments with specular top edges. */
export const glass = {
  card: {
    backgroundColor: colors.cardGlassBg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  cardStrong: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.specularBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  pill: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
} as const;

export function shadowElevation(level: 1 | 2 | 3) {
  if (Platform.OS === 'android') {
    return { elevation: level * 2 };
  }
  return {
    shadowColor: level === 3 ? colors.primaryGlow : '#000000',
    shadowOpacity: level === 3 ? 0.35 : level * 0.18,
    shadowRadius: level * 8,
    shadowOffset: { width: 0, height: level * 4 },
  };
}
