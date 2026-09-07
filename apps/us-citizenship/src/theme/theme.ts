import { Platform } from 'react-native';

// "Civics Pulse" identity - chosen after comparing 8 prototype directions
// (see chat history / prototype-pulse.html). A readiness-monitor metaphor:
// white/near-black grounds, one vivid "phosphor" green, IBM Plex for a
// data-readout feel. Values are ported 1:1 from the approved prototype, not
// re-derived, so the shipped app matches what was actually signed off on.

export type ThemeMode = 'light' | 'dark';

function paletteFor(mode: ThemeMode) {
  const isDark = mode === 'dark';
  return {
    mode,
    background: isDark ? '#05130D' : '#FFFFFF',
    surface: isDark ? '#0B2118' : '#F4F7F5',
    glassFill: isDark ? 'rgba(11,33,24,0.6)' : 'rgba(255,255,255,0.6)',
    glassBorder: isDark ? 'rgba(230,251,240,0.12)' : 'rgba(11,31,23,0.1)',

    accent: isDark ? '#35E28C' : '#0FA968',
    accentSoft: isDark ? 'rgba(53,226,140,0.18)' : 'rgba(15,169,104,0.12)',
    accentGlow: isDark ? 'rgba(53,226,140,0.25)' : 'rgba(15,169,104,0.22)',

    success: isDark ? '#35E28C' : '#0FA968',
    successSoft: isDark ? 'rgba(53,226,140,0.18)' : 'rgba(15,169,104,0.12)',
    warning: isDark ? '#F2A93B' : '#CE7A1B',
    warningSoft: isDark ? 'rgba(242,169,59,0.18)' : 'rgba(206,122,27,0.12)',
    danger: isDark ? '#FF6B5E' : '#D8402E',
    dangerSoft: isDark ? 'rgba(255,107,94,0.18)' : 'rgba(216,64,46,0.12)',

    textPrimary: isDark ? '#E6FBF0' : '#0B1F17',
    textSecondary: isDark ? 'rgba(230,251,240,0.62)' : 'rgba(11,31,23,0.6)',
    textTertiary: isDark ? 'rgba(230,251,240,0.3)' : 'rgba(11,31,23,0.32)',
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
