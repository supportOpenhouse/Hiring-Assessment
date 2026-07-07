const { one, many, query } = require('./db');

const ASSIGNMENT_TYPES = ['bd', 'market'];

// Whitelist of child tables + their insertable columns, per assignment type.
// The generic row endpoints only accept tables/columns listed here.
const TABLES = {
  market_configs: {
    type: 'market',
    cols: ['config', 'super_area', 'carpet_area', 'towers', 'units', 'source', 'notes'],
  },
  market_plans: {
    type: 'market',
    cols: ['config', 'source', 'layout', 'link'],
  },
  market_prices: {
    type: 'market',
    cols: ['broker', 'phone', 'config', 'price', 'call_date', 'notes'],
  },
  market_negotiations: {
    type: 'market',
    cols: ['broker', 'phone', 'config', 'floor', 'facing', 'call_type', 'budget', 'offer', 'can_close', 'notes'],
  },
  bd_calls: {
    type: 'bd',
    cols: ['config', 'size', 'asking_price', 'outcome_price', 'outcome', 'notes'],
  },
};

const CHILDREN_BY_TYPE = {
  market: ['market_configs', 'market_plans', 'market_prices', 'market_negotiations'],
  bd: ['bd_calls'],
};

async function getOrCreateSubmission(userId, type) {
  let sub = await one(
    `select * from submissions where user_id = $1 and assignment_type = $2`,
    [userId, type]
  );
  if (!sub) {
    sub = await one(
      `insert into submissions (user_id, assignment_type) values ($1, $2) returning *`,
      [userId, type]
    );
  }
  return sub;
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
  const allowed = ['society', 'config', 'market_price', 'comparables'];
  const sets = [];
  const vals = [];
  let i = 1;
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${i++}`);
      vals.push(fields[key] === '' ? null : fields[key]);
    }
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
  if (!def) throw new Error('Unknown table');
  const cols = ['submission_id'];
  const placeholders = ['$1'];
  const vals = [submissionId];
  let i = 2;
  for (const c of def.cols) {
    if (c in body) {
      cols.push(c);
      placeholders.push(`$${i++}`);
      const v = body[c];
      vals.push(v === '' || v === undefined ? null : v);
    }
  }
  return one(
    `insert into ${table} (${cols.join(',')}) values (${placeholders.join(',')}) returning *`,
    vals
  );
}

async function deleteRow(submissionId, table, id) {
  if (!TABLES[table]) throw new Error('Unknown table');
  await query(`delete from ${table} where id = $1 and submission_id = $2`, [id, submissionId]);
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
