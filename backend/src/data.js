const { one, many, query } = require('./db');
const v = require('./validate');

const ASSIGNMENT_TYPES = ['bd', 'market'];

const NOTES_MAX = 5000;

// Whitelist of child tables + their insertable columns (with coercers), per
// assignment type. The generic row endpoints only accept tables/columns listed
// here, and every value is validated before it reaches Postgres.
const TABLES = {
  market_configs: {
    type: 'market',
    cols: {
      config: (x) => v.text(x, 'config'),
      super_area: (x) => v.numeric(x, 'super area'),
      carpet_area: (x) => v.numeric(x, 'carpet area'),
      towers: (x) => v.text(x, 'towers'),
      units: (x) => v.numeric(x, 'units'),
      source: (x) => v.text(x, 'source'),
      notes: (x) => v.text(x, 'notes', NOTES_MAX),
    },
  },
  market_plans: {
    type: 'market',
    cols: {
      config: (x) => v.text(x, 'config'),
      source: (x) => v.text(x, 'source'),
      layout: (x) => v.text(x, 'layout', NOTES_MAX),
      link: (x) => v.text(x, 'link', 2000),
    },
  },
  market_prices: {
    type: 'market',
    cols: {
      broker: (x) => v.text(x, 'broker'),
      phone: (x) => v.text(x, 'phone', 30),
      config: (x) => v.text(x, 'config'),
      price: (x) => v.numeric(x, 'price'),
      call_date: (x) => v.date(x, 'call date'),
      notes: (x) => v.text(x, 'notes', NOTES_MAX),
    },
  },
  market_negotiations: {
    type: 'market',
    cols: {
      broker: (x) => v.text(x, 'broker'),
      phone: (x) => v.text(x, 'phone', 30),
      config: (x) => v.text(x, 'config'),
      floor: (x) => v.text(x, 'floor', 50),
      facing: (x) => v.oneOf(['park', 'nonpark'], x, 'facing'),
      call_type: (x) => v.oneOf(['compromise', 'urgency'], x, 'call type'),
      budget: (x) => v.numeric(x, 'budget'),
      offer: (x) => v.numeric(x, 'offer'),
      can_close: (x) => v.oneOf(['yes', 'no', 'unclear'], x, 'can close'),
      notes: (x) => v.text(x, 'notes', NOTES_MAX),
    },
  },
  bd_calls: {
    type: 'bd',
    cols: {
      config: (x) => v.text(x, 'config'),
      size: (x) => v.numeric(x, 'size'),
      asking_price: (x) => v.numeric(x, 'asking price'),
      outcome_price: (x) => v.numeric(x, 'outcome price'),
      outcome: (x) => v.text(x, 'outcome'),
      notes: (x) => v.text(x, 'notes', NOTES_MAX),
    },
  },
};

const SUBMISSION_FIELDS = {
  society: (x) => v.text(x, 'society'),
  config: (x) => v.text(x, 'config'),
  market_price: (x) => v.numeric(x, 'market price'),
  comparables: (x) => v.text(x, 'comparables', NOTES_MAX),
};

const CHILDREN_BY_TYPE = {
  market: ['market_configs', 'market_plans', 'market_prices', 'market_negotiations'],
  bd: ['bd_calls'],
};

async function getOrCreateSubmission(userId, type) {
  // `on conflict do nothing` + re-select: two concurrent first requests would
  // otherwise race the unique (user_id, assignment_type) constraint.
  const inserted = await one(
    `insert into submissions (user_id, assignment_type) values ($1, $2)
     on conflict (user_id, assignment_type) do nothing
     returning *`,
    [userId, type]
  );
  if (inserted) return inserted;
  return one(
    `select * from submissions where user_id = $1 and assignment_type = $2`,
    [userId, type]
  );
}

// Assemble the full bundle: submission + all child rows + recordings + score.
async function getBundle(submissionId, type) {
  const submission = await one(`select * from submissions where id = $1`, [submissionId]);
  if (!submission) return null;
  const bundle = { submission, rows: {}, recordings: [], score: null };
  for (const table of CHILDREN_BY_TYPE[type]) {
    bundle.rows[table] = await many(
      `select * from ${table} where submission_id = $1 order by created_at desc`,
      [submissionId]
    );
  }
  bundle.recordings = await many(
    `select * from recordings where submission_id = $1 order by created_at desc`,
    [submissionId]
  );
  bundle.score = await one(`select * from scores where submission_id = $1`, [submissionId]);
  return bundle;
}

async function updateSubmissionFields(submissionId, fields) {
  const clean = v.cleanBody(SUBMISSION_FIELDS, fields);
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, val] of Object.entries(clean)) {
    sets.push(`${key} = $${i++}`);
    vals.push(val);
  }
  if (!sets.length) return one(`select * from submissions where id = $1`, [submissionId]);
  sets.push(`updated_at = now()`);
  vals.push(submissionId);
  return one(
    `update submissions set ${sets.join(', ')} where id = $${i} returning *`,
    vals
  );
}

async function insertRow(submissionId, table, body) {
  const def = TABLES[table];
  if (!def) throw new v.ValidationError('Unknown table');
  const clean = v.cleanBody(def.cols, body);
  const cols = ['submission_id'];
  const placeholders = ['$1'];
  const vals = [submissionId];
  let i = 2;
  for (const [col, val] of Object.entries(clean)) {
    cols.push(col);
    placeholders.push(`$${i++}`);
    vals.push(val);
  }
  return one(
    `insert into ${table} (${cols.join(',')}) values (${placeholders.join(',')}) returning *`,
    vals
  );
}

async function deleteRow(submissionId, table, id) {
  if (!TABLES[table]) throw new v.ValidationError('Unknown table');
  await query(`delete from ${table} where id = $1 and submission_id = $2`, [
    v.id(id, 'row id'), submissionId,
  ]);
}

module.exports = {
  ASSIGNMENT_TYPES,
  TABLES,
  CHILDREN_BY_TYPE,
  getOrCreateSubmission,
  getBundle,
  updateSubmissionFields,
  insertRow,
  deleteRow,
};
