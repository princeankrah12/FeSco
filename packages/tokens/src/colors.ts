/**
 * FeSCo Functional Color Palette
 *
 * Color communicates system status strictly, adhering to fintech & legal transparency standards:
 * - Primary Action: Deep Corporate Indigo (#1E3A8A)
 * - Success: Emerald (#10B981)
 * - Warning/Pending: Amber (#F59E0B)
 * - Error/Destructive: Crimson (#EF4444)
 * - Secondary/Muted: Muted Slate (#64748B)
 * - Surfaces: Off-White (#F8FAFC), Card Pure White (#FFFFFF), Dark Mask (#0F172A)
 */

export const colors = {
  primary: {
    indigo: '#1E3A8A',
    indigoDark: '#172554',
    indigoLight: '#3B82F6',
    indigoSubtle: '#EFF6FF',
  },
  status: {
    success: '#10B981',
    successSubtle: '#ECFDF5',
    successBorder: '#6EE7B7',

    warning: '#F59E0B',
    warningSubtle: '#FFFBEB',
    warningBorder: '#FCD34D',

    error: '#EF4444',
    errorSubtle: '#FEF2F2',
    errorBorder: '#FCA5A5',

    info: '#2563EB',
    infoSubtle: '#EFF6FF',
    infoBorder: '#93C5FD',
  },
  neutral: {
    slate: '#64748B',
    slateDark: '#334155',
    slateLight: '#94A3B8',
    slateMuted: '#CBD5E1',
    slateBorder: '#E2E8F0',
  },
  surfaces: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    dark: '#0F172A',
    darkSubtle: '#1E293B',
    darkMaskRgba: 'rgba(15, 23, 42, 0.70)',
  },
  border: {
    default: '#E2E8F0',
    subtle: '#F1F5F9',
    focus: '#1E3A8A',
  },
  routing: {
    pedestrianPath: '#64748B', // Dotted Muted Slate for Pedestrian Walking Leg
    sharedVehiclePath: '#1E3A8A', // Solid Deep Corporate Indigo for Shared Vehicle Leg
    convergenceNodeOuter: '#1E3A8A', // Deep Corporate Indigo target outer ring
    convergenceNodeInner: '#FFFFFF', // Pure White target inner core
    carpoolClubPath: '#4338CA', // Indigo 700 for Fixed-Roster Carpool Club
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#64748B',
    inverse: '#FFFFFF',
    monospaceMath: '#0F172A',
  },
} as const;

export type Colors = typeof colors;
