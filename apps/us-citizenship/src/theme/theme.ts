import { Platform } from 'react-native';

// "Civics Pulse" identity - chosen after comparing 8 prototype directions
// (see chat history / prototype-pulse.html). A readiness-monitor metaphor:
// white/near-black grounds, one vivid "phosphor" green, IBM Plex for a
// data-readout feel. Values are ported from the approved prototype; the only
// deliberate departures are the contrast corrections recorded below.
//
// CONTRAST (WCAG 2.1 AA). The prototype's light-mode green #0FA968 was carried
// over unchanged and failed at every size the app actually uses it: white on it
// measured 3.05:1 and the green itself measured 3.05:1 on white and 2.69:1 on
// the pale accentSoft surface, against the 4.5:1 that 12-16px text requires.
// Same hue and saturation (HSL 155, 84%), darkened to L 25% -> #0A7548. Measured
// with the WCAG relative-luminance formula, light theme:
//   white on #0A7548 (filled buttons, pills, segments) .......... 5.75:1
//   #0A7548 text/icons on #FFFFFF background .................... 5.75:1
//   #0A7548 text on #F4F7F5 surface ............................. 5.33:1
//   #0A7548 text on accentSoft over background .................. 4.83:1
//   #0A7548 text on accentSoft over surface ..................... 4.50:1
// Dark mode's #35E28C is bright enough as text (11.23:1 on the background) but
// white ON it measured 1.69:1 - worse than the fault the audit reported. Fixing
// that by darkening the fill would leave a muddy near-black-on-near-black
// button, so dark mode keeps the vivid fill and flips the label to near-black
// via the `onFill` token: 11.17:1. `onFill` is the ONLY color that may be
// placed on accentFill / successFill / dangerFill - never a hardcoded '#fff'.
// Light-mode danger went #D8402E -> #C4331F for the same reason (4.48:1 is
// below AA for the 12px validation messages that use it); it now measures
// 5.47:1. `warning` is used for star icons only, where the bar is 3:1, and
// passes at 3.27:1, so it is unchanged.
//
// TEXT LEVELS. The three text tokens were the other half of the same fault.
// Every single use of `textTertiary` in this app is text somebody has to read -
// "Tap to flip" is the only instruction on the flashcard, the StatTile captions
// are the only thing naming what the numbers are, the Settings footers carry
// the privacy claim, and the Paywall carries the price comparison. There is no
// decorative use to grant an exception to, so tertiary is held to 4.5:1 like
// the rest. Before: light 2.03:1 on white, dark 2.55:1 on the background.
//
// Raising tertiary forced the whole scale. Old secondary was already failing
// (4.44:1 on `surface`, 4.18:1 on accentSoft over surface - it never cleared AA
// off the plain white background), and at 4.5:1 it would have been
// indistinguishable from tertiary. So all three are re-derived as one set, at
// the same hue, against the WORST background each can land on - which is
// accentSoft over surface, not the page: the flashcard back is an accentSoft
// panel and it carries both secondary (the note) and tertiary ("Tap to flip
// back"). Worst-case ratios, and CIE L* on the page to show the hierarchy:
//
//              light                          dark
//              worst   L*   gap               worst   L*   gap
//   primary    13.47  9.9                     10.30  96.9
//   secondary   7.76  30.7  20.8               7.23  80.6  16.3
//   tertiary    4.71  45.9  15.2               4.82  63.6  17.3
//
// Light mode is the constrained one: tertiary cannot sit above L* ~46 and still
// clear 4.5:1, so all three levels have to fit into L* 10-46. They do, with
// ~15-21 L* between steps - far above the ~2-3 L* just-noticeable difference,
// so three levels still read as three. The visible consequence is that
// secondary is darker than the prototype's; that is the cost of tertiary being
// legible at all, and it was below AA on cards regardless.

export type ThemeMode = 'light' | 'dark';

function paletteFor(mode: ThemeMode) {
  const isDark = mode === 'dark';
  return {
    mode,
    background: isDark ? '#05130D' : '#FFFFFF',
    surface: isDark ? '#0B2118' : '#F4F7F5',
    glassFill: isDark ? 'rgba(11,33,24,0.6)' : 'rgba(255,255,255,0.6)',
    glassBorder: isDark ? 'rgba(230,251,240,0.12)' : 'rgba(11,31,23,0.1)',

    accent: isDark ? '#35E28C' : '#0A7548',
    accentSoft: isDark ? 'rgba(53,226,140,0.18)' : 'rgba(10,117,72,0.12)',
    accentGlow: isDark ? 'rgba(53,226,140,0.25)' : 'rgba(10,117,72,0.22)',

    success: isDark ? '#35E28C' : '#0A7548',
    successSoft: isDark ? 'rgba(53,226,140,0.18)' : 'rgba(10,117,72,0.12)',
    warning: isDark ? '#F2A93B' : '#CE7A1B',
    warningSoft: isDark ? 'rgba(242,169,59,0.18)' : 'rgba(206,122,27,0.12)',
    danger: isDark ? '#FF6B5E' : '#C4331F',
    dangerSoft: isDark ? 'rgba(255,107,94,0.18)' : 'rgba(196,51,31,0.12)',

    // Solid fills that carry a label. Separate tokens because a fill and a text
    // color have different contrast partners: the label must clear 4.5:1
    // against the fill, and the fill must clear 3:1 against the page. Always
    // pair these with `onFill` - a literal '#fff' is what failed AA in dark mode.
    accentFill: isDark ? '#35E28C' : '#0A7548',
    successFill: isDark ? '#35E28C' : '#0A7548',
    dangerFill: isDark ? '#FF6B5E' : '#C4331F',
    onFill: isDark ? '#04140C' : '#FFFFFF',

    // Three read-as-distinct levels, all AA at 12px on every background they
    // land on. See the TEXT LEVELS note above before changing an alpha - these
    // are solved against accentSoft-over-surface, not against the page.
    textPrimary: isDark ? '#E6FBF0' : '#0B1F17',
    textSecondary: isDark ? 'rgba(230,251,240,0.8)' : 'rgba(11,31,23,0.8)',
    textTertiary: isDark ? 'rgba(230,251,240,0.6)' : 'rgba(11,31,23,0.64)',
    separator: isDark ? 'rgba(230,251,240,0.12)' : 'rgba(11,31,23,0.1)',
  };
}

export const lightPalette = paletteFor('light');
export const darkPalette = paletteFor('dark');
export const colors = lightPalette;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 28, xxl: 36 };
export const radii = { sm: 12, md: 18, lg: 20, xl: 28, pill: 999 };

// IBM Plex Sans (UI/body) + IBM Plex Mono (numeric/data readouts) - matches
// the "readiness monitor" identity. Font family names must match exactly
// what @expo-google-fonts loads (see app/_layout.tsx useFonts call).
export const fontFamily = {
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemiBold: 'IBMPlexSans_600SemiBold',
  sansBold: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemiBold: 'IBMPlexMono_600SemiBold',
  monoBold: 'IBMPlexMono_700Bold',
};

export const type = {
  largeTitle: { fontFamily: fontFamily.sansBold, fontSize: 30, letterSpacing: -0.3 },
  title2: { fontFamily: fontFamily.sansBold, fontSize: 20 },
  headline: { fontFamily: fontFamily.sansSemiBold, fontSize: 16 },
  body: { fontFamily: fontFamily.sans, fontSize: 16 },
  callout: { fontFamily: fontFamily.sans, fontSize: 14 },
  subheadline: { fontFamily: fontFamily.sansMedium, fontSize: 13 },
  caption: { fontFamily: fontFamily.sans, fontSize: 12 },
  tabLabel: { fontFamily: fontFamily.sansMedium, fontSize: 11 },
  // Numeric/data readouts - the "monitor" signature.
  numLg: { fontFamily: fontFamily.monoSemiBold, fontSize: 26, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
  numMd: { fontFamily: fontFamily.monoSemiBold, fontSize: 18, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
  numSm: { fontFamily: fontFamily.monoMedium, fontSize: 13, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
  monoLabel: {
    fontFamily: fontFamily.monoSemiBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0.12,
    shadowRadius: 14,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};
