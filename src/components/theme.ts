import { Platform } from 'react-native';

/**
 * Money Manager design tokens — PREMIUM DARK SYSTEM (Phase 5).
 *
 * Single source of truth for color/spacing/radius/typography. Screens must
 * consume these tokens rather than scattering raw hex values. The palette is
 * a dark/black fintech foundation with luminous blue/purple accents and
 * translucent "glass" surfaces (transparency-based; no runtime blur layers,
 * which are too expensive on low-end Android).
 */

export const colors = {
  // Foundation
  background: '#05060a',
  backgroundAlt: '#0a0c14',
  surface: 'rgba(255,255,255,0.05)',
  surfaceStrong: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.10)',
  inputBackground: 'rgba(255,255,255,0.06)',

  // Text
  text: '#f4f6ff',
  textSecondary: '#9aa3b8',

  // Luminous accents
  primary: '#6d7cff', // indigo-blue
  primaryGlow: '#4f6bff', // deep blue
  secondaryGlow: '#9b5cff', // violet
  accentBright: '#aebaff',

  // Semantic
  success: '#3ddc97',
  danger: '#ff5c7a',
  warning: '#ffc55c',

  // Ring
  ringTrack: 'rgba(255,255,255,0.07)',
  ringGlowInner: 'rgba(93,110,255,0.55)',
  ringGlowOuter: 'rgba(155,92,255,0.28)',
  ringHighlight: '#eef1ff',

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

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const typography = {
  balance: 40,
  heading: 26,
  title: 18,
  body: 15,
  caption: 12,
} as const;

/** Translucent glass card style fragments (no runtime blur). */
export const glass = {
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
} as const;

export function shadowElevation(level: 1 | 2 | 3) {
  if (Platform.OS === 'android') {
    return { elevation: level };
  }
  return {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: level * 4,
    shadowOffset: { width: 0, height: level * 2 },
  };
}
