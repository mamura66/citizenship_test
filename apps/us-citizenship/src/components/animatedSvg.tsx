import { forwardRef } from 'react';
import { Animated } from 'react-native';
import { Circle, Path } from 'react-native-svg';

// Animated.createAnimatedComponent injects `collapsable={false}` into whatever
// it wraps. On native that's a valid View prop; on web react-native-svg forwards
// it straight onto the DOM <circle>/<path>, and React logs
// "Received `false` for a non-boolean attribute `collapsable`" on every screen
// that shows the gauge or sparkline. These thin wrappers drop the prop before it
// reaches the SVG element. Refs are forwarded so Animated can still reach the node.

type AnyProps = Record<string, unknown> & { collapsable?: boolean };

const CircleSansCollapsable = forwardRef<any, AnyProps>(function CircleSansCollapsable({ collapsable: _c, ...rest }, ref) {
  return <Circle ref={ref} {...(rest as any)} />;
});

const PathSansCollapsable = forwardRef<any, AnyProps>(function PathSansCollapsable({ collapsable: _c, ...rest }, ref) {
  return <Path ref={ref} {...(rest as any)} />;
});

export const AnimatedCircle = Animated.createAnimatedComponent(CircleSansCollapsable);
export const AnimatedPath = Animated.createAnimatedComponent(PathSansCollapsable);
