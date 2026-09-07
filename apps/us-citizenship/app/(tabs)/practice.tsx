import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader, GlassCard, PrimaryButton, SecondaryButton, Pill, TabScrollView } from '../../src/components/ui';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { AppIcon } from '../../src/components/AppIcon';
import { Paywall } from '../../src/components/Paywall';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radii, spacing, type } from '../../src/theme/theme';
import { useAppState } from '../../src/lib/appState';
import { usePurchase } from '../../src/lib/purchase';
import {
  acceptsAnyOne,
  GOVERNORS,
  JURISDICTIONS,
  STATE_CAPITALS,
  capitalAnswerFor,
  findCategory,
  getAllQuestions,
  governorAnswerFor,
  resolveAnswers,
} from '../../src/content/loadContent';
import type { CivicsQuestion } from '../../src/content/types';
import { subsectionLabel, topicGuideFor } from '../../src/content/topics';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = 'setup' | 'running' | 'results';

// Which questions genuinely require picking several answers.
//
// The definite article is the deciding signal in USCIS phrasing:
//   "Name TWO important ideas…"          -> two separate picks
//   "Name THE two parts of the Congress" -> ONE composite answer ("Senate and House")
//   "Name THE three branches"            -> ONE composite answer
//   "Name ONE OF the two longest rivers" -> one pick
// Getting this wrong is why "Name one of the two longest rivers" was asking for
// two selections. Anything not clearly multi-answer stays single-select.
function expectedAnswerCount(q: CivicsQuestion, acceptable: string[]): number {
  const text = q.question;
  if (/\bone of\b/i.test(text)) return 1; // "Name one of the two…"
  if (/\b(?:the|its|their)\s+(?:two|three)\b/i.test(text)) return 1; // composite answer
  // Matched at any sentence start, not just the beginning of the question, so
  // "There were 13 original states. Name three." is caught too.
  const m = text.match(/(?:^|[.!?]\s+)(?:name|list|give|what are)\s+(two|three)\b/i);
  if (!m) return 1;
  const n = m[1].toLowerCase() === 'two' ? 2 : 3;
  return acceptable.length >= n ? n : 1;
}

// Distractors scale with the number of answers required, so a three-answer
// question isn't 3 correct out of 4 options (impossible to fail).
const DISTRACTOR_COUNT = 3;

interface PreparedQuestion {
  q: CivicsQuestion;
  acceptable: string[]; // every official answer, resolved (governor/capital/dynamic)
  options: string[]; // expected + DISTRACTOR_COUNT choices, in display order
  correctSet: Set<string>;
  expected: number; // how many the user must pick
}

export default function PracticeScreen() {
  const { colors } = useTheme();
  const { civicsVersion, recordPracticeResult, practiceHistory, homeState, starredIds, toggleStar } = useAppState();
  const { isPro } = usePurchase();
  const allQuestions = useMemo(() => getAllQuestions(civicsVersion), [civicsVersion]);

  // State-specific questions: resolve governor/capital from the user's chosen
  // state or jurisdiction. For D.C. and the territories the official answer is a
  // fixed statement ("D.C. does not have a governor"), and their U.S. senators
  // question has a definite answer too, so those are testable. A named senator or
  // representative needs a live congressional feed we don't have, so those stay
  // out rather than being shown with a fake answer.
  const resolveAcceptable = (q: CivicsQuestion): string[] | null => {
    const raw = resolveAnswers(q.answers);
    if (!raw.includes('Answers will vary.')) return raw;
    const t = (q as any).stateSpecificType as string | undefined;
    if (!homeState) return null;
    if (t === 'governor') {
      const a = governorAnswerFor(homeState);
      return a ? [a] : null;
    }
    if (t === 'capital') {
      const a = capitalAnswerFor(homeState);
      return a ? [a] : null;
    }
    if (t === 'senator') {
      const j = JURISDICTIONS[homeState];
      return j ? [j.senatorAnswer] : null;
    }
    return null;
  };

  const testable = useMemo(() => allQuestions.filter((q) => resolveAcceptable(q) !== null), [allQuestions, homeState]);
  const defaultCount = civicsVersion === '2025' ? 20 : 10;
  const defaultPass = civicsVersion === '2025' ? 12 : 6;

  const [phase, setPhase] = useState<Phase>('setup');
  const [count, setCount] = useState(defaultCount);
  const [passThreshold, setPassThreshold] = useState(defaultPass);
  const [deck, setDeck] = useState<PreparedQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [graded, setGraded] = useState<null | boolean>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<PreparedQuestion[]>([]);
  // Switching test version in Settings changes the real test's length and pass
  // line. Without this the screen kept the old numbers (a 2008 user could be
  // handed a 20-question test needing 12 correct while the card said 10 and 6).
  useEffect(() => {
    setCount(defaultCount);
    setPassThreshold(defaultPass);
    setPhase('setup');
  }, [civicsVersion]);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // First full practice test is free for everyone (soft paywall, value-first -
  // see docs/BUILD_PLAN.md "Motivation & conversion design"). Every test after
  // that requires the lifetime unlock.
  const hasUsedFreeTest = practiceHistory.length >= 1;
  const lastScorePct = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].scorePct : 0;

  // Build every question's options ONCE per test, so they can't reshuffle mid-question.
  const prepare = (q: CivicsQuestion): PreparedQuestion => {
    const acceptable = resolveAcceptable(q)!;
    const expected = expectedAnswerCount(q, acceptable);
    const correct = shuffle(acceptable).slice(0, expected);
    const t = (q as any).stateSpecificType as string | undefined;
    const acceptableSet = new Set(acceptable);
    let pool: string[];
    // Plausible distractors for the state-specific questions: other governors /
    // other capitals. Only used where the answer really is a name or a city.
    if (t === 'governor' && GOVERNORS[homeState ?? '']) pool = Object.values(GOVERNORS).map((g) => g.name);
    else if (t === 'capital' && STATE_CAPITALS[homeState ?? '']) pool = Object.values(STATE_CAPITALS);
    else {
      // Prefer distractors from the same topic (more plausible), fall back to any.
      const cat = findCategory(civicsVersion, q.id);
      const sameTopic = (cat?.questions ?? []).filter((o) => o.id !== q.id).flatMap((o) => resolveAnswers(o.answers));
      const anyTopic = allQuestions.filter((o) => o.id !== q.id).flatMap((o) => resolveAnswers(o.answers));
      pool = [...shuffle(sameTopic), ...shuffle(anyTopic)];
    }
    const distractors: string[] = [];
    for (const cand of pool) {
      if (distractors.length >= DISTRACTOR_COUNT) break;
      if (cand === 'Answers will vary.' || acceptableSet.has(cand) || distractors.includes(cand)) continue;
      distractors.push(cand);
    }
    return { q, acceptable, options: shuffle([...correct, ...distractors]), correctSet: new Set(correct), expected };
  };

  const beginTest = () => {
    setDeck(shuffle(testable).slice(0, Math.min(count, testable.length)).map(prepare));
    setQIndex(0);
    setSelected([]);
    setGraded(null);
    setCorrectCount(0);
    setMissed([]);
    setPhase('running');
  };

  const startTest = () => {
    if (hasUsedFreeTest && !isPro) {
      setPaywallVisible(true);
      return;
    }
    beginTest();
  };

  const choose = (opt: string) => {
    if (graded !== null) return;
    const current = deck[qIndex];
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    if (next.length < current.expected) {
      setSelected(next);
      return;
    }
    // Enough picks - grade.
    const isCorrect = next.every((s) => current.correctSet.has(s));
    setSelected(next);
    setGraded(isCorrect);
    if (isCorrect) setCorrectCount((c) => c + 1);
    else setMissed((m) => [...m, current]);
  };

  const nextQuestion = () => {
    if (qIndex + 1 >= deck.length) {
      const scorePct = Math.round((correctCount / deck.length) * 100);
      recordPracticeResult(scorePct, correctCount >= passThreshold);
      setPhase('results');
    } else {
      setQIndex((i) => i + 1);
      setSelected([]);
      setGraded(null);
    }
  };

  const studyTopic = (categoryId: string) => router.push({ pathname: '/study', params: { category: categoryId } });

  if (phase === 'setup') {
    return (
      <TabScrollView>
        <ScreenContainer>
          <ScreenHeader title="Practice test" subtitle={`Based on the ${civicsVersion} civics test format`} />
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <GlassCard>
              <Text style={[type.headline, { color: colors.textPrimary }]}>Number of questions</Text>
              <View style={styles.pillRow}>
                {[10, 20, testable.length].map((n) => (
                  <Pill
                    key={n}
                    label={n === testable.length ? 'All' : String(n)}
                    active={count === n}
                    onPress={() => {
                      // Keep the pass line in step with the new length (60%, the real test's ratio).
                      setCount(n);
                      setPassThreshold(Math.round(n * 0.6));
                    }}
                  />
                ))}
              </View>

              <View style={{ height: spacing.md }} />
              <Text style={[type.headline, { color: colors.textPrimary }]}>Pass threshold</Text>
              <View style={styles.pillRow}>
                {[Math.round(count * 0.5), Math.round(count * 0.6), Math.round(count * 0.7)].map((n) => (
                  <Pill key={n} label={String(n)} active={passThreshold === n} onPress={() => setPassThreshold(n)} />
                ))}
              </View>
            </GlassCard>

            <GlassCard>
              <Text style={[type.callout, { color: colors.textSecondary, lineHeight: 20 }]}>
                In the real {civicsVersion} interview the officer asks up to{' '}
                {civicsVersion === '2025' ? '20 questions and you need 12 correct' : '10 questions and you need 6 correct'} to
                pass. Adjust the settings above to make practice easier or harder than the real thing.
                {homeState
                  ? ` Your ${homeState} governor and capital questions are included.`
                  : ' The governor and capital questions need your state.'}
              </Text>
              {!homeState ? (
                <Pressable
                  onPress={() => router.push('/local')}
                  style={({ pressed }) => [styles.stateLink, pressed && { opacity: 0.6 }]}
                >
                  <AppIcon name="location" size={15} color={colors.accent} />
                  <Text style={[type.subheadline, { color: colors.accent }]}>Pick your state</Text>
                  <AppIcon name="chevronRight" size={12} color={colors.accent} />
                </Pressable>
              ) : null}
            </GlassCard>

            {hasUsedFreeTest && !isPro ? (
              <Text style={[type.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
                Your free practice test is used. Unlock unlimited tests below.
              </Text>
            ) : null}

            <PrimaryButton
              title={hasUsedFreeTest && !isPro ? 'Unlock unlimited tests' : 'Start practice test'}
              onPress={startTest}
            />
          </View>
        </ScreenContainer>

        <Paywall
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          lastScorePct={lastScorePct}
          onPurchased={() => {
            setPaywallVisible(false);
            beginTest();
          }}
        />
      </TabScrollView>
    );
  }

  if (phase === 'running') {
    const current = deck[qIndex];
    const isStarred = starredIds.has(current.q.id);

    return (
      <TabScrollView>
        <ScreenContainer>
          <ScreenHeader title={`Question ${qIndex + 1} of ${deck.length}`} />
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <GlassCard>
              <View style={styles.qHead}>
                <View style={styles.modeRow}>
                  <AppIcon name={current.expected > 1 ? 'stack' : 'check'} size={13} color={colors.textSecondary} />
                  <Text style={[type.caption, { color: colors.textSecondary }]}>
                    {current.expected > 1
                      ? `Select ${current.expected} answers${graded === null ? ` · ${selected.length} chosen` : ''}`
                      : 'Select one answer'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggleStar(current.q.id)}
                  hitSlop={10}
                  accessibilityLabel={isStarred ? 'Remove star' : 'Star this question for review'}
                >
                  <AppIcon name={isStarred ? 'starFill' : 'starOutline'} size={20} color={colors.warning} />
                </Pressable>
              </View>
              <Text style={[type.title2, { color: colors.textPrimary, lineHeight: 28, marginTop: spacing.xs }]}>
                {current.q.question}
              </Text>
            </GlassCard>

            <View style={{ gap: spacing.xs }}>
              {current.options.map((opt, i) => {
                const picked = selected.includes(opt);
                const isRight = current.correctSet.has(opt);
                const show = graded !== null;
                // After grading: your correct picks go green, your wrong picks go red,
                // and correct answers you missed are outlined green so you learn them.
                const bg = show && picked && isRight ? colors.successSoft : show && picked && !isRight ? colors.dangerSoft : colors.surface;
                const border = show && isRight ? colors.success : picked ? colors.accent : colors.separator;
                const numBg = show && picked && isRight ? colors.success : show && picked && !isRight ? colors.danger : picked ? colors.accent : colors.background;
                const numColor = picked || (show && isRight) ? '#FFFFFF' : colors.textSecondary;
                return (
                  <Pressable
                    key={i}
                    onPress={() => choose(opt)}
                    disabled={show}
                    style={[styles.option, { backgroundColor: bg, borderColor: border }, show && !picked && !isRight && { opacity: 0.45 }]}
                  >
                    <View style={[styles.optionNum, { backgroundColor: show && isRight && !picked ? colors.success : numBg }]}>
                      <Text style={[type.numSm, { color: show && isRight && !picked ? '#FFFFFF' : numColor }]}>{i + 1}</Text>
                    </View>
                    <Text style={[type.body, { color: colors.textPrimary, flex: 1, lineHeight: 22 }]}>{opt}</Text>
                    {show && isRight ? <AppIcon name="checkCircleFill" size={20} color={colors.success} /> : null}
                    {show && picked && !isRight ? <AppIcon name="xCircleFill" size={20} color={colors.danger} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {graded !== null ? (
              <PrimaryButton title={qIndex + 1 >= deck.length ? 'See results' : 'Next question'} onPress={nextQuestion} />
            ) : null}
          </View>
        </ScreenContainer>
      </TabScrollView>
    );
  }

  const scorePct = Math.round((correctCount / deck.length) * 100);
  const passed = correctCount >= passThreshold;

  return (
    <TabScrollView>
      <ScreenContainer>
        <ScreenHeader title="Results" />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <GlassCard style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <AppIcon name={passed ? 'checkCircleFill' : 'xCircleFill'} size={56} color={passed ? colors.success : colors.danger} />
            <Text style={[type.title2, { color: colors.textPrimary, marginTop: spacing.sm }]}>{passed ? 'Pass' : 'Not yet'}</Text>
            <Text style={[type.callout, { color: colors.textSecondary, marginTop: 4 }]}>
              {correctCount} / {deck.length} correct ({scorePct}%) — needed {passThreshold} to pass
            </Text>
          </GlassCard>

          {/* All the review detail lives here rather than after each question: during
              the test the option colours say everything, and anything more forced the
              user to scroll mid-question. Here, scrolling is expected. */}
          {missed.length > 0 ? (
            <>
              <Text style={[type.headline, { color: colors.textPrimary, marginTop: spacing.xs }]}>
                Review the {missed.length} you missed
              </Text>
              {missed.map((m) => {
                const category = findCategory(civicsVersion, m.q.id);
                const tip = category ? topicGuideFor(category.id) : undefined;
                return (
                  <GlassCard key={m.q.id}>
                    <Text style={[type.headline, { color: colors.textPrimary, lineHeight: 22 }]}>{m.q.question}</Text>

                    <Text style={[type.monoLabel, { color: colors.textTertiary, marginTop: spacing.sm }]}>
                      {m.acceptable.length > 1 ? `ACCEPTED ANSWERS · ${m.acceptable.length}` : 'ANSWER'}
                    </Text>
                    {acceptsAnyOne(m.q.question, m.acceptable.length) ? (
                      <Text style={[type.caption, { color: colors.accent, marginTop: 2 }]}>
                        Any one of these is accepted.
                      </Text>
                    ) : null}
                    <View style={{ gap: 4, marginTop: 4 }}>
                      {m.acceptable.map((a, i) => (
                        <View key={i} style={styles.answerRow}>
                          <AppIcon name="checkCircleFill" size={16} color={colors.success} />
                          <Text style={[type.callout, { color: colors.textPrimary, flex: 1, lineHeight: 20 }]}>{a}</Text>
                        </View>
                      ))}
                    </View>
                    {m.q.note ? (
                      <Text style={[type.caption, { color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs }]}>
                        {m.q.note}
                      </Text>
                    ) : null}

                    {tip ? (
                      <Text style={[type.callout, { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 }]}>
                        {tip}
                      </Text>
                    ) : null}

                    {category ? (
                      <Pressable
                        onPress={() => studyTopic(category.id)}
                        style={({ pressed }) => [styles.studyLink, pressed && { opacity: 0.6 }]}
                      >
                        <AppIcon name="stack" size={15} color={colors.accent} />
                        <Text style={[type.subheadline, { color: colors.accent }]}>
                          Flashcards: {subsectionLabel(category.subsection)}
                        </Text>
                        <AppIcon name="chevronRight" size={12} color={colors.accent} />
                      </Pressable>
                    ) : null}
                  </GlassCard>
                );
              })}
            </>
          ) : null}

          <SecondaryButton title="Back to setup" onPress={() => setPhase('setup')} />
        </View>
      </ScreenContainer>
    </TabScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pillRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' },
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stateLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  answerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  studyLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  optionNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
