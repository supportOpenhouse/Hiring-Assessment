import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import TopBar from '../../components/TopBar.jsx';

const REC_LABEL = { strong: 'Strong', consider: 'Consider', weak: 'Weak' };

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    try { const { candidates } = await api.adminCandidates(); setRows(candidates); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div className="center"><span className="spinner" /></div>;

  const shown = rows.filter((r) => filter === 'all' || r.assignment_type === filter);
  const scored = (n) => (n === null || n === undefined ? '—' : Math.round(n));

  return (
    <div className="wrap">
      <TopBar back="/" />
      <div className="mast">
        <div className="mast-left">
          <div className="kicker">Openhouse — hiring</div>
          <h1>Candidate dashboard</h1>
        </div>
        <div className="mast-right">{shown.length} submissions</div>
      </div>

      {error && <div className="banner err">{error}</div>}

      <div className="tabs" style={{ marginBottom: 16 }}>
        {[['all', 'All'], ['market', 'Market Research'], ['bd', 'Business Dev']].map(([k, l]) => (
          <button key={k} className={`tab-btn ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)} style={{ borderRadius: 4 }}>{l}</button>
        ))}
        <button className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={load}>↻ Refresh</button>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr><th>Score</th><th>Candidate</th><th>Role</th><th>Society</th><th>Recording</th><th>Status</th><th>Verdict</th><th></th></tr>
          </thead>
          <tbody>
            {shown.length ? shown.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{scored(r.overall)}</td>
                <td>{r.name || r.email}<br /><span className="mono muted" style={{ fontSize: 11 }}>{r.email}</span></td>
                <td><span className="pill status">{r.assignment_type === 'bd' ? 'BD' : 'Market'}</span></td>
                <td>{r.society || '—'}</td>
                <td className="mono">{r.transcribed}/{r.recordings}</td>
                <td>{r.status === 'scored' ? '✓ scored' : r.status === 'scoring' ? <span className="muted"><span className="spinner" /> scoring</span> : r.status === 'error' ? <span style={{ color: 'var(--brick)' }}>error</span> : r.status}</td>
                <td>{r.recommendation ? <span className={`pill ${r.recommendation}`}>{REC_LABEL[r.recommendation]}</span> : '—'}</td>
                <td><Link to={`/admin/${r.id}`} className="btn-ghost" style={{ textDecoration: 'none' }}>Open →</Link></td>
              </tr>
            )) : <tr className="empty-row"><td colSpan={8}>No submissions yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="note">Scores are computed automatically after submission (transcription + rubric grading). If a row is stuck on “scoring”, the cron job may not have run yet — open it and use “Re-run scoring”.</p>
    </div>
  );
}
