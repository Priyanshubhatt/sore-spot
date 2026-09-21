import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  areaPath,
  curveSeries,
  dayTicks,
  linePath,
  peakOf,
  xOf,
  yOf,
  type ChartBox,
} from '../evidence';
import { CURVE_A11Y, CURVE_PEAK_LABEL, CURVE_X_LABEL, CURVE_Y_LABEL } from '../evidenceCopy';
import { colors } from '../theme';

const LINE = colors.accent;
const FILL = colors.accentFill;
const AXIS = colors.muted;
const TEXT = colors.muted;
const HEIGHT = 194;
// SVG text does not inherit the app font on web, where it would fall back to a serif face.
const FONT = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined });

interface Props {
  width: number;
}

/** The engine's soreness curve, drawn as it is used: rising over the first day, peaking, then fading. */
export default function TimeCurveChart({ width }: Props) {
  const box: ChartBox = { width, height: HEIGHT, left: 12, right: 12, top: 46, bottom: 40 };
  const series = curveSeries();
  const peak = peakOf(series);
  const baseline = yOf(0, box);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={CURVE_A11Y} style={styles.wrap}>
      <Svg width={width} height={HEIGHT}>
        <Path d={areaPath(series, box)} fill={FILL} />
        <Path d={linePath(series, box)} fill="none" stroke={LINE} strokeWidth={2.5} />
        <Line x1={box.left} y1={baseline} x2={width - box.right} y2={baseline} stroke={AXIS} strokeWidth={1} />
        {dayTicks().map((day) => (
          <SvgText key={day} x={xOf(day * 24, box)} y={baseline + 14} fontFamily={FONT} fontSize={11} fill={TEXT} textAnchor="middle">
            {String(day)}
          </SvgText>
        ))}
        <SvgText x={width / 2} y={HEIGHT - 6} fontFamily={FONT} fontSize={11} fill={TEXT} textAnchor="middle">
          {CURVE_X_LABEL}
        </SvgText>
        <Circle cx={xOf(peak.hours, box)} cy={yOf(peak.level, box)} r={4.5} fill={LINE} />
        <SvgText x={xOf(peak.hours, box)} y={yOf(peak.level, box) - 10} fontFamily={FONT} fontSize={11} fill={TEXT} textAnchor="middle">
          {CURVE_PEAK_LABEL}
        </SvgText>
        <SvgText x={box.left} y={12} fontFamily={FONT} fontSize={11} fill={TEXT}>
          {CURVE_Y_LABEL}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
