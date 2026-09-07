import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as usePlexSans,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  useFonts as usePlexMono,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { AppStateProvider, useAppState } from '../src/lib/appState';
import { PurchaseProvider } from '../src/lib/purchase';

SplashScreen.preventAutoHideAsync().catch(() => {});

// The splash screen is held until fonts AND persisted state (theme preference,
// onboarding flag) have resolved, then hidden exactly once. Gating on all three
// avoids two visible glitches: a light flash before a dark-mode user's
// preference loads, and a flash of onboarding for a returning user.
function ThemedStack({ fontsReady }: { fontsReady: boolean }) {
  const { colors, mode, hydrated: themeHydrated } = useTheme();
  const { hydrated: stateHydrated } = useAppState();
  const ready = fontsReady && themeHydrated && stateHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="local" options={{ title: 'My State', headerBackTitle: 'Back' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // The second tuple element is the load error. If a font fails to load we must
  // still start the app with system fonts - discarding the error left the splash
  // screen up forever with no way forward.
  const [sansLoaded, sansError] = usePlexSans({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });
  const [monoLoaded, monoError] = usePlexMono({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  });

  const fontsReady = (sansLoaded || !!sansError) && (monoLoaded || !!monoError);

  useEffect(() => {
    if (sansError || monoError) {
      console.warn('[fonts] IBM Plex failed to load; falling back to system fonts.', sansError ?? monoError);
    }
  }, [sansError, monoError]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <PurchaseProvider>
            <ThemedStack fontsReady={fontsReady} />
          </PurchaseProvider>
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
