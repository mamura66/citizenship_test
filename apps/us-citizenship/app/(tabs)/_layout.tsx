import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppState } from '../../src/lib/appState';
import { getCountry } from '../../src/content/countries';
import { langOf, translator } from '../../src/lib/strings';

// Genuine platform-native tab bar: on iOS 26 this renders with real Liquid
// Glass automatically, on Android it's a native Material 3 bar, on web it
// degrades to a styled fallback. `blurEffect` adapts to light/dark so it
// keeps reading as native glass in both appearances.
//
// Exactly five triggers on purpose: iOS shows at most five tab items and
// collapses any extras into a plain, unthemed "More" list. My State moved to a
// pushed screen (app/local.tsx), reached from the Home tile and Practice setup.
//
// First launch is gated here: until onboarding has been completed we send the
// user to /onboarding. We wait for persisted state to hydrate first so a
// returning user never sees a flash of the welcome flow.
export default function TabsLayout() {
  const { colors, mode } = useTheme();
  const { hydrated, hasOnboarded, country } = useAppState();
  // Tab labels follow the language of the test, not the phone: someone reading German
  // questions should have German chrome around them.
  const tr = translator(langOf(getCountry(country).language));

  if (!hydrated) return null;
  if (!hasOnboarded) return <Redirect href="/onboarding" />;

  return (
    <NativeTabs
      blurEffect={mode === 'dark' ? 'systemMaterialDark' : 'systemMaterialLight'}
      tintColor={colors.accent}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{tr('tab.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} drawable="ic_menu_home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="study">
        <NativeTabs.Trigger.Label>{tr('tab.study')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'rectangle.stack', selected: 'rectangle.stack.fill' }}
          drawable="ic_menu_agenda"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <NativeTabs.Trigger.Label>{tr('tab.practice')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'checkmark.circle', selected: 'checkmark.circle.fill' }}
          drawable="ic_menu_send"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="interview">
        <NativeTabs.Trigger.Label>{tr('tab.interview')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          drawable="ic_menu_call"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{tr('tab.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          drawable="ic_menu_preferences"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
