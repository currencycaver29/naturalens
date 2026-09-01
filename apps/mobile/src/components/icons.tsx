import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Colors } from '../theme/tokens';

/**
 * The Volume One icon set — 24 grid, 1.6px stroke, square caps.
 *
 * Hand-drawn rather than pulled from a pack. Ionicons are rounded, filled and unmistakably
 * iOS; this system is line-drawn and rectangular, and the icons are most of what makes a
 * screen read as one or the other. They share the mark's construction: thin stroke, open
 * counters, no fill.
 */

interface IconProps {
  size?: number;
  color?: string;
}

const DEFAULTS = { size: 21, stroke: 1.6 };

function base(size: number, color: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: DEFAULTS.stroke,
  };
}

export function CameraIcon({ size = DEFAULTS.size, color = Colors.fg }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x={2.5} y={6} width={19} height={14} />
      <Circle cx={12} cy={13} r={4} />
      <Line x1={8} y1={6} x2={10} y2={3.5} />
    </Svg>
  );
}

/** Camera with a strike through it — the permission screen. */
export function CameraOffIcon({ size = DEFAULTS.size, color = Colors.fg }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x={2.5} y={6} width={19} height={14} />
      <Circle cx={12} cy={13} r={4} />
      <Line x1={8} y1={6} x2={10} y2={3.5} />
      <Line x1={3} y1={21} x2={21} y2={4} />
    </Svg>
  );
}

/** Two stacked rows — a list of finds, each a thumbnail beside its lines. */
export function FindsIcon({ size = DEFAULTS.size, color = Colors.fg }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x={3} y={4} width={5} height={5} />
      <Rect x={3} y={14} width={5} height={5} />
      <Line x1={11} y1={6.5} x2={21} y2={6.5} />
      <Line x1={11} y1={16.5} x2={21} y2={16.5} />
    </Svg>
  );
}

/** A folded paper map — three panels. */
export function MapIcon({ size = DEFAULTS.size, color = Colors.fg }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x={3} y={4.5} width={18} height={15} />
      <Line x1={9} y1={4.5} x2={9} y2={19.5} />
      <Line x1={15} y1={4.5} x2={15} y2={19.5} />
    </Svg>
  );
}

export function ChevronIcon({ size = 18, color = Colors.fg }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

export function CloseIcon({ size = 15, color = Colors.bg }: IconProps) {
  return (
    <Svg {...base(size, color)} strokeWidth={1.8}>
      <Line x1={5} y1={5} x2={19} y2={19} />
      <Line x1={19} y1={5} x2={5} y2={19} />
    </Svg>
  );
}

/** Two stacked frames — choose a still from the library rather than the shutter. */
export function LibraryIcon({ size = DEFAULTS.size, color = Colors.fg }: IconProps) {
  return (
    <Svg {...base(size, color)} strokeLinecap="square">
      <Rect x={6.5} y={3} width={14} height={14} />
      <Rect x={3.5} y={7} width={14} height={14} />
    </Svg>
  );
}

/** Back — the only way out of a screen that isn't a tab or a modal (Screens 20 / 21). */
export function ArrowLeftIcon({ size = DEFAULTS.size, color = Colors.fg }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1={19.5} y1={12} x2={5} y2={12} />
      <Path d="M11 5.5 L4.5 12 L11 18.5" />
    </Svg>
  );
}
