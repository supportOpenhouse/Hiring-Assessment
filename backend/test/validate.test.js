const { test } = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/validate');

test('id accepts positive integers, rejects junk', () => {
  assert.equal(v.id('42'), '42');
  assert.equal(v.id(7), '7');
  assert.throws(() => v.id('1; drop table users'), /Invalid id/);
  assert.throws(() => v.id('-5'), /Invalid id/);
  assert.throws(() => v.id('abc'), /Invalid id/);
  assert.throws(() => v.id(''), /Invalid id/);
});

test('numeric strips currency formatting and empties to null', () => {
  assert.equal(v.numeric('₹1,25,000'), 125000);
  assert.equal(v.numeric('  850 '), 850);
  assert.equal(v.numeric(1200), 1200);
  assert.equal(v.numeric(''), null);
  assert.equal(v.numeric(null), null);
  assert.equal(v.numeric(undefined), null);
});

test('numeric rejects non-numbers, negatives, and absurd magnitudes', () => {
  assert.throws(() => v.numeric('abc', 'price'), /price must be a number/);
  assert.throws(() => v.numeric('-10', 'price'), /price cannot be negative/);
  assert.throws(() => v.numeric('1e15', 'price'), /price is too large/);
});

test('text trims, strips null bytes, enforces max length', () => {
  assert.equal(v.text('  hi  '), 'hi');
  assert.equal(v.text('a\0b'), 'ab');
  assert.equal(v.text(''), null);
  assert.equal(v.text(null), null);
  assert.throws(() => v.text('x'.repeat(600), 'notes', 500), /notes is too long/);
  assert.throws(() => v.text({ a: 1 }, 'notes'), /notes must be text/);
});

test('date requires ISO calendar dates', () => {
  assert.equal(v.date('2026-07-07'), '2026-07-07');
  assert.equal(v.date(''), null);
  assert.throws(() => v.date('07/07/2026'), /must be a date/);
  assert.throws(() => v.date('2026-13-99'), /must be a date/);
});

test('oneOf enforces the allowed set', () => {
  assert.equal(v.oneOf(['park', 'nonpark'], 'park'), 'park');
  assert.equal(v.oneOf(['park', 'nonpark'], ''), null);
  assert.throws(() => v.oneOf(['park', 'nonpark'], 'ocean', 'facing'), /facing must be one of/);
});

test('cleanBody keeps only known columns and validates each', () => {
  const spec = {
    price: (x) => v.numeric(x, 'price'),
    notes: (x) => v.text(x, 'notes'),
  };
  const out = v.cleanBody(spec, { price: '₹5,000', notes: ' hi ', evil: 'DROP' });
  assert.deepEqual(out, { price: 5000, notes: 'hi' });
  assert.equal('evil' in out, false);
  assert.throws(() => v.cleanBody(spec, []), /must be an object/);
});
