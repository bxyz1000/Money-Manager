import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Shared screen scaffolding values: safe-area-aware padding so content
 * respects notches/system bars on real devices.
 */
export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
}
