import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { GlassButton, GlassCard } from './GlassCard';
import { colors, radius, spacing, typography } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 240;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH * 2 - 24) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface BalanceRingProps {
  /** 0..1 progress of the luminous arc. */
  fraction: number;
  /** Center amount, formatted for display (e.g. "₹15,325"). */
  centerLabel: string;
  /** Optional callback when the + Add pill at the bottom of the ring is tapped */
  onAddPress?: () => void;
}

export function BalanceRing({ fraction, centerLabel, onAddPress }: BalanceRingProps) {
  const clamped = Math.min(1, Math.max(0, fraction));

  const [sweep] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [entrance] = useState(() => new Animated.Value(0));
  const [counter] = useState(() => new Animated.Value(0));

  const [countText, setCountText] = useState('₹0');

  const targetRupees = useMemo(() => {
    const digits = centerLabel.replace(/[^\d.-]/g, '');
    const value = Number.parseFloat(digits);
    return Number.isFinite(value) ? value : 0;
  }, [centerLabel]);

  // Entrance and count-up animation
  useEffect(() => {
    const reveal = Animated.timing(sweep, {
      toValue: clamped,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    const popIn = Animated.timing(entrance, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const countUp = Animated.timing(counter, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    const parallel = Animated.parallel([reveal, popIn, countUp]);
    parallel.start();

    const listenerId = counter.addListener(({ value }) => {
      setCountText(formatRupeeGrouped(Math.round(targetRupees * value)));
    });

    return () => {
      counter.removeListener(listenerId);
      parallel.stop();
    };
  }, [clamped, counter, sweep, entrance, targetRupees]);

  // Gentle breathing glow loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const dashOffset = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, CIRCUMFERENCE * (1 - clamped)],
  });

  const outerGlowOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.70],
  });

  const auraScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const cardTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity: entrance, transform: [{ translateY: cardTranslateY }] },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Wallet balance ${centerLabel}. Savings rate ${Math.round(
        clamped * 100,
      )} percent.`}
    >
      {/* Soft Glow Ambient Circle */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: outerGlowOpacity,
            transform: [{ scale: auraScale }],
          },
        ]}
      />

      {/* Luminous Glowing Ring (Reference 1 Style) */}
      <Animated.View style={{ transform: [{ scale: auraScale }] }}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <LinearGradient id="cyanArcGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.electricCyan} stopOpacity="1" />
              <Stop offset="0.5" stopColor={colors.skyGlow} stopOpacity="1" />
              <Stop offset="1" stopColor={colors.neonBlue} stopOpacity="0.9" />
            </LinearGradient>

            <RadialGradient id="softRingGlow" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={colors.electricCyan} stopOpacity="0.25" />
              <Stop offset="0.6" stopColor={colors.neonBlue} stopOpacity="0.12" />
              <Stop offset="1" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Diffused inner ring glow */}
          <Circle cx={CENTER} cy={CENTER} r={RADIUS * 1.4} fill="url(#softRingGlow)" />

          {/* Dark Glass Ring Track */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.ringTrack}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />

          {/* Outer Soft Cyan Glow (Sinusoidal breathing) */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.neonBlue}
            strokeWidth={STROKE_WIDTH + 14}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            opacity={outerGlowOpacity}
          />

          {/* Core Electric Cyan Arc */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#cyanArcGrad)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      </Animated.View>

      {/* Center Amount & Caption (Medium/Regular weight per reference) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.centerContent}>
          <Text style={styles.centerAmount}>{countText}</Text>
          <Text style={styles.centerCaption}>WALLET BALANCE</Text>
        </View>
      </View>

      {/* Floating Frosted Glass Percentage Chip (Top-Right) */}
      <GlassCard style={styles.rateChip} intensity={55} borderRadius={radius.sm}>
        <Text style={styles.rateChipValue}>{Math.round(clamped * 100)}% saved</Text>
        <Text style={styles.rateChipCaption}>last 30 days</Text>
      </GlassCard>

      {/* Frosted Glass + Add Button (Bottom-Center, Reference Shape) */}
      {onAddPress && (
        <GlassButton
          style={styles.addButton}
          intensity={60}
          borderRadius={radius.sm + 2}
          onPress={onAddPress}
          accessibilityLabel="Add transaction"
        >
          <View style={styles.addButtonContent}>
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText}>Add</Text>
          </View>
        </GlassButton>
      )}
    </Animated.View>
  );
}

/** Indian-grouped rupee formatting for the animated counter. */
function formatRupeeGrouped(rupees: number): string {
  const negative = rupees < 0;
  const abs = Math.abs(rupees);
  let grouped = String(abs);
  if (grouped.length > 3) {
    const last3 = grouped.slice(-3);
    const rest = grouped.slice(0, -3);
    grouped = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
  }
  return `${negative ? '-' : ''}₹${grouped}`;
}

const styles = StyleSheet.create({
  addButton: {
    bottom: -6,
    position: 'absolute',
    zIndex: 10,
  },
  addButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  addButtonIcon: {
    color: colors.electricCyan,
    fontSize: 16,
    fontWeight: '500',
  },
  addButtonText: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: '500',
  },
  ambientGlow: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderRadius: 120,
    height: 160,
    position: 'absolute',
    width: 160,
  },
  centerAmount: {
    color: colors.text,
    fontSize: typography.balance,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  centerCaption: {
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
    marginTop: 3,
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  rateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    position: 'absolute',
    right: -10,
    top: 10,
  },
  rateChipCaption: {
    color: colors.textSecondary,
    fontSize: 9.5,
    marginTop: 1,
  },
  rateChipValue: {
    color: colors.electricCyan,
    fontSize: 12.5,
    fontWeight: '600',
  },
  wrapper: {
    alignItems: 'center',
    height: SIZE + 20,
    justifyContent: 'center',
    position: 'relative',
    width: SIZE,
  },
});
