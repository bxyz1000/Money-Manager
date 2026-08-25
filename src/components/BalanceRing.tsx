import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

import { colors, glass, radius, spacing, typography } from './theme';

/**
 * Luminous balance ring — the dashboard's financial instrument.
 *
 * Built from layered SVG strokes (no bitmap/video assets):
 *   1. dark track ring
 *   2. wide soft outer glow (violet, breathing)
 *   3. medium inner glow (blue)
 *   4. main gradient progress arc (blue → violet, rounded cap, dash-reveal)
 *   5. bright highlight edge riding the same arc
 *
 * Animation (RN Animated only — GPU-friendly opacity/transform):
 *   - reveal: arc sweeps from empty to `fraction` on mount / value change
 *   - breathing: slow sinusoidal glow-opacity loop, ~6s period
 *   - count-up: balance text counts from zero to the new value over ~1.2s
 *
 * Driven entirely by props derived from real data
 * (savingsFraction over authoritative balances/month totals).
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 232;
const STROKE_WIDTH = 14;
const RADIUS = (SIZE - STROKE_WIDTH * 2 - 24) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface BalanceRingProps {
  /** 0..1 progress of the luminous arc. */
  fraction: number;
  /** Center amount, formatted for display (e.g. "₹12,345"). */
  centerLabel: string;
}

export function BalanceRing({ fraction, centerLabel }: BalanceRingProps) {
  const clamped = Math.min(1, Math.max(0, fraction));

  const [sweep] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [entrance] = useState(() => new Animated.Value(0));
  const [counter] = useState(() => new Animated.Value(0));

  const [countText, setCountText] = useState('₹0');

  // Animate toward the numeric rupee value embedded in the formatted label so
  // the counter always lands exactly on utils/money-formatted output.
  const targetRupees = useMemo(() => {
    const digits = centerLabel.replace(/[^\d.-]/g, '');
    const value = Number.parseFloat(digits);
    return Number.isFinite(value) ? value : 0;
  }, [centerLabel]);

  useEffect(() => {
    const reveal = Animated.timing(sweep, {
      toValue: clamped,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // strokeDashoffset animates on the JS thread
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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false, // SVG animated nodes are JS-driven
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false, // SVG animated nodes are JS-driven
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
    outputRange: [0.35, 0.75],
  });
  const haloScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const cardTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity: entrance, transform: [{ translateY: cardTranslateY }] },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Total balance ${centerLabel}. Savings rate ${Math.round(
        clamped * 100,
      )} percent.`}
    >
      <Animated.View style={{ transform: [{ scale: haloScale }] }}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.primaryGlow} />
              <Stop offset="0.55" stopColor={colors.primary} />
              <Stop offset="1" stopColor={colors.secondaryGlow} />
            </LinearGradient>
            <LinearGradient id="highlightGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.ringHighlight} stopOpacity="0.9" />
              <Stop offset="1" stopColor={colors.accentBright} stopOpacity="0.4" />
            </LinearGradient>
            <RadialGradient id="haloGradient" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={colors.ringGlowInner} stopOpacity="0.4" />
              <Stop offset="0.7" stopColor={colors.ringGlowOuter} stopOpacity="0.22" />
              <Stop offset="1" stopColor={colors.ringGlowOuter} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Atmospheric bloom halo behind the ring */}
          <Circle cx={CENTER} cy={CENTER} r={RADIUS * 1.85} fill="url(#haloGradient)" />
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="rgba(93,110,255,0.05)" />

          {/* Dark track */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.ringTrack}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />

          {/* Soft outer violet glow (breathing) */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.ringGlowOuter}
            strokeWidth={STROKE_WIDTH + 18}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            opacity={outerGlowOpacity}
          />

          {/* Medium blue inner glow */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.ringGlowInner}
            strokeWidth={STROKE_WIDTH + 7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            opacity={0.65}
          />

          {/* Main luminous gradient arc */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#ringGradient)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />

          {/* Bright highlight edge */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="url(#highlightGradient)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      </Animated.View>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.centerContent}>
          <Text style={styles.centerCaption}>TOTAL BALANCE</Text>
          <Text style={styles.centerAmount}>{countText}</Text>
        </View>
      </View>

      {/* Savings-rate glass chip (real data: month net / month income) */}
      <View style={[styles.rateChip, glass.card]} pointerEvents="none">
        <Text style={styles.rateChipValue}>{Math.round(clamped * 100)}% saved</Text>
        <Text style={styles.rateChipCaption}>this month</Text>
      </View>
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
  centerAmount: {
    color: colors.text,
    fontSize: typography.balance - 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  centerCaption: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  rateChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    position: 'absolute',
    right: -6,
    top: 18,
  },
  rateChipCaption: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  rateChipValue: {
    color: colors.accentBright,
    fontSize: 13,
    fontWeight: '700',
  },
  wrapper: {
    alignItems: 'center',
    height: SIZE,
    justifyContent: 'center',
    width: SIZE,
  },
});



