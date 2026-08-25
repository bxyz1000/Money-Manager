import { Platform } from 'react-native';

/**
 * Minimal light-first palette for the first product screens.
 *
 * The app config currently declares `userInterfaceStyle: "light"`, so dark
 * variants are intentionally out of scope until a theming pass exists. All
 * spacing/sizing values are tuned for phone-sized layouts.
 */

export const colors = {
  background: '#f6f7fb',
  surface: '#ffffff',
  text: '#1c1c1e',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  primary: '#1b72e8',
  primaryText: '#ffffff',
  danger: '#b3261e',
  success: '#188038',
  inputBackground: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = { sm: 8, md: 12, lg: 16 } as const;

export const platformPaddingTop = Platform.OS === 'android' ? undefined : undefined;
