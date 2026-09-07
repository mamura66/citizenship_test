import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AmericanFlag } from './AmericanFlag';
import { useTheme } from '../theme/ThemeProvider';

// Stands in for the interviewer in the mock interview. Deliberately a generic
// figure with a small flag chip - never a real USCIS officer, seal, or uniform,
// which would imply an official endorsement the app must not claim
// (see docs/LEGAL_REVIEW.md).
//
// While the question is being spoken, two rings expand and fade outward so the
// screen visibly "talks" instead of sitting static. Two looping values, the
// second offset by half a cycle, so a ring is always mid-flight. Native driver.

const CYCLE = 1800;

export function InterviewerAvatar({ speaking, size = 96 }: { speaking: boolean; size?: number }) {
  const { colors } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!speaking) {
      a.stopAnimation(() => a.setValue(0));
      b.stopAnimation(() => b.setValue(0));
      return;
    }
    const spin = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.timing(v, { toValue: 1, duration: CYCLE, delay, easing: Easing.out(Easing.ease), useNativeDriver: true })
      );
    const loopA = spin(a, 0);
    const loopB = spin(b, CYCLE / 2);
    loopA.start();
    loopB.start();
    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [speaking]);

  const ringStyle = (v: Animated.Value) => ({
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.85] }) }],
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.35, 0] }),
  });

  const box = size * 1.9;

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {speaking ? (
        <>
          <Animated.View
            style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: colors.accent }, ringStyle(a)]}
          />
          <Animated.View
            style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: colors.accent }, ringStyle(b)]}
          />
        </>
      ) : null}

      <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft }]}>
        <AppIcon name="person" size={Math.round(size * 0.42)} color={colors.accent} />
      </View>

      <View style={[styles.flagChip, { borderColor: colors.background, right: box / 2 - size / 2 - 4, bottom: box / 2 - size / 2 + 2 }]}>
        <AmericanFlag width={26} radius={3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 2 },
  disc: { alignItems: 'center', justifyContent: 'center' },
  flagChip: { position: 'absolute', borderWidth: 2, borderRadius: 5, overflow: 'hidden' },
});
