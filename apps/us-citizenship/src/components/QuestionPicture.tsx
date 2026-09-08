/* Picture questions.
 *
 * Some tests ask the question with artwork rather than words. Germany's catalogue has 38
 * such questions: for 19 the four options *are* the pictures ("Bild 1".."Bild 4"), and for
 * the rest a single figure sits above ordinary text options - the sixteen Bundesland
 * locator maps, the specimen ballot papers, the 1945 occupation zones. For those 19, the
 * option text alone carries no information at all, so the picture is not decoration; it is
 * the question.
 *
 * Two rules here are not stylistic and must not be "tidied up":
 *
 *  1. **A white tile in both themes, never a filter or a blend.** The files are already
 *     composited onto white, which is exactly how the official document prints them.
 *     Several are black line art - question 21 offers a black Chi-Rho - and on a dark
 *     ground with transparency preserved that option disappears completely, so the answer
 *     literally cannot be seen. This was found by rendering it, not by reasoning about it.
 *  2. **Never reorder.** `optionImages` is index-aligned with `options`, and the order was
 *     recovered from where each picture is actually drawn on the official page. Sorting or
 *     shuffling silently marks the wrong answer correct while the screen still looks fine.
 *
 * React Native's own `Image` is used rather than `expo-image`: it accepts the result of
 * `require()`, which is how the generated image map hands over a bundled asset, and it
 * needs no new native module (and so no new build) to add.
 */

import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radii, spacing, type } from '../theme/theme';
import type { PackImage } from '../content/images.generated';

/** The white ground every picture sits on, in both themes. See rule 1 above. */
const TILE_BACKGROUND = '#FFFFFF';

export function PictureTile({
  source,
  size = 64,
  label,
}: {
  source: PackImage;
  size?: number;
  label?: string;
}) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, backgroundColor: TILE_BACKGROUND },
      ]}
    >
      <Image
        source={source}
        style={{ width: size - 8, height: size - 8 }}
        resizeMode="contain"
        accessible
        accessibilityLabel={label}
      />
    </View>
  );
}

/**
 * A single figure shown above the options.
 *
 * Wider and taller than an option tile because the numbers a question refers to are
 * printed inside the artwork - "Welches Bundesland ist Bayern? 1 / 2 / 3 / 4" is answered
 * by reading a map, and a thumbnail would make those digits unreadable.
 */
export function QuestionFigure({
  source,
  credit,
  label,
}: {
  source: PackImage;
  credit?: string;
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4, marginTop: spacing.sm }}>
      <View style={[styles.figure, { backgroundColor: TILE_BACKGROUND }]}>
        <Image
          source={source}
          style={styles.figureImage}
          resizeMode="contain"
          accessible
          accessibilityLabel={label}
        />
      </View>
      {credit ? (
        <Text style={[type.caption, { color: colors.textTertiary }]}>{credit}</Text>
      ) : null}
    </View>
  );
}

/**
 * One answer option: its position, its picture when it has one, and its text.
 *
 * The position is always shown. For a picture question the official document labels the
 * options "Bild 1".."Bild 4", and a learner cross-checking against the real catalogue
 * needs the same numbering; for a text question it is simply how the options are ordered
 * on the page.
 */
export function OptionRow({
  position,
  text,
  picture,
  state = 'idle',
}: {
  position: number;
  text: string;
  picture?: PackImage;
  /** `correct` marks the answer; `chosen-wrong` marks what the user picked instead. */
  state?: 'idle' | 'correct' | 'chosen-wrong';
}) {
  const { colors } = useTheme();
  const border =
    state === 'correct' ? colors.accent : state === 'chosen-wrong' ? colors.danger : colors.separator;
  const tint =
    state === 'correct' ? colors.accent : state === 'chosen-wrong' ? colors.danger : colors.textSecondary;

  return (
    <View
      style={[
        styles.option,
        {
          borderColor: border,
          borderWidth: state === 'idle' ? StyleSheet.hairlineWidth : 1.5,
          backgroundColor: state === 'idle' ? 'transparent' : colors.accentSoft,
        },
      ]}
    >
      <Text style={[type.monoLabel, { color: tint, width: 18, textAlign: 'center' }]}>{position}</Text>
      {picture ? <PictureTile source={picture} label={text} /> : null}
      <Text style={[type.body, { color: colors.textPrimary, flex: 1, lineHeight: 22 }]}>{text}</Text>
    </View>
  );
}

/**
 * True when the options carry no information of their own - they are just labels for the
 * pictures ("Bild 1".."Bild 4", or bare numbers).
 *
 * Worth distinguishing because these should be laid out as a grid of pictures rather than
 * a list of rows: the text adds nothing, and four stacked rows push the fourth option off
 * a phone-sized card, so the one option a learner never sees is as likely as not the right
 * one. A question with real text options plus pictures keeps the list.
 */
export function optionsArePicturesOnly(options: string[], art?: (PackImage | undefined)[]): boolean {
  if (!art || art.length !== options.length || options.length === 0) return false;
  if (!art.every(Boolean)) return false;
  return options.every((o) => /^\s*(?:bild|image|picture)?\s*\d+\s*$/i.test(o));
}

/**
 * The four pictures as a 2x2 grid, which is how the official paper prints them.
 *
 * `position` is what the learner picks, so it stays visible on every tile.
 */
export function PictureOptionsGrid({
  options,
  art,
  correctIndex,
  reveal = false,
}: {
  options: string[];
  art: (PackImage | undefined)[];
  correctIndex?: number;
  /** Outline the correct one. Used on a flashcard's answer face. */
  reveal?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {options.map((label, i) => {
        const right = reveal && i === correctIndex;
        return (
          <View
            key={i}
            style={[
              styles.gridCell,
              {
                borderColor: right ? colors.accent : colors.separator,
                borderWidth: right ? 2 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={[styles.gridPicture, { backgroundColor: TILE_BACKGROUND }]}>
              <Image
                source={art[i]!}
                style={styles.gridImage}
                resizeMode="contain"
                accessible
                accessibilityLabel={label}
              />
            </View>
            <Text
              style={[
                type.monoLabel,
                { color: right ? colors.accent : colors.textSecondary, textAlign: 'center' },
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  figure: {
    borderRadius: radii.sm,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  figureImage: {
    width: '100%',
    // Tall enough that numbers printed inside a map or a ballot paper stay legible.
    height: 190,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  gridCell: {
    // Two per row, whatever the card is wide. The gap is subtracted so the pair never
    // overflows and wraps into a one-per-row column.
    width: '47%',
    borderRadius: radii.md,
    padding: spacing.xs,
    gap: 2,
  },
  gridPicture: {
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  gridImage: { width: '100%', height: 78 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
