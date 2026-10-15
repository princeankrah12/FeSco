import { ALLOWED_PHRASES, BANNED_FORMS } from './terms.mjs';

/**
 * Marker that suppresses violations on its own line and the following line.
 * A justification is mandatory so every exception is self-documenting for
 * auditors, e.g. `// lexicon-allow: third-party SDK option name`.
 */
export const SUPPRESSION_MARKER = 'lexicon-allow:';
const MIN_JUSTIFICATION_LENGTH = 10;

/**
 * Splits text into word tokens, breaking on camelCase, PascalCase,
 * snake_case, kebab-case, SCREAMING_CASE, and any non-letter character.
 * `fareAmount` -> fare, Amount; `IS_DRIVER` -> IS, DRIVER; `HTTPDriver` -> HTTP, Driver.
 *
 * @param {string} text
 * @returns {{ word: string, index: number }[]}
 */
export function tokenize(text) {
  const tokens = [];
  const pattern = /[A-Z]+(?![a-z])|[A-Z]?[a-z]+/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    tokens.push({ word: match[0].toLowerCase(), index: match.index });
  }
  return tokens;
}

/**
 * @param {{ word: string }[]} tokens
 * @param {number} position index of the banned token
 */
function isInsideAllowedPhrase(tokens, position) {
  const target = tokens[position].word;
  return ALLOWED_PHRASES.some((phrase) =>
    phrase.some((phraseWord, offset) => {
      if (phraseWord !== target) return false;
      const start = position - offset;
      if (start < 0 || start + phrase.length > tokens.length) return false;
      return phrase.every((word, i) => tokens[start + i].word === word);
    }),
  );
}

/**
 * @typedef {object} Violation
 * @property {number} line 1-based
 * @property {number} column 1-based
 * @property {string} match the exact text that matched
 * @property {string} approved the approved replacement term
 * @property {string} rationale why the term is banned
 * @property {'banned-term' | 'unjustified-suppression'} kind
 */

/**
 * Finds every lexicon violation in a block of text.
 *
 * @param {string} text
 * @returns {{ violations: Violation[], suppressions: number }}
 */
export function findViolations(text) {
  const lines = text.split(/\r?\n/);
  /** @type {Violation[]} */
  const violations = [];
  let suppressions = 0;
  let suppressNextLine = false;

  lines.forEach((lineText, lineIndex) => {
    const markerAt = lineText.indexOf(SUPPRESSION_MARKER);
    const suppressedByPrevious = suppressNextLine;
    suppressNextLine = false;

    if (markerAt !== -1) {
      const justification = lineText
        .slice(markerAt + SUPPRESSION_MARKER.length)
        .replace(/\*\/|-->|\}/g, '')
        .trim();
      if (justification.length < MIN_JUSTIFICATION_LENGTH) {
        violations.push({
          line: lineIndex + 1,
          column: markerAt + 1,
          match: SUPPRESSION_MARKER,
          approved: `${SUPPRESSION_MARKER} <justification of at least ${MIN_JUSTIFICATION_LENGTH} characters>`,
          rationale: 'Every lexicon exception must state why it is unavoidable.',
          kind: 'unjustified-suppression',
        });
      } else {
        suppressions += 1;
        suppressNextLine = true;
        return; // the marker line itself is exempt
      }
    }

    if (suppressedByPrevious) return;

    const tokens = tokenize(lineText);
    tokens.forEach((token, position) => {
      const rule = BANNED_FORMS.get(token.word);
      if (!rule || isInsideAllowedPhrase(tokens, position)) return;
      violations.push({
        line: lineIndex + 1,
        column: token.index + 1,
        match: lineText.slice(token.index, token.index + token.word.length),
        approved: rule.approved,
        rationale: rule.rationale,
        kind: 'banned-term',
      });
    });
  });

  return { violations, suppressions };
}
