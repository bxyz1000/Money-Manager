import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { colors } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * FlowRibbon — hyper-luminous electric cyan / neon blue liquid river
 * with moving glowing light spots weaving organically behind the cards (Reference A).
 */

interface FlowRibbonProps {
  width: number | string;
  height: number | string;
  flip?: boolean;
  opacity?: number;
}

const VIEW_W = 400;
const VIEW_H = 820;

// Organic liquid S-river curve weaving through the cards
const FLOW_PATH =
  `M ${VIEW_W * 0.9} -30 ` +
  `C ${VIEW_W * 0.3} ${VIEW_H * 0.16}, ${VIEW_W * 0.98} ${VIEW_H * 0.36}, ${VIEW_W * 0.55} ${VIEW_H * 0.52} ` +
  `C ${VIEW_W * 0.08} ${VIEW_H * 0.68}, ${VIEW_W * 0.85} ${VIEW_H * 0.84}, ${VIEW_W * 0.45} ${VIEW_H + 30}`;

export function FlowRibbon({ width, height, flip = false, opacity = 1 }: FlowRibbonProps) {
  const [pulse] = useState(() => new Animated.Value(0.8));
  const [node1Pos] = useState(() => new Animated.Value(0));
  const [node2Pos] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Breathing pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0.75,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    pulseLoop.start();

    // Drifting light nodes along the liquid river
    const node1Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(node1Pos, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(node1Pos, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    node1Loop.start();

    const node2Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(node2Pos, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(node2Pos, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    node2Loop.start();

    return () => {
      pulseLoop.stop();
      node1Loop.stop();
      node2Loop.stop();
    };
  }, [pulse, node1Pos, node2Pos]);

  const node1Y = node1Pos.interpolate({
    inputRange: [0, 1],
    outputRange: [VIEW_H * 0.28, VIEW_H * 0.38],
  });
  const node1X = node1Pos.interpolate({
    inputRange: [0, 1],
    outputRange: [VIEW_W * 0.72, VIEW_W * 0.64],
  });

  const node2Y = node2Pos.interpolate({
    inputRange: [0, 1],
    outputRange: [VIEW_H * 0.62, VIEW_H * 0.72],
  });
  const node2X = node2Pos.interpolate({
    inputRange: [0, 1],
    outputRange: [VIEW_W * 0.35, VIEW_W * 0.45],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity },
        flip && { transform: [{ scaleX: -1 }] },
      ]}
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          {/* Electric Cyan Neon Liquid Gradient */}
          <LinearGradient id="neonRiverGrad" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={colors.electricCyan} stopOpacity="1" />
            <Stop offset="0.3" stopColor={colors.skyGlow} stopOpacity="1" />
            <Stop offset="0.7" stopColor={colors.neonBlue} stopOpacity="1" />
            <Stop offset="1" stopColor="#003db3" stopOpacity="0.9" />
          </LinearGradient>

          {/* Core White Highlight Gradient */}
          <LinearGradient id="riverCoreHighlight" x1="0" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <Stop offset="0.5" stopColor={colors.electricCyan} stopOpacity="0.8" />
            <Stop offset="1" stopColor={colors.skyGlow} stopOpacity="0.5" />
          </LinearGradient>

          {/* Node Light Spot Glow */}
          <RadialGradient id="nodeGlow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <Stop offset="0.3" stopColor={colors.electricCyan} stopOpacity="0.7" />
            <Stop offset="0.7" stopColor={colors.neonBlue} stopOpacity="0.3" />
            <Stop offset="1" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* 1. Deep Wide Atmospheric Diffusion Glow */}
        <Path
          d={FLOW_PATH}
          stroke="url(#neonRiverGrad)"
          strokeWidth={90}
          fill="none"
          strokeLinecap="round"
          opacity={0.18}
        />

        {/* 2. Medium Neon Body */}
        <Path
          d={FLOW_PATH}
          stroke="url(#neonRiverGrad)"
          strokeWidth={44}
          fill="none"
          strokeLinecap="round"
          opacity={0.45}
        />

        {/* 3. Intense Electric Core (Breathing Pulse) */}
        <AnimatedPath
          d={FLOW_PATH}
          stroke="url(#neonRiverGrad)"
          strokeWidth={20}
          fill="none"
          strokeLinecap="round"
          opacity={pulse}
        />

        {/* 4. Sharp Razor Specular Highlight */}
        <AnimatedPath
          d={FLOW_PATH}
          stroke="url(#riverCoreHighlight)"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          opacity={0.85}
        />

        {/* 5. Dynamic Drifting Glowing Node 1 (Behind upper cards) */}
        <AnimatedCircle
          cx={node1X}
          cy={node1Y}
          r={42}
          fill="url(#nodeGlow)"
        />

        {/* 6. Dynamic Drifting Glowing Node 2 (Behind lower cards) */}
        <AnimatedCircle
          cx={node2X}
          cy={node2Y}
          r={50}
          fill="url(#nodeGlow)"
        />
      </Svg>
    </Animated.View>
  );
}
