import Svg, { Path } from 'react-native-svg';
import type { DayForecast, Muscle } from '../../engine';
import { zoneA11yLabel } from '../copy';
import { bandColor } from '../body/colors';
import { BodySide, SILHOUETTE, VIEWBOX, ZONES, musclesInView } from '../body/zones';

const BODY_FILL = '#EEF1F2';
const OUTLINE = '#FFFFFF';
const SELECTED_OUTLINE = '#0B2F2A';

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
  return (
    <Svg
      width={width}
      height={(width * VIEWBOX.height) / VIEWBOX.width}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
    >
      {SILHOUETTE.map((s, i) =>
        s.kind === 'fill' ? (
          <Path key={`body-${i}`} d={s.d} fill={BODY_FILL} />
        ) : (
          <Path
            key={`body-${i}`}
            d={s.d}
            fill="none"
            stroke={BODY_FILL}
            strokeWidth={s.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}
      {muscles.flatMap((muscle) =>
        (ZONES[side][muscle] ?? []).map((d, i) => (
          <Path
            key={`${muscle}-${i}`}
            d={d}
            fill={bandColor(forecast[muscle].band)}
            stroke={selected === muscle ? SELECTED_OUTLINE : OUTLINE}
            strokeWidth={selected === muscle ? 2.5 : 1}
            onPress={() => onSelect(muscle)}
            accessibilityLabel={zoneA11yLabel(muscle, forecast[muscle].band)}
          />
        )),
      )}
    </Svg>
  );
}
