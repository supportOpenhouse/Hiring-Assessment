import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSubmission } from '../hooks/useSubmission.js';
import TopBar from '../components/TopBar.jsx';
import RecordingUploader from '../components/RecordingUploader.jsx';
import SubmitBar from '../components/SubmitBar.jsx';
import InstructionsModal from '../components/InstructionsModal.jsx';

const INR = (n) => (n === null || n === undefined || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN'));

const BLANK = {
  configs: { config: '', super_area: '', carpet_area: '', towers: '', units: '', source: '', notes: '' },
  plans: { config: '', source: '', layout: '', link: '' },
  prices: { broker: '', phone: '', config: '', price: '', call_date: '', notes: '' },
  negotiations: { broker: '', phone: '', config: '', floor: '', facing: 'park', call_type: 'compromise', budget: '', offer: '', can_close: '', notes: '' },
};
const TABLE = { configs: 'market_configs', plans: 'market_plans', prices: 'market_prices', negotiations: 'market_negotiations' };

export default function MarketTracker() {
  const { bundle, loading, error, reload, locked, setError } = useSubmission('market');
  const [tab, setTab] = useState('configs');
  const [society, setSociety] = useState('');
  const [form, setForm] = useState(BLANK.configs);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => { if (bundle) setSociety(bundle.submission.society || ''); }, [bundle?.submission?.id]);
  useEffect(() => { setForm(BLANK[tab]); }, [tab]);

  if (loading) return <div className="center"><span className="spinner" /></div>;
  if (error) return <div className="wrap"><div className="banner err">{error}</div></div>;

  const rows = {
    configs: bundle.rows.market_configs || [],
    plans: bundle.rows.market_plans || [],
    prices: bundle.rows.market_prices || [],
    negotiations: bundle.rows.market_negotiations || [],
  };
  const distinctBrokers = new Set(rows.prices.map((r) => (r.broker || '').trim().toLowerCase()).filter(Boolean)).size;
  const recsFor = (id) => bundle.recordings.filter((r) => r.kind === 'negotiation' && String(r.ref_id) === String(id));
  const set = (k, v) => setForm({ ...form, [k]: v });

  async function saveSociety() {
    try { await api.updateSubmission('market', { society }); } catch (e) { setError(e.message); }
  }
  async function add() {
    try { await api.addRow('market', TABLE[tab], form); setForm(BLANK[tab]); await reload(); }
    catch (e) { setError(e.message); }
  }
  async function remove(id) {
    try { await api.deleteRow('market', TABLE[tab], id); await reload(); } catch (e) { setError(e.message); }
  }

  const total = rows.configs.length + rows.plans.length + rows.prices.length + rows.negotiations.length;

  return (
    <div className="wrap">
      <TopBar back="/" />
      <div className="mast">
        <div className="mast-left">
          <div className="kicker">Openhouse — market research assignment</div>
          <h1>Society ledger</h1>
        </div>
        <div className="mast-right">
          <button className="btn btn-ghost btn-sm btn-highlight" onClick={() => setShowInstructions(true)}>Read instructions</button>
          <div className="mast-count">{total} entries</div>
        </div>
      </div>

      {showInstructions && <InstructionsModal type="market" onClose={() => setShowInstructions(false)} />}

      {locked && <div className="banner ok">Submitted ✓ — your ledger is locked and with the Openhouse team.</div>}

      <div className="setup" style={{ gridTemplateColumns: '1fr' }}>
        <div className="field">
          <label>Society (all entries are filed under this)</label>
          <input value={society} disabled={locked} onChange={(e) => setSociety(e.target.value)} onBlur={saveSociety}
            placeholder="e.g. Purvanchal Royal City" />
        </div>
      </div>

      <div className="meter-box">
        <div className="meter-top">
          <span className="label">Distinct brokers contacted for baseline pricing (Task 3 asks for 10+)</span>
          <span className="count">{distinctBrokers} / 10</span>
        </div>
        <div className="meter-track"><div className="meter-fill" style={{ width: Math.min(100, (distinctBrokers / 10) * 100) + '%' }} /></div>
      </div>

      <div className="tabs">
        {[['configs', '1 · Sizes & configs'], ['plans', '2 · Floor plans'], ['prices', '3 · Baseline prices'], ['negotiations', '4 · Negotiation calls']].map(([k, label]) => (
          <button key={k} className={`tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      <div className="panel tabbed">
        {/* ---- CONFIGS ---- */}
        {tab === 'configs' && (<>
          <h2>Configurations &amp; sizes</h2>
          <p className="sub">One row per unit type that exists in the society.</p>
          {!locked && <>
            <div className="grid g3">
              <div className="field"><label>Configuration</label><input value={form.config} onChange={(e) => set('config', e.target.value)} placeholder="3BHK + study" /></div>
              <div className="field"><label>Super area (sq ft)</label><input type="number" value={form.super_area} onChange={(e) => set('super_area', e.target.value)} placeholder="1650" /></div>
              <div className="field"><label>Carpet area (sq ft)</label><input type="number" value={form.carpet_area} onChange={(e) => set('carpet_area', e.target.value)} placeholder="1180" /></div>
              <div className="field"><label>Towers with this type</label><input value={form.towers} onChange={(e) => set('towers', e.target.value)} placeholder="B, D, F" /></div>
              <div className="field"><label>Approx. units</label><input type="number" value={form.units} onChange={(e) => set('units', e.target.value)} placeholder="120" /></div>
              <div className="field"><label>Source</label><input value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="RERA / brochure / RWA" /></div>
              <div className="field full"><label>Notes</label><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything unusual" /></div>
            </div>
            <button className="btn btn-primary" onClick={add}>Log configuration</button>
          </>}
          <div className="log-head"><h3>Logged so far</h3></div>
          <table>
            <thead><tr><th>Config</th><th>Super / carpet</th><th>Towers</th><th>Units</th><th>Notes</th>{!locked && <th></th>}</tr></thead>
            <tbody>
              {rows.configs.length ? rows.configs.map((r) => (
                <tr key={r.id}>
                  <td>{r.config || '—'}</td>
                  <td className="mono">{r.super_area || '—'} / {r.carpet_area || '—'}</td>
                  <td>{r.towers || '—'}</td><td>{r.units || '—'}</td><td>{r.notes || '—'}</td>
                  {!locked && <td><button className="del-btn" onClick={() => remove(r.id)}>×</button></td>}
                </tr>
              )) : <tr className="empty-row"><td colSpan={locked ? 5 : 6}>Nothing logged yet.</td></tr>}
            </tbody>
          </table>
        </>)}

        {/* ---- PLANS ---- */}
        {tab === 'plans' && (<>
          <h2>Floor plans</h2>
          <p className="sub">One row per configuration you found a floor plan for.</p>
          {!locked && <>
            <div className="grid">
              <div className="field"><label>Configuration</label><input value={form.config} onChange={(e) => set('config', e.target.value)} placeholder="3BHK + study" /></div>
              <div className="field"><label>Source</label><input value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="Brochure / RERA / broker" /></div>
              <div className="field full"><label>Layout notes — bedroom/kitchen orientation, balcony placement</label><textarea value={form.layout} onChange={(e) => set('layout', e.target.value)} placeholder="2 of 3 bedrooms face the park, kitchen faces internal road" /></div>
              <div className="field full"><label>Floor plan link (optional)</label><input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="Drive link or where the PDF is saved" /></div>
            </div>
            <button className="btn btn-primary" onClick={add}>Log floor plan</button>
          </>}
          <div className="log-head"><h3>Logged so far</h3></div>
          <table>
            <thead><tr><th>Config</th><th>Layout notes</th><th>Source</th>{!locked && <th></th>}</tr></thead>
            <tbody>
              {rows.plans.length ? rows.plans.map((r) => (
                <tr key={r.id}>
                  <td>{r.config || '—'}</td>
                  <td>{r.layout || '—'}{r.link ? <> · <a href={r.link} target="_blank" rel="noopener noreferrer">link</a></> : ''}</td>
                  <td>{r.source || '—'}</td>
                  {!locked && <td><button className="del-btn" onClick={() => remove(r.id)}>×</button></td>}
                </tr>
              )) : <tr className="empty-row"><td colSpan={locked ? 3 : 4}>Nothing logged yet.</td></tr>}
            </tbody>
          </table>
        </>)}

        {/* ---- PRICES ---- */}
        {tab === 'prices' && (<>
          <h2>Baseline market price</h2>
          <p className="sub">One row per broker call. Log the raw quote — don’t average anything.</p>
          {!locked && <>
            <div className="grid g3">
              <div className="field"><label>Broker name</label><input value={form.broker} onChange={(e) => set('broker', e.target.value)} placeholder="Rakesh, ABC Estates" /></div>
              <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="9XXXXXXXXX" /></div>
              <div className="field"><label>Configuration</label><input value={form.config} onChange={(e) => set('config', e.target.value)} placeholder="3BHK" /></div>
              <div className="field"><label>Quoted minimum price (₹)</label><input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="9500000" /></div>
              <div className="field"><label>Date contacted</label><input type="date" value={form.call_date} onChange={(e) => set('call_date', e.target.value)} /></div>
              <div className="field full"><label>Notes — what the broker actually said</label><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Seller firm, 2 units on floors 4 and 9" /></div>
            </div>
            <button className="btn btn-primary" onClick={add}>Log broker quote</button>
          </>}
          <div className="log-head"><h3>Logged so far</h3></div>
          <table>
            <thead><tr><th>Broker</th><th>Config</th><th>Quote</th><th>Date</th><th>Notes</th>{!locked && <th></th>}</tr></thead>
            <tbody>
              {rows.prices.length ? rows.prices.map((r) => (
                <tr key={r.id}>
                  <td>{r.broker || '—'}<br /><span className="mono muted" style={{ fontSize: 11 }}>{r.phone || ''}</span></td>
                  <td>{r.config || '—'}</td><td className="mono">{INR(r.price)}</td><td className="mono">{r.call_date || '—'}</td><td>{r.notes || '—'}</td>
                  {!locked && <td><button className="del-btn" onClick={() => remove(r.id)}>×</button></td>}
                </tr>
              )) : <tr className="empty-row"><td colSpan={locked ? 5 : 6}>Nothing logged yet.</td></tr>}
            </tbody>
          </table>
        </>)}

        {/* ---- NEGOTIATIONS ---- */}
        {tab === 'negotiations' && (<>
          <h2>Negotiation calls</h2>
          <p className="sub">Log the compromise call and the urgency call separately. Upload the recording against each call.</p>
          {!locked && <>
            <div className="grid g3">
              <div className="field"><label>Broker name</label><input value={form.broker} onChange={(e) => set('broker', e.target.value)} placeholder="Rakesh, ABC Estates" /></div>
              <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="9XXXXXXXXX" /></div>
              <div className="field"><label>Configuration</label><input value={form.config} onChange={(e) => set('config', e.target.value)} placeholder="3BHK" /></div>
              <div className="field"><label>Floor</label><input value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="mid floor (5-9)" /></div>
              <div className="field"><label>Facing</label>
                <div className="radio-row">
                  <label><input type="radio" name="facing" checked={form.facing === 'park'} onChange={() => set('facing', 'park')} /> Park-facing</label>
                  <label><input type="radio" name="facing" checked={form.facing === 'nonpark'} onChange={() => set('facing', 'nonpark')} /> Non-park</label>
                </div>
              </div>
              <div className="field"><label>Call type</label>
                <div className="radio-row">
                  <label><input type="radio" name="ctype" checked={form.call_type === 'compromise'} onChange={() => set('call_type', 'compromise')} /> Compromise</label>
                  <label><input type="radio" name="ctype" checked={form.call_type === 'urgency'} onChange={() => set('call_type', 'urgency')} /> Urgency</label>
                </div>
              </div>
              <div className="field"><label>Your stated budget (₹)</label><input type="number" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="8800000" /></div>
              <div className="field"><label>Broker's best offer (₹)</label><input type="number" value={form.offer} onChange={(e) => set('offer', e.target.value)} placeholder="9100000" /></div>
              <div className="field"><label>Can close within a month?</label>
                <select value={form.can_close} onChange={(e) => set('can_close', e.target.value)}>
                  <option value="">—</option><option value="yes">Yes</option><option value="no">No</option><option value="unclear">Unclear</option>
                </select>
              </div>
              <div className="field full"><label>Notes — what actually moved the price, in the broker’s words</label><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Dropped 3L when I said non-park facing was fine" /></div>
            </div>
            <button className="btn btn-primary" onClick={add}>Log negotiation call</button>
          </>}
          <div className="log-head"><h3>Logged so far</h3></div>
          <table>
            <thead><tr><th>Broker</th><th>Config / floor</th><th>Facing</th><th>Call</th><th>Budget → offer</th><th>Recording</th>{!locked && <th></th>}</tr></thead>
            <tbody>
              {rows.negotiations.length ? rows.negotiations.map((r) => (
                <tr key={r.id}>
                  <td>{r.broker || '—'}<br /><span className="mono muted" style={{ fontSize: 11 }}>{r.phone || ''}</span></td>
                  <td>{r.config || '—'}<br /><span className="muted" style={{ fontSize: 12 }}>{r.floor || ''}</span></td>
                  <td><span className={`pill ${r.facing === 'park' ? 'park' : 'nonpark'}`}>{r.facing === 'park' ? 'Park' : 'Non-park'}</span></td>
                  <td><span className={`pill ${r.call_type === 'compromise' ? 'compromise' : 'urgency'}`}>{r.call_type === 'compromise' ? 'Compromise' : 'Urgency'}</span></td>
                  <td className="mono">{INR(r.budget)} → {INR(r.offer)}</td>
                  <td style={{ minWidth: 190 }}><RecordingUploader assignmentType="market" kind="negotiation" refId={r.id} recordings={recsFor(r.id)} disabled={locked} onChange={reload} /></td>
                  {!locked && <td><button className="del-btn" onClick={() => remove(r.id)}>×</button></td>}
                </tr>
              )) : <tr className="empty-row"><td colSpan={locked ? 6 : 7}>Nothing logged yet.</td></tr>}
            </tbody>
          </table>
        </>)}
      </div>

      <SubmitBar type="market" locked={locked} onSubmitted={reload}
        summary={`${rows.configs.length} configs · ${distinctBrokers} brokers · ${rows.negotiations.length} negotiation calls · ${bundle.recordings.length} recordings`}
        guard={() => {
          if (distinctBrokers < 10) return `Task 3 asks for 10+ distinct brokers — you have ${distinctBrokers}. Add more before submitting.`;
          if (rows.negotiations.length < 1) return 'Log at least one negotiation call before submitting.';
          return null;
        }} />
    </div>
  );
}
