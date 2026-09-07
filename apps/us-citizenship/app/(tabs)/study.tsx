import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { ScreenHeader, Pill, TAB_BAR_CLEARANCE } from '../../src/components/ui';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { AppIcon } from '../../src/components/AppIcon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, shadow, spacing, type } from '../../src/theme/theme';
import { useAppState } from '../../src/lib/appState';
import { acceptsAnyOne, getAllQuestions, getCategories, resolveAnswers } from '../../src/content/loadContent';
import { subsectionLabel, titleCaseSection, topicGuideFor } from '../../src/content/topics';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Flashcards, browsable by USCIS topic.
//
// The card is genuinely two-sided: tapping rotates it 180° on the Y axis and both
// faces hide their backface, so only one is ever visible. "Read aloud" speaks only
// the visible face, so it can't leak the answer before the flip.
//
// Topic browsing is the point of the Topics control: the official test is organised
// into sections, and studying one section at a time is how people actually learn it.
// Practice results deep-link straight into a topic via /study?category=<id>.
export default function StudyScreen() {
  const { colors } = useTheme();
  // Plain View root, so the native tabs' automatic insets don't apply - handled here.
  const insets = useSafeAreaInsets();
  const { civicsVersion, starredIds, toggleStar } = useAppState();
  const { category } = useLocalSearchParams<{ category?: string }>();

  const [order, setOrder] = useState<'sequential' | 'random'>('sequential');
  const [starredOnly, setStarredOnly] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(category ?? null);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const flip = useRef(new Animated.Value(0)).current; // 0 = question face, 1 = answer face

  const categories = useMemo(() => getCategories(civicsVersion), [civicsVersion]);
  const allQuestions = useMemo(() => getAllQuestions(civicsVersion), [civicsVersion]);

  // Follow a deep link, and drop a topic that doesn't exist in this test version.
  useEffect(() => {
    if (category) setTopicId(category);
  }, [category]);
  useEffect(() => {
    if (topicId && !categories.some((c) => c.id === topicId)) setTopicId(null);
  }, [categories, topicId]);

  // Never leave speech running when the user navigates away.
  useEffect(
    () => () => {
      Speech.stop();
    },
    []
  );

  const topic = useMemo(() => categories.find((c) => c.id === topicId), [categories, topicId]);

  const pool = useMemo(() => {
    let base = topic ? topic.questions : allQuestions;
    if (starredOnly) base = base.filter((q) => starredIds.has(q.id));
    return order === 'random' ? shuffle(base) : base;
  }, [allQuestions, topic, order, starredOnly, starredIds]);

  const resetFace = () => {
    setRevealed(false);
    flip.setValue(0);
  };

  // Any change to the deck starts from its first card, face up.
  useEffect(() => {
    setIndex(0);
    resetFace();
  }, [pool.length, topicId, starredOnly, order]);

  const current = pool[index % Math.max(pool.length, 1)];

  const toggleFlip = () => {
    const to = revealed ? 0 : 1;
    setRevealed(!revealed);
    Animated.spring(flip, { toValue: to, friction: 8, tension: 14, useNativeDriver: true }).start();
  };

  const next = () => {
    resetFace();
    setIndex((i) => (i + 1) % Math.max(pool.length, 1));
  };
  const prev = () => {
    resetFace();
    setIndex((i) => (i - 1 + pool.length) % Math.max(pool.length, 1));
  };

  const speak = () => {
    if (!current) return;
    Speech.stop();
    if (revealed) {
      Speech.speak(`${current.question} ... ${resolveAnswers(current.answers).join(', or, ')}`, { language: 'en-US' });
    } else {
      Speech.speak(current.question, { language: 'en-US' });
    }
  };

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  // The topic chooser gets its own row and is styled as a field with a chevron, not
  // as another filter pill: as a pill it looked like a toggle and nothing suggested it
  // opened anything. While no topic is picked it also says so outright.
  const controls = (
    <>
      <Pressable
        onPress={() => setTopicPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose a topic to study"
        style={({ pressed }) => [
          styles.topicSelect,
          {
            backgroundColor: topic ? colors.accentSoft : colors.surface,
            borderColor: topic ? colors.accent : colors.separator,
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <AppIcon name="stack" size={16} color={topic ? colors.accent : colors.textSecondary} />
        <Text style={[type.subheadline, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
          {topic ? subsectionLabel(topic.subsection) : 'All topics'}
          {!topic ? (
            <Text style={[type.caption, { color: colors.textTertiary }]}>  ·  tap to pick a topic</Text>
          ) : null}
        </Text>
        <AppIcon name="chevronDown" size={13} color={topic ? colors.accent : colors.textTertiary} />
      </Pressable>

      <View style={styles.pillRow}>
        <Pill label="Sequential" active={order === 'sequential'} onPress={() => setOrder('sequential')} />
        <Pill label="Random" active={order === 'random'} onPress={() => setOrder('random')} />
        <Pill label="Starred" active={starredOnly} onPress={() => setStarredOnly((s) => !s)} />
      </View>
      {topic ? (
        <View style={[styles.topicNote, { backgroundColor: colors.accentSoft }]}>
          <Text style={[type.caption, { color: colors.textSecondary, lineHeight: 18 }]} numberOfLines={3}>
            {topicGuideFor(topic.id)}
          </Text>
        </View>
      ) : null}
    </>
  );

  const topicPicker = (
    <Modal
      visible={topicPickerOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setTopicPickerOpen(false)}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.modalHeader}>
          <Text style={[type.title2, { color: colors.textPrimary }]}>Study by topic</Text>
          <Pressable
            onPress={() => setTopicPickerOpen(false)}
            hitSlop={10}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[type.subheadline, { color: colors.accent }]}>Done</Text>
          </Pressable>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            <Pressable
              onPress={() => {
                setTopicId(null);
                setTopicPickerOpen(false);
              }}
              style={({ pressed }) => [styles.topicRow, { borderBottomColor: colors.separator }, pressed && { opacity: 0.6 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.headline, { color: colors.textPrimary }]}>All topics</Text>
                <Text style={[type.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Every question in the {civicsVersion} test, in order
                </Text>
              </View>
              {!topicId ? <AppIcon name="check" size={18} color={colors.accent} /> : null}
            </Pressable>
          }
          renderItem={({ item, index: i }) => {
            const prevSection = i > 0 ? categories[i - 1].section : null;
            const showSection = item.section !== prevSection;
            const starred = item.questions.filter((q) => starredIds.has(q.id)).length;
            return (
              <>
                {showSection ? (
                  <Text style={[type.monoLabel, styles.sectionLabel, { color: colors.textTertiary }]}>
                    {titleCaseSection(item.section).toUpperCase()}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => {
                    setTopicId(item.id);
                    setTopicPickerOpen(false);
                  }}
                  style={({ pressed }) => [styles.topicRow, { borderBottomColor: colors.separator }, pressed && { opacity: 0.6 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[type.headline, { color: colors.textPrimary }]}>{subsectionLabel(item.subsection)}</Text>
                    <Text style={[type.caption, { color: colors.textSecondary, marginTop: 2, lineHeight: 18 }]}>
                      {topicGuideFor(item.id)}
                    </Text>
                    {starred > 0 ? (
                      <View style={styles.starredHint}>
                        <AppIcon name="starFill" size={11} color={colors.warning} />
                        <Text style={[type.caption, { color: colors.textTertiary }]}>{starred} starred</Text>
                      </View>
                    ) : null}
                  </View>
                  {topicId === item.id ? <AppIcon name="check" size={18} color={colors.accent} /> : null}
                </Pressable>
              </>
            );
          }}
        />
      </View>
    </Modal>
  );

  if (!current) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
        <ScreenContainer>
          <ScreenHeader title="Flashcards" />
          {controls}
          <Text style={[type.body, { color: colors.textSecondary, paddingHorizontal: spacing.lg, lineHeight: 22 }]}>
            {starredOnly
              ? 'Nothing starred here yet. Tap the star on a card to build a review deck.'
              : 'No cards match these filters.'}
          </Text>
        </ScreenContainer>
        {topicPicker}
      </View>
    );
  }

  const answers = resolveAnswers(current.answers);
  const isStarred = starredIds.has(current.id);
  const anyOneCounts = acceptsAnyOne(current.question, answers.length);
  const progress = pool.length ? (index + 1) / pool.length : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
      <ScreenContainer>
        <ScreenHeader title="Flashcards" subtitle={`Card ${index + 1}`} />
        {controls}
        <View style={[styles.progressTrack, { backgroundColor: colors.separator }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${Math.max(2, progress * 100)}%` }]} />
        </View>

        <View style={styles.cardArea}>
          <Pressable
            style={styles.flipArea}
            onPress={toggleFlip}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Show question' : 'Show answer'}
          >
            <Animated.View
              style={[
                styles.face,
                { backgroundColor: colors.surface, borderColor: colors.separator, transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
              ]}
            >
              <View style={styles.cardTopRow}>
                <Text style={[type.monoLabel, { color: colors.textSecondary }]}>QUESTION {current.id}</Text>
                <Pressable onPress={() => toggleStar(current.id)} hitSlop={10}>
                  <AppIcon name={isStarred ? 'starFill' : 'starOutline'} size={22} color={colors.warning} />
                </Pressable>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.faceScroll}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[type.title2, { color: colors.textPrimary, lineHeight: 30, fontSize: 22 }]}>{current.question}</Text>
              </ScrollView>
              <Pressable onPress={toggleFlip} hitSlop={12} style={styles.hintRow}>
                <AppIcon name="circleHalf" size={14} color={colors.textTertiary} />
                <Text style={[type.caption, { color: colors.textTertiary }]}>Tap to flip</Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              style={[
                styles.face,
                { backgroundColor: colors.accentSoft, borderColor: colors.separator, transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
              ]}
            >
              <View style={styles.cardTopRow}>
                <Text style={[type.monoLabel, { color: colors.accent }]}>
                  {answers.length > 1 ? `ACCEPTED ANSWERS · ${answers.length}` : 'ANSWER'}
                </Text>
                <Pressable onPress={() => toggleStar(current.id)} hitSlop={10}>
                  <AppIcon name={isStarred ? 'starFill' : 'starOutline'} size={22} color={colors.warning} />
                </Pressable>
              </View>
              {answers.length <= 6 ? (
                <Text style={[type.caption, { color: colors.textSecondary, marginTop: spacing.xs }]} numberOfLines={2}>
                  {current.question}
                </Text>
              ) : null}
              {anyOneCounts ? (
                <Text style={[type.caption, { color: colors.accent, marginTop: spacing.xs }]}>
                  Any one of these is accepted.
                </Text>
              ) : null}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.faceScroll, { gap: 8 }]}
                showsVerticalScrollIndicator
              >
                {answers.map((a, i) => (
                  <View key={i} style={styles.answerRow}>
                    <AppIcon name="checkCircleFill" size={18} color={colors.accent} />
                    <Text style={[type.body, { color: colors.textPrimary, flex: 1, lineHeight: 22 }]}>{a}</Text>
                  </View>
                ))}
                {current.note ? (
                  <Text style={[type.caption, { color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs }]}>
                    {current.note}
                  </Text>
                ) : null}
              </ScrollView>
              <Pressable onPress={toggleFlip} hitSlop={12} style={styles.hintRow}>
                <AppIcon name="circleHalf" size={14} color={colors.textTertiary} />
                <Text style={[type.caption, { color: colors.textTertiary }]}>Tap to flip back</Text>
              </Pressable>
            </Animated.View>
          </Pressable>

          <View style={styles.toolsRow}>
            <Pressable
              style={({ pressed }) => [styles.speakButton, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}
              onPress={speak}
            >
              <AppIcon name="volume" size={16} color={colors.accent} />
              <Text style={[type.subheadline, { color: colors.accent }]}>
                {revealed ? 'Read question & answer' : 'Read question'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.navRow}>
          <Pressable style={styles.navButton} onPress={prev} hitSlop={10}>
            <AppIcon name="chevronLeft" size={18} color={colors.textPrimary} />
            <Text style={[type.callout, { color: colors.textPrimary }]}>Previous</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={next} hitSlop={10}>
            <Text style={[type.callout, { color: colors.textPrimary }]}>Next</Text>
            <AppIcon name="chevronRight" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </ScreenContainer>

      {topicPicker}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topicSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  topicNote: { marginHorizontal: spacing.lg, marginBottom: spacing.xs, padding: spacing.sm, borderRadius: radii.sm },
  progressTrack: { height: 3, borderRadius: 2, marginHorizontal: spacing.lg, marginBottom: spacing.sm, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  cardArea: { flex: 1, minHeight: 260, paddingHorizontal: spacing.lg, gap: spacing.md },
  flipArea: { flex: 1 },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    backfaceVisibility: 'hidden',
    ...shadow.card,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faceScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xs },
  answerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  toolsRow: { flexDirection: 'row', justifyContent: 'center' },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  doneBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill },
  sectionLabel: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  starredHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
