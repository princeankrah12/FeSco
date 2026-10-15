/**
 * Ghana Card (NIA) Number Validation & Sanitization
 *
 * Official National Identification Authority format:
 * "GHA-XXXXXXXXX-X" (15 characters: "GHA-" prefix + 9 digits + "-" + 1 alphanumeric check character)
 * Example: GHA-712345678-9
 */

const GHANA_CARD_REGEX = /^GHA-[0-9]{9}-[0-9A-Z]$/i;

export interface GhanaCardValidationResult {
  isValid: boolean;
  formattedPin: string;
  errorMessage?: string;
}

export function sanitizeGhanaCardPin(rawPin: string): string {
  // Remove accidental spaces, dashes, or non-alphanumeric chars (except prefix)
  const cleaned = rawPin.trim().toUpperCase().replace(/[\s_]/g, '');

  // If user entered without dashes e.g. "GHA7123456789"
  if (/^GHA[0-9]{9}[0-9A-Z]$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 12)}-${cleaned.slice(12)}`;
  }

  // If user entered just numbers and check char e.g. "7123456789"
  if (/^[0-9]{9}[0-9A-Z]$/.test(cleaned)) {
    return `GHA-${cleaned.slice(0, 9)}-${cleaned.slice(9)}`;
  }

  return cleaned;
}

export function validateGhanaCardPin(rawPin: string): GhanaCardValidationResult {
  const formattedPin = sanitizeGhanaCardPin(rawPin);

  if (!formattedPin) {
    return {
      isValid: false,
      formattedPin: '',
      errorMessage: 'Ghana Card PIN is required.',
    };
  }

  if (!GHANA_CARD_REGEX.test(formattedPin)) {
    return {
      isValid: false,
      formattedPin,
      errorMessage: 'Invalid Ghana Card format. Expected format: GHA-XXXXXXXXX-X (e.g. GHA-712345678-9).',
    };
  }

  return {
    isValid: true,
    formattedPin,
  };
}
