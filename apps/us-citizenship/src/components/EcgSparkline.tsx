import { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg from 'react-native-svg';
import { AnimatedCircle, AnimatedPath } from './animatedSvg';

const W = 340;
const H = 46;
const PAD_X = 4;
const TOP = 6;
const BOTTOM = 40;
const PATH_LENGTH = 900; // generous upper bound so the draw-on always completes

function buildPath(scores: number[]) {
  const mid = (TOP + BOTTOM) / 2;
  if (scores.length === 0) {
    return { d: `M${PAD_X} ${mid} L${W - PAD_X} ${mid}`, endX: W - PAD_X, endY: mid };
  }
  const yFor = (s: number) => BOTTOM - (Math.max(0, Math.min(100, s)) / 100) * (BOTTOM - TOP);
  if (scores.length === 1) {
    const y = yFor(scores[0]);
    return { d: `M${PAD_X} ${y} L${W - PAD_X} ${y}`, endX: W - PAD_X, endY: y };
  }
  const pts = scores.map((s, i) => ({
    x: PAD_X + (i / (scores.length - 1)) * (W - 2 * PAD_X),
    y: yFor(s),
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return { d, endX: last.x, endY: last.y };
}

/**
 * Recent-session score trace, drawn from REAL data (one point per completed
 * practice test). With no sessions it renders a flat muted baseline - never a
 * fabricated waveform. Draws itself on mount, then the lead dot blips.
 */
export function EcgSparkline({
  scores,
  color,
  mutedColor,
}: {
  scores: number[];
  color: string;
  mutedColor: string;
}) {
  const { d, endX, endY } = useMemo(() => buildPath(scores), [scores.join(',')]);
  const hasData = scores.length > 0;
  const draw = useRef(new Animated.Value(0)).current;
  const blip = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    draw.setValue(0);
    blip.setValue(1);
    const anim = Animated.timing(draw, { toValue: 1, duration: 1400, delay: 300, useNativeDriver: false });
    let loop: Animated.CompositeAnimation | null = null;
    anim.start(({ finished }) => {
      if (!finished || !hasData) return;
      loop = Animated.loop(
        Animated.sequence([
          // JS driver: the wrapped SVG node isn't a plain native view, and a 2-keyframe
          // opacity loop is trivially cheap to drive from JS.
          Animated.timing(blip, { toValue: 0.4, duration: 900, useNativeDriver: false }),
          Animated.timing(blip, { toValue: 1, duration: 900, useNativeDriver: false }),
        ])
      );
      loop.start();
    });
    return () => {
      anim.stop();
      loop?.stop();
    };
  }, [d, hasData]);

  const strokeDashoffset = draw.interpolate({ inputRange: [0, 1], outputRange: [PATH_LENGTH, 0] });
  const stroke = hasData ? color : mutedColor;

  return (
    <View>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <AnimatedPath
          d={d}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={hasData ? `${PATH_LENGTH}, ${PATH_LENGTH}` : '4, 6'}
          strokeDashoffset={hasData ? strokeDashoffset : 0}
        />
        {hasData ? <AnimatedCircle cx={endX} cy={endY} r={3.2} fill={color} opacity={blip} /> : null}
      </Svg>
    </View>
  );
}
