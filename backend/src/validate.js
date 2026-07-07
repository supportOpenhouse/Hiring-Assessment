// Input validation for everything that reaches Postgres. Coercers return the
// cleaned value or throw ValidationError (mapped to HTTP 400 in app.js) —
// without this, a stray string in a numeric field surfaces as a 500 with a
// raw Postgres message.

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

const MAX_NUMERIC = 1e12; // sanity ceiling for prices/areas (₹1 lakh crore)

// Positive integer id (route params, ref_id).
function id(value, label = 'id') {
  const s = String(value ?? '').trim();
  if (!/^\d{1,18}$/.test(s)) throw new ValidationError(`Invalid ${label}`);
  return s;
}

// Numeric field: accepts numbers or numeric strings, tolerates ₹ and
// thousands separators. Empty → null.
function numeric(value, label = 'value') {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).replace(/[₹,\s]/g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) throw new ValidationError(`${label} must be a number`);
  if (n < 0) throw new ValidationError(`${label} cannot be negative`);
  if (n > MAX_NUMERIC) throw new ValidationError(`${label} is too large`);
  return n;
}

// Free text: trimmed, null-byte stripped, length capped. Empty → null.
function text(value, label = 'field', max = 500) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') throw new ValidationError(`${label} must be text`);
  const s = String(value).replace(/\0/g, '').trim();
  if (!s) return null;
  if (s.length > max) throw new ValidationError(`${label} is too long (max ${max} characters)`);
  return s;
}

// Calendar date as YYYY-MM-DD. Empty → null.
function date(value, label = 'date') {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
    throw new ValidationError(`${label} must be a date (YYYY-MM-DD)`);
  }
  return s;
}

// One of a fixed set. Empty → null.
function oneOf(values, value, label = 'field') {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (!values.includes(s)) throw new ValidationError(`${label} must be one of: ${values.join(', ')}`);
  return s;
}

// Apply a column spec ({ col: coercer }) to a request body, returning only
// the cleaned, known columns.
function cleanBody(spec, body) {
  if (body !== undefined && (typeof body !== 'object' || Array.isArray(body) || body === null)) {
    throw new ValidationError('Request body must be an object');
  }
  const out = {};
  for (const [col, coerce] of Object.entries(spec)) {
    if (body && col in body) out[col] = coerce(body[col]);
  }
  return out;
}

module.exports = { ValidationError, id, numeric, text, date, oneOf, cleanBody };
