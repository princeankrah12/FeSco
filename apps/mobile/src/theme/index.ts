/**
 * FeSCo Mobile Theme & Design Token Integration
 *
 * Enforces:
 * - Functional status colors (Indigo, Emerald, Amber, Crimson, Slate)
 * - Two-typeface system: Sans-Serif for instructions, Monospace for numbers/timers/receipts
 * - 8pt spatial grid
 * - 300ms Ease-Out transitions
 */

export const FeScoColors = {
  // Brand
  indigo: '#1E3A8A',
  indigoDark: '#172554',
  indigoLight: '#3B82F6',
  indigoSubtle: '#EFF6FF',

  // Status
  emerald: '#10B981',
  emeraldSubtle: '#ECFDF5',
  emeraldBorder: '#6EE7B7',

  amber: '#F59E0B',
  amberSubtle: '#FFFBEB',
  amberBorder: '#FCD34D',

  crimson: '#EF4444',
  crimsonSubtle: '#FEF2F2',
  crimsonBorder: '#FCA5A5',

  slate: '#64748B',
  slateDark: '#334155',
  slateLight: '#94A3B8',
  slateMuted: '#CBD5E1',
  slateBorder: '#E2E8F0',

  // Surfaces
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  darkMask: 'rgba(15, 23, 42, 0.70)',
  darkMaskSolid: '#0F172A',

  // Corporate Exemption Badge
  corporateBlue: '#2563EB',

  // Spatial Routing Visual Hierarchy
  pedestrianPath: '#64748B',
  sharedVehiclePath: '#1E3A8A',
  convergenceNodeOuter: '#1E3A8A',
  convergenceNodeInner: '#FFFFFF',
  carpoolClubPath: '#4338CA',
} as const;

export const FeScoTypography = {
  fontFamilies: {
    // React Native system font aliases
    sans: 'System',
    mono: 'monospace',
  },
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 32,
  },
} as const;

export const FeScoSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  giant: 64,
} as const;

export const FeScoRadii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;

export const FeScoElevation = {
  flat: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  popped: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
