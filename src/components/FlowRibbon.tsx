import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * FlowRibbon — the luminous organic "liquid light" path from the Expenses /
 * Home visual language (Reference A). Pure SVG: one S-curve rendered as three
 * stacked strokes (wide soft halo → mid glow → bright core) so it reads as a
 * glowing river without any bitmap or blur layer.
 *
 * A single slow opacity pulse (one JS-driven animated node, ~5s period) keeps
 * it feeling alive. Kept to ONE animated node for low-end device performance.
 */

interface FlowRibbonProps {
  width: number | string;
  height: number | string;
  /** Vertical flip so Home/Expenses flows mirror each other. */
  flip?: boolean;
  opacity?: number;
}

const VIEW_W = 400;
const VIEW_H = 800;

const FLOW_PATH =
  `M ${VIEW_W * 0.82} -20 ` +
  `C ${VIEW_W * 0.25} ${VIEW_H * 0.14}, ${VIEW_W * 0.95} ${VIEW_H * 0.32}, ${VIEW_W * 0.42} ${VIEW_H * 0.5} ` +
  `C ${VIEW_W * 0.02} ${VIEW_H * 0.64}, ${VIEW_W * 0.7} ${VIEW_H * 0.82}, ${VIEW_W * 0.5} ${VIEW_H + 20}`;

export function FlowRibbon({ width, height, flip = false, opacity = 1 }: FlowRibbonProps) {
  const [pulse] = useState(() => new Animated.Value(0.75));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false, // SVG node opacity — JS thread (single node)
        }),
        Animated.timing(pulse, {
          toValue: 0.75,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
        { opacity },
        flip && { transform: [{ scaleX: -1 }] },
      ]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="flowGradient" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#2f7bff" />
            <Stop offset="0.5" stopColor="#3fa4ff" />
            <Stop offset="1" stopColor={colors.secondaryGlow} />
          </LinearGradient>
        </Defs>

        {/* widest halo */}
        <Path
          d={FLOW_PATH}
          stroke="url(#flowGradient)"
          strokeWidth={64}
          fill="none"
          strokeLinecap="round"
          opacity={0.16}
        />
        {/* mid glow */}
        <Path
          d={FLOW_PATH}
          stroke="url(#flowGradient)"
          strokeWidth={34}
          fill="none"
          strokeLinecap="round"
          opacity={0.38}
        />
        {/* luminous core */}
        <AnimatedPath
          d={FLOW_PATH}
          stroke="url(#flowGradient)"
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          opacity={pulse}
        />
      </Svg>
    </Animated.View>
  );
}

