import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import TopBar from '../../components/TopBar.jsx';

const INR = (n) => (n === null || n === undefined || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN'));
const CRIT_TITLE = {
  price_homework: 'Price homework', negotiation: 'Owner conversation', outcome_logging: 'Outcome logged',
  recording_quality: 'Recordings', professionalism: 'Call etiquette & delivery',
  broker_coverage: 'Broker coverage', price_specificity: 'Price specificity', compromise_gap: 'Compromise gap',
  writeup_quality: 'Write-up quality', call_delivery: 'Call delivery',
};

export default function CandidateDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setData(await api.adminSubmission(id)); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [id]);

  if (error) return <div className="wrap"><TopBar back="/admin" /><div className="banner err">{error}</div></div>;
  if (!data) return <div className="center"><span className="spinner" /></div>;

  const { submission: s, rows, recordings, score, user } = data;
  const type = s.assignment_type;

  async function rescore() {
    setBusy(true);
    try { await api.adminRescore(id); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="wrap">
      <TopBar back="/admin" />
      <div className="mast">
        <div className="mast-left">
          <div className="kicker">{type === 'bd' ? 'Business Development' : 'Market Research'} · {s.society || 'no society'}</div>
          <h1>{user?.name || user?.email}</h1>
        </div>
        <div className="mast-right">{user?.email}<br />{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'not submitted'}</div>
      </div>

      {/* Score card */}
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="topbar" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontFamily: 'Fraunces,serif' }}>
            AI assessment {score ? <> · <span className="mono">{Math.round(score.overall)}/100</span> {score.recommendation && <span className={`pill ${score.recommendation}`}>{score.recommendation}</span>}</> : ''}
          </h2>
          <button className="btn-ghost" disabled={busy} onClick={rescore}>{busy ? 'Queuing…' : '↻ Re-run scoring'}</button>
        </div>
        {!score && <div className="banner warn">Not scored yet. Status: <b>{s.status}</b>. If it stays like this, the cron scorer hasn’t run — click “Re-run scoring”, then refresh in a minute.</div>}
        {score && <>
          <p style={{ fontSize: 15, lineHeight: 1.5, marginTop: 0 }}>{score.summary}</p>
          <div className="grid" style={{ marginTop: 8 }}>
            <div>
              <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 14 }}>Strengths</h3>
              <ul>{(score.strengths || []).map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}</ul>
            </div>
            <div>
              <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 14 }}>Red flags</h3>
              <ul>{(score.red_flags || []).length ? score.red_flags.map((x, i) => <li key={i} style={{ marginBottom: 4, color: 'var(--brick)' }}>{x}</li>) : <li className="muted">None flagged</li>}</ul>
            </div>
          </div>
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Criterion</th><th>Score</th><th>Reasoning</th></tr></thead>
            <tbody>
              {(score.breakdown || []).map((b) => (
                <tr key={b.key}>
                  <td>{CRIT_TITLE[b.key] || b.key}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{Math.round(b.score)}</td>
                  <td>{b.reasoning}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note" style={{ marginBottom: 0 }}>Model: {score.model} · rubric {score.rubric_version}</p>
        </>}
      </div>

      {/* Recordings + transcripts */}
      <div className="log-head"><h3>Call recordings &amp; transcripts</h3></div>
      <div className="panel">
        {recordings.length ? recordings.map((r) => (
          <div key={r.id} style={{ borderBottom: '1px dashed var(--paper-line)', paddingBottom: 14, marginBottom: 14 }}>
            <div className="topbar" style={{ marginBottom: 8 }}>
              <div className="muted" style={{ fontSize: 13 }}>🎧 {r.filename || 'recording'} · {r.kind} · {r.transcript_lang || 'lang?'} · {r.duration_sec ? Math.round(r.duration_sec) + 's' : ''} · <b>{r.status}</b></div>
            </div>
            <audio controls src={r.blob_url} style={{ width: '100%', maxWidth: 420 }} />
            {r.transcript && <p style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: '#FBFAF6', padding: 12, borderRadius: 4, marginTop: 8 }}>{r.transcript}</p>}
            {r.status === 'error' && <div className="banner err" style={{ marginTop: 8 }}>Transcription failed: {r.error}</div>}
          </div>
        )) : <div className="muted">No recordings uploaded.</div>}
      </div>

      {/* Raw submission data */}
      <div className="log-head"><h3>Submitted data</h3></div>
      <div className="panel">
        {type === 'bd' ? (
          <>
            <p><b>Established market price:</b> {INR(s.market_price)} — {s.comparables || 'no comparables noted'}</p>
            <table>
              <thead><tr><th>Config / size</th><th>Asking → outcome</th><th>Result</th><th>Notes</th></tr></thead>
              <tbody>
                {(rows.bd_calls || []).map((c) => (
                  <tr key={c.id}><td>{c.config} {c.size ? `/ ${c.size}sqft` : ''}</td><td className="mono">{INR(c.asking_price)} → {INR(c.outcome_price)}</td><td>{c.outcome || '—'}</td><td>{c.notes || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13 }}>Configs: {(rows.market_configs || []).length} · Plans: {(rows.market_plans || []).length} · Price calls: {(rows.market_prices || []).length} · Negotiations: {(rows.market_negotiations || []).length}</p>
            <table>
              <thead><tr><th>Broker</th><th>Config</th><th>Quote</th><th>Notes</th></tr></thead>
              <tbody>
                {(rows.market_prices || []).map((p) => (
                  <tr key={p.id}><td>{p.broker}<br /><span className="mono muted" style={{ fontSize: 11 }}>{p.phone}</span></td><td>{p.config}</td><td className="mono">{INR(p.price)}</td><td>{p.notes || '—'}</td></tr>
                ))}
              </tbody>
            </table>
            <table style={{ marginTop: 16 }}>
              <thead><tr><th>Broker</th><th>Facing</th><th>Call</th><th>Budget → offer</th><th>Notes</th></tr></thead>
              <tbody>
                {(rows.market_negotiations || []).map((n) => (
                  <tr key={n.id}><td>{n.broker}</td><td><span className={`pill ${n.facing === 'park' ? 'park' : 'nonpark'}`}>{n.facing === 'park' ? 'Park' : 'Non-park'}</span></td><td><span className={`pill ${n.call_type === 'compromise' ? 'compromise' : 'urgency'}`}>{n.call_type}</span></td><td className="mono">{INR(n.budget)} → {INR(n.offer)}</td><td>{n.notes || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
