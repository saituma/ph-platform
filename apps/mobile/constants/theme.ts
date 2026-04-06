export const fonts = {
  // Hero numbers — distance, time, big stats
  // Britney Ultra is the chunkiest, most impactful font in the project
  heroNumber:    'Britney-Ultra',         // size 80-96, the BIG numbers
  heroDisplay:   'Britney-Bold',          // size 36-48, section heroes
  
  // Headers and titles — Panchang is bold and geometric
  heading1:      'Panchang-Extrabold',    // size 28-32, screen titles
  heading2:      'Panchang-Bold',         // size 22-26, card titles
  heading3:      'Panchang-Semibold',     // size 18-20, sub-headers

  // UI labels — CabinetGrotesk is clean and modern
  labelBold:     'CabinetGrotesk-Bold',   // size 14-16, metric labels
  labelMedium:   'CabinetGrotesk-Medium', // size 13-14, secondary labels
  labelCaps:     'CabinetGrotesk-Black',  // size 11-12, ALL CAPS labels

  // Body and tags — Satoshi is versatile and readable
  bodyBold:      'Satoshi-Bold',          // size 15-17, list items
  bodyMedium:    'Satoshi-Medium',        // size 14-15, body text
  bodyRegular:   'Satoshi-Regular',       // size 13-14, captions

  // Accent / decorative — ClashDisplay for special moments
  accent:        'ClashDisplay-Semibold', // size 13-16, tags, chips
  accentBold:    'ClashDisplay-Bold',     // size 16-20, highlighted text

  // Numbers in lists / secondary stats — Outfit is clean for numbers
  statNumber:    'Outfit-Black',          // size 24-32, secondary stats
  statLabel:     'Outfit-SemiBold',       // size 11-13, stat labels
} as const;

export const colors = {
  // Backgrounds
  bg:              '#07070F',  // deepest dark, near black with blue tint
  surface:         '#0F0F1E',  // card background
  surfaceHigh:     '#161628',  // elevated card / input background
  surfaceHigher:   '#1E1E38',  // pressed / selected states

  // Borders — ZERO black borders, EVER
  borderSubtle:    '#1A1A30',  // default resting border
  borderMid:       '#252540',  // slightly visible border  
  borderStrong:    '#303058',  // prominent border
  borderLime:      'rgba(200, 241, 53, 0.16)', // lime at 16% opacity — glow border
  borderPurple:    'rgba(123, 97, 255, 0.16)', // purple at 16% opacity
  borderCoral:     'rgba(255, 107, 107, 0.16)', // coral at 16% opacity
  borderCyan:      'rgba(0, 229, 255, 0.16)',  // cyan at 16% opacity

  // Accent colors
  lime:            '#C8F135',  // primary CTA — electric lime
  limeDark:        '#9DB82A',  // pressed lime
  limeGlow:        'rgba(200, 241, 53, 0.20)', // lime background glow
  purple:          '#7B61FF',  // secondary accent
  purpleGlow:      'rgba(123, 97, 255, 0.20)',
  coral:           '#FF6B6B',  // effort / warning / stop
  coralGlow:       'rgba(255, 107, 107, 0.20)',
  cyan:            '#00E5FF',  // speed / GPS active
  cyanGlow:        'rgba(0, 229, 255, 0.20)',
  amber:           '#FFB800',  // calories / personal bests
  amberGlow:       'rgba(255, 184, 0, 0.20)',

  // Text
  textPrimary:     '#FFFFFF',
  textSecondary:   '#9090B8',
  textDim:         '#55556A',
  textInverse:     '#07070F',  // dark text on lime buttons

  // Semantic aliases used across non-tracking screens
  accent:          '#C8F135',
  accentLight:     'rgba(200, 241, 53, 0.16)',
  background:      '#07070F',
  backgroundSecondary: '#121224',
  card:            '#0F0F1E',
  cardElevated:    '#161628',
  border:          '#252540',
  text:            '#FFFFFF',
  placeholder:     '#6B7280',
  warning:         '#F59E0B',
  warningSoft:     'rgba(245,158,11,0.20)',
  danger:          '#FF6B6B',
  dangerSoft:      'rgba(255,107,107,0.20)',
  success:         '#22C55E',
  successSoft:     'rgba(34,197,94,0.20)',
  icon:            '#94A3B8',
  tint:            '#C8F135',
  separator:       'rgba(148,163,184,0.20)',
  inputBackground: '#1E1E38',
  themeToggleIcon: '#CBD5E1',
  heroSurfaceMuted: '#10101D',
  heroSurfaceStrong: '#161628',

  // Map
  mapRoute:        '#7B61FF',  // purple route polyline
  mapStart:        '#00E5FF',  // cyan start marker
  mapEnd:          '#FF6B6B',  // coral end marker
} as const;

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
} as const;

export const radius = {
  xs:   8,
  sm:   12,
  md:   16,
  lg:   20,
  xl:   24,
  xxl:  32,
  pill: 100,
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
} as const;

export const icons = {
  // Actions
  startRun:      { lib: 'MaterialCommunityIcons', name: 'run-fast' },
  pause:         { lib: 'Ionicons',               name: 'pause-circle' },
  resume:        { lib: 'Ionicons',               name: 'play-circle' },
  stop:          { lib: 'Ionicons',               name: 'stop-circle' },
  save:          { lib: 'Ionicons',               name: 'checkmark-circle' },
  discard:       { lib: 'Ionicons',               name: 'trash-outline' },
  close:         { lib: 'Ionicons',               name: 'close-circle' },

  // Metrics
  distance:      { lib: 'MaterialCommunityIcons', name: 'map-marker-distance' },
  timer:         { lib: 'Ionicons',               name: 'timer-outline' },
  pace:          { lib: 'MaterialCommunityIcons', name: 'speedometer' },
  speed:         { lib: 'Ionicons',               name: 'flash-outline' },
  calories:      { lib: 'MaterialCommunityIcons', name: 'fire' },
  route:         { lib: 'Ionicons',               name: 'map-outline' },

  // GPS
  gpsActive:     { lib: 'Ionicons',               name: 'navigate-circle' },
  gpsSearching:  { lib: 'Ionicons',               name: 'navigate-circle-outline' },

  // Stats / History
  trophy:        { lib: 'MaterialCommunityIcons', name: 'trophy-outline' },
  medal:         { lib: 'MaterialCommunityIcons', name: 'medal-outline' },
  chart:         { lib: 'Ionicons',               name: 'bar-chart-outline' },
  history:       { lib: 'Ionicons',               name: 'time-outline' },
  shoe:          { lib: 'MaterialCommunityIcons', name: 'shoe-print' },
  run:           { lib: 'MaterialCommunityIcons', name: 'run' },
  heart:         { lib: 'Ionicons',               name: 'heart-outline' },

  // Effort icons
  effortVeryEasy: { lib: 'MaterialCommunityIcons', name: 'emoticon-happy-outline' },
  effortEasy:     { lib: 'MaterialCommunityIcons', name: 'emoticon-outline' },
  effortModerate: { lib: 'MaterialCommunityIcons', name: 'emoticon-neutral-outline' },
  effortHard:     { lib: 'MaterialCommunityIcons', name: 'emoticon-sad-outline' },
  effortMaximum:  { lib: 'MaterialCommunityIcons', name: 'emoticon-dead-outline' },

  // Feel tags
  feelEnergized:  { lib: 'Ionicons',               name: 'flash' },
  feelTired:      { lib: 'MaterialCommunityIcons', name: 'sleep' },
  feelHeavyLegs:  { lib: 'MaterialCommunityIcons', name: 'run' },
  feelBreathless: { lib: 'MaterialCommunityIcons', name: 'weather-windy' },
  feelStrong:     { lib: 'MaterialCommunityIcons', name: 'arm-flex-outline' },
  feelStruggled:  { lib: 'Ionicons',               name: 'alert-circle-outline' },
  feelInZone:     { lib: 'Ionicons',               name: 'radio-button-on' },
  feelDiscomfort: { lib: 'Ionicons',               name: 'medical-outline' },

  // UI
  chevronRight:  { lib: 'Ionicons',               name: 'chevron-forward' },
  arrowRight:    { lib: 'Ionicons',               name: 'arrow-forward' },
  person:        { lib: 'Ionicons',               name: 'person-circle-outline' },
  edit:          { lib: 'Ionicons',               name: 'pencil-outline' },
  info:          { lib: 'Ionicons',               name: 'information-circle-outline' },
  settings:      { lib: 'Ionicons',               name: 'settings-outline' },
} as const;

const light = {
  // Legacy app-wide semantic tokens
  text: '#0F172A',
  background: '#FFFFFF',
  tint: '#16A34A',
  icon: '#64748B',
  tabIconDefault: '#94A3B8',
  tabIconSelected: '#16A34A',
  card: '#FFFFFF',
  cardElevated: '#F7FFF9',
  border: 'rgba(15,23,42,0.10)',
  backgroundSecondary: '#F1F5F9',
  accent: '#16A34A',
  accentLight: '#DCFCE7',
  textSecondary: '#475569',
  placeholder: '#94A3B8',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.16)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.14)',
  success: '#22C55E',
  successSoft: 'rgba(34,197,94,0.16)',
  themeToggleIcon: '#334155',
  inputBackground: '#F8FAFC',
  separator: 'rgba(15,23,42,0.08)',
  heroSurfaceStrong: '#FFFFFF',
  heroSurfaceMuted: '#F8FAFC',

  // Tracking palette compatibility tokens
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceHigh: '#F8FAFC',
  surfaceHigher: '#EEF2FF',
  borderSubtle: 'rgba(15,23,42,0.08)',
  borderMid: 'rgba(15,23,42,0.14)',
  borderStrong: 'rgba(15,23,42,0.20)',
  borderLime: 'rgba(22,163,74,0.24)',
  borderPurple: 'rgba(123,97,255,0.22)',
  borderCoral: 'rgba(255,107,107,0.22)',
  borderCyan: 'rgba(0,229,255,0.22)',
  lime: '#84CC16',
  limeDark: '#65A30D',
  limeGlow: 'rgba(132,204,22,0.18)',
  purple: '#7B61FF',
  purpleGlow: 'rgba(123,97,255,0.16)',
  coral: '#FF6B6B',
  coralGlow: 'rgba(255,107,107,0.16)',
  cyan: '#0891B2',
  cyanGlow: 'rgba(8,145,178,0.16)',
  amber: '#F59E0B',
  amberGlow: 'rgba(245,158,11,0.16)',
  textPrimary: '#0F172A',
  textDim: '#94A3B8',
  textInverse: '#FFFFFF',
  mapRoute: '#7B61FF',
  mapStart: '#06B6D4',
  mapEnd: '#FB7185',
} as const;

const dark = {
  // Legacy app-wide semantic tokens
  text: '#F8FAFC',
  background: '#07070F',
  tint: '#C8F135',
  icon: '#94A3B8',
  tabIconDefault: '#64748B',
  tabIconSelected: '#C8F135',
  card: '#0F0F1E',
  cardElevated: '#161628',
  border: '#252540',
  backgroundSecondary: '#121224',
  accent: '#C8F135',
  accentLight: 'rgba(200,241,53,0.16)',
  textSecondary: '#9090B8',
  placeholder: '#6B7280',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.20)',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.20)',
  success: '#22C55E',
  successSoft: 'rgba(34,197,94,0.20)',
  themeToggleIcon: '#CBD5E1',
  inputBackground: '#1E1E38',
  separator: 'rgba(148,163,184,0.20)',
  heroSurfaceStrong: '#161628',
  heroSurfaceMuted: '#10101D',

  // Tracking palette compatibility tokens
  bg: '#07070F',
  surface: '#0F0F1E',
  surfaceHigh: '#161628',
  surfaceHigher: '#1E1E38',
  borderSubtle: '#1A1A30',
  borderMid: '#252540',
  borderStrong: '#303058',
  borderLime: 'rgba(200,241,53,0.16)',
  borderPurple: 'rgba(123,97,255,0.16)',
  borderCoral: 'rgba(255,107,107,0.16)',
  borderCyan: 'rgba(0,229,255,0.16)',
  lime: '#C8F135',
  limeDark: '#9DB82A',
  limeGlow: 'rgba(200,241,53,0.20)',
  purple: '#7B61FF',
  purpleGlow: 'rgba(123,97,255,0.20)',
  coral: '#FF6B6B',
  coralGlow: 'rgba(255,107,107,0.20)',
  cyan: '#00E5FF',
  cyanGlow: 'rgba(0,229,255,0.20)',
  amber: '#FFB800',
  amberGlow: 'rgba(255,184,0,0.20)',
  textPrimary: '#FFFFFF',
  textDim: '#55556A',
  textInverse: '#07070F',
  mapRoute: '#7B61FF',
  mapStart: '#00E5FF',
  mapEnd: '#FF6B6B',
} as const;

export const Colors = {
  light,
  dark,
} as const;
