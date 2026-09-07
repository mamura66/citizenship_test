import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

/** Animates a displayed integer from 0 up to `value` on mount/change. */
export function useCountUp(value: number, duration = 900, delay = 0) {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration, delay, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return display;
}
