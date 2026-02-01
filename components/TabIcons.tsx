/**
 * Tab bar icons (official Ionicons outline style), rendered with react-native-svg
 * so they show in local and EAS builds.
 */
import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

const VIEWBOX = '0 0 512 512';

const STROKE_PROPS = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

type TabIconName = 'home' | 'trophy' | 'grid' | 'calendar' | 'settings';

type TabIconsProps = {
  name: TabIconName;
  color: string;
  size: number;
};

export function TabIcons({ name, color, size }: TabIconsProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      {name === 'home' && (
        <>
          <Path
            d="M80 212v236a16 16 0 0 0 16 16h96V328a24 24 0 0 1 24-24h80a24 24 0 0 1 24 24v136h96a16 16 0 0 0 16-16V212"
            stroke={color}
            strokeWidth={32}
            {...STROKE_PROPS}
          />
          <Path
            d="M480 256 266.89 52c-5-5.28-16.69-5.34-21.78 0L32 256M400 179V64h-48v69"
            stroke={color}
            strokeWidth={32}
            {...STROKE_PROPS}
          />
        </>
      )}
      {name === 'trophy' && (
        <>
          <Path
            d="M176 464h160M256 464V336M384 224c0-50.64-.08-134.63-.12-160a16 16 0 0 0-16-16l-223.79.26a16 16 0 0 0-16 15.95c0 30.58-.13 129.17-.13 159.79 0 64.28 83 112 128 112S384 288.28 384 224"
            stroke={color}
            strokeWidth={32}
            {...STROKE_PROPS}
          />
          <Path
            d="M128 96H48v16c0 55.22 33.55 112 80 112M384 96h80v16c0 55.22-33.55 112-80 112"
            stroke={color}
            strokeWidth={32}
            {...STROKE_PROPS}
          />
        </>
      )}
      {name === 'grid' && (
        <>
          <Rect x={48} y={48} width={176} height={176} rx={20} ry={20} stroke={color} strokeWidth={32} {...STROKE_PROPS} />
          <Rect x={288} y={48} width={176} height={176} rx={20} ry={20} stroke={color} strokeWidth={32} {...STROKE_PROPS} />
          <Rect x={48} y={288} width={176} height={176} rx={20} ry={20} stroke={color} strokeWidth={32} {...STROKE_PROPS} />
          <Rect x={288} y={288} width={176} height={176} rx={20} ry={20} stroke={color} strokeWidth={32} {...STROKE_PROPS} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={48} y={80} width={416} height={384} rx={48} stroke={color} strokeWidth={32} {...STROKE_PROPS} />
          <Circle cx={296} cy={232} r={24} fill={color} />
          <Circle cx={376} cy={232} r={24} fill={color} />
          <Circle cx={296} cy={312} r={24} fill={color} />
          <Circle cx={376} cy={312} r={24} fill={color} />
          <Circle cx={136} cy={312} r={24} fill={color} />
          <Circle cx={216} cy={312} r={24} fill={color} />
          <Circle cx={136} cy={392} r={24} fill={color} />
          <Circle cx={216} cy={392} r={24} fill={color} />
          <Circle cx={296} cy={392} r={24} fill={color} />
          <Path d="M128 48v32M384 48v32" stroke={color} strokeWidth={32} {...STROKE_PROPS} />
          <Path d="M464 160H48" stroke={color} strokeWidth={32} {...STROKE_PROPS} />
        </>
      )}
      {name === 'settings' && (
        <Path
          d="M262.29 192.31a64 64 0 1 0 57.4 57.4 64.13 64.13 0 0 0-57.4-57.4M416.39 256a154 154 0 0 1-1.53 20.79l45.21 35.46a10.81 10.81 0 0 1 2.45 13.75l-42.77 74a10.81 10.81 0 0 1-13.14 4.59l-44.9-18.08a16.11 16.11 0 0 0-15.17 1.75A164.5 164.5 0 0 1 325 400.8a15.94 15.94 0 0 0-8.82 12.14l-6.73 47.89a11.08 11.08 0 0 1-10.68 9.17h-85.54a11.11 11.11 0 0 1-10.69-8.87l-6.72-47.82a16.07 16.07 0 0 0-9-12.22 155 155 0 0 1-21.46-12.57 16 16 0 0 0-15.11-1.71l-44.89 18.07a10.81 10.81 0 0 1-13.14-4.58l-42.77-74a10.8 10.8 0 0 1 2.45-13.75l38.21-30a16.05 16.05 0 0 0 6-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 0 0-6.07-13.94l-38.19-30A10.81 10.81 0 0 1 49.48 186l42.77-74a10.81 10.81 0 0 1 13.14-4.59l44.9 18.08a16.11 16.11 0 0 0 15.17-1.75A164.5 164.5 0 0 1 187 111.2a15.94 15.94 0 0 0 8.82-12.14l6.73-47.89A11.08 11.08 0 0 1 213.23 42h85.54a11.11 11.11 0 0 1 10.69 8.87l6.72 47.82a16.07 16.07 0 0 0 9 12.22 155 155 0 0 1 21.46 12.57 16 16 0 0 0 15.11 1.71l44.89-18.07a10.81 10.81 0 0 1 13.14 4.58l42.77 74a10.8 10.8 0 0 1-2.45 13.75l-38.21 30a16.05 16.05 0 0 0-6.05 14.08c.33 4.14.55 8.3.55 12.47"
          stroke={color}
          strokeWidth={32}
          {...STROKE_PROPS}
        />
      )}
    </Svg>
  );
}
