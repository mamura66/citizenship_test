import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { type } from '../theme/theme';
import { AnimatedCircle } from './animatedSvg';

/**
 * "Civics Pulse" signature moment: a single readiness gauge whose arc sweeps
 * in from 0 on mount. `empty` renders an honest no-data state ("—" / START)
 * instead of a fabricated percentage when the user has no sessions yet.
 */
export function RadialGauge({
  percent,
  trackColor,
  arcColor,
  glowColor,
  textColor,
  size = 112,
  empty = false,
}: {
  percent: number;
  trackColor: string;
  arcColor: string;
  glowColor: string;
  textColor: string;
  size?: number;
  empty?: boolean;
}) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(0)).current;
  const target = empty ? 0 : Math.max(0, Math.min(100, percent));

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: target,
      duration: 1300,
      delay: 200,
      useNativeDriver: false, // strokeDashoffset isn't supported by the native driver
    }).start();
  }, [target]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={[
        { width: size, height: size },
        { shadowColor: glowColor, shadowOpacity: empty ? 0 : 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={radius} stroke={trackColor} strokeWidth={9} fill="none" />
        <AnimatedCircle
          cx={50}
          cy={50}
          r={radius}
          stroke={arcColor}
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={styles.mid}>
        <Text style={[type.numLg, { color: textColor, fontSize: size >= 112 ? 26 : 22 }]}>
          {empty ? '—' : `${target}%`}
        </Text>
        <Text style={[type.monoLabel, { color: textColor, opacity: 0.5 }]}>{empty ? 'START' : 'READY'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
