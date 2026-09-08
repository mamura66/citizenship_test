import { useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassCard, SecondaryButton } from '../src/components/ui';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { AppIcon } from '../src/components/AppIcon';
import { useTheme } from '../src/theme/ThemeProvider';
import { radii, spacing, type } from '../src/theme/theme';
import { useAppState } from '../src/lib/appState';
import {
  ALL_JURISDICTION_NAMES,
  JURISDICTIONS,
  capitalAnswerFor,
  governorAnswerFor,
  isState,
} from '../src/content/loadContent';
import { officialPhotos } from '../src/content/officialPhotos';
import { useOfficials } from '../src/content/officialsStore';

// The 50 states plus D.C. and the five inhabited territories: USCIS's
// state-specific questions have explicit answers for those residents too.
const STATES = ALL_JURISDICTION_NAMES;

function initialsOf(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function PersonRow({ label, name, photo, initials }: { label: string; name: string; photo?: any; initials: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {photo ? (
        <Image source={photo} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surface }]}>
          <Text style={[type.subheadline, { color: colors.textSecondary }]}>{initials}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[type.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[type.headline, { color: colors.textPrimary }]}>{name}</Text>
      </View>
    </View>
  );
}

export default function LocalScreen() {
  const { colors } = useTheme();
  const { homeState, setHomeState } = useAppState();
  // Live officials: seeded from the bundled JSON, replaced by a validated remote copy when
  // one lands, and this screen re-renders when it does.
  const { national: NATIONAL_DYNAMIC, source: officialsSource } = useOfficials();
  const [pickerOpen, setPickerOpen] = useState(false);

  const governor = homeState ? governorAnswerFor(homeState) : null;
  const capital = homeState ? capitalAnswerFor(homeState) : null;
  const jurisdiction = homeState ? JURISDICTIONS[homeState] : undefined;
  const nonState = !!homeState && !isState(homeState);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenContainer>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.md }}>
        <Text style={[type.callout, { color: colors.textSecondary, lineHeight: 20 }]}>
          Your state decides the answers to a few official questions. Pick it once and the
          practice test will use it.
        </Text>
        <SecondaryButton
          title={homeState ? `Change from ${homeState}` : 'Select your state'}
          onPress={() => setPickerOpen(true)}
        />

        {homeState ? (
          <>
            <GlassCard>
              <View style={{ gap: spacing.md }}>
                <Text style={[type.caption, { color: colors.textSecondary }]}>
                  {homeState}
                  {jurisdiction ? ` · ${jurisdiction.kind}` : ''}
                </Text>
                <PersonRow
                  label="Governor"
                  name={governor ?? 'Not tracked yet — check your USCIS materials'}
                  initials={governor && isState(homeState!) ? initialsOf(governor) : '?'}
                />
                <View style={styles.row}>
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.accentSoft }]}>
                    <AppIcon name="building" size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.caption, { color: colors.textSecondary }]}>
                      {nonState ? 'Capital' : 'State capital'}
                    </Text>
                    <Text style={[type.headline, { color: colors.textPrimary }]}>{capital ?? 'Unavailable'}</Text>
                  </View>
                </View>
              </View>
            </GlassCard>

            <GlassCard>
              <View style={styles.warningRow}>
                <AppIcon
                  name={jurisdiction ? 'infoCircleFill' : 'warningTriangleFill'}
                  size={18}
                  color={jurisdiction ? colors.accent : colors.warning}
                />
                <Text style={[type.caption, { flex: 1, color: colors.textSecondary, lineHeight: 18 }]}>
                  {jurisdiction
                    ? `Your U.S. senators question: ${jurisdiction.senatorAnswer} ${
                        jurisdiction.kind === 'territory'
                          ? 'Territories send a non-voting delegate to the House of Representatives.'
                          : 'D.C. sends a non-voting delegate to the House of Representatives.'
                      }`
                    : "U.S. Senator and House Representative lookup requires a live congressional data feed and isn't wired up yet — showing this note instead of a possibly-wrong name."}
                </Text>
              </View>
            </GlassCard>

            <GlassCard>
              <View style={{ gap: spacing.md }}>
                <Text style={[type.caption, { color: colors.textSecondary }]}>
                  National officials · verified {NATIONAL_DYNAMIC.lastVerified}
                  {officialsSource === 'bundled' ? ' · as shipped' : ' · updated'}
                </Text>
                <PersonRow label="President" name={NATIONAL_DYNAMIC.president} photo={officialPhotos.president} initials="" />
                <PersonRow label="Vice President" name={NATIONAL_DYNAMIC.vicePresident} photo={officialPhotos.vicePresident} initials="" />
                <PersonRow
                  label="Speaker of the House"
                  name={NATIONAL_DYNAMIC.speakerOfTheHouse}
                  photo={officialPhotos.speakerOfTheHouse}
                  initials=""
                />
                <PersonRow
                  label="Chief Justice"
                  name={NATIONAL_DYNAMIC.chiefJustice}
                  photo={officialPhotos.chiefJustice}
                  initials=""
                />
              </View>
            </GlassCard>
          </>
        ) : (
          <GlassCard>
            <Text style={[type.body, { color: colors.textSecondary, lineHeight: 22 }]}>
              Select your state to see the governor, capital, and other answers used by the
              state-specific civics questions.
            </Text>
          </GlassCard>
        )}
      </View>
      </ScreenContainer>

      {/*
        pageSheet gives the native iOS card that can be swiped down to dismiss
        (onRequestClose fires for that gesture and for Android's back button);
        the explicit Done button covers web and anyone who doesn't know the gesture.
      */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={[type.title2, { color: colors.textPrimary }]}>Choose your state</Text>
            <Pressable
              onPress={() => setPickerOpen(false)}
              hitSlop={10}
              style={({ pressed }) => [styles.doneButton, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[type.subheadline, { color: colors.accent }]}>Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={STATES}
            keyExtractor={(s) => s}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.stateRow, { borderBottomColor: colors.separator }]}
                onPress={() => {
                  setHomeState(item);
                  setPickerOpen(false);
                }}
              >
                <Text style={[type.body, { color: colors.textPrimary }]}>{item}</Text>
                {homeState === item ? <AppIcon name="check" size={18} color={colors.accent} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  warningRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  doneButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill },
});
