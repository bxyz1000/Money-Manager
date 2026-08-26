import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
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

import { colors, glass, radius, shadowElevation, spacing, typography } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 248;
const STROKE_WIDTH = 14;
const RADIUS = (SIZE - STROKE_WIDTH * 2 - 28) / 2;
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
  const [spin] = useState(() => new Animated.Value(0));
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
      duration: 900,
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

  // Continuous pulsating breathing loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  // Continuous rotating vortex aura
  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoop.start();
    return () => spinLoop.stop();
  }, [spin]);

  const dashOffset = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, CIRCUMFERENCE * (1 - clamped)],
  });

  const outerGlowOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  const auraScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const spinRotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const cardTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
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
      {/* Background Hyper-Glow Atmospheric Flare */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: outerGlowOpacity,
            transform: [{ scale: auraScale }],
          },
        ]}
      />

      {/* Continuous Rotating Aura Layer */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.rotatingAuraContainer,
          { transform: [{ rotate: spinRotation }] },
        ]}
      >
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <RadialGradient id="rotatingFlare" cx="0.8" cy="0.2" r="0.6">
              <Stop offset="0" stopColor={colors.electricCyan} stopOpacity="0.45" />
              <Stop offset="0.6" stopColor={colors.neonBlue} stopOpacity="0.2" />
              <Stop offset="1" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={CENTER} cy={CENTER} r={RADIUS * 1.55} fill="url(#rotatingFlare)" />
        </Svg>
      </Animated.View>

      {/* Main Multi-Layer SVG Instrument */}
      <Animated.View style={{ transform: [{ scale: auraScale }] }}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            {/* Primary Electric Cyan Gradient */}
            <LinearGradient id="electricCyanGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.electricCyan} stopOpacity="1" />
              <Stop offset="0.4" stopColor={colors.skyGlow} stopOpacity="1" />
              <Stop offset="0.85" stopColor={colors.neonBlue} stopOpacity="1" />
              <Stop offset="1" stopColor="#0038a8" stopOpacity="0.8" />
            </LinearGradient>

            {/* Specular White Arc Highlight */}
            <LinearGradient id="specularHighlight" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
              <Stop offset="0.4" stopColor={colors.electricCyan} stopOpacity="0.8" />
              <Stop offset="1" stopColor="transparent" stopOpacity="0" />
            </LinearGradient>

            {/* Hyper-Luminous Bloom Halo */}
            <RadialGradient id="innerBloom" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={colors.electricCyan} stopOpacity="0.32" />
              <Stop offset="0.6" stopColor={colors.neonBlue} stopOpacity="0.18" />
              <Stop offset="1" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Atmospheric bloom circle */}
          <Circle cx={CENTER} cy={CENTER} r={RADIUS * 1.6} fill="url(#innerBloom)" />

          {/* Dark Glass Track Ring */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.ringTrack}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />

          {/* Outer Wide Cyan Neon Aura (Breathing) */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.neonBlue}
            strokeWidth={STROKE_WIDTH + 24}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            opacity={outerGlowOpacity}
          />

          {/* Medium Electric Cyan Glow */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.electricCyan}
            strokeWidth={STROKE_WIDTH + 10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            opacity={0.8}
          />

          {/* Core Luminous Arc */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#electricCyanGrad)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />

          {/* Specular White Razor Edge */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#specularHighlight)"
            strokeWidth={4.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      </Animated.View>

      {/* Center Balance Value & Caption */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.centerContent}>
          <Text style={styles.centerAmount}>{countText}</Text>
          <Text style={styles.centerCaption}>Wallet Balance</Text>
        </View>
      </View>

      {/* Floating Savings Rate Glass Chip (Top-Right) */}
      <View style={[styles.rateChip, glass.cardStrong, shadowElevation(2)]} pointerEvents="none">
        <Text style={styles.rateChipValue}>{Math.round(clamped * 100)}% saved</Text>
        <Text style={styles.rateChipCaption}>last 30 days</Text>
      </View>

      {/* Nestled + Add Pill Button at Bottom Center (Reference Style) */}
      {onAddPress && (
        <Pressable
          style={({ pressed }) => [
            styles.addPill,
            glass.cardStrong,
            shadowElevation(3),
            pressed && styles.addPillPressed,
          ]}
          onPress={onAddPress}
          accessibilityLabel="Add transaction"
          accessibilityRole="button"
        >
          <Text style={styles.addPillIcon}>+</Text>
          <Text style={styles.addPillText}>Add</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

/** Lightweight Indian-grouped rupee formatting for the animated counter. */
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
  addPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderColor: colors.specularBorderTop,
    borderRadius: radius.md,
    borderWidth: 1.5,
    bottom: 2,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 10,
  },
  addPillIcon: {
    color: colors.electricCyan,
    fontSize: 18,
    fontWeight: '700',
  },
  addPillPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  addPillText: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: '700',
  },
  ambientGlow: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderRadius: 130,
    height: 180,
    position: 'absolute',
    width: 180,
  },
  centerAmount: {
    color: colors.text,
    fontSize: typography.balance,
    fontWeight: '800',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0, 240, 255, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  centerCaption: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  rateChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 18, 32, 0.85)',
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 3,
    position: 'absolute',
    right: -8,
    top: 14,
  },
  rateChipCaption: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  rateChipValue: {
    color: colors.electricCyan,
    fontSize: 13,
    fontWeight: '800',
  },
  rotatingAuraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapper: {
    alignItems: 'center',
    height: SIZE + 16,
    justifyContent: 'center',
    position: 'relative',
    width: SIZE,
  },
});
