const Anthropic = require('@anthropic-ai/sdk');
const { rubricFor } = require('./rubric');

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const INR = (n) =>
  n === null || n === undefined || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN');

// Turn the raw submission bundle into a compact, readable brief for the model.
function bundleToText(type, bundle) {
  const s = bundle.submission;
  const lines = [];
  lines.push(`Society: ${s.society || '(not stated)'}`);
  if (type === 'bd') {
    lines.push(`Chosen configuration: ${s.config || '(not stated)'}`);
    lines.push(`Candidate's established market price: ${INR(s.market_price)}`);
    lines.push(`How they established it (comparables): ${s.comparables || '(not stated)'}`);
    lines.push('');
    const calls = bundle.rows.bd_calls || [];
    lines.push(`OWNER CALLS LOGGED: ${calls.length}`);
    calls.forEach((c, i) => {
      lines.push(`  Call ${i + 1}: ${c.config || '?'} / ${c.size || '?'} sq ft` +
        ` | asking ${INR(c.asking_price)} → outcome ${INR(c.outcome_price)}` +
        ` | result: ${c.outcome || '—'}`);
      if (c.notes) lines.push(`    Notes: ${c.notes}`);
    });
  } else {
    const cfg = bundle.rows.market_configs || [];
    const plans = bundle.rows.market_plans || [];
    const prices = bundle.rows.market_prices || [];
    const negs = bundle.rows.market_negotiations || [];
    const distinctBrokers = new Set(prices.map((p) => (p.broker || '').trim().toLowerCase()).filter(Boolean));
    lines.push(`CONFIGURATIONS MAPPED: ${cfg.length}`);
    cfg.forEach((c) => lines.push(`  - ${c.config || '?'}: super ${c.super_area || '?'} / carpet ${c.carpet_area || '?'} sq ft, towers ${c.towers || '?'}, ~${c.units || '?'} units, source ${c.source || '?'}${c.notes ? ` (${c.notes})` : ''}`));
    lines.push(`FLOOR PLANS: ${plans.length}`);
    plans.forEach((p) => lines.push(`  - ${p.config || '?'}: ${p.layout || '(no layout notes)'} [${p.source || '?'}]`));
    lines.push(`BASELINE PRICE CALLS: ${prices.length} (distinct brokers: ${distinctBrokers.size})`);
    prices.forEach((p) => lines.push(`  - ${p.broker || '?'} (${p.phone || '—'}): ${p.config || '?'} @ ${INR(p.price)} on ${p.call_date || '—'}${p.notes ? ` — "${p.notes}"` : ''}`));
    lines.push(`NEGOTIATION CALLS: ${negs.length}`);
    negs.forEach((n) => lines.push(`  - ${n.broker || '?'} | ${n.config || '?'} ${n.floor || ''} | ${n.facing === 'park' ? 'park-facing' : 'non-park'} | ${n.call_type} call | budget ${INR(n.budget)} → offer ${INR(n.offer)} | close: ${n.can_close || '—'}${n.notes ? ` — "${n.notes}"` : ''}`));
  }

  // Transcripts
  const transcribed = bundle.recordings.filter((r) => r.transcript);
  lines.push('');
  lines.push(`CALL RECORDINGS TRANSCRIBED: ${transcribed.length} of ${bundle.recordings.length} uploaded`);
  transcribed.forEach((r, i) => {
    lines.push(`--- Transcript ${i + 1} (${r.transcript_lang || 'lang?'}, ${r.duration_sec ? Math.round(r.duration_sec) + 's' : '?'}) ---`);
    lines.push(r.transcript.slice(0, 8000));
  });
  if (bundle.recordings.length === 0) {
    lines.push('(No call audio uploaded — cannot assess spoken delivery.)');
  }
  return lines.join('\n');
}

const SCORE_TOOL = {
  name: 'record_assessment',
  description: 'Record the structured assessment of this candidate against the rubric.',
  input_schema: {
    type: 'object',
    properties: {
      overall: { type: 'number', description: '0-100 weighted overall score' },
      recommendation: { type: 'string', enum: ['strong', 'consider', 'weak'] },
      summary: { type: 'string', description: '2-3 sentence verdict for the hiring manager' },
      breakdown: {
        type: 'array',
        description: 'One entry per rubric criterion',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            score: { type: 'number', description: '0-100 for this criterion' },
            reasoning: { type: 'string', description: 'Evidence-based, cite specifics from the data/transcripts' },
          },
          required: ['key', 'score', 'reasoning'],
        },
      },
      strengths: { type: 'array', items: { type: 'string' } },
      red_flags: { type: 'array', items: { type: 'string' }, description: 'Concerns, gaps, or possible fabrication' },
    },
    required: ['overall', 'recommendation', 'summary', 'breakdown', 'strengths', 'red_flags'],
  },
};

async function scoreSubmission(type, bundle) {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY not set — cannot score');
  const rubric = rubricFor(type);

  const rubricText = rubric.criteria
    .map((c) => `- ${c.key} (weight ${c.weight}): ${c.title}\n    WEAK: ${c.weak}\n    STRONG: ${c.strong}`)
    .join('\n');

  const system = `You are a hiring assessor for Openhouse, a real-estate resale platform in NCR India. You evaluate interns who completed a field sales assignment. Be rigorous and skeptical: reward specificity and real evidence, penalise vague/rounded numbers, thin coverage, and anything that looks fabricated or copy-pasted. Judge spoken sales ability primarily from the call transcripts — tone, whether they hold their price line, how they handle objections, and whether they follow the call etiquette rules. Calls are in Hindi/English; judge substance, not language. Score each criterion 0-100, then a weighted overall. A candidate with no usable call audio cannot score well on delivery criteria.`;

  const user = `ASSIGNMENT: ${rubric.label}

RUBRIC (score each criterion 0-100 against these anchors):
${rubricText}

CANDIDATE SUBMISSION:
${bundleToText(type, bundle)}

Assess this candidate. Cite specific numbers and quotes from the data and transcripts in your reasoning. Call the record_assessment tool.`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    tools: [SCORE_TOOL],
    tool_choice: { type: 'tool', name: 'record_assessment' },
    messages: [{ role: 'user', content: user }],
  });

  const toolUse = resp.content.find((c) => c.type === 'tool_use');
  if (!toolUse) throw new Error('Model did not return a structured assessment');
  const out = toolUse.input;

  // Recompute the weighted overall from the criterion scores so it is consistent
  // with the rubric weights rather than trusting the model's arithmetic.
  const byKey = Object.fromEntries((out.breakdown || []).map((b) => [b.key, b.score]));
  let weighted = 0;
  let totalW = 0;
  for (const c of rubric.criteria) {
    if (byKey[c.key] !== undefined) {
      weighted += (Number(byKey[c.key]) || 0) * c.weight;
      totalW += c.weight;
    }
  }
  const overall = totalW ? Math.round(weighted / totalW) : Math.round(out.overall || 0);

  return {
    overall,
    recommendation: out.recommendation,
    summary: out.summary,
    breakdown: out.breakdown,
    strengths: out.strengths || [],
    red_flags: out.red_flags || [],
    rubric_version: rubric.version,
    model: MODEL,
  };
}

module.exports = { scoreSubmission, bundleToText };
