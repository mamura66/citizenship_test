import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View, Pressable } from 'react-native';
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
import {
  attribution,
  getCountry,
  isMultipleChoice,
  packFormat,
  questionArt,
  questionsForRegion,
} from '../../src/content/countries';
import { langOf, translator } from '../../src/lib/strings';
import { OptionRow, PictureTile, QuestionFigure } from '../../src/components/QuestionPicture';
import type { PackImage } from '../../src/content/images.generated';
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
  options: string[]; // display order
  correctSet: Set<string>;
  expected: number; // how many the user must pick
  /**
   * True when `options` are the test's own printed options, in the official order.
   *
   * These must never be shuffled and no distractor may be added to them. Two reasons:
   * the wrong answers are themselves official, so inventing our own would make it a
   * different test; and for a picture question `optionImages` is index-aligned with
   * `options`, so reordering would show each picture against the wrong answer while the
   * screen still looked perfectly normal.
   */
  official?: boolean;
  /** Index-aligned with `options`. */
  optionArt?: (PackImage | undefined)[];
  /** A single figure the question refers to, shown above the options. */
  figure?: PackImage;
}

/**
 * Speak a grading result to the screen reader.
 *
 * Grading is communicated visually by color plus a check/cross icon (v15 removed
 * the post-answer card to keep a question scroll-free), and neither of those
 * reaches VoiceOver or TalkBack. iOS gets the queued variant so the verdict is not
 * cut off by VoiceOver still reading the option the user just tapped; Android
 * ignores the options object, and react-native-web's announceForAccessibility is
 * an empty function - which is why the verdict is ALSO rendered as text inside an
 * accessibilityLiveRegion, and is not left to this call alone.
 */
function announceResult(message: string) {
  const info = AccessibilityInfo as typeof AccessibilityInfo & {
    announceForAccessibilityWithOptions?: (m: string, o: { queue?: boolean }) => void;
  };
  if (typeof info.announceForAccessibilityWithOptions === 'function') {
    info.announceForAccessibilityWithOptions(message, { queue: true });
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/** "The correct answer is X." / "The correct answers are X and Y." */
function correctAnswerSentence(q: PreparedQuestion): string {
  const answers = [...q.correctSet];
  if (answers.length === 1) return `The correct answer is ${answers[0]}.`;
  return `The correct answers are ${answers.slice(0, -1).join(', ')} and ${answers[answers.length - 1]}.`;
}

/** How one option should read to a screen reader, before and after grading. */
function optionAccessibilityLabel(
  opt: string,
  position: number,
  total: number,
  picked: boolean,
  isRight: boolean,
  graded: boolean
): string {
  const base = `Option ${position} of ${total}. ${opt}`;
  if (!graded) return picked ? `${base}. Chosen.` : base;
  if (picked && isRight) return `${base}. You chose this. Correct.`;
  if (picked && !isRight) return `${base}. You chose this. Incorrect.`;
  if (isRight) return `${base}. Correct answer. You did not choose it.`;
  return `${base}. Not chosen.`;
}

export default function PracticeScreen() {
  const { colors } = useTheme();
  const { country, civicsVersion, recordPracticeResult, practiceHistory, homeState, starredIds, toggleStar } = useAppState();
  const countryDef = getCountry(country);
  const tr = translator(langOf(countryDef.language));
  const format = packFormat(country, civicsVersion);
  const sourceCredit = attribution(country, civicsVersion);
  const { isPro } = usePurchase();
  const allQuestions = useMemo(() => getAllQuestions(country, civicsVersion), [country, civicsVersion]);

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

  // Nationwide questions plus the one sub-national set that applies to this person. A
  // German candidate answers their own Bundesland's ten questions and never the other
  // 150, so a practice test built from all sixteen would ask questions that cannot come
  // up and then grade against them.
  const askable = useMemo(
    () => questionsForRegion(country, civicsVersion, homeState),
    [country, civicsVersion, homeState]
  );
  const testable = useMemo(() => askable.filter((q) => resolveAcceptable(q) !== null), [askable, homeState]);

  /* How long the real test is and what passes it, from the pack - never a guess.
   *
   * This used to read `civicsVersion === '2025' ? 20 : 10` and `? 12 : 6`, which are the
   * American numbers. On the German test that would have offered a 20-question practice
   * test needing 12 correct when the real paper asks 33 and needs 17 - numbers we would
   * have invented and shown as fact. When the pack does not state them, the fallback is a
   * practice-only default and the screen says so rather than claiming a pass mark. */
  const officialRatio = format.asked && format.passMark ? format.passMark / format.asked : 0.6;
  const defaultCount = Math.min(format.asked ?? 20, Math.max(1, testable.length));
  const defaultPass = format.passMark ?? Math.round(defaultCount * officialRatio);

  // Practice lengths to offer: the real test's own length first when it is known, then a
  // couple of shorter runs, then everything. De-duplicated and clamped to what exists.
  const countOptions = useMemo(() => {
    const wanted = [format.asked, 10, 20, testable.length].filter(
      (n): n is number => typeof n === 'number' && n > 0 && n <= testable.length
    );
    return [...new Set(wanted)].sort((a, b) => a - b);
  }, [format.asked, testable.length]);


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
    // Country as well as version: switching country changes the pool, the length and the
    // pass line, and a test already in progress belongs to the country it started in.
  }, [country, civicsVersion]);
  // Pass lines to offer, around the real test's own ratio. These are the user's practice
  // choice, not a claim about the official mark - that is stated separately, from the pack.
  const passOptions = useMemo(() => {
    const around = [officialRatio - 0.1, officialRatio, officialRatio + 0.1]
      .map((r) => Math.max(1, Math.min(count, Math.round(count * r))));
    return [...new Set(around)].sort((a, b) => a - b);
  }, [count, officialRatio]);

  const [paywallVisible, setPaywallVisible] = useState(false);

  // First full practice test is free for everyone (soft paywall, value-first -
  // see docs/BUILD_PLAN.md "Motivation & conversion design"). Every test after
  // that requires the lifetime unlock.
  const hasUsedFreeTest = practiceHistory.length >= 1;
  const lastScorePct = practiceHistory.length ? practiceHistory[practiceHistory.length - 1].scorePct : 0;

  // Build every question's options ONCE per test, so they can't reshuffle mid-question.
  const prepare = (q: CivicsQuestion): PreparedQuestion => {
    const acceptable = resolveAcceptable(q)!;

    /* A test that prints its own options is asked exactly as printed.
     *
     * No shuffle and no added distractors. The Einbuergerungstest's three wrong answers
     * are part of the official question, so replacing them with answers borrowed from
     * other questions would be a test we made up. And `optionImages` is index-aligned
     * with `options`: reorder them and every picture sits against the wrong answer, with
     * nothing on screen looking wrong. */
    if (isMultipleChoice(q)) {
      const art = questionArt(country, q);
      const options = q.options ?? [];
      const idx =
        typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length
          ? q.correctIndex
          : options.findIndex((o) => acceptable.includes(o));
      return {
        q,
        acceptable,
        options,
        // `answers` stays authoritative; correctIndex only says which option carries it.
        correctSet: new Set(idx >= 0 ? [options[idx]] : acceptable),
        expected: 1,
        official: true,
        optionArt: art.optionArt,
        figure: art.figure,
      };
    }

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
      const cat = findCategory(country, civicsVersion, q.id);
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
    // Say the verdict, and on a miss say what the answer was - the same thing the
    // green outline tells a sighted user.
    announceResult(isCorrect ? 'Correct.' : `Incorrect. ${correctAnswerSentence(current)}`);
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
          <ScreenHeader title={tr('practice.title')} subtitle={countryDef.officialTestName} />
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <GlassCard>
              <Text style={[type.headline, { color: colors.textPrimary }]}>{tr('practice.numQuestions')}</Text>
              <View style={styles.pillRow}>
                {/* The real test's own length is offered first when the pack states it, so
                    the default choice is the true one rather than a round number. */}
                {countOptions.map((n) => (
                  <Pill
                    key={n}
                    label={n === testable.length ? tr('practice.all') : String(n)}
                    active={count === n}
                    onPress={() => {
                      // Keep the pass line in step with the new length, at the real test's
                      // own ratio rather than a hardcoded 60%.
                      setCount(n);
                      setPassThreshold(Math.max(1, Math.round(n * officialRatio)));
                    }}
                  />
                ))}
              </View>

              <View style={{ height: spacing.md }} />
              <Text style={[type.headline, { color: colors.textPrimary }]}>{tr('practice.passThreshold')}</Text>
              <View style={styles.pillRow}>
                {passOptions.map((n) => (
                  <Pill key={n} label={String(n)} active={passThreshold === n} onPress={() => setPassThreshold(n)} />
                ))}
              </View>
            </GlassCard>

            <GlassCard>
              <Text style={[type.callout, { color: colors.textSecondary, lineHeight: 20 }]}>
                {/* Only what the official document actually says. There is no officer in
                    the German process - it is a written paper - so the wording is neutral,
                    and when the pack states no format the screen says that instead of
                    borrowing another country's numbers. */}
                {format.asked !== null && format.passMark !== null
                  ? `${tr('practice.realTest')} ${tr('practice.askedAndPass', {
                      asked: format.asked,
                      pass: format.passMark,
                    })}`
                  : tr('practice.formatUnknown')}
                {format.timeLimitMinutes !== null
                  ? ` ${tr('practice.timeLimit', { minutes: format.timeLimitMinutes })}`
                  : ''}
                {' '}
                {tr('practice.adjust')}
                {countryDef.regionKind === 'us-jurisdiction'
                  ? homeState
                    ? ` Your ${homeState} governor and capital questions are included.`
                    : ' The governor and capital questions need your state.'
                  : ''}
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
                {/* Same row, no extra height (a question must stay scroll-free - v15),
                    but after grading it states the verdict in words as well as in
                    color, and is a live region so TalkBack and the web screen
                    reader pick the change up without depending on the announcement. */}
                <View style={styles.modeRow} accessibilityLiveRegion="polite">
                  <AppIcon
                    name={graded === null ? (current.expected > 1 ? 'stack' : 'check') : graded ? 'checkCircleFill' : 'xCircleFill'}
                    size={13}
                    color={graded === null ? colors.textSecondary : graded ? colors.success : colors.danger}
                  />
                  <Text
                    style={[type.caption, { color: graded === null ? colors.textSecondary : graded ? colors.success : colors.danger }]}
                  >
                    {graded !== null
                      ? graded
                        ? 'Correct'
                        : 'Incorrect'
                      : current.expected > 1
                        ? `Select ${current.expected} answers · ${selected.length} chosen`
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

            {/* A single figure the question refers to - a Bundesland locator map, the
                specimen ballot papers. The numbers the options name are printed inside the
                artwork, so it has to be legible, not a thumbnail. */}
            {current.figure ? (
              <QuestionFigure
                source={current.figure}
                credit={current.q.imageCredit && current.q.imageCredit.includes('©') ? current.q.imageCredit : undefined}
                label={current.q.imageDescription || current.q.question}
              />
            ) : null}

            <View style={{ gap: spacing.xs }}>
              {current.options.map((opt, i) => {
                const picked = selected.includes(opt);
                const isRight = current.correctSet.has(opt);
                const show = graded !== null;
                // After grading: your correct picks go green, your wrong picks go red,
                // and correct answers you missed are outlined green so you learn them.
                const bg = show && picked && isRight ? colors.successSoft : show && picked && !isRight ? colors.dangerSoft : colors.surface;
                const border = show && isRight ? colors.success : picked ? colors.accent : colors.separator;
                const numBg = show && picked && isRight ? colors.successFill : show && picked && !isRight ? colors.dangerFill : picked ? colors.accentFill : colors.background;
                const numColor = picked || (show && isRight) ? colors.onFill : colors.textSecondary;
                return (
                  <Pressable
                    key={i}
                    onPress={() => choose(opt)}
                    disabled={show}
                    // The color and the icon are invisible to a screen reader, and
                    // the option going `disabled` is the only other signal, so the
                    // whole state is spelled out in the label.
                    accessibilityRole={current.expected > 1 ? 'checkbox' : 'radio'}
                    accessibilityLabel={optionAccessibilityLabel(opt, i + 1, current.options.length, picked, isRight, show)}
                    accessibilityHint={show ? undefined : current.expected > 1 ? `Select ${current.expected} answers` : 'Selects this answer'}
                    accessibilityState={{ checked: picked, selected: picked, disabled: show }}
                    // Same value again as an aria alias, because react-native-web
                    // reads `aria-checked` and ignores `accessibilityState` entirely.
                    // React Native merges the two on iOS and Android
                    // (`ariaChecked ?? accessibilityState?.checked`), so there is no
                    // conflict - and it makes the state assertable in a browser.
                    aria-checked={picked}
                    style={[styles.option, { backgroundColor: bg, borderColor: border }, show && !picked && !isRight && { opacity: 0.45 }]}
                  >
                    <View style={[styles.optionNum, { backgroundColor: show && isRight && !picked ? colors.successFill : numBg }]}>
                      <Text style={[type.numSm, { color: show && isRight && !picked ? colors.onFill : numColor }]}>{i + 1}</Text>
                    </View>
                    {/* For the questions whose options ARE pictures, the text is
                        "Bild 1".."Bild 4" and says nothing on its own. Index-aligned with
                        `options`, which is why those are never shuffled. */}
                    {current.optionArt?.[i] ? (
                      <PictureTile source={current.optionArt[i]!} size={56} label={opt} />
                    ) : null}
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

            {/* Naming the source is an obligation for Germany's catalogue (section 63
                UrhG), so it appears wherever a question does. */}
            {sourceCredit ? (
              <Text style={[type.caption, { color: colors.textTertiary, lineHeight: 16 }]}>
                {tr('source.label')}: {sourceCredit}
              </Text>
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
              the test the option colors say everything, and anything more forced the
              user to scroll mid-question. Here, scrolling is expected. */}
          {missed.length > 0 ? (
            <>
              <Text style={[type.headline, { color: colors.textPrimary, marginTop: spacing.xs }]}>
                Review the {missed.length} you missed
              </Text>
              {missed.map((m) => {
                const category = findCategory(country, civicsVersion, m.q.id);
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
                          Flashcards: {subsectionLabel(category.subsection, category.section)}
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
