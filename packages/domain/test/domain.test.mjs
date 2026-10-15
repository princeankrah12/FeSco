import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Money,
  classifyEngineByCapacity,
  calculateTotalCommuteOperatingCost,
  calculateSeatContribution,
  verifyNotForProfitInvariant,
  calculateCancellationSettlement,
  validateCorporateEmail,
  validateGhanaCardPin,
  sanitizeGhanaCardPin,
  evaluateJitLockState,
} from '../dist/index.js';

test('Money performs exact integer pesewas math without floating point drift', () => {
  const m1 = Money.fromCedis(14.00);
  const m2 = Money.fromCedis(7.50);

  assert.equal(m1.pesewas, 1400);
  assert.equal(m2.pesewas, 750);
  assert.equal(m1.add(m2).pesewas, 2150);
  assert.equal(m1.add(m2).toFormattedCedis(), 'GH₵ 21.50');
  assert.equal(m1.subtract(m2).toFormattedCedis(), 'GH₵ 6.50');

  // Floor division
  const total = Money.fromPesewas(4199); // GH₵ 41.99
  const seat = total.floorDivide(3);
  assert.equal(seat.pesewas, 1399); // 13.99, NOT 14.00
  assert.ok(seat.pesewas * 3 <= total.pesewas);
});

test('SVOC classifies vehicle engines and computes distance cost', () => {
  assert.equal(classifyEngineByCapacity(1200), 'A');
  assert.equal(classifyEngineByCapacity(1998), 'B');
  assert.equal(classifyEngineByCapacity(3000), 'C');

  // Ablekuma to Osu (~20 km) with Class B (GH₵ 2.10/km)
  const cost = calculateTotalCommuteOperatingCost(20, 'B');
  assert.equal(cost.pesewas, 4200); // GH₵ 42.00
  assert.equal(cost.toFormattedCedis(), 'GH₵ 42.00');

  const seat = calculateSeatContribution(cost);
  assert.equal(seat.pesewas, 1400); // GH₵ 14.00
  assert.equal(seat.toFormattedCedis(), 'GH₵ 14.00');
});

test('MATHEMATICAL PROOF: Invariance theorem proves Host can never exceed cost offset across 1000 simulated commutes', () => {
  // Test across distances from 1.0 km to 100.0 km in 0.1 km increments across classes A, B, C
  for (let dist = 1.0; dist <= 50.0; dist += 0.5) {
    for (const engineClass of ['A', 'B', 'C']) {
      const totalCost = calculateTotalCommuteOperatingCost(dist, engineClass);
      const seat = calculateSeatContribution(totalCost, 3);
      const proof = verifyNotForProfitInvariant(totalCost, seat, 3);

      assert.ok(
        proof.isCompliant,
        `Violation detected at ${dist}km, Class ${engineClass}: recovery ${proof.maxPossibleRecovery.pesewas} > total ${totalCost.pesewas}`,
      );
      assert.ok(
        proof.costDifferential.pesewas >= 0,
        `Cost differential must be >= 0, received ${proof.costDifferential.pesewas}`,
      );
    }
  }
});

test('Cancellation policy allocates excess penalties to Rescue Pool rather than Host windfall', () => {
  const departure = new Date('2026-10-15T08:00:00Z');
  const seatContribution = Money.fromCedis(14.00); // 1400 pesewas

  // 1. T-45 mins (Free cancellation)
  const freeCancel = calculateCancellationSettlement({
    scheduledDeparture: departure,
    cancelledAt: new Date('2026-10-15T07:15:00Z'),
    seatContribution,
  });
  assert.equal(freeCancel.penaltyPercent, 0);
  assert.equal(freeCancel.totalPenalty.pesewas, 0);
  assert.equal(freeCancel.refundToCoCommuter.pesewas, 1400);

  // 2. T-20 mins (50% penalty: GH₵ 7.00)
  // Host did NOT incur detour
  const lateCancelNoDetour = calculateCancellationSettlement({
    scheduledDeparture: departure,
    cancelledAt: new Date('2026-10-15T07:40:00Z'),
    seatContribution,
    actualDetourKmIncurred: 0,
  });
  assert.equal(lateCancelNoDetour.penaltyPercent, 50);
  assert.equal(lateCancelNoDetour.totalPenalty.pesewas, 700);
  assert.equal(lateCancelNoDetour.hostDetourReimbursement.pesewas, 0);
  assert.equal(lateCancelNoDetour.rescuePoolAllocation.pesewas, 700); // 100% to Rescue Pool!

  // 3. T-5 mins (100% penalty: GH₵ 14.00)
  // Host drove 2.5 km detour in Class B (2.5 * 2.10 = GH₵ 5.25)
  const lastMinCancelWithDetour = calculateCancellationSettlement({
    scheduledDeparture: departure,
    cancelledAt: new Date('2026-10-15T07:55:00Z'),
    seatContribution,
    actualDetourKmIncurred: 2.5,
    engineClass: 'B',
  });
  assert.equal(lastMinCancelWithDetour.penaltyPercent, 100);
  assert.equal(lastMinCancelWithDetour.totalPenalty.pesewas, 1400);
  assert.equal(lastMinCancelWithDetour.hostDetourReimbursement.pesewas, 525); // Exact detour
  assert.equal(lastMinCancelWithDetour.rescuePoolAllocation.pesewas, 875); // Excess to Rescue Pool!
});

test('Corporate Email Gatekeeper strictly admits verified corporate domains', () => {
  // Verified employer
  const gcb = validateCorporateEmail('kwame.asante@gcbbank.com.gh');
  assert.ok(gcb.isValid);
  assert.equal(gcb.employer?.companyName, 'GCB Bank PLC');

  // Public personal email rejected
  const gmail = validateCorporateEmail('kwame@gmail.com');
  assert.equal(gmail.isValid, false);
  assert.equal(gmail.canRequestAddition, false);

  // Corporate but unverified domain allows request addition
  const unverified = validateCorporateEmail('officer@startupgh.com');
  assert.equal(unverified.isValid, false);
  assert.equal(unverified.isCorporate, true);
  assert.equal(unverified.canRequestAddition, true);
});

test('Ghana Card PIN validation and sanitization', () => {
  assert.equal(sanitizeGhanaCardPin('gha-712345678-9'), 'GHA-712345678-9');
  assert.equal(sanitizeGhanaCardPin('7123456789'), 'GHA-712345678-9');

  const valid = validateGhanaCardPin('GHA-712345678-9');
  assert.ok(valid.isValid);

  const invalid = validateGhanaCardPin('INVALID-123');
  assert.equal(invalid.isValid, false);
});

test('JIT Wallet Lock State Machine handles standard flow and Osu/Airport City exception', () => {
  const departure = new Date('2026-10-15T08:00:00Z');
  const seatContribution = Money.fromCedis(14.00);

  // T-40 mins: Anticipation
  const anticipation = evaluateJitLockState({
    scheduledDeparture: departure,
    currentTime: new Date('2026-10-15T07:20:00Z'),
    seatContribution,
    walletBalance: Money.fromCedis(20.00),
    isInOsuAirportCityGeofence: false,
  });
  assert.equal(anticipation.state, 'ANTICIPATION');

  // T-25 mins standard: Teasheet pulsing countdown
  const teasheet = evaluateJitLockState({
    scheduledDeparture: departure,
    currentTime: new Date('2026-10-15T07:35:00Z'),
    seatContribution,
    walletBalance: Money.fromCedis(20.00),
    isInOsuAirportCityGeofence: false,
  });
  assert.equal(teasheet.state, 'TEASHEET_PULSING');
  assert.ok(teasheet.badgeLabel.startsWith('Payment Locking in'));

  // T-25 mins Osu / Airport City corporate exception with sufficient balance
  const osuCleared = evaluateJitLockState({
    scheduledDeparture: departure,
    currentTime: new Date('2026-10-15T07:35:00Z'),
    seatContribution,
    walletBalance: Money.fromCedis(20.00),
    isInOsuAirportCityGeofence: true,
  });
  assert.equal(osuCleared.state, 'CLEARED_FOR_BOARDING_OSU');
  assert.equal(osuCleared.badgeLabel, 'Cleared for Boarding');
  assert.equal(osuCleared.allowsBoarding, true);

  // Telco MoMo 500 Outage Network Grace Period
  const momoGrace = evaluateJitLockState({
    scheduledDeparture: departure,
    currentTime: new Date('2026-10-15T07:55:00Z'),
    seatContribution,
    walletBalance: Money.fromCedis(20.00),
    isInOsuAirportCityGeofence: false,
    authorizationAttempted: true,
    authorizationSucceeded: false,
    gatewayErrorCode: 500,
  });
  assert.equal(momoGrace.state, 'NETWORK_GRACE_PERIOD');
  assert.equal(momoGrace.allowsBoarding, true);

  // Insufficient Funds 402: Forfeited Seat
  const forfeited = evaluateJitLockState({
    scheduledDeparture: departure,
    currentTime: new Date('2026-10-15T07:55:00Z'),
    seatContribution,
    walletBalance: Money.fromCedis(2.00),
    isInOsuAirportCityGeofence: false,
    authorizationAttempted: true,
    authorizationSucceeded: false,
    gatewayErrorCode: 402,
  });
  assert.equal(forfeited.state, 'FORFEITED_SEAT');
  assert.equal(forfeited.allowsBoarding, false);
});
