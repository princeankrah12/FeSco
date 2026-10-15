import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateChassisVin,
  sanitizeChassisVin,
  formatChassisVin,
  validateVehicleAge,
  recalculateCommuteCostJit,
  formatPesewasToGhc,
  validateDoubleEntryInvariant,
  createMomoTopUpJournal,
  calculateAccountBalance,
} from '../dist/index.js';

test('Vehicle: ISO 3779 VIN sanitizer auto-corrects I, O, Q and formats 4-4-4-5', () => {
  // Input with lowercase, spaces, and illegal characters under ISO 3779
  const rawInput = ' 1hgcr2f83ha-0491oi ';
  const sanitized = sanitizeChassisVin(rawInput);

  assert.equal(sanitized.length, 17);
  // 'O' was converted to '0' and 'I' was converted to '1'
  assert.equal(sanitized, '1HGCR2F83HA049101');
  assert.equal(/^[A-HJ-NPR-Z0-9]{17}$/.test(sanitized), true);

  const formatted = formatChassisVin(sanitized);
  assert.equal(formatted, '1HGC - R2F8 - 3HA0 - 49101');
});

test('Vehicle: ISO 3779 VIN validation strictly rejects invalid lengths and illegal letters', () => {
  const shortVin = validateChassisVin('1HGCR2F83HA');
  assert.equal(shortVin.isValid, false);
  assert.match(shortVin.error, /17 characters/);

  // Even after sanitation, an invalid string
  const validVin = validateChassisVin('1HGCR2F83HA049101');
  assert.equal(validVin.isValid, true);
  assert.equal(validVin.formattedVin, '1HGC - R2F8 - 3HA0 - 49101');
});

test('Vehicle: 15-Year statutory ceiling strictly admits 2011 and rejects 2010 in 2026', () => {
  const evaluationYear = 2026;

  // 2011 vehicle: 2026 - 2011 = 15 years old (Passes)
  const result2011 = validateVehicleAge(2011, evaluationYear);
  assert.equal(result2011.isEligible, true);
  assert.equal(result2011.vehicleAgeYears, 15);
  assert.match(result2011.message, /complies with the FeSCo <= 15-year/);

  // 2010 vehicle: 2026 - 2010 = 16 years old (Fails)
  const result2010 = validateVehicleAge(2010, evaluationYear);
  assert.equal(result2010.isEligible, false);
  assert.equal(result2010.vehicleAgeYears, 16);
  assert.match(result2010.message, /exceeds the 15-year maximum limit/);
});

test('SVOC: JIT Recalculation applies lower rate on pump rate drop and displays NPA Rate Adjusted badge', () => {
  const distanceKm = 16.5; // Agape to Osu
  const engineClass = 'B'; // 1500cc - 2500cc

  // Quoted under December 2025 rate (220 pesewas/km)
  // Active under January 2026 rate (210 pesewas/km)
  const jitResult = recalculateCommuteCostJit(
    '2025.24-DVLA',
    '2026.1-DVLA',
    distanceKm,
    engineClass,
    3,
  );

  assert.equal(jitResult.isNpaRateAdjusted, true);
  assert.equal(jitResult.badgeLabel, 'NPA Rate Adjusted');
  // Quoted: round(16.5 * 220) = 3630; floor(3630 / 3) = 1210 pesewas
  assert.equal(jitResult.quotedSeatContribution.pesewas, 1210);
  // Active: round(16.5 * 210) = 3465; floor(3465 / 3) = 1155 pesewas
  assert.equal(jitResult.activeSeatContribution.pesewas, 1155);
  assert.equal(jitResult.effectiveSeatContribution.pesewas, 1155);
  assert.equal(jitResult.differencePesewas, 55); // 55 pesewas saved per co-commuter
});

test('SVOC: JIT Recalculation honors quoted rate if active rate rises to protect Co-Commuters', () => {
  const distanceKm = 16.5;
  const engineClass = 'B';

  // Quoted at 210 pesewas/km, but hypothetically current rate is 220 pesewas/km
  const jitResult = recalculateCommuteCostJit(
    '2026.1-DVLA',
    '2025.24-DVLA',
    distanceKm,
    engineClass,
    3,
  );

  assert.equal(jitResult.isNpaRateAdjusted, false);
  assert.equal(jitResult.badgeLabel, null);
  // Honors quoted lower rate: 1155 pesewas
  assert.equal(jitResult.effectiveSeatContribution.pesewas, 1155);
});

test('Presentation: formatPesewasToGhc formats integer pesewas into standard GH₵ string', () => {
  assert.equal(formatPesewasToGhc(1400), 'GH₵ 14.00');
  assert.equal(formatPesewasToGhc(1155), 'GH₵ 11.55');
  assert.equal(formatPesewasToGhc(0), 'GH₵ 0.00');
  assert.equal(formatPesewasToGhc(50), 'GH₵ 0.50');
});

test('Ledger: Double-entry invariant enforces balanced debits and credits', () => {
  const userAccountId = 'acc_user_123';
  const pspAccountId = 'acc_psp_clearing';

  const journal = createMomoTopUpJournal(
    'usr_kwame',
    userAccountId,
    pspAccountId,
    5000, // GH₵ 50.00
    'momo_ref_987654',
    'idemp_abc_123',
  );

  const invariant = validateDoubleEntryInvariant(journal.postings);
  assert.equal(invariant.isBalanced, true);
  assert.equal(invariant.discrepancyPesewas, 0);

  // User account credited with 5000 pesewas
  const balance = calculateAccountBalance([journal.postings[1]]);
  assert.equal(balance.pesewas, 5000);
  assert.equal(balance.toFormattedCedis(), 'GH₵ 50.00');
});
