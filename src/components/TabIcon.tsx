import { Ionicons } from '@expo/vector-icons';
import type { OpaqueColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from './theme';

interface TabIconProps {
  name: 'home' | 'expenses' | 'add' | 'accounts' | 'profile';
  focused: boolean;
  color: string | OpaqueColorValue;
  size?: number;
}

export function TabIcon({ name, focused, color, size = 22 }: TabIconProps) {
  if (name === 'add') {
    return (
      <View style={styles.addCircle}>
        <Ionicons name="add" size={24} color={colors.primaryText} />
      </View>
    );
  }

  let iconName: keyof typeof Ionicons.glyphMap;
  switch (name) {
    case 'home':
      iconName = focused ? 'home' : 'home-outline';
      break;
    case 'expenses':
      iconName = focused ? 'receipt' : 'receipt-outline';
      break;
    case 'accounts':
      iconName = focused ? 'wallet' : 'wallet-outline';
      break;
    case 'profile':
      iconName = focused ? 'person' : 'person-outline';
      break;
    default:
      iconName = 'ellipse-outline';
  }

  return (
    <View style={styles.iconWrapper}>
      <Ionicons name={iconName} size={size} color={color as string} />
      {focused && <View style={[styles.activeDot, { backgroundColor: color as string }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    borderRadius: radius.pill,
    bottom: -6,
    height: 4,
    position: 'absolute',
    width: 4,
  },
  addCircle: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.borderHighlight,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    elevation: 4,
    height: 38,
    justifyContent: 'center',
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    width: 38,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
