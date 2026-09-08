import { Children, ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader, GlassCard, PrimaryButton, TabScrollView } from '../../src/components/ui';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { AppIcon, AppIconName } from '../../src/components/AppIcon';
import { InterviewDateField, fromIsoDate, toIsoDate } from '../../src/components/InterviewDateField';
import { Paywall } from '../../src/components/Paywall';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radii, spacing, type } from '../../src/theme/theme';
import { useAppState } from '../../src/lib/appState';
import { COUNTRIES, getCountry } from '../../src/content/countries';
import { langOf, translator } from '../../src/lib/strings';
import { restoreMessage, usePurchase } from '../../src/lib/purchase';

// Structured as a conventional grouped settings list - a labelled section, then a
// card of hairline-separated rows - instead of the earlier stack of cards full of
// paragraphs. Long legal/privacy copy is collapsed behind disclosure rows so the
// screen is scannable, but every word is still one tap away (it has to be: the
// non-affiliation and not-legal-advice disclaimers are required, see
// docs/LEGAL_REVIEW.md).

const APPEARANCE_OPTIONS: { key: 'system' | 'light' | 'dark'; label: string; icon: AppIconName }[] = [
  { key: 'system', label: 'System', icon: 'circleHalf' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const {
    country,
    setCountry,
    civicsVersion,
    setCivicsVersion,
    practiceHistory,
    firstName,
    setFirstName,
    interviewDate,
    setInterviewDate,
    homeState,
  } = useAppState();
  const countryDef = getCountry(country);
  const tr = translator(langOf(countryDef.language));
  const { isPro, restorePurchases } = usePurchase();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState(firstName ?? '');
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [expanded, setExpanded] = useState<'privacy' | 'legal' | null>(null);

  const lastScorePct = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].scorePct : 0;

  const handleRestore = async () => {
    setRestoring(true);
    setRestoreMsg(null);
    const result = await restorePurchases();
    setRestoring(false);
    // One wording for every restore outcome, shared with the paywall. A store we
    // could not reach must never be reported as "no purchase found".
    setRestoreMsg(restoreMessage(result));
  };

  return (
    <TabScrollView>
      <ScreenContainer>
        <ScreenHeader title="Settings" />

        <View style={{ gap: spacing.lg }}>
          {/* ---------- Access ---------- */}
          <View style={{ paddingHorizontal: spacing.lg }}>
            {isPro ? (
              <GlassCard>
                <View style={styles.proRow}>
                  <AppIcon name="checkCircleFill" size={22} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.headline, { color: colors.textPrimary }]}>Lifetime access active</Text>
                    <Text style={[type.caption, { color: colors.textSecondary, marginTop: 2, lineHeight: 17 }]}>
                      Unlimited practice tests and mock interview, unlocked for good.
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ) : (
              <GlassCard>
                <Text style={[type.headline, { color: colors.textPrimary }]}>Unlock full access</Text>
                <Text style={[type.callout, { color: colors.textSecondary, marginTop: 4, lineHeight: 20 }]}>
                  One-time purchase, no subscription. Unlimited practice tests and the full mock interview.
                </Text>
                <View style={{ height: spacing.md }} />
                <PrimaryButton title="View lifetime unlock" onPress={() => setPaywallVisible(true)} />
              </GlassCard>
            )}
          </View>

          {/* ---------- Personal ---------- */}
          <Section title="Personal" footer="Stored on this device only. Never sent anywhere.">
            <Row label="First name">
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                onEndEditing={() => setFirstName(nameDraft)}
                onBlur={() => setFirstName(nameDraft)}
                placeholder="Add your name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                style={[type.body, styles.inlineInput, { color: colors.textPrimary }]}
              />
            </Row>
            <Row label="Interview date" stacked>
              <InterviewDateField
                value={interviewDate ? fromIsoDate(interviewDate) : null}
                onChange={(d) => setInterviewDate(d ? toIsoDate(d) : null)}
              />
              {interviewDate ? (
                <Pressable onPress={() => setInterviewDate(null)} style={{ paddingTop: spacing.xs }}>
                  <Text style={[type.subheadline, { color: colors.accent }]}>Remove date</Text>
                </Pressable>
              ) : null}
            </Row>
            <LinkRow label="My state" value={homeState ?? 'Not set'} onPress={() => router.push('/local')} />
          </Section>

          {/* ---------- Appearance ---------- */}
          <Section title="Appearance">
            <View style={styles.segmentWrap}>
              {APPEARANCE_OPTIONS.map((opt) => {
                const active = preference === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setPreference(opt.key)}
                    style={({ pressed }) => [
                      styles.segment,
                      { backgroundColor: active ? colors.accentFill : 'transparent' },
                      pressed && !active && { opacity: 0.6 },
                    ]}
                  >
                    <AppIcon name={opt.icon} size={17} color={active ? colors.onFill : colors.textSecondary} />
                    <Text style={[type.subheadline, { color: active ? colors.onFill : colors.textPrimary }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {/* ---------- Which country's test ---------- */}
          <Section title={tr('country.current')} footer={tr('country.explain')}>
            <View style={styles.segmentWrap}>
              {COUNTRIES.map((c) => {
                const active = c.code === country;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => setCountry(c.code)}
                    style={({ pressed }) => [
                      styles.segment,
                      { backgroundColor: active ? colors.accentFill : 'transparent' },
                      pressed && !active && { opacity: 0.6 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[type.subheadline, { color: active ? colors.onFill : colors.textPrimary }]}>
                      {c.flag}  {c.nativeName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Row label={tr('country.official')}>
              <Text style={[type.body, { color: colors.textSecondary }]}>{countryDef.officialTestName}</Text>
            </Row>
          </Section>

          {/* ---------- Which version of that test ----------
               Drawn only when the country really has more than one version in force. Two
               are for the United States and which applies depends on when the person filed,
               so it has to be theirs to choose. Germany publishes one catalogue, and a
               one-option picker would imply a decision that does not exist. */}
          {countryDef.versions.length > 1 ? (
            <Section
              title={countryDef.officialTestName}
              footer={countryDef.versions.map((v) => v.note).filter(Boolean).join(' ') || undefined}
            >
              <View style={styles.segmentWrap}>
                {countryDef.versions.map((v) => {
                  const active = civicsVersion === v.id;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => setCivicsVersion(v.id)}
                      style={({ pressed }) => [
                        styles.segment,
                        { backgroundColor: active ? colors.accentFill : 'transparent' },
                        pressed && !active && { opacity: 0.6 },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[type.subheadline, { color: active ? colors.onFill : colors.textPrimary }]}>
                        {v.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {/* ---------- Purchases ---------- */}
          <Section title="Purchases">
            <ActionRow
              label={restoring ? 'Checking…' : 'Restore purchases'}
              icon="checkCircleFill"
              onPress={handleRestore}
              disabled={restoring}
            />
            {restoreMsg ? (
              <Row label="">
                <Text style={[type.caption, { color: colors.textSecondary }]}>{restoreMsg}</Text>
              </Row>
            ) : null}
          </Section>

          {/* ---------- About ---------- */}
          <Section title="About">
            <DisclosureRow
              label="Privacy"
              open={expanded === 'privacy'}
              onPress={() => setExpanded(expanded === 'privacy' ? null : 'privacy')}
              body="The mock interview uses on-device text-to-speech to ask questions. It does not record, transmit, or store your voice. A future speech-scoring feature will ask for separate, explicit consent before any audio leaves your device."
            />
            <DisclosureRow
              label="Disclaimers"
              open={expanded === 'legal'}
              onPress={() => setExpanded(expanded === 'legal' ? null : 'legal')}
              body={
                'This app is an independent study tool. It is not affiliated with, endorsed by, or sponsored by U.S. Citizenship and Immigration Services (USCIS) or any government agency. All official civics questions and vocabulary lists come from uscis.gov (U.S. government works, public domain).\n\n' +
                'It provides general educational information about the naturalization test. It does not provide legal advice, and using it does not create an attorney-client relationship. For advice about your case, consult a licensed immigration attorney or an accredited representative.'
              }
            />
          </Section>

        </View>
      </ScreenContainer>

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        lastScorePct={lastScorePct}
        onPurchased={() => setPaywallVisible(false)}
      />
    </TabScrollView>
  );
}

/* ------------------------------- building blocks ------------------------------ */

function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View>
      <Text style={[type.monoLabel, styles.sectionLabel, { color: colors.textTertiary }]}>{title.toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
        {rows.map((row, i) => (
          <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator } : undefined}>
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <Text style={[type.caption, styles.sectionFooter, { color: colors.textTertiary }]}>{footer}</Text>
      ) : null}
    </View>
  );
}

/** A label on the left with its control on the right, or beneath it when `stacked`. */
function Row({ label, children, stacked = false }: { label: string; children?: ReactNode; stacked?: boolean }) {
  const { colors } = useTheme();
  if (stacked) {
    return (
      <View style={styles.rowStacked}>
        <Text style={[type.body, { color: colors.textPrimary }]}>{label}</Text>
        {children}
      </View>
    );
  }
  return (
    <View style={styles.row}>
      {label ? <Text style={[type.body, { color: colors.textPrimary }]}>{label}</Text> : null}
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

function LinkRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Text style={[type.body, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[type.callout, { color: colors.textSecondary }]}>{value}</Text>
        <AppIcon name="chevronRight" size={13} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

function ActionRow({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: AppIconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={[type.body, { color: colors.accent }]}>{label}</Text>
      <AppIcon name={icon} size={17} color={colors.accent} />
    </Pressable>
  );
}

function DisclosureRow({
  label,
  body,
  open,
  onPress,
}: {
  label: string;
  body: string;
  open: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
        <Text style={[type.body, { color: colors.textPrimary }]}>{label}</Text>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <AppIcon name="chevronRight" size={13} color={colors.textTertiary} />
        </View>
      </Pressable>
      {open ? (
        <Text style={[type.callout, styles.disclosureBody, { color: colors.textSecondary }]}>{body}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginLeft: spacing.lg + spacing.xs, marginBottom: spacing.xs },
  sectionFooter: { marginHorizontal: spacing.lg + spacing.xs, marginTop: spacing.xs, lineHeight: 17 },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    minHeight: 48,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  rowStacked: { paddingHorizontal: spacing.md, paddingVertical: 13, gap: spacing.xxs },
  inlineInput: { textAlign: 'right', minWidth: 140, paddingVertical: 0 },
  disclosureBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, lineHeight: 20 },
  proRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  segmentWrap: { flexDirection: 'row', gap: 4, padding: 4 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
