import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSubmission } from '../hooks/useSubmission.js';
import TopBar from '../components/TopBar.jsx';
import RecordingUploader from '../components/RecordingUploader.jsx';
import SubmitBar from '../components/SubmitBar.jsx';
import InstructionsModal from '../components/InstructionsModal.jsx';

const INR = (n) => (n === null || n === undefined || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN'));
const empty = { config: '', size: '', asking_price: '', outcome_price: '', outcome: '', notes: '' };

export default function BDTracker() {
  const { bundle, loading, error, reload, locked, setError } = useSubmission('bd');
  const [setup, setSetup] = useState({ society: '', config: '', market_price: '', comparables: '' });
  const [form, setForm] = useState(empty);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (bundle) {
      const s = bundle.submission;
      setSetup({
        society: s.society || '', config: s.config || '',
        market_price: s.market_price || '', comparables: s.comparables || '',
      });
    }
  }, [bundle?.submission?.id]);

  if (loading) return <div className="center"><span className="spinner" /></div>;
  if (error) return <div className="wrap"><div className="banner err">{error}</div></div>;

  const calls = bundle.rows.bd_calls || [];
  const recsFor = (id) => bundle.recordings.filter((r) => r.kind === 'bd_call' && String(r.ref_id) === String(id));

  async function saveSetup(field) {
    try { await api.updateSubmission('bd', { [field]: setup[field] }); }
    catch (e) { setError(e.message); }
  }

  async function addCall() {
    if (!form.config.trim()) { setError('Add a configuration first.'); return; }
    try {
      await api.addRow('bd', 'bd_calls', form);
      setForm(empty);
      await reload();
    } catch (e) { setError(e.message); }
  }

  async function removeCall(id) {
    try { await api.deleteRow('bd', 'bd_calls', id); await reload(); }
    catch (e) { setError(e.message); }
  }

  const totalRecordings = bundle.recordings.length;

  return (
    <div className="wrap narrow">
      <TopBar back="/" />
      <div className="mast">
        <div className="mast-left">
          <div className="kicker">Openhouse — BD assignment</div>
          <h1>Owner call tracker</h1>
        </div>
        <div className="mast-right">
          <button className="btn btn-ghost btn-sm btn-highlight" onClick={() => setShowInstructions(true)}>Read instructions</button>
          <div className="mast-count">{calls.length} calls · {totalRecordings} recordings</div>
        </div>
      </div>

      {showInstructions && <InstructionsModal type="bd" onClose={() => setShowInstructions(false)} />}

      {locked && <div className="banner ok">Submitted ✓ — your work is locked and with the Openhouse team.</div>}

      <div className="setup">
        <div className="field">
          <label>Society</label>
          <input value={setup.society} disabled={locked}
            onChange={(e) => setSetup({ ...setup, society: e.target.value })} onBlur={() => saveSetup('society')}
            placeholder="e.g. Purvanchal Royal City" />
        </div>
        <div className="field">
          <label>Configuration</label>
          <input value={setup.config} disabled={locked}
            onChange={(e) => setSetup({ ...setup, config: e.target.value })} onBlur={() => saveSetup('config')}
            placeholder="e.g. 3BHK" />
        </div>
        <div className="field">
          <label>Your established market price (₹)</label>
          <input type="number" value={setup.market_price} disabled={locked}
            onChange={(e) => setSetup({ ...setup, market_price: e.target.value })} onBlur={() => saveSetup('market_price')}
            placeholder="9500000" />
        </div>
        <div className="field">
          <label>How you established it (comparables + broker checks)</label>
          <input value={setup.comparables} disabled={locked}
            onChange={(e) => setSetup({ ...setup, comparables: e.target.value })} onBlur={() => saveSetup('comparables')}
            placeholder="e.g. 3 listings on 99acres avg 96L; broker Rakesh says 92-94L closing" />
        </div>
      </div>
      <p className="note">The market price is the number you hold the line on in every owner call. Task 2 asks you to defend it with comparables and 1–2 broker checks.</p>

      {!locked && (
        <div className="panel">
          <h2>Log an owner call</h2>
          <p className="sub">One row per owner call. Add the call first, then upload its recording below.</p>
          <div className="grid g3">
            <div className="field"><label>Configuration</label><input value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} placeholder="3BHK" /></div>
            <div className="field"><label>Size (sq ft)</label><input type="number" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="1650" /></div>
            <div className="field"><label>Owner's asking price (₹)</label><input type="number" value={form.asking_price} onChange={(e) => setForm({ ...form, asking_price: e.target.value })} placeholder="10500000" /></div>
            <div className="field"><label>Price they came down to (₹)</label><input type="number" value={form.outcome_price} onChange={(e) => setForm({ ...form, outcome_price: e.target.value })} placeholder="9800000" /></div>
            <div className="field"><label>Outcome</label><input value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} placeholder="agreed to think / refused / follow-up Fri" /></div>
            <div className="field full"><label>Notes — what actually moved them, objections raised</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Held firm on 'other brokers said more' — asked if any had a buyer today; dropped 4L" /></div>
          </div>
          <button className="btn btn-primary" onClick={addCall}>Log owner call</button>
        </div>
      )}

      <div className="log-head"><h3>Logged calls</h3></div>
      <div className="panel">
        <table>
          <thead><tr><th>Config / size</th><th>Asking → outcome</th><th>Result</th><th>Notes</th><th>Recording</th>{!locked && <th></th>}</tr></thead>
          <tbody>
            {calls.length ? calls.map((c) => (
              <tr key={c.id}>
                <td>{c.config || '—'}<br /><span className="mono muted">{c.size ? c.size + ' sq ft' : ''}</span></td>
                <td className="mono">{INR(c.asking_price)} → {INR(c.outcome_price)}</td>
                <td>{c.outcome || '—'}</td>
                <td>{c.notes || '—'}</td>
                <td style={{ minWidth: 200 }}>
                  <RecordingUploader assignmentType="bd" kind="bd_call" refId={c.id}
                    recordings={recsFor(c.id)} disabled={locked} onChange={reload} />
                </td>
                {!locked && <td><button className="del-btn" onClick={() => removeCall(c.id)}>×</button></td>}
              </tr>
            )) : <tr className="empty-row"><td colSpan={locked ? 5 : 6}>No calls logged yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <SubmitBar type="bd" locked={locked} onSubmitted={reload}
        summary={`${calls.length} owner calls · ${totalRecordings} recordings`}
        guard={() => {
          if (calls.length < 1) return 'Log at least one owner call before submitting.';
          if (totalRecordings < 1) return 'Upload at least one call recording before submitting.';
          return null;
        }} />
    </div>
  );
}
