import { View } from 'react-native';
import Svg, { Rect, Polygon } from 'react-native-svg';

// Rendered to the official specification, not a stretched stock image:
//  - Proportion 10:19 (hoist:fly)
//  - 13 stripes, each 1/13 of the hoist
//  - Canton: 7 stripes tall (7/13 of hoist), 0.76 of hoist wide
//  - 50 stars in 9 offset rows (6-5-6-5-6-5-6-5-6), rows at 1/10 and
//    columns at 1/12 intervals of the canton, star diameter 0.0616 of hoist
//  - Colors: Old Glory Red #B31942, Old Glory Blue #0A3161, White #FFFFFF
//    (U.S. Department of State / GSA spec DDD-F-416F)
// This audience (prospective citizens) will notice a wrong flag. Keep it exact.

const HOIST = 1000;
const FLY = 1900;
const STRIPE = HOIST / 13;
const CANTON_H = STRIPE * 7;
const CANTON_W = HOIST * 0.76;
const STAR_R = (HOIST * 0.0616) / 2;

const OLD_GLORY_RED = '#B31942';
const OLD_GLORY_BLUE = '#0A3161';
const WHITE = '#FFFFFF';

function starPoints(cx: number, cy: number, R: number): string {
  const r = R * 0.381966; // inner radius of a regular five-pointed star
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(angle)).toFixed(2)},${(cy + rad * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const STARS: { cx: number; cy: number }[] = [];
for (let row = 1; row <= 9; row++) {
  const cy = (CANTON_H / 10) * row;
  const cols = row % 2 === 1 ? [1, 3, 5, 7, 9, 11] : [2, 4, 6, 8, 10];
  for (const col of cols) STARS.push({ cx: (CANTON_W / 12) * col, cy });
}

export function AmericanFlag({ width, radius = 0 }: { width: number; radius?: number }) {
  const height = width / 1.9;
  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${FLY} ${HOIST}`}>
        {Array.from({ length: 13 }).map((_, i) => (
          <Rect
            key={`s${i}`}
            x={0}
            y={i * STRIPE}
            width={FLY}
            height={STRIPE + 0.5}
            fill={i % 2 === 0 ? OLD_GLORY_RED : WHITE}
          />
        ))}
        <Rect x={0} y={0} width={CANTON_W} height={CANTON_H} fill={OLD_GLORY_BLUE} />
        {STARS.map((s, i) => (
          <Polygon key={`st${i}`} points={starPoints(s.cx, s.cy, STAR_R)} fill={WHITE} />
        ))}
      </Svg>
    </View>
  );
}
