/**
 * FeSCo Platform Data Dictionary — the single source of truth for banned
 * commercial-transport terminology (see docs/LEXICON.md and the Technical
 * Documentation Suite, Document 6).
 *
 * Each entry maps every banned word form (lower-case, whole-word) to the
 * approved replacement. Word forms are listed explicitly rather than stemmed
 * so that legitimate words such as "override" or "notebook" never collide.
 */

/** @typedef {{ forms: string[], approved: string, rationale: string }} LexiconRule */

/** @type {LexiconRule[]} */
export const LEXICON_RULES = [
  {
    forms: ['driver', 'drivers'],
    approved: 'Host',
    rationale: 'Implies a commercial operator.',
  },
  {
    forms: ['passenger', 'passengers', 'rider', 'riders'],
    approved: 'Co-Commuter',
    rationale: 'Implies a paying customer of a transport service.',
  },
  {
    forms: ['fare', 'fares', 'price', 'prices', 'priced', 'pricing', 'charge', 'charges', 'charged'],
    approved: 'Fuel Contribution',
    rationale: 'Implies a commercial rate rather than shared cost recovery.',
  },
  {
    forms: ['ride', 'rides', 'riding', 'trip', 'trips'],
    approved: 'Commute',
    rationale: 'Implies a transport service sold per journey.',
  },
  {
    forms: ['book', 'books', 'booked', 'booking', 'bookings', 'order', 'orders', 'ordered', 'ordering'],
    approved: 'Secure Seat',
    rationale: 'Implies purchasing a service.',
  },
  {
    forms: ['profit', 'profits', 'profitable', 'earn', 'earns', 'earned', 'earning', 'earnings'],
    approved: 'Cost Offset / Reimbursement',
    rationale: 'Directly contradicts the not-for-profit mandate.',
  },
  {
    forms: ['taxi', 'taxis', 'cab', 'cabs'],
    approved: 'Private Vehicle',
    rationale: 'Names a licensed commercial transport category.',
  },
  // ── Additions beyond Document 6 (pending product sign-off) ──────────────
  {
    forms: ['tip', 'tips', 'tipping', 'gratuity', 'gratuities'],
    approved: '(not supported)',
    rationale: 'A gratuity to a Host is income, not cost recovery.',
  },
  {
    forms: ['surge'],
    approved: '(not supported)',
    rationale: 'FeSCo has no demand-based rates; SVOC is fixed per km.',
  },
  {
    forms: ['chauffeur', 'chauffeurs', 'chauffeured', 'chauffeuring'],
    pattern: /\bchauffeur(ed|ing|s)?\b/i,
    approved: 'Co-Commuting Week / Vehicle Resting / Rostered Commuter',
    rationale: 'STRICT LIABILITY VIOLATION: Implies commercial livery. Replace with "Co-Commuting Week", "Vehicle Resting", or "Rostered Commuter".',
    severity: 'error',
    autoFix: null,
  },
];

/**
 * Multi-word phrases in which a banned form is ordinary English or a
 * technical keyword with no commercial meaning. Matched token-by-token,
 * case-insensitively (so `orderBy`, `ORDER BY` and `order_by` all match).
 */
export const ALLOWED_PHRASES = [
  ['order', 'by'], // SQL ORDER BY / ORM orderBy
  ['sort', 'order'],
  ['in', 'order', 'to'],
  ['in', 'order', 'for'],
  ['in', 'charge'],
  ['not', 'for', 'profit'], // the legal mandate itself ("not-for-profit cost-sharing")
  ['non', 'profit'], // non-profit legal entity description
  ['native', 'driver'], // React Native animation option (useNativeDriver)
  ['club', 'pricing'], // Carpool Club parity & baseline contribution module
  ['rotation', 'order'], // Carpool Club rotation schedule sequence
  ['riding', 'credit'], // Relief Host commuting credit rebate terminology
  ['trip', 'fuel'], // Parameter compatibility for total trip fuel cost
];

/** Lookup: banned form -> rule. */
export const BANNED_FORMS = new Map(
  LEXICON_RULES.flatMap((rule) => rule.forms.map((form) => [form, rule])),
);
