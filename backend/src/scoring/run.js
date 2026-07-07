const { one, many, query } = require('../db');
const { getBundle } = require('../data');
const { transcribeFromUrl } = require('./transcribe');
const { scoreSubmission } = require('./score');

// Transcribe any un-transcribed recordings for a submission.
async function transcribePending(submissionId) {
  const pending = await many(
    `select * from recordings where submission_id = $1 and status in ('uploaded','error') and transcript is null`,
    [submissionId]
  );
  for (const rec of pending) {
    try {
      await query(`update recordings set status = 'transcribing' where id = $1`, [rec.id]);
      const { text, language, duration } = await transcribeFromUrl(rec.blob_url, rec.filename || 'call.m4a');
      await query(
        `update recordings set transcript = $1, transcript_lang = $2, duration_sec = $3, status = 'transcribed', error = null where id = $4`,
        [text, language, duration, rec.id]
      );
    } catch (e) {
      await query(`update recordings set status = 'error', error = $1 where id = $2`, [String(e.message).slice(0, 500), rec.id]);
    }
  }
}

// Process one submission end-to-end.
async function processSubmission(sub) {
  await query(`update submissions set status = 'scoring', updated_at = now() where id = $1`, [sub.id]);
  try {
    await transcribePending(sub.id);
    const bundle = await getBundle(sub.id, sub.assignment_type);
    const result = await scoreSubmission(sub.assignment_type, bundle);
    await query(
      `insert into scores (submission_id, overall, recommendation, breakdown, strengths, red_flags, summary, rubric_version, model)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (submission_id) do update set
         overall = excluded.overall, recommendation = excluded.recommendation,
         breakdown = excluded.breakdown, strengths = excluded.strengths,
         red_flags = excluded.red_flags, summary = excluded.summary,
         rubric_version = excluded.rubric_version, model = excluded.model,
         created_at = now()`,
      [
        sub.id, result.overall, result.recommendation,
        JSON.stringify(result.breakdown), JSON.stringify(result.strengths),
        JSON.stringify(result.red_flags), result.summary,
        result.rubric_version, result.model,
      ]
    );
    await query(`update submissions set status = 'scored', updated_at = now() where id = $1`, [sub.id]);
    return { id: sub.id, ok: true, overall: result.overall };
  } catch (e) {
    await query(`update submissions set status = 'error', updated_at = now() where id = $1`, [sub.id]);
    return { id: sub.id, ok: false, error: String(e.message) };
  }
}

// Pick up all submissions waiting to be scored. Called by cron and the manual script.
async function runScorer(limit = 5) {
  const pending = await many(
    `select * from submissions where status in ('submitted','scoring') order by submitted_at asc nulls last limit $1`,
    [limit]
  );
  const results = [];
  for (const sub of pending) {
    results.push(await processSubmission(sub));
  }
  return results;
}

module.exports = { runScorer, processSubmission, transcribePending };
