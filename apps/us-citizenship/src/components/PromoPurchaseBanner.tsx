import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { radii, spacing, type } from '../theme/theme';
import { usePurchase } from '../lib/purchase';
import { AppIcon } from './AppIcon';

/**
 * Surfaces a purchase Apple itself started - someone tapping the promoted "Lifetime
 * access" card in App Store search results or on the product page, before or after the
 * app was even open. There is no screen to attach that flow to (it can arrive on any
 * tab, or before the person has navigated anywhere), so this mounts once at the root and
 * reads src/lib/purchase.tsx's promoPurchase state directly.
 *
 * Success is shown briefly and dismisses itself - nothing needs confirming, the person
 * already told the App Store they wanted this. An error stays until dismissed, because
 * "your card was charged and nothing happened" is exactly the silent failure CLAUDE.md
 * warns about.
 */
export function PromoPurchaseBanner() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { promoPurchase, dismissPromoPurchase } = usePurchase();

  useEffect(() => {
    if (promoPurchase.status !== 'success') return;
    const timer = setTimeout(dismissPromoPurchase, 3500);
    return () => clearTimeout(timer);
  }, [promoPurchase.status]);

  if (promoPurchase.status === 'idle') return null;

  const tone =
    promoPurchase.status === 'error'
      ? { bg: colors.dangerSoft, fg: colors.danger, icon: 'warningTriangleFill' as const }
      : promoPurchase.status === 'success'
        ? { bg: colors.successSoft, fg: colors.success, icon: 'checkCircleFill' as const }
        : { bg: colors.surface, fg: colors.textSecondary, icon: null };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.xs }]}>
      <View style={[styles.card, { backgroundColor: tone.bg, borderColor: colors.separator }]}>
        {promoPurchase.status === 'pending' ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <AppIcon name={tone.icon!} size={18} color={tone.fg} />
        )}
        <Text style={[type.callout, { color: colors.textPrimary, flex: 1 }]} numberOfLines={3}>
          {promoPurchase.status === 'pending' && 'Completing your purchase from the App Store…'}
          {promoPurchase.status === 'success' && "You're all set — full access is unlocked."}
          {promoPurchase.status === 'error' && promoPurchase.message}
        </Text>
        {promoPurchase.status === 'error' ? (
          <Pressable onPress={dismissPromoPurchase} hitSlop={10}>
            <AppIcon name="xCircleFill" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 50 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
