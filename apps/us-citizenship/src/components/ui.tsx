import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { radii, shadow, spacing, type } from '../theme/theme';

// NativeTabs (expo-router/unstable-native-tabs) auto-insets content on iOS/Android
// but not on its web fallback, where the fixed top bar sits over page content -
// see docs/BUILD_PLAN.md. This constant compensates only on web.
export const WEB_TABBAR_OFFSET = Platform.OS === 'web' ? 56 : 0;

/** Height to keep clear beneath content for the floating native tab bar. */
export const TAB_BAR_CLEARANCE = 56;

/**
 * The scroll container every tab screen should use.
 *
 * NativeTabs is documented to apply automatic content insets to a screen whose root
 * is a scroll view, but on device that did not happen reliably (Home rendered its
 * title under the status bar, and Settings did the same). So every tab screen opts
 * OUT of automatic adjustment and pads for the safe area explicitly - deterministic
 * on iOS, Android and web, and the magic tab-bar number lives in exactly one place.
 */
export function TabScrollView({
  children,
  contentContainerStyle,
}: PropsWithChildren<{ contentContainerStyle?: ViewStyle }>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[
        { paddingTop: insets.top, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + spacing.lg },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerWrap}>
      <Text style={[type.largeTitle, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[type.callout, { color: colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text> : null}
    </View>
  );
}

// Named GlassCard from the earlier Liquid Glass pass; the app has since
// settled on the "Civics Pulse" identity (a flat, clean data-monitor look
// with no blur/translucency - see prototype-pulse.html), so this now
// renders a plain solid card. Kept the name to avoid touching every screen's
// imports for what is, visually, a deliberate flat-card design now.
export function GlassCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardShadowWrap, { backgroundColor: colors.surface, borderColor: colors.separator }, style]}>
      {children}
    </View>
  );
}

/** The "LIVE READINESS MONITOR"-style eyebrow with a pulsing dot, ported from prototype-pulse.html. */
export function PulseEyebrow({ label }: { label: string }) {
  const { colors } = useTheme();
  const blip = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blip, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(blip, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={styles.eyebrowRow}>
      <Animated.View style={[styles.eyebrowDot, { backgroundColor: colors.accent, opacity: blip }]} />
      <Text style={[type.monoLabel, { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors } = useTheme();
  return <View style={[styles.plainCard, { backgroundColor: colors.surface }, style]}>{children}</View>;
}

function useTapScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return { scale, onPressIn, onPressOut };
}

// Buttons always stretch to their container's width and carry horizontal
// padding, so a long label inside a centered card (alignItems: 'center') can't
// shrink the pill down to the text and overflow it - that was the "Unlock Mock
// Interview" bug on the Interview screen.
export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapScale();
  return (
    <Animated.View style={[styles.buttonWrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[styles.primaryButton, { backgroundColor: colors.accentFill }, disabled && { opacity: 0.4 }]}
      >
        {/* onFill, not '#fff': in dark mode the fill is the bright phosphor green
            and white on it measures 1.69:1. See the contrast note in theme.ts. */}
        <Text style={[styles.primaryButtonText, { color: colors.onFill }]} numberOfLines={1}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = useTapScale();
  return (
    <Animated.View style={[styles.buttonWrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.secondaryButton, { backgroundColor: colors.accentSoft }]}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.accent }]} numberOfLines={1}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        { backgroundColor: active ? colors.accentFill : colors.surface, borderColor: colors.separator },
        !active && { borderWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Text style={[type.subheadline, { color: active ? colors.onFill : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + WEB_TABBAR_OFFSET,
    paddingBottom: spacing.sm,
  },

  cardShadowWrap: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    ...shadow.card,
  },
  plainCard: { borderRadius: radii.md, padding: spacing.md },

  buttonWrap: { alignSelf: 'stretch' },
  primaryButton: { paddingVertical: 15, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: 'center' },
  primaryButtonText: { ...type.headline }, // color comes from colors.onFill at the call site
  secondaryButton: { paddingVertical: 15, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: 'center' },
  secondaryButtonText: { ...type.headline },

  pill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radii.md },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3 },
});
