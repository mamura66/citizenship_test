import { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

// Fixes a real bug: on a wide desktop browser (npm run web), screens built for
// a ~390-430pt phone width were stretching edge-to-edge with no max width,
// leaving huge dead gaps between cards/tiles and reading as broken/"vibe
// coded" rather than intentional. Native iOS/Android are already phone-width
// so this only changes anything on web.
export function ScreenContainer({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', width: '100%' },
  inner: { flex: 1, width: '100%', maxWidth: 480 },
});
