import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { colors } from './theme';

interface HeroRadialGlowProps {
  size?: number;
}

export function HeroRadialGlow({ size = 320 }: HeroRadialGlowProps) {
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="heroGlow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0%" stopColor={colors.electricCyan} stopOpacity="0.32" />
            <Stop offset="40%" stopColor={colors.neonBlue} stopOpacity="0.20" />
            <Stop offset="75%" stopColor="#0c1a3a" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={center} cy={center} r={center} fill="url(#heroGlow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    position: 'absolute',
    top: '50%',
    transform: [{ translateX: -160 }, { translateY: -160 }],
    zIndex: 0,
  },
});
