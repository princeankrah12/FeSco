import { findViolations } from './core.mjs';

/**
 * ESLint integration for in-editor feedback. The CI scanner
 * (`npm run lint:lexicon`) is the authoritative gate: `eslint-disable`
 * comments silence this rule in the editor but do NOT bypass CI.
 * Use `// lexicon-allow: <justification>` for genuine exceptions.
 */

/** @type {import('eslint').Rule.RuleModule} */
const noBannedTerms = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow commercial-transport terminology (FeSCo Lexicon).' },
    messages: {
      banned: '"{{match}}" is banned by the FeSCo Lexicon. Use "{{approved}}". {{rationale}}',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const fullText = sourceCode.getText();
    // Run once over the whole file so `lexicon-allow:` behaves exactly as in CI.
    const { violations } = findViolations(fullText);

    return {
      Program() {
        for (const v of violations) {
          context.report({
            loc: {
              start: { line: v.line, column: v.column - 1 },
              end: { line: v.line, column: v.column - 1 + v.match.length },
            },
            messageId: 'banned',
            data: { match: v.match, approved: v.approved, rationale: v.rationale },
          });
        }
      },
    };
  },
};

export default {
  meta: { name: '@fesco/lexicon' },
  rules: { 'no-banned-terms': noBannedTerms },
};
