import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateClubBaselineRate,
  requiresParityDisclosure,
  calculateClubCommuteLock,
} from '../dist/index.js';

test('Club Invariant: calculateClubBaselineRate throws error when vehicle list is empty', () => {
  assert.throws(
    () => calculateClubBaselineRate([]),
    /Club must contain at least one registered vehicle\./,
  );
  assert.throws(
    () => calculateClubBaselineRate(null),
    /Club must contain at least one registered vehicle\./,
  );
});

test('Club Invariant: calculateClubBaselineRate caps baseline at lowest vehicle class across mixed fleet', () => {
  const mixedFleet = [
    {
      id: 'veh_class_c_01',
      engineClass: 'C',
      svocPerSeatCeilingPesewas: 3330,
    },
    {
      id: 'veh_class_a_01',
      engineClass: 'A',
      svocPerSeatCeilingPesewas: 1400,
    },
    {
      id: 'veh_class_b_01',
      engineClass: 'B',
      svocPerSeatCeilingPesewas: 2100,
    },
  ];

  const baselineRate = calculateClubBaselineRate(mixedFleet);
  assert.equal(baselineRate, 1400);

  // Fleet permutation independence check
  const reversedFleet = [...mixedFleet].reverse();
  assert.equal(calculateClubBaselineRate(reversedFleet), 1400);
});

test('Club Invariant: requiresParityDisclosure flags members joining with higher-cost vehicles', () => {
  const baselineRatePesewas = 1400; // Capped by Class A vehicle in rotation

  const higherClassVehicle = {
    id: 'veh_class_b_joining',
    engineClass: 'B',
    svocPerSeatCeilingPesewas: 2100,
  };

  const sameClassVehicle = {
    id: 'veh_class_a_joining',
    engineClass: 'A',
    svocPerSeatCeilingPesewas: 1400,
  };

  // Higher class vehicle requires the cost parity disclosure modal
  assert.equal(requiresParityDisclosure(higherClassVehicle, baselineRatePesewas), true);

  // Equal class vehicle does not require the disclosure modal
  assert.equal(requiresParityDisclosure(sameClassVehicle, baselineRatePesewas), false);
});

test('Drip-Funding: calculateClubCommuteLock computes standard 200 pesewas drip and receipt', () => {
  const result = calculateClubCommuteLock({
    totalCommuteFuelCostPesewas: 4200,
    clubBaselineRatePesewas: 1400,
    currentStakePesewas: 0,
    dripFundingEnabled: true,
  });

  assert.equal(result.hostContributionPesewas, 1400);
  assert.equal(result.stakeDripPesewas, 200);
  assert.equal(result.updatedStakeTotalPesewas, 200);
  assert.equal(result.totalWalletLockPesewas, 1600);
  assert.equal(result.seatCapacity, 3);
  assert.ok(result.monospaceLines.some((l) => l.includes('Refundable Club Stake (GH₵ 2.00/GH₵ 60.00) . GH₵ 2.00')));
  assert.ok(result.monospaceLines.some((l) => l.includes('Total Wallet Lock ................ GH₵ 16.00')));
});

test('Drip-Funding: calculateClubCommuteLock caps at 6000p avoiding constraint overflow (5900p + 100p)', () => {
  const result = calculateClubCommuteLock({
    totalCommuteFuelCostPesewas: 4200,
    clubBaselineRatePesewas: 1400,
    currentStakePesewas: 5900,
    dripFundingEnabled: true,
  });

  // Exactly 100 pesewas drip to reach the 6000 pesewas cap
  assert.equal(result.stakeDripPesewas, 100);
  assert.equal(result.updatedStakeTotalPesewas, 6000);
  assert.equal(result.totalWalletLockPesewas, 1500); // 1400 + 100
  assert.ok(result.monospaceLines.some((l) => l.includes('Refundable Club Stake (GH₵ 60.00/GH₵ 60.00) . GH₵ 1.00')));
});

test('Drip-Funding: calculateClubCommuteLock collapses receipt line once 6000p cap is fully funded', () => {
  const result = calculateClubCommuteLock({
    totalCommuteFuelCostPesewas: 4200,
    clubBaselineRatePesewas: 1400,
    currentStakePesewas: 6000,
    dripFundingEnabled: true,
  });

  assert.equal(result.stakeDripPesewas, 0);
  assert.equal(result.updatedStakeTotalPesewas, 6000);
  assert.equal(result.totalWalletLockPesewas, 1400);
  assert.ok(result.monospaceLines.some((l) => l.includes('Club Continuity Stake ............ Secured (GH₵ 60.00)')));
});
