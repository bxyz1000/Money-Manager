import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, typography } from './theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  disabled = false,
}: SegmentedControlProps<T>) {
  const [segmentWidth, setSegmentWidth] = useState<number>(0);
  const [slideAnim] = useState(() => new Animated.Value(0));

  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === selected),
  );

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: selectedIndex,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, slideAnim]);

  function handleContainerLayout(e: LayoutChangeEvent) {
    const width = e.nativeEvent.layout.width;
    if (options.length > 0) {
      setSegmentWidth((width - 8) / options.length);
    }
  }

  const translateX = slideAnim.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => i * segmentWidth),
  });

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {/* Sliding Highlight Pill */}
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.slider,
            {
              width: segmentWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      {/* Segment Buttons */}
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            disabled={disabled}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.segment,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextSelected,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    padding: 4,
    position: 'relative',
    width: '100%',
  },
  segment: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    zIndex: 2,
  },
  segmentPressed: {
    opacity: 0.7,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: colors.primaryText,
    fontWeight: '700',
  },
  slider: {
    backgroundColor: colors.neonBlue,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 4,
    left: 4,
    position: 'absolute',
    top: 4,
    zIndex: 1,
  },
});
