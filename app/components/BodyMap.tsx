import { Circle, Defs, LinearGradient, Path, RadialGradient, Stop, Svg } from 'react-native-svg';
import type { DayForecast, Muscle, RiskBand } from '../../engine';
import { zoneA11yLabel } from '../copy';
import { colors } from '../theme';
import { BodySide, SILHOUETTE, VIEWBOX, ZONES, musclesInView } from '../body/zones';

// Soft, dimensional look: every fill is a top-to-bottom gradient (light tint to the base tone
// app/theme.test.ts checks contrast on), zone seams are thin and translucent instead of a hard line,
// and the selected zone gets a soft halo (three widening, fading strokes of its own outline, so it
// hugs the real shape without depending on SVG blur filters, which native platforms render poorly).
const SEAM = colors.bg;
const SELECTED_OUTLINE = colors.selectedOutline;
const HALO_WIDTHS = [9, 6, 3.5] as const;
const HALO_OPACITIES = [0.05, 0.09, 0.16] as const;
const BAND_GRADIENT: Record<RiskBand, string> = { low: 'zoneLow', moderate: 'zoneModerate', high: 'zoneHigh' };
const BAND_PRIORITY: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

interface Props {
  side: BodySide;
  forecast: DayForecast;
  selected: Muscle | null;
  onSelect: (muscle: Muscle) => void;
  width: number;
}

export default function BodyMap({ side, forecast, selected, onSelect, width }: Props) {
  // Draw the selected zone last so its outline sits on top of its neighbours.
  const muscles = musclesInView(side).sort((a, b) => Number(a === selected) - Number(b === selected));
  // The ambient glow behind the figure always shows, tinted to the worst band currently on screen —
  // green on an all-clear day, same as red or amber on a sore one.
  const dominant = muscles.reduce<RiskBand>(
    (worst, m) => (BAND_PRIORITY[forecast[m].band] > BAND_PRIORITY[worst] ? forecast[m].band : worst),
    'low',
  );
  const glow = colors[dominant];

  return (
    <Svg
      width={width}
      height={(width * VIEWBOX.height) / VIEWBOX.width}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
    >
      <Defs>
        <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.bodyFillTint} />
          <Stop offset="1" stopColor={colors.bodyFill} />
        </LinearGradient>
        <LinearGradient id="zoneLow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.lowTint} />
          <Stop offset="1" stopColor={colors.low} />
        </LinearGradient>
        <LinearGradient id="zoneModerate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.moderateTint} />
          <Stop offset="1" stopColor={colors.moderate} />
        </LinearGradient>
        <LinearGradient id="zoneHigh" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.highTint} />
          <Stop offset="1" stopColor={colors.high} />
        </LinearGradient>
        <RadialGradient id="ambientGlow" cx="50%" cy="55%" r="65%">
          <Stop offset="0" stopColor={glow} stopOpacity={0.28} />
          <Stop offset="1" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Circle cx={100} cy={230} r={150} fill="url(#ambientGlow)" />

      {SILHOUETTE.map((s, i) =>
        s.kind === 'fill' ? (
          <Path key={`body-${i}`} d={s.d} fill="url(#bodyGrad)" />
        ) : (
          <Path
            key={`body-${i}`}
            d={s.d}
            fill="none"
            stroke="url(#bodyGrad)"
            strokeWidth={s.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}

      {muscles.flatMap((muscle) =>
        (ZONES[side][muscle] ?? []).flatMap((d, i) => {
          const isSelected = selected === muscle;
          const halo = isSelected
            ? HALO_WIDTHS.map((w, hi) => (
                <Path
                  key={`${muscle}-halo-${i}-${hi}`}
                  d={d}
                  fill="none"
                  stroke={SELECTED_OUTLINE}
                  strokeWidth={w}
                  strokeOpacity={HALO_OPACITIES[hi]}
                  pointerEvents="none"
                />
              ))
            : [];
          return [
            ...halo,
            <Path
              key={`${muscle}-${i}`}
              d={d}
              fill={`url(#${BAND_GRADIENT[forecast[muscle].band]})`}
              stroke={isSelected ? SELECTED_OUTLINE : SEAM}
              strokeWidth={isSelected ? 2.4 : 0.75}
              strokeOpacity={isSelected ? 1 : 0.35}
              onPress={() => onSelect(muscle)}
              accessibilityLabel={zoneA11yLabel(muscle, forecast[muscle].band)}
            />,
          ];
        }),
      )}
    </Svg>
  );
}
