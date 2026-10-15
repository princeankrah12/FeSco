/**
 * Corporate Email & Domain Gatekeeper
 *
 * Enforces corporate domain verification for FeSCo onboarding:
 * 1. Rejects public/personal email providers (gmail, yahoo, etc.)
 * 2. Checks against admin-curated allowlist of verified corporate employers in Accra
 * 3. Provides clean error feedback & addition request intent
 */

export const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'mail.com',
  'proton.me',
  'protonmail.com',
  'yandex.com',
  'zoho.com',
]);

export interface CorporateEmployer {
  domain: string;
  companyName: string;
  category: 'Banking' | 'Telecom' | 'Energy' | 'Professional Services' | 'Corporate';
  primaryHub: string; // e.g. 'Airport City', 'Osu', 'Ridge', 'West Hills'
}

export const SEEDED_CORPORATE_ALLOWLIST: CorporateEmployer[] = [
  { domain: 'gcbbank.com.gh', companyName: 'GCB Bank PLC', category: 'Banking', primaryHub: 'High Street / Ministries' },
  { domain: 'stanbic.com.gh', companyName: 'Stanbic Bank Ghana', category: 'Banking', primaryHub: 'Airport City' },
  { domain: 'mtn.com.gh', companyName: 'MTN Ghana', category: 'Telecom', primaryHub: 'Ridge' },
  { domain: 'telecel.com.gh', companyName: 'Telecel Ghana', category: 'Telecom', primaryHub: 'Airport City' },
  { domain: 'fidelitybank.com.gh', companyName: 'Fidelity Bank Ghana', category: 'Banking', primaryHub: 'Ridge' },
  { domain: 'calbank.net', companyName: 'CalBank PLC', category: 'Banking', primaryHub: 'Ridge' },
  { domain: 'ecobank.com', companyName: 'Ecobank Ghana', category: 'Banking', primaryHub: 'Ridge' },
  { domain: 'standardchartered.com', companyName: 'Standard Chartered Bank', category: 'Banking', primaryHub: 'High Street' },
  { domain: 'absa.africa', companyName: 'Absa Bank Ghana', category: 'Banking', primaryHub: 'High Street / Airport City' },
  { domain: 'zenithbank.com.gh', companyName: 'Zenith Bank Ghana', category: 'Banking', primaryHub: 'Ridge' },
  { domain: 'accessbankplc.com', companyName: 'Access Bank Ghana', category: 'Banking', primaryHub: 'Osu' },
  { domain: 'tullowoil.com', companyName: 'Tullow Oil Ghana', category: 'Energy', primaryHub: 'Airport City' },
  { domain: 'pwc.com', companyName: 'PwC Ghana', category: 'Professional Services', primaryHub: 'Airport City' },
  { domain: 'kpmg.com', companyName: 'KPMG Ghana', category: 'Professional Services', primaryHub: 'Airport City' },
  { domain: 'deloitte.com', companyName: 'Deloitte Ghana', category: 'Professional Services', primaryHub: 'Airport City' },
  { domain: 'ey.com', companyName: 'EY Ghana', category: 'Professional Services', primaryHub: 'Airport City' },
];

export interface EmailValidationResult {
  isValid: boolean;
  normalizedEmail: string;
  domain: string;
  isCorporate: boolean;
  isAllowlisted: boolean;
  employer?: CorporateEmployer;
  errorMessage?: string;
  canRequestAddition?: boolean;
}

export function validateCorporateEmail(
  rawEmail: string,
  allowlist: CorporateEmployer[] = SEEDED_CORPORATE_ALLOWLIST,
): EmailValidationResult {
  const normalized = rawEmail.trim().toLowerCase();
  const parts = normalized.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      isValid: false,
      normalizedEmail: normalized,
      domain: '',
      isCorporate: false,
      isAllowlisted: false,
      errorMessage: 'Please enter a valid email address.',
    };
  }

  const [, domain] = parts;

  if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      normalizedEmail: normalized,
      domain,
      isCorporate: false,
      isAllowlisted: false,
      errorMessage: 'Personal email providers are not permitted. Please use your official corporate work email.',
      canRequestAddition: false,
    };
  }

  const employer = allowlist.find((e) => e.domain.toLowerCase() === domain);

  if (!employer) {
    return {
      isValid: false,
      normalizedEmail: normalized,
      domain,
      isCorporate: true,
      isAllowlisted: false,
      errorMessage: `The domain "@${domain}" is not yet on the verified corporate list. You can request company verification below.`,
      canRequestAddition: true,
    };
  }

  return {
    isValid: true,
    normalizedEmail: normalized,
    domain,
    isCorporate: true,
    isAllowlisted: true,
    employer,
  };
}
