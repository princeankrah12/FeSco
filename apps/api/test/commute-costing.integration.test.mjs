import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VehicleService,
  SvocService,
  WalletService,
  haversineDistanceMeters,
} from '../dist/index.js';

test('Integration Test: Commute Costing, SVOC Invariance, and JIT Rate Recalculation', async () => {
  const vehicleService = new VehicleService();
  const svocService = new SvocService();
  const walletService = new WalletService();

  // 1. Host Vehicle Registration (2021 Toyota Corolla, 1798cc, Class B)
  const hostUserId = 'usr_kwame_stanbic_001';
  const regResult = await vehicleService.registerVehicle({
    hostUserId,
    licensePlate: 'GW-2021-26',
    chassisNumber: '1HGCR2F83HA049101', // Clean 17-char ISO 3779 VIN
  });

  assert.equal(regResult.vehicle.registration_status, 'VERIFIED');
  assert.equal(regResult.vehicle.engine_class, 'B');
  assert.equal(regResult.vehicle.manufacture_year, 2021);
  assert.match(regResult.userFacingMessage, /Vehicle Verified/);

  // 2. PostGIS Coordinates Pin (Agape Junction to Osu Corporate Center)
  const agapeOrigin = { lat: 5.5896, lng: -0.3204, name: 'Agape Junction' };
  const osuDestination = { lat: 5.5560, lng: -0.1818, name: 'Osu Oxford Street' };

  // Calculate straight-line distance via Haversine
  const straightLineMeters = haversineDistanceMeters(agapeOrigin, osuDestination);
  assert.ok(straightLineMeters > 15000 && straightLineMeters < 16500);

  // Real-world road network distance through N1 Highway / Ring Road (16.5 km)
  const actualCommuteDistanceKm = 16.5;

  // 3. Apply Active SVOC Rate Version (2026.1-DVLA @ 210 pesewas/km for Class B)
  const activeCostResult = svocService.calculateCost({
    distanceKm: actualCommuteDistanceKm,
    engineClass: regResult.vehicle.engine_class,
    coCommuterSeats: 3,
  });

  // Total operating cost: round(16.5 * 210) = 3465 pesewas (GH₵ 34.65)
  assert.equal(activeCostResult.totalOperatingCostPesewas, 3465);
  assert.equal(activeCostResult.totalOperatingCostFormatted, 'GH₵ 34.65');

  // Mathematically floor-rounded seat contribution: floor(3465 / 3) = 1155 pesewas (GH₵ 11.55)
  assert.equal(activeCostResult.seatContributionPesewas, 1155);
  assert.equal(activeCostResult.seatContributionFormatted, 'GH₵ 11.55');

  // Proof of Non-Profit Invariance: 3 seats * 1155 pesewas = 3465 <= 3465
  const maxPossibleRecovery = activeCostResult.seatContributionPesewas * 3;
  assert.ok(maxPossibleRecovery <= activeCostResult.totalOperatingCostPesewas);

  // 4. JIT Recalculation at T-30 Minutes:
  // Commute was drafted under older December 2025 rate (220 pesewas/km)
  // Active rate is January 2026 rate (210 pesewas/km)
  const jitCostResult = svocService.calculateCost({
    distanceKm: actualCommuteDistanceKm,
    engineClass: regResult.vehicle.engine_class,
    quotedRateVersion: '2025.24-DVLA',
    coCommuterSeats: 3,
  });

  // Assert fuel pump rate reduction is passed directly to Co-Commuter
  assert.equal(jitCostResult.isNpaRateAdjusted, true);
  assert.equal(jitCostResult.badgeLabel, 'NPA Rate Adjusted');
  assert.equal(jitCostResult.seatContributionPesewas, 1155);
  assert.equal(jitCostResult.seatContributionFormatted, 'GH₵ 11.55');

  // 5. Pre-Funded Wallet Top-Up via MoMo and Double-Entry Invariant
  const momoTopUp = await walletService.topUpViaMomo({
    userId: hostUserId,
    amountPesewas: 5000, // GH₵ 50.00
    momoReference: 'momo_gh_99887766',
    idempotencyKey: 'idemp_key_topup_001',
  });

  assert.equal(momoTopUp.isDuplicate, false);
  assert.equal(momoTopUp.balancePesewas, 5000);
  assert.equal(momoTopUp.balanceFormatted, 'GH₵ 50.00');

  // Idempotency check: duplicate webhook does not double credit
  const duplicateTopUp = await walletService.topUpViaMomo({
    userId: hostUserId,
    amountPesewas: 5000,
    momoReference: 'momo_gh_99887766',
    idempotencyKey: 'idemp_key_topup_001',
  });
  assert.equal(duplicateTopUp.isDuplicate, true);
  assert.equal(duplicateTopUp.balancePesewas, 5000);

  // 6. Hold Seat Contribution in Escrow
  const cocommuterId = 'usr_esi_cocommuter_002';
  await walletService.topUpViaMomo({
    userId: cocommuterId,
    amountPesewas: 2000, // GH₵ 20.00
    momoReference: 'momo_esi_112233',
    idempotencyKey: 'idemp_esi_topup',
  });

  const seatHold = await walletService.holdSeatContribution({
    userId: cocommuterId,
    seatId: 'seat_c1_01',
    contributionPesewas: jitCostResult.seatContributionPesewas, // 1155 pesewas
    idempotencyKey: 'idemp_hold_seat_c1_01',
  });

  // Remaining spendable balance: 2000 - 1155 = 845 pesewas (GH₵ 8.45)
  assert.equal(seatHold.remainingBalance.pesewas, 845);
  assert.equal(seatHold.remainingBalance.toFormattedCedis(), 'GH₵ 8.45');
});

test('Integration Test: Vehicle Registration Graceful Degradation and SSE Stream Recovery', async () => {
  const vehicleService = new VehicleService();

  // License plate containing '500' simulates DVLA timeout / 500 downtime
  const hostUserId = 'usr_ama_telecel_003';
  const pendingReg = await vehicleService.registerVehicle({
    hostUserId,
    licensePlate: 'ER-500-26',
    chassisNumber: '1HGCR2F83HA049101',
  });

  // Graceful degradation: status is PENDING, user is NOT hard-blocked
  assert.equal(pendingReg.vehicle.registration_status, 'PENDING');
  assert.match(pendingReg.userFacingMessage, /Verification Pending/);

  // Subscribe to real-time Server-Sent Events (SSE)
  const receivedEvents = [];
  const unsubscribe = vehicleService.subscribeToVehicleEvents(
    pendingReg.vehicle.id,
    (event) => {
      receivedEvents.push(event);
    },
  );

  // Immediate initial status event sent to client
  assert.equal(receivedEvents.length, 1);
  assert.equal(receivedEvents[0].eventType, 'VERIFICATION_PENDING');

  // Simulate background reconciliation recovery
  const recoveredVehicle = vehicleService.simulateBackgroundRecovery(pendingReg.vehicle.id);
  assert.equal(recoveredVehicle?.registration_status, 'VERIFIED');

  // Verify client received VERIFICATION_SUCCESS event over SSE
  assert.equal(receivedEvents.length, 2);
  assert.equal(receivedEvents[1].eventType, 'VERIFICATION_SUCCESS');
  assert.equal(receivedEvents[1].data.status, 'VERIFIED');
  assert.match(receivedEvents[1].data.message, /Vehicle Verified/);

  unsubscribe();
});
