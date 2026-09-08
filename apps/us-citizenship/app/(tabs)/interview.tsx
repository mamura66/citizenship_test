import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { ScreenHeader, GlassCard, PrimaryButton, SecondaryButton, TabScrollView } from '../../src/components/ui';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { AppIcon } from '../../src/components/AppIcon';
import { InterviewerAvatar } from '../../src/components/InterviewerAvatar';
import { Paywall } from '../../src/components/Paywall';
import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, type } from '../../src/theme/theme';
import { useAppState } from '../../src/lib/appState';
import { usePurchase } from '../../src/lib/purchase';
import { acceptsAnyOne, getAllQuestions, resolveAnswers } from '../../src/content/loadContent';
import { getCountry } from '../../src/content/countries';

// V1: self-graded spoken-practice mode. The app speaks the question aloud (on-device
// TTS) and the user answers out loud to themselves, then self-grades by revealing the
// answer. No audio is recorded, transmitted, or stored - this deliberately avoids the
// BIPA/CCPA voice-biometric exposure that a cloud speech-to-text pipeline would create
// (see docs/LEGAL_REVIEW.md, item 4) until we've built proper consent flows for that.
export default function InterviewScreen() {
  const { colors } = useTheme();
  const { country, civicsVersion, practiceHistory } = useAppState();
  const { isPro } = usePurchase();
  const questions = useMemo(() => getAllQuestions(country, civicsVersion), [country, civicsVersion]);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * questions.length));
  const [revealed, setRevealed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [asked, setAsked] = useState(0);
  const [selfCorrect, setSelfCorrect] = useState(0);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Switching test version in Settings changes the pool size. Without this, an
  // index valid for the 128-question set points past the end of the 100-question
  // set and the screen crashes on the next render.
  useEffect(() => {
    setIndex(Math.floor(Math.random() * questions.length));
    setRevealed(false);
  }, [questions]);

  // Never leave speech running when the user navigates away.
  useEffect(
    () => () => {
      Speech.stop();
    },
    []
  );

  const current = questions[Math.min(index, questions.length - 1)];
  const answers = current ? resolveAnswers(current.answers) : [];
  const anyOneCounts = current ? acceptsAnyOne(current.question, answers.length) : false;
  const lastScorePct = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].scorePct : 0;

  const askQuestion = () => {
    if (!current) return;
    Speech.stop(); // repeated taps must not overlap
    setRevealed(false);
    setSpeaking(true);
    Speech.speak(current.question, {
      language: getCountry(country).language,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const nextRandom = (wasCorrect: boolean | null) => {
    Speech.stop();
    setSpeaking(false);
    if (wasCorrect !== null) {
      setAsked((a) => a + 1);
      if (wasCorrect) setSelfCorrect((c) => c + 1);
    }
    setRevealed(false);
    setIndex(Math.floor(Math.random() * questions.length));
  };

  return (
    <TabScrollView>
      <ScreenContainer>
        <ScreenHeader title="Mock interview" subtitle="Speak your answer out loud, then self-grade" />

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <GlassCard>
            <View style={styles.infoRow}>
              <AppIcon name="infoCircleFill" size={18} color={colors.accent} />
              <Text style={[type.caption, { flex: 1, color: colors.textSecondary, lineHeight: 18 }]}>
                This is a self-practice mode — the app never records or uploads your voice.
                Automatic speech scoring is on the roadmap and will require a separate consent
                step before it's turned on.
              </Text>
            </View>
          </GlassCard>

          {isPro && asked > 0 ? (
            <GlassCard>
              <Text style={[type.subheadline, { color: colors.textPrimary }]}>
                This session: {selfCorrect}/{asked} you marked correct
              </Text>
            </GlassCard>
          ) : null}

          {!isPro ? (
            <GlassCard style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
              <View style={[styles.avatarRing, { backgroundColor: colors.accentSoft }]}>
                <AppIcon name="chatBubbles" size={32} color={colors.accent} />
              </View>
              <Text style={[type.title2, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
                Practice the real interview
              </Text>
              <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 }]}>
                Mock interview is part of the lifetime unlock, alongside unlimited practice tests.
              </Text>
              <View style={{ height: spacing.md }} />
              <View style={{ alignSelf: 'stretch' }}>
                <PrimaryButton title="Unlock Mock Interview" onPress={() => setPaywallVisible(true)} />
              </View>
            </GlassCard>
          ) : !current ? (
            <GlassCard>
              <Text style={[type.body, { color: colors.textSecondary }]}>No questions available for this test version.</Text>
            </GlassCard>
          ) : (
            <>
              <GlassCard style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <InterviewerAvatar speaking={speaking} />
                <Text style={[type.monoLabel, { color: colors.textTertiary }]}>
                  {speaking ? 'ASKING…' : 'PRACTICE INTERVIEWER'}
                </Text>
                <Text style={[type.title2, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md, lineHeight: 28 }]}>
                  {current.question}
                </Text>

                <View style={{ height: spacing.md }} />
                <View style={{ alignSelf: 'stretch' }}>
                  <SecondaryButton title={speaking ? 'Asking…' : 'Speak question aloud'} onPress={askQuestion} />
                </View>

                {revealed ? (
                  <View style={{ marginTop: spacing.lg, alignSelf: 'stretch', gap: 6 }}>
                    <Text style={[type.monoLabel, { color: colors.textTertiary }]}>
                      {answers.length > 1 ? `ACCEPTED ANSWERS · ${answers.length}` : 'ANSWER'}
                    </Text>
                    {anyOneCounts ? (
                      <Text style={[type.caption, { color: colors.accent }]}>Any one of these is accepted.</Text>
                    ) : null}
                    {answers.map((a, i) => (
                      <View key={i} style={styles.answerRow}>
                        <AppIcon name="checkCircleFill" size={16} color={colors.success} />
                        <Text style={[type.body, { color: colors.textPrimary, flex: 1, lineHeight: 22 }]}>{a}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ marginTop: spacing.md, alignSelf: 'stretch' }}>
                    <PrimaryButton title="Reveal correct answer" onPress={() => setRevealed(true)} />
                  </View>
                )}
              </GlassCard>

              {revealed ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton title="I got it wrong" onPress={() => nextRandom(false)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton title="I got it right" onPress={() => nextRandom(true)} />
                  </View>
                </View>
              ) : (
                <SecondaryButton title="Skip question" onPress={() => nextRandom(null)} />
              )}
            </>
          )}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  infoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  answerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
