// Rubrics derived directly from each assignment's "What good looks like" table.
// Weights sum to 100. The scorer produces a 0-100 sub-score per criterion and
// a weighted overall.

const RUBRIC_VERSION = '2026-07-05';

const BD = {
  version: RUBRIC_VERSION,
  label: 'Business Development — Move a seller off their anchor price',
  criteria: [
    {
      key: 'price_homework',
      weight: 20,
      title: 'Price homework',
      weak: 'One portal, no broker check.',
      strong: 'Cross-checked across 3+ listings and 1-2 broker calls; a single defensible market price.',
    },
    {
      key: 'negotiation',
      weight: 30,
      title: 'Owner conversation (from call audio)',
      weak: 'Reads a script, folds at the first objection.',
      strong: 'Holds the market-price line with specific comparables; handles at least one real objection.',
    },
    {
      key: 'outcome_logging',
      weight: 20,
      title: 'Outcome logged',
      weak: '"Owner said no."',
      strong: 'Specific final number discussed and the owner\'s stated reason, even if it is a no.',
    },
    {
      key: 'recording_quality',
      weight: 15,
      title: 'Recordings',
      weak: 'Missing or unusable.',
      strong: 'All 3 calls recorded and logged against the right configuration and size.',
    },
    {
      key: 'professionalism',
      weight: 15,
      title: 'Call etiquette & delivery (from audio)',
      weak: 'Does not identify as Openhouse; pushy or evasive; overpromises a buyer/timeline.',
      strong: 'Identifies as calling from Openhouse; respectful under pushback; never promises what cannot be backed up.',
    },
  ],
};

const MARKET = {
  version: RUBRIC_VERSION,
  label: 'Market Research — Society deep-dive pricing intelligence',
  criteria: [
    {
      key: 'broker_coverage',
      weight: 25,
      title: 'Broker coverage',
      weak: '3-4 brokers, mostly the same source.',
      strong: '10+ distinct, genuinely independent brokers.',
    },
    {
      key: 'price_specificity',
      weight: 25,
      title: 'Price data',
      weak: 'Rounded, "roughly" numbers.',
      strong: 'Specific figures, tagged to exact configuration and floor.',
    },
    {
      key: 'compromise_gap',
      weight: 20,
      title: 'Compromise gap',
      weak: 'Not attempted or vague.',
      strong: 'Actual rupee gap between park-facing and non-park-facing quoted.',
    },
    {
      key: 'writeup_quality',
      weight: 15,
      title: 'Write-up',
      weak: 'Numbers only.',
      strong: 'Numbers plus what the broker actually said, in their words.',
    },
    {
      key: 'call_delivery',
      weight: 15,
      title: 'Call delivery (from audio, where provided)',
      weak: 'Rambling; fabricates a backstory; claims to represent Openhouse.',
      strong: 'Genuine-buyer framing; short and specific; asks directly for the real minimum price; never claims Openhouse.',
    },
  ],
};

module.exports = { RUBRIC_VERSION, BD, MARKET, rubricFor: (t) => (t === 'bd' ? BD : MARKET) };
