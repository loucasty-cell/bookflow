/**
 * Widget geometry and surface tokens measured from the Figma file
 * zST5IOFYB6MgjnwAzpMxNt ("Apple Widgets UI Kit (Community)"), node 6:59.
 *
 * Every value here is traceable to a `figma-developer-mcp fetch` result.
 * Do not hand-edit: re-run the extraction instead.
 */

export const WIDGET_FILE_KEY = 'zST5IOFYB6MgjnwAzpMxNt';
export const WIDGET_ROOT_NODE = '6:59';
export const WIDGET_SOURCE_URL =
  'https://www.figma.com/design/zST5IOFYB6MgjnwAzpMxNt/Apple-Widgets-UI-Kit--Community-?node-id=6-59';

export const WIDGET_SIZES = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
};

/** 21.670000076293945px in Figma; the tail is float artifact. */
export const WIDGET_RADIUS = 21.67;

export const WIDGET_SCALES = {
  1: { transform: 'scale(1)', width: 329, height: 345 },
  2: { transform: 'scale(0.5)', width: 164.5, height: 172.5 },
  3: { transform: 'scale(0.33)', width: 108.57, height: 113.85 },
  4: { transform: 'scale(0.25)', width: 82.25, height: 86.25 },
};

/**
 * Type ramp as published by the file. Tracking is size-specific: negative on
 * display sizes, slightly positive on the small caption sizes.
 */
export const WIDGET_TYPE = {
  display: { font: 'SF Pro Display', style: 'Thin', weight: 200, size: 44, tracking: '-0.02em' },
  title: { font: 'SF Pro Rounded', style: 'Bold', weight: 700, size: 24, tracking: '-0.01em' },
  headline: { font: 'SF Pro Rounded', style: 'Bold', weight: 700, size: 17, tracking: '0' },
  label: { font: 'SF Pro Text', style: 'Semibold', weight: 600, size: 15, tracking: '0.02em' },
  body: { font: 'SF Pro Text', style: 'Medium', weight: 500, size: 13, tracking: '0' },
  caption: { font: 'SF Pro Text', style: 'Medium', weight: 500, size: 12, tracking: '0.01em' },
  micro: { font: 'SF Pro Text', style: 'Medium', weight: 500, size: 10, tracking: '0.01em' },
};

/** Surfaces actually observed in the file, keyed by the widget they came from. */
export const WIDGET_SURFACES = {
  weather: 'linear-gradient(180deg, rgba(28, 134, 180, 1) 0%, rgba(62, 174, 222, 1) 100%)',
  activityDark: '#121212',
  todayDark: '#262626',
  purple: 'linear-gradient(180deg, rgba(181, 72, 150, 1) 0%, rgba(107, 5, 170, 1) 100%)',
  amber: 'linear-gradient(180deg, rgba(255, 212, 34, 1) 0%, rgba(242, 200, 0, 1) 100%)',
  todoistRed: 'linear-gradient(180deg, rgba(219, 75, 61, 1) 0%, rgba(208, 55, 40, 1) 100%)',
  blue: 'linear-gradient(180deg, rgba(53, 115, 231, 1) 0%, rgba(36, 99, 219, 1) 100%)',
  blueAlt: 'linear-gradient(180deg, rgba(36, 111, 224, 1) 0%, rgba(33, 99, 199, 1) 100%)',
  today: 'linear-gradient(180deg, rgba(11, 184, 57, 1) 0%, rgba(5, 133, 39, 1) 100%)',
  todayLight: 'linear-gradient(180deg, rgba(234, 254, 239, 1) 0%, rgba(219, 243, 225, 1) 100%)',
  white: '#FFFFFF',
};

export const WIDGET_INK = {
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255, 255, 255, 0.6)',
  onLight: '#000000',
  onLightMuted: 'rgba(0, 0, 0, 0.5)',
};

export function widgetBox(size) {
  return WIDGET_SIZES[size] ?? WIDGET_SIZES.small;
}
