import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius } from './theme';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  borderRadius?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 50,
  borderRadius = radius.md,
}: GlassCardProps) {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.cardBase,
          { borderRadius },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { borderRadius }, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[StyleSheet.absoluteFill, styles.blurFill, { borderRadius }]}
      />
      <View style={[styles.innerContent, { borderRadius }]}>{children}</View>
    </View>
  );
}

interface GlassButtonProps extends PressableProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  borderRadius?: number;
}

export function GlassButton({
  children,
  style,
  intensity = 55,
  borderRadius = radius.md,
  ...props
}: GlassButtonProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.wrapper,
        { borderRadius },
        style,
        pressed && styles.pressed,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[StyleSheet.absoluteFill, styles.blurFill, { borderRadius }]}
      />
      <View style={[styles.innerContent, { borderRadius }]}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  blurFill: {
    backgroundColor: colors.surfaceGlass,
  },
  cardBase: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  innerContent: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  wrapper: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
});
