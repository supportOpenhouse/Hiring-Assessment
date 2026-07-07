import { useState } from 'react';
import { api } from '../api';

// Final submit control. `guard` returns an error string (blocking) or null.
export default function SubmitBar({ type, locked, guard, onSubmitted, summary }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (locked) return null;

  async function submit() {
    const problem = guard ? guard() : null;
    if (problem) { setErr(problem); return; }
    if (!window.confirm('Submit for review? You won’t be able to edit after this.')) return;
    setErr('');
    setBusy(true);
    try {
      await api.submit(type);
      onSubmitted && onSubmitted();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 28, borderTop: '2px solid var(--ink)', paddingTop: 18 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <div className="muted" style={{ fontSize: 13 }}>{summary}</div>
        <button className="btn btn-primary" style={{ marginTop: 0 }} disabled={busy} onClick={submit}>
          {busy ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>
      {err && <div className="banner err" style={{ marginTop: 12 }}>{err}</div>}
    </div>
  );
}
