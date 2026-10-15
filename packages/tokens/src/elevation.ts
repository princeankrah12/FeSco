/**
 * FeSCo Elevation & Z-Depth System
 *
 * Used for dynamic state changes:
 * - Flattened (T-10 processing): z-depth drops to 0
 * - Raised (Normal card): subtle shadow
 * - Popped (Success T-9, active): increased z-depth
 */

export const elevation = {
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
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  popped: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export type Elevation = typeof elevation;
