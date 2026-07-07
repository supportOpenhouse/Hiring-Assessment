import { useEffect } from 'react';

// Assignment instructions, transcribed from the Openhouse assignment briefs.
// Rendered in a modal from the "Read instructions" button on each tracker.

function BDContent() {
  return (
    <>
      <div className="ins-kicker">Business Development Assignment</div>
      <h2>Move a Real Seller Off Their Anchor Price</h2>

      <h3>Why this assignment exists</h3>
      <p>
        The hardest part of BD at Openhouse isn't finding sellers — portals are full of them. It's
        getting a seller who has anchored on a number to move to what the market will actually pay,
        using data and conversation, not discounts you don't control. This assignment puts you in
        that exact conversation with a real owner, on a real listing, today.
      </p>

      <h3>Your society &amp; configuration</h3>
      <p>
        Pick one society and one configuration (e.g. 3BHK in a specific society) that has enough
        listings to work with. Record it in the <strong>Society</strong> and{' '}
        <strong>Configuration</strong> fields at the top of the tracker before you start.
      </p>

      <h3>The four tasks</h3>

      <h4>Task 1 — Choose a society and configuration</h4>
      <p>
        Pick a society where at least 4-5 properties of one configuration are currently listed for
        sale online, so you have enough owners to call and enough data to establish a price.
      </p>

      <h4>Task 2 — Establish the market price</h4>
      <p>Before you call any owner, know the number you're negotiating toward.</p>
      <ul>
        <li>Check 3-5 comparable listings for the same configuration in the same society across 99acres, MagicBricks, and Housing.com</li>
        <li>Call 1-2 brokers active in the society and ask what similar units have actually transacted at recently — not the asking price, the closing price</li>
        <li>Settle on a single defensible market price for this configuration. This is the number you'll hold the line on in every owner call.</li>
      </ul>

      <h4>Task 3 — Call 3 owners and negotiate them to market price</h4>
      <p>
        Find owners — not brokers — who have listed the property themselves and are asking roughly
        10% or more above the market price you established.
      </p>
      <ul>
        <li>Identify 3 such owner-listed properties. Portals let you filter by "owner" listings — use that filter.</li>
        <li>Call each owner and be upfront: you're calling from Openhouse, you work with genuine buyers in this society, and you wanted to understand their listing.</li>
        <li>Walk them through the market price using your comparables — specific numbers, not "I think it's overpriced."</li>
        <li>Ask directly if they'd sell at the market price to a buyer who's ready to move. Hold the line through the first objection at minimum.</li>
        <li>Log the outcome honestly, including if they refuse to move — a clean "no" with good reasoning logged is more useful than a vague call.</li>
      </ul>
      <p className="ins-sample">
        Sample opening line: "Hi, I'm calling from Openhouse — we work with genuine buyers looking in
        [Society]. I saw your listing for [Configuration] and wanted to understand it better."
      </p>

      <h4>Task 4 — Upload the call recording</h4>
      <p>
        Record all 3 calls (most phones and call-recorder apps do this natively). Log each recording
        in the BD owner call tracker against the configuration and size you called about. The tracker
        is private, so only you see your own entries.
      </p>
      <ul>
        <li>Let the owner know at the start of the call that you're taking notes for internal record-keeping — most owners don't mind and it keeps things transparent</li>
        <li>If a recording fails or is unusable, log the call anyway with detailed notes and flag that the recording is missing</li>
      </ul>

      <h3>Handling common objections</h3>
      <table className="ins-table">
        <thead>
          <tr><th>Owner says</th><th>How to respond</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>"The market will only go up, I'll wait."</td>
            <td>Point to your comparables — what actually sold recently, not what's listed. Ask what happens if it takes 6+ months to find a buyer at the higher number.</td>
          </tr>
          <tr>
            <td>"Other brokers told me I can get more."</td>
            <td>Ask if any of those brokers have an actual buyer today. Reframe: a real offer now is worth more than a hypothetical higher number later.</td>
          </tr>
          <tr>
            <td>"I've already rejected offers at that price."</td>
            <td>Ask what changed since then — days on market, buyer interest, urgency to sell. Use it to reset the anchor.</td>
          </tr>
          <tr>
            <td>"I need to think about it."</td>
            <td>Don't push for a yes on the call. Agree on a specific day you'll follow up, and confirm they'll hold off finalizing with anyone else until then.</td>
          </tr>
        </tbody>
      </table>

      <h3>Call etiquette</h3>
      <ul>
        <li>Always identify yourself as calling from Openhouse — this is a real business conversation, not research</li>
        <li>Never promise a buyer or a closing timeline you can't back up</li>
        <li>Stay respectful if an owner pushes back hard — a firm no today can become a yes in a month</li>
      </ul>

      <h3>Timeline</h3>
      <table className="ins-table">
        <thead><tr><th>Day</th><th>Focus</th></tr></thead>
        <tbody>
          <tr><td>Day 1</td><td>Task 1 + Task 2 — pick society/configuration, establish market price</td></tr>
          <tr><td>Day 2</td><td>Identify 3 owner-listed properties priced 10%+ above market</td></tr>
          <tr><td>Day 3</td><td>Make and record all 3 calls</td></tr>
          <tr><td>Day 4</td><td>Upload recordings, log outcomes, prepare a 5-minute readout</td></tr>
        </tbody>
      </table>

      <h3>What good looks like</h3>
      <table className="ins-table">
        <thead><tr><th>Criteria</th><th>Weak</th><th>Strong</th></tr></thead>
        <tbody>
          <tr><td>Price homework</td><td>One portal, no broker check</td><td>Cross-checked across 3+ listings and 1-2 broker calls</td></tr>
          <tr><td>Owner conversation</td><td>Reads a script, folds at first objection</td><td>Holds the market-price line, handles at least one real objection</td></tr>
          <tr><td>Outcome logged</td><td>"Owner said no"</td><td>Specific final number discussed and the owner's stated reason, even if it's a no</td></tr>
          <tr><td>Recording</td><td>Missing or unusable</td><td>All 3 calls recorded and logged against the right configuration and size</td></tr>
        </tbody>
      </table>
    </>
  );
}

function MarketContent() {
  return (
    <>
      <div className="ins-kicker">Market Research Assignment</div>
      <h2>Society Deep-Dive: Building Ground-Truth Pricing Intelligence</h2>

      <h3>Why this assignment exists</h3>
      <p>
        Openhouse's edge over listing portals and other resale platforms is that we understand price
        at the level of a single unit in a single society — not just "the market." That intelligence
        only exists because someone actually called brokers, asked the uncomfortable questions, and
        wrote down real answers. This assignment is your first rep at building that muscle.
      </p>

      <h3>Your society</h3>
      <p>
        You will be assigned one residential society in NCR. Every task below is scoped to that one
        society only. Record its name in the <strong>Society</strong> field at the top of the tracker
        before you start.
      </p>

      <h3>The four tasks</h3>

      <h4>Task 1 — Map every configuration</h4>
      <p>Build a complete list of every unit type that exists in the society.</p>
      <ul>
        <li>List every configuration (1BHK, 2BHK, 3BHK, 3BHK+study, penthouse, etc.)</li>
        <li>For each configuration, note the super area and carpet area (in sq. ft.)</li>
        <li>Note how many towers/blocks have that configuration, and roughly how many units of that type exist</li>
      </ul>
      <p className="ins-sample">
        Sources: RERA filing for the project, the builder's original brochure, resident WhatsApp
        groups, or the society's RWA/facilities office.
      </p>

      <h4>Task 2 — Collect floor plans</h4>
      <p>For every configuration identified in Task 1, find the actual floor plan.</p>
      <ul>
        <li>Pull it from the builder's brochure, RERA website, or a broker (brokers usually have PDFs on hand)</li>
        <li>Note the layout logic — number of bedrooms facing the park vs. the road, balcony placement, which side the kitchen/utility sits on</li>
        <li>Flag any configuration where you cannot find an official floor plan — that's useful information too</li>
      </ul>

      <h4>Task 3 — Baseline market price (call 10+ brokers)</h4>
      <p>This is the core of the assignment. You are now a buyer, not an intern.</p>
      <ul>
        <li>Call at least 10 different brokers active in this society (not 10 calls to the same 3 — genuinely different brokers).</li>
        <li>Tell them you're looking to buy in this specific society and ask what's currently available.</li>
        <li>For each configuration, ask directly: "What's the lowest price the seller will actually accept?" — not the listed price, the real minimum.</li>
        <li>Log every quote separately, even if two brokers quote wildly different numbers for the same size. Do not average them in your head — log the raw data.</li>
      </ul>
      <p className="ins-sample">
        Sample opening line: "Hi, I'm looking to buy a 3BHK in [Society]. What's currently available
        and what's the best price the seller will actually take?"
      </p>

      <h4>Task 4 — Test price flexibility (the harder call)</h4>
      <p>
        Once you have baseline prices, make a second round of calls to understand how much prices
        actually move. Run two distinct conversations per broker:
      </p>
      <p><strong>Call A — The compromise call</strong></p>
      <ul>
        <li>State a budget noticeably below the baseline quote for that configuration.</li>
        <li>Ask if anything is available at that price if you're willing to compromise — e.g. a lower floor, non-park-facing, an older-possession unit.</li>
        <li>Specifically compare: mid-floor park-facing unit with good sunlight vs. a non-park-facing unit of the same size. Get an actual number for the gap, not a vague "it depends."</li>
      </ul>
      <p><strong>Call B — The urgency call</strong></p>
      <ul>
        <li>Tell the broker you want the best possible unit at the best possible price, and you can close within a month if the deal is right.</li>
        <li>Ask whether that urgency unlocks anything — a seller who's motivated, a distressed sale, a price the broker didn't mention on the first call.</li>
      </ul>
      <p>
        Log both calls against the same broker/unit so we can see the swing between "just asking" and
        "a buyer who can close fast."
      </p>

      <h3>How to find brokers</h3>
      <ul>
        <li>99acres, MagicBricks, Housing.com — filter listings to this society and call the listed number</li>
        <li>The society's security gate / RWA office — brokers visit regularly and gate staff usually know 4-5 names</li>
        <li>Ask the first broker you speak to for 2-3 names of other brokers active in the society — they always know their competitors</li>
      </ul>

      <h3>Call etiquette</h3>
      <ul>
        <li>Always be upfront that you're a genuine buyer looking in that society — don't fabricate a backstory beyond that</li>
        <li>Keep calls short and specific; brokers are busy and respond better to precise questions</li>
        <li>If a broker asks for your number to send listings, it's fine to share it — that's normal buyer behavior</li>
        <li>Never claim to represent Openhouse on these calls</li>
      </ul>

      <h3>Where to log your data</h3>
      <p>
        Log everything directly into the assignment tracker as you collect it — not at the end of the
        week from memory. All entries are tagged to your society.
      </p>

      <h3>Timeline</h3>
      <table className="ins-table">
        <thead><tr><th>Day</th><th>Focus</th></tr></thead>
        <tbody>
          <tr><td>Day 1</td><td>Task 1 + Task 2 — configurations, sizes, floor plans</td></tr>
          <tr><td>Day 2–3</td><td>Task 3 — 10+ baseline broker calls, logged as you go</td></tr>
          <tr><td>Day 4</td><td>Task 4 — compromise + urgency calls</td></tr>
          <tr><td>Day 5</td><td>Clean up entries in the tracker, prepare a 5-minute readout</td></tr>
        </tbody>
      </table>

      <h3>What good looks like</h3>
      <table className="ins-table">
        <thead><tr><th>Criteria</th><th>Weak</th><th>Strong</th></tr></thead>
        <tbody>
          <tr><td>Broker coverage</td><td>3-4 brokers, mostly the same source</td><td>10+ distinct brokers, genuinely independent</td></tr>
          <tr><td>Price data</td><td>Rounded, "roughly" numbers</td><td>Specific figures, tagged to exact configuration and floor</td></tr>
          <tr><td>Compromise gap</td><td>Not attempted or vague</td><td>Actual rupee gap between park-facing and non-park-facing quoted</td></tr>
          <tr><td>Write-up</td><td>Numbers only</td><td>Numbers plus what the broker actually said, in their words</td></tr>
        </tbody>
      </table>
    </>
  );
}

export default function InstructionsModal({ type, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="ins-overlay" onClick={onClose}>
      <div className="ins-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="ins-close" onClick={onClose} aria-label="Close instructions">×</button>
        <div className="ins">
          {type === 'bd' ? <BDContent /> : <MarketContent />}
        </div>
      </div>
    </div>
  );
}
