import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'body' | 'plan' | 'evidence';

interface Props {
  name: IconName;
  color: string;
  size?: number;
}

/** Simple line icons drawn with SVG, so no icon package is needed. The tab's text label carries the meaning. */
export default function TabIcon({ name, color, size = 22 }: Props) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {name === 'body' && (
          <>
            <Circle cx={12} cy={5} r={2.5} />
            <Path d="M8 21v-7l-2-4.5 3-1.5h6l3 1.5-2 4.5v7" />
          </>
        )}
        {name === 'plan' && (
          <>
            <Rect x={4} y={5} width={16} height={15} rx={3} />
            <Path d="M4 10h16M9 3v4M15 3v4" />
          </>
        )}
        {name === 'evidence' && <Path d="M3 19c3-1 4-12 9-12s5 9 9 12" />}
      </Svg>
    </View>
  );
}
