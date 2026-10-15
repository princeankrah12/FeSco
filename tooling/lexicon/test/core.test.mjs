import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findViolations, tokenize } from '../src/core.mjs';

const terms = (text) => findViolations(text).violations.map((v) => v.match.toLowerCase());

test('tokenize splits camel, pascal, snake, and screaming case', () => {
  assert.deepEqual(
    tokenize('fareAmount is_driver HTTPDriver RIDE_ID').map((t) => t.word),
    ['fare', 'amount', 'is', 'driver', 'http', 'driver', 'ride', 'id'],
  );
});

test('flags banned terms in identifiers, SQL, routes, and UI copy', () => {
  assert.deepEqual(terms('const fareAmount = 1;'), ['fare']);
  assert.deepEqual(terms('ALTER TABLE users ADD is_driver boolean;'), ['driver']);
  assert.deepEqual(terms("@Get('/trips/:id')"), ['trips']);
  assert.deepEqual(terms('<Text>Book your ride</Text>'), ['book', 'ride']);
  assert.deepEqual(terms('Host earnings this week'), ['earnings']);
  assert.deepEqual(terms('chauffeured week for member'), ['chauffeured']);
});

test('reports 1-based line and column', () => {
  const [v] = findViolations('ok line\n  const passenger = 1;').violations;
  assert.equal(v.line, 2);
  assert.equal(v.column, 9);
  assert.equal(v.approved, 'Co-Commuter');
});

test('does not flag words that merely contain a banned substring', () => {
  assert.deepEqual(terms('override notebook stripe Facebook tooltip cabinet'), []);
});

test('allows technical and idiomatic phrases', () => {
  assert.deepEqual(terms('SELECT * FROM commutes ORDER BY scheduled_departure'), []);
  assert.deepEqual(terms('db.select().from(commutes).orderBy(desc(x))'), []);
  assert.deepEqual(terms('Retry in order to recover.'), []);
  assert.deepEqual(terms('A not-for-profit cost-sharing utility.'), []);
  // ...but the bare forms are still caught
  assert.deepEqual(terms('createOrder()'), ['order']);
  assert.deepEqual(terms('Host profit report'), ['profit']);
});

test('justified suppression exempts its own line and the next line only', () => {
  const src = [
    '// lexicon-allow: third-party SDK option name we cannot rename',
    'sdk.configure({ driver: true });',
    'const trip = 1;',
  ].join('\n');
  const result = findViolations(src);
  assert.equal(result.suppressions, 1);
  assert.deepEqual(result.violations.map((v) => v.match), ['trip']);
});

test('suppression without a justification is itself a violation', () => {
  const result = findViolations('// lexicon-allow:\nconst driver = 1;');
  assert.deepEqual(
    result.violations.map((v) => v.kind),
    ['unjustified-suppression', 'banned-term'],
  );
});
