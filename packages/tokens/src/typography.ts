/**
 * FeSCo Typography Token System — The Transparency Engine
 *
 * Enforces a strict two-typeface system to satisfy the legal not-for-profit mandate:
 * 1. UI & Instructions: Sans-Serif (Inter or SF Pro)
 * 2. Financial Math & Timers: Monospace (SF Mono or Roboto Mono)
 *    Used strictly for numbers, countdown timers, and receipt math to visually communicate
 *    raw accounting rather than commercial transport rates.
 */

export const typography = {
  fontFamilies: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Roboto Mono", Menlo, Monaco, Consolas, monospace',
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16, // Minimum 16px body for accessibility
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export type Typography = typeof typography;
