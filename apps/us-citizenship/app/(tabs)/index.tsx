import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { GlassCard, TabScrollView, WEB_TABBAR_OFFSET } from '../../src/components/ui';
import { AppIcon, AppIconName } from '../../src/components/AppIcon';
import { RadialGauge } from '../../src/components/RadialGauge';
import { EcgSparkline } from '../../src/components/EcgSparkline';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radii, spacing, type } from '../../src/theme/theme';
import { useAppState, daysUntil } from '../../src/lib/appState';
import { useCountUp } from '../../src/lib/useCountUp';

const TILES: { key: string; title: string; icon: AppIconName; route: '/study' | '/practice' | '/interview' | '/local' }[] = [
  { key: 'study', title: 'Flashcards', icon: 'stack', route: '/study' },
  { key: 'practice', title: 'Practice Test', icon: 'checkCircleFill', route: '/practice' },
  { key: 'interview', title: 'Mock Interview', icon: 'chatBubbles', route: '/interview' },
  { key: 'local', title: 'My State', icon: 'location', route: '/local' },
];

// Layout note: safe-area padding and tab-bar clearance come from TabScrollView,
// which every tab screen shares (the native tabs' automatic insets were not
// applied reliably on device). Content is sized to fit a standard iPhone without
// scrolling; scrolling is only a fallback for very small devices.
export default function HomeScreen() {
  const { colors } = useTheme();
  const { starredIds, practiceHistory, firstName, interviewDate } = useAppState();

  // Personal greeting + an honest countdown to the user's real interview date.
  // Deliberately no question counts and no test-version year here: the pool size
  // is USCIS's (reads as a limit), and "2025 civics test" is USCIS's official
  // name for the current version - correct, but it reads as stale on a home
  // screen. The version name stays in Settings, where choosing it matters.

  const days = interviewDate ? daysUntil(interviewDate) : null;
  const subtitle =
    days === null
      ? 'Preparing for your naturalization interview'
      : days < 0
        ? 'Your interview date has passed — update it in Settings'
        : days === 0
          ? "Your interview is today — you've got this."
          : days === 1
            ? 'Your interview is tomorrow.'
            : `${days} days until your interview`;

  // All numbers below come from real sessions - no placeholder values.
  const recent = practiceHistory.slice(-7);
  const hasSessions = recent.length > 0;
  const avgScore = hasSessions ? Math.round(recent.reduce((s, r) => s + r.scorePct, 0) / recent.length) : 0;
  const trendingUp = recent.length >= 2 && recent[recent.length - 1].scorePct >= recent[0].scorePct;

  const sessionsDisplay = useCountUp(practiceHistory.length, 700, 500);
  const scoreDisplay = useCountUp(avgScore, 700, 580);
  const starredDisplay = useCountUp(starredIds.size, 700, 660);

  const readinessCopy = !hasSessions
    ? 'Complete your first practice test to measure your interview readiness.'
    : avgScore >= 60
      ? 'Above the 60% pass line. Keep going toward a confident 90%.'
      : 'Below the 60% pass line — a few more sessions will get you there.';

  return (
    <TabScrollView>
      <ScreenContainer>
        <View style={styles.headerWrap}>
          {/* Two lines on purpose: a long name on the same line as the greeting would
              shrink the title to fit. The name keeps the full large-title size and gets
              up to two lines of its own. */}
          {firstName ? (
            <>
              <Text style={[type.callout, { color: colors.textSecondary }]}>Welcome back</Text>
              <Text
                style={[type.largeTitle, { color: colors.textPrimary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                {firstName}
              </Text>
            </>
          ) : (
            <Text style={[type.largeTitle, { color: colors.textPrimary }]}>Welcome back</Text>
          )}
          <Text style={[type.callout, { color: colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <GlassCard style={styles.gaugeCard}>
            <RadialGauge
              percent={avgScore}
              empty={!hasSessions}
              size={100}
              trackColor={colors.separator}
              arcColor={colors.accent}
              glowColor={colors.accentGlow}
              textColor={colors.textPrimary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[type.headline, { color: colors.textPrimary }]}>Interview readiness</Text>
              <Text style={[type.callout, { color: colors.textSecondary, marginTop: 4, lineHeight: 19 }]}>
                {readinessCopy}
              </Text>
            </View>
          </GlassCard>

          <GlassCard>
            <View style={styles.ecgHead}>
              <Text style={[type.caption, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 }]}>
                {hasSessions ? `Last ${recent.length} session${recent.length === 1 ? '' : 's'}` : 'No sessions yet'}
              </Text>
              <Text style={[type.numSm, { color: hasSessions ? colors.accent : colors.textTertiary }]}>
                {!hasSessions ? 'no data yet' : trendingUp ? '↑ trending up' : '↓ trending down'}
              </Text>
            </View>
            <EcgSparkline
              scores={recent.map((r) => r.scorePct)}
              color={colors.accent}
              mutedColor={colors.separator}
            />
          </GlassCard>

          {/* Tests taken = completed practice tests; Avg score = mean of the last 7;
              Starred = questions the user starred for review in Flashcards / Practice. */}
          <View style={styles.statRow}>
            <StatTile value={sessionsDisplay} label="TESTS" />
            <StatTile value={scoreDisplay} label="AVG SCORE" suffix="%" />
            <StatTile value={starredDisplay} label="STARRED" />
          </View>

          <Text style={[type.headline, { color: colors.textPrimary, marginTop: spacing.xs }]}>Let's start the preparation</Text>
          <View style={styles.actionsGrid}>
            {TILES.map((t) => (
              <ActionTile key={t.key} title={t.title} icon={t.icon} onPress={() => router.push(t.route)} />
            ))}
          </View>
        </View>
      </ScreenContainer>
    </TabScrollView>
  );
}

function StatTile({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.statCard}>
      <Text style={[type.numMd, { color: colors.textPrimary }]}>
        {value}
        {suffix}
      </Text>
      <Text style={[type.monoLabel, { color: colors.textTertiary, marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </GlassCard>
  );
}

function ActionTile({ title, icon, onPress }: { title: string; icon: AppIconName; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionTile,
        { backgroundColor: colors.surface, borderColor: colors.separator },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <AppIcon name={icon} size={22} color={colors.accent} />
      <Text style={[type.headline, { color: colors.textPrimary, marginTop: spacing.xs, fontSize: 14 }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + WEB_TABBAR_OFFSET,
    paddingBottom: spacing.sm,
  },
  gaugeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ecgHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.xs },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionTile: {
    width: '47.5%',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
  },
});
