/**
 * FeSCo Vehicle Safety & Compliance Domain Logic
 *
 * Enforces:
 * 1. ISO 3779 VIN specification: 17 characters, strictly excludes I, O, Q.
 * 2. 15-Year statutory ceiling: (current_year - manufacture_year) <= 15.
 * 3. 4-4-4-5 VIN mask formatting.
 */

export const ISO_3779_VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

// Transliteration values for ISO 3779 check digit calculation
const VIN_LETTER_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
  '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

// Position weights for positions 1 to 17 (1-indexed)
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Sanitizes raw user/OCR input:
 * - Strips whitespace, hyphens, and non-alphanumeric symbols
 * - Converts to uppercase
 * - Auto-corrects common OCR confusions: I -> 1, O -> 0, Q -> 0
 */
export function sanitizeChassisVin(rawInput: string): string {
  if (!rawInput) return '';
  return rawInput
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, '')
    .replace(/I/g, '1')
    .replace(/O/g, '0')
    .replace(/Q/g, '0');
}

/**
 * Formats a clean 17-character VIN into a human-readable 4-4-4-5 spaced string:
 * "XXXX - XXXX - XXXX - XXXXX"
 */
export function formatChassisVin(sanitizedVin: string): string {
  const clean = sanitizeChassisVin(sanitizedVin).slice(0, 17);
  const parts: string[] = [];

  if (clean.length > 0) parts.push(clean.slice(0, 4));
  if (clean.length > 4) parts.push(clean.slice(4, 8));
  if (clean.length > 8) parts.push(clean.slice(8, 12));
  if (clean.length > 12) parts.push(clean.slice(12, 17));

  return parts.join(' - ');
}

/**
 * Validates whether a chassis number complies strictly with ISO 3779.
 */
export function validateChassisVin(rawInput: string): {
  isValid: boolean;
  sanitizedVin: string;
  formattedVin: string;
  error?: string;
} {
  const sanitized = sanitizeChassisVin(rawInput);
  const formatted = formatChassisVin(sanitized);

  if (sanitized.length !== 17) {
    return {
      isValid: false,
      sanitizedVin: sanitized,
      formattedVin: formatted,
      error: `Chassis number must be exactly 17 characters (currently ${sanitized.length}).`,
    };
  }

  if (!ISO_3779_VIN_REGEX.test(sanitized)) {
    return {
      isValid: false,
      sanitizedVin: sanitized,
      formattedVin: formatted,
      error: 'Chassis number contains illegal characters under ISO 3779 (I, O, and Q are prohibited).',
    };
  }

  return {
    isValid: true,
    sanitizedVin: sanitized,
    formattedVin: formatted,
  };
}

/**
 * Calculates and verifies the ISO 3779 Modulo-11 check digit (position 9).
 */
export function verifyIso3779CheckDigit(sanitizedVin: string): boolean {
  if (sanitizedVin.length !== 17 || !ISO_3779_VIN_REGEX.test(sanitizedVin)) {
    return false;
  }

  let weightedSum = 0;
  for (let i = 0; i < 17; i++) {
    const char = sanitizedVin[i]!;
    const val = VIN_LETTER_VALUES[char] ?? 0;
    const weight = VIN_WEIGHTS[i] ?? 0;
    weightedSum += val * weight;
  }

  const remainder = weightedSum % 11;
  const expectedCheckChar = remainder === 10 ? 'X' : remainder.toString();
  const actualCheckChar = sanitizedVin[8]!;

  return actualCheckChar === expectedCheckChar;
}

export const MAXIMUM_VEHICLE_AGE_YEARS = 15;

export interface VehicleAgeValidationResult {
  isEligible: boolean;
  vehicleAgeYears: number;
  manufactureYear: number;
  evaluationYear: number;
  message: string;
}

/**
 * Validates the vehicle age against the 15-year statutory ceiling.
 * Rule: (current_year - manufacture_year) <= 15
 * In 2026: 2011 passes (15 yrs), 2010 fails (16 yrs).
 */
export function validateVehicleAge(
  manufactureYear: number,
  evaluationYear = new Date().getFullYear(),
): VehicleAgeValidationResult {
  if (!Number.isInteger(manufactureYear) || manufactureYear < 1900 || manufactureYear > evaluationYear + 1) {
    return {
      isEligible: false,
      vehicleAgeYears: -1,
      manufactureYear,
      evaluationYear,
      message: `Invalid manufacture year: ${manufactureYear}`,
    };
  }

  const vehicleAgeYears = evaluationYear - manufactureYear;
  const isEligible = vehicleAgeYears <= MAXIMUM_VEHICLE_AGE_YEARS;

  const message = isEligible
    ? `Vehicle age (${vehicleAgeYears} years) complies with the FeSCo <= 15-year safety ceiling.`
    : `Vehicle age (${vehicleAgeYears} years) exceeds the 15-year maximum limit for Host vehicles.`;

  return {
    isEligible,
    vehicleAgeYears,
    manufactureYear,
    evaluationYear,
    message,
  };
}
