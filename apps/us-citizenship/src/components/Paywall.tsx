import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radii, spacing, type } from '../theme/theme';
import { usePurchase } from '../lib/purchase';
import { AppIcon } from './AppIcon';
import { RadialGauge } from './RadialGauge';

// Design rationale (see docs/BUILD_PLAN.md "Motivation & conversion design"
// for the full research this is built on):
//  - Shown only AFTER a completed practice test (soft paywall, value-first -
//    the Duolingo/Headspace pattern: prove real competence, then ask).
//  - Leads with the user's actual score via the same gauge used on Home
//    (goal-gradient effect: "you're closer than you think" lands harder when
//    it's paired with a real, specific number, not a generic pitch).
//  - Outcome-framed copy ("walk into your interview ready"), not a feature
//    list - mirrors Headspace's finding that outcome framing outperforms
//    listing features.
//  - Price is anchored against a *true, verified* competitor price
//    ($9.99/week for Citizenry), not a fabricated "was $49.99" strike-through.
//  - Deliberately NO countdown timer, NO fake scarcity, NO fear-based copy
//    ("you might fail without this"). This app serves people mid-naturalization
//    - a genuinely stressful process - and exploiting that anxiety for
//    conversion is both an ethical line and a real dark-patterns/FTC risk
//    (see docs/LEGAL_REVIEW.md). The identity/outcome motivation here is
//    real and doesn't need manufactured urgency.
//  - Always dismissible (soft paywall) and always shows Restore Purchases
//    (Apple requires this be reachable from the paywall itself).

export function Paywall({
  visible,
  onClose,
  lastScorePct,
  onPurchased,
}: {
  visible: boolean;
  onClose: () => void;
  lastScorePct: number;
  onPurchased: () => void;
}) {
  const { colors } = useTheme();
  const { priceDisplay, purchaseLifetime, restorePurchases } = usePurchase();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBuy = async () => {
    setBusy('buy');
    setErrorMsg(null);
    const result = await purchaseLifetime();
    setBusy(null);
    if (result.success) {
      onPurchased();
    } else if (result.error && result.error !== 'cancelled') {
      // A silent failure here reads as a broken app. Surface the reason.
      setErrorMsg(result.error);
    }
  };

  const handleRestore = async () => {
    setBusy('restore');
    setRestoreMsg(null);
    const result = await restorePurchases();
    setBusy(null);
    if (result.restored) {
      setRestoreMsg('Purchase restored — you have full access.');
      onPurchased();
    } else {
      setRestoreMsg('No previous purchase found for this account.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <AppIcon name="chevronLeft" size={20} color={colors.textSecondary} />
          </Pressable>

          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
            <View style={styles.gaugeWrap}>
              <RadialGauge
                percent={lastScorePct}
                trackColor={colors.separator}
                arcColor={colors.accent}
                glowColor={colors.accentGlow}
                textColor={colors.textPrimary}
              />
            </View>

            <Text style={[type.largeTitle, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md, fontSize: 26 }]}>
              You're closer than you think
            </Text>
            <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg, lineHeight: 20 }]}>
              That score is real progress. Unlock unlimited practice tests and a full mock
              interview so you can walk in on interview day already knowing you're ready.
            </Text>

            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm }}>
              <Feature icon="checkCircleFill" text="Unlimited practice tests, every question" />
              <Feature icon="chatBubbles" text="Full mock interview practice" />
              <Feature icon="stack" text="Every flashcard stays free, forever" />
            </View>

            <View style={[styles.priceCard, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
              <Text style={[type.numLg, { color: colors.textPrimary, fontSize: 30 }]}>{priceDisplay}</Text>
              <Text style={[type.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                One time. No subscription, no recurring charge — ever.
              </Text>
              <Text style={[type.caption, { color: colors.textTertiary, marginTop: 6 }]}>
                Some apps in this category charge $9.99 a week. This is $9.99 once.
              </Text>
            </View>

            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm }}>
              <Pressable
                style={[styles.buyBtn, { backgroundColor: colors.accent }, busy === 'buy' && { opacity: 0.7 }]}
                onPress={handleBuy}
                disabled={busy !== null}
              >
                <Text style={styles.buyBtnText}>{busy === 'buy' ? 'Processing…' : `Unlock for ${priceDisplay}`}</Text>
              </Pressable>

              {errorMsg ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                  <AppIcon name="warningTriangleFill" size={16} color={colors.danger} />
                  <Text style={[type.caption, { color: colors.textPrimary, flex: 1, lineHeight: 17 }]}>{errorMsg}</Text>
                </View>
              ) : null}

              <Pressable onPress={handleRestore} disabled={busy !== null} style={styles.restoreBtn}>
                <Text style={[type.subheadline, { color: colors.accent }]}>
                  {busy === 'restore' ? 'Checking…' : 'Restore Purchases'}
                </Text>
              </Pressable>
              {restoreMsg ? (
                <Text style={[type.caption, { color: colors.textSecondary, textAlign: 'center' }]}>{restoreMsg}</Text>
              ) : null}

              <Pressable onPress={onClose} style={styles.laterBtn}>
                <Text style={[type.callout, { color: colors.textTertiary }]}>Not now</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Feature({ icon, text }: { icon: 'checkCircleFill' | 'chatBubbles' | 'stack'; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.featureRow}>
      <AppIcon name={icon} size={18} color={colors.accent} />
      <Text style={[type.callout, { color: colors.textPrimary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: spacing.sm },
  closeBtn: { alignSelf: 'flex-start', padding: spacing.md },
  gaugeWrap: { alignItems: 'center', marginTop: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    alignItems: 'center',
  },
  buyBtn: { borderRadius: radii.md, paddingVertical: 16, alignItems: 'center' },
  buyBtnText: { color: '#fff', ...type.headline, fontSize: 17 },
  restoreBtn: { alignItems: 'center', paddingVertical: spacing.xs },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  laterBtn: { alignItems: 'center', paddingVertical: spacing.xs },
});
