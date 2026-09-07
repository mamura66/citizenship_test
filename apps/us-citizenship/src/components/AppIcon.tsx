import { SymbolView, SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

// Real platform-native icon glyphs - SF Symbols on iOS, Material Symbols on
// Android/web (both via expo-symbols) - not a generic third-party icon font.
// One semantic name here maps to the correct glyph per platform so screens
// don't need to know SF Symbol vs. Material Symbol naming.
const REGISTRY = {
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  chart: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  starFill: { ios: 'star.fill', android: 'star', web: 'star' },
  starOutline: { ios: 'star', android: 'star_outline', web: 'star_outline' },
  checkCircleFill: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  xCircleFill: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  volume: { ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  infoCircleFill: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  warningTriangleFill: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  building: { ios: 'building.2.fill', android: 'location_city', web: 'location_city' },
  stack: { ios: 'rectangle.stack.fill', android: 'auto_stories', web: 'auto_stories' },
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  chatBubbles: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' },
  gear: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  sun: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  moon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  circleHalf: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
} as const;

export type AppIconName = keyof typeof REGISTRY;

export function AppIcon({
  name,
  size = 20,
  color,
  type = 'hierarchical',
}: {
  name: AppIconName;
  size?: number;
  color: ColorValue;
  type?: SymbolViewProps['type'];
}) {
  const glyph = REGISTRY[name];
  return (
    <SymbolView
      name={{ ios: glyph.ios, android: glyph.android, web: glyph.web }}
      size={size}
      tintColor={color}
      type={type}
      fallback={null}
    />
  );
}
