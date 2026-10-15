/**
 * FeSCo Spatial Routing Design Tokens
 *
 * Strict visual hierarchy separating the Pedestrian Leg from the Shared Vehicle Leg:
 * - Pedestrian Path: Discrete dotted Slate line (#64748B, 4px circle dots with 6px spacing)
 * - Convergence Node: Double-ring target marker (#1E3A8A outer ring, #FFFFFF inner core)
 * - Shared Commute Path: Solid Deep Corporate Indigo (#1E3A8A) polyline beginning strictly at convergence node
 */

export const spatialRouting = {
  pedestrian: {
    color: '#64748B',
    dotDiameter: 4,
    dotSpacing: 6,
    dotRadius: 2,
  },
  convergenceNode: {
    outerRingDiameter: 26,
    outerRingRadius: 13,
    outerRingBorderWidth: 3,
    outerRingColor: '#1E3A8A',
    innerCoreDiameter: 10,
    innerCoreRadius: 5,
    innerCoreColor: '#FFFFFF',
  },
  sharedCommute: {
    color: '#1E3A8A',
    strokeWidth: 6,
    strokeRadius: 3,
  },
} as const;

export type SpatialRouting = typeof spatialRouting;
