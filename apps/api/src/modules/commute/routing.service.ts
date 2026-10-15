import {
  Money,
  EngineClass,
  calculateTotalCommuteOperatingCost,
  calculateSeatContribution,
} from '@fesco/domain';

export interface GeoPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface NearestStopMatchResult {
  hasExactMatch: boolean;
  isNearestStopOffered: boolean;
  distanceToStopMeters: number;
  stopPoint: GeoPoint;
  stopName: string;
  estimatedPickupTime: string;
  recalculatedContribution: Money;
  suggestionPrompt: string;
}

/**
 * Calculates straight-line distance in metres between two coordinates using Haversine formula.
 */
export function haversineDistanceMeters(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371000; // Earth radius in metres
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Flexible Routing Engine: Nearest Stop Match
 *
 * Implements PostGIS ST_ClosestPoint equivalent in pure domain logic,
 * ensuring Co-Commuters are never met with an empty "No Commutes Found" screen.
 */
export class RoutingService {
  /**
   * Matches a Co-Commuter's origin coordinate with a Host's route waypoints.
   */
  findNearestStopMatch(params: {
    hostRouteWaypoints: Array<GeoPoint & { name: string; scheduledPassingTime: string }>;
    cocommuterOrigin: GeoPoint;
    destinationKmFromStop: number;
    engineClass: EngineClass;
    exactMatchThresholdMeters?: number; // e.g. 150m
    maxWalkingDistanceMeters?: number; // e.g. 1200m
  }): NearestStopMatchResult | null {
    const exactThreshold = params.exactMatchThresholdMeters ?? 150;
    const maxWalking = params.maxWalkingDistanceMeters ?? 1200;

    let closestWaypoint = params.hostRouteWaypoints[0];
    let minDistance = Infinity;

    for (const waypoint of params.hostRouteWaypoints) {
      const dist = haversineDistanceMeters(params.cocommuterOrigin, waypoint);
      if (dist < minDistance) {
        minDistance = dist;
        closestWaypoint = waypoint;
      }
    }

    if (!closestWaypoint || minDistance > maxWalking) {
      return null;
    }

    const hasExactMatch = minDistance <= exactThreshold;

    // Recalculate Fuel Contribution dynamically for the shorter leg
    const totalLegCost = calculateTotalCommuteOperatingCost(
      params.destinationKmFromStop,
      params.engineClass,
    );
    const recalculatedContribution = calculateSeatContribution(totalLegCost);

    const suggestionPrompt = hasExactMatch
      ? `Boarding at ${closestWaypoint.name} at ${closestWaypoint.scheduledPassingTime}.`
      : `Exact match unavailable. Host is passing [${closestWaypoint.name}] at ${closestWaypoint.scheduledPassingTime}. Tap to accept this nearest-stop match.`;

    return {
      hasExactMatch,
      isNearestStopOffered: !hasExactMatch,
      distanceToStopMeters: minDistance,
      stopPoint: closestWaypoint,
      stopName: closestWaypoint.name,
      estimatedPickupTime: closestWaypoint.scheduledPassingTime,
      recalculatedContribution,
      suggestionPrompt,
    };
  }
}
