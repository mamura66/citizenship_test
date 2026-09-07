import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmericanFlag } from '../src/components/AmericanFlag';
import { AppIcon, AppIconName } from '../src/components/AppIcon';
import { GlassCard, PrimaryButton, SecondaryButton } from '../src/components/ui';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { InterviewDateField, toIsoDate } from '../src/components/InterviewDateField';
import { useTheme } from '../src/theme/ThemeProvider';
import { radii, spacing, type } from '../src/theme/theme';
import { useAppState } from '../src/lib/appState';
import { WELCOME_QUOTE } from '../src/content/quotes';

// First-launch experience. Three short steps, shown once:
//   1. Welcome - the flag (drawn to spec) and words from a President about
//      exactly what this user is about to do. Copy is written to who these
//      users actually are: lawful permanent residents who have already lived
//      here for years and are about to make it official.
//   2. Personal - first name and interview date. Both optional, both stored on
//      the device only. The date uses the platform's native date picker via
//      InterviewDateField - nobody types a date. A real interview date powers
//      an honest countdown on Home. Both can be changed later in Settings.
//   3. Trust - the three things that make this app safe to rely on.

type Step = 'welcome' | 'personal' | 'trust';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { setFirstName, setInterviewDate, setHasOnboarded } = useAppState();

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [noDateYet, setNoDateYet] = useState(false);

  const flagWidth = Math.min(width - spacing.lg * 2, 440);

  const finish = () => {
    setHasOnboarded(true);
    router.replace('/');
  };

  const continueFromPersonal = () => {
    const chosen = noDateYet ? null : date;
    setInterviewDate(chosen ? toIsoDate(chosen) : null);
    setFirstName(name);
    setStep('trust');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenContainer>
          {step === 'welcome' && (
            <View style={styles.pad}>
              <View style={styles.flagWrap}>
                <AmericanFlag width={flagWidth} radius={radii.sm} />
              </View>
              <Text style={[type.largeTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>
                The last step of a long journey.
              </Text>
              <Text style={[type.body, { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 24 }]}>
                You've been building a life here for years. This is where it becomes official — and
                we'll help you walk in ready.
              </Text>

              <GlassCard style={{ marginTop: spacing.xl }}>
                <Text style={[type.body, { color: colors.textPrimary, lineHeight: 24, fontStyle: 'italic' }]}>
                  “{WELCOME_QUOTE.text}”
                </Text>
                <Text style={[type.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                  — {WELCOME_QUOTE.attribution}
                </Text>
              </GlassCard>

              <View style={{ flex: 1 }} />
              <View style={{ marginTop: spacing.xl }}>
                <PrimaryButton title="Begin" onPress={() => setStep('personal')} />
              </View>
            </View>
          )}

          {step === 'personal' && (
            <View style={styles.pad}>
              <Text style={[type.largeTitle, { color: colors.textPrimary }]}>Let's make this yours.</Text>
              <Text style={[type.body, { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 24 }]}>
                Both of these are optional, and both stay on your phone — nothing is sent anywhere.
              </Text>

              <Text style={[type.headline, { color: colors.textPrimary, marginTop: spacing.xl }]}>
                What should we call you?
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="First name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.separator }]}
              />

              <Text style={[type.headline, { color: colors.textPrimary, marginTop: spacing.lg }]}>
                When is your interview?{' '}
                <Text style={[type.callout, { color: colors.textTertiary }]}>(optional)</Text>
              </Text>
              <Text style={[type.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                We'll count down to it on your home screen.
              </Text>

              <InterviewDateField
                value={date}
                disabled={noDateYet}
                onChange={(d) => {
                  setDate(d);
                  if (d) setNoDateYet(false);
                }}
              />

              <Pressable
                onPress={() => {
                  const next = !noDateYet;
                  setNoDateYet(next);
                  if (next) setDate(null);
                }}
                style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.7 }]}
              >
                <View
                  style={[
                    styles.checkBox,
                    {
                      borderColor: noDateYet ? colors.accentFill : colors.separator,
                      backgroundColor: noDateYet ? colors.accentFill : 'transparent',
                    },
                  ]}
                >
                  {noDateYet && <AppIcon name="check" size={12} color={colors.onFill} />}
                </View>
                <Text style={[type.callout, { color: colors.textSecondary }]}>I don't have an interview date yet</Text>
              </Pressable>

              <View style={{ flex: 1 }} />
              <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
                <PrimaryButton title="Continue" onPress={continueFromPersonal} />
                <SecondaryButton
                  title="Skip for now"
                  onPress={() => {
                    setFirstName(null);
                    setInterviewDate(null);
                    setStep('trust');
                  }}
                />
              </View>
            </View>
          )}

          {step === 'trust' && (
            <View style={styles.pad}>
              <Text style={[type.largeTitle, { color: colors.textPrimary }]}>What you can count on.</Text>

              <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                <TrustRow
                  icon="checkCircleFill"
                  title="Every question is official"
                  body="Every civics question — both the 2008 and 2025 tests — and the reading and writing vocabulary come directly from USCIS's published test materials."
                />
                <TrustRow
                  icon="person"
                  title="Your data stays on your phone"
                  body="No account, no sign-up. Your name, progress, and interview date never leave this device."
                />
                <TrustRow
                  icon="infoCircleFill"
                  title="Independent, and clear about it"
                  body="This is an independent study tool. It is not affiliated with, endorsed by, or sponsored by USCIS or any government agency, and it isn't legal advice."
                />
              </View>

              <View style={{ flex: 1 }} />
              <View style={{ marginTop: spacing.xl }}>
                <PrimaryButton title="Start studying" onPress={finish} />
              </View>
            </View>
          )}
        </ScreenContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TrustRow({ icon, title, body }: { icon: AppIconName; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.trustRow}>
      <View style={[styles.trustIcon, { backgroundColor: colors.accentSoft }]}>
        <AppIcon name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.headline, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[type.callout, { color: colors.textSecondary, marginTop: 4, lineHeight: 20 }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: spacing.lg },
  flagWrap: { alignItems: 'center' },
  input: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...type.body,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  trustIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
