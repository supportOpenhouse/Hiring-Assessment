import { useRef, useState } from 'react';
import { api, uploadAudio } from '../api';

// Uploads a call recording to Vercel Blob and registers it against a call row.
// `recordings` is the list already attached to this ref (kind+ref_id).
export default function RecordingUploader({ assignmentType, kind, refId, recordings = [], disabled, onChange }) {
  const inputRef = useRef();
  const [pct, setPct] = useState(null);
  const [err, setErr] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    setPct(0);
    try {
      const blob = await uploadAudio(file, setPct);
      await api.registerRecording({
        assignment_type: assignmentType,
        kind,
        ref_id: refId,
        blob_url: blob.url,
        filename: file.name,
        content_type: file.type || blob.contentType,
        size_bytes: file.size,
      });
      setPct(null);
      onChange && onChange();
    } catch (e2) {
      setErr(e2.message);
      setPct(null);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(id) {
    try {
      await api.deleteRecording(id);
      onChange && onChange();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <div className="upload-row">
        {recordings.map((r) => (
          <span key={r.id} className={`rec-chip ${r.status === 'error' ? 'err' : ''}`}>
            🎧 {r.filename || 'recording'}
            {!disabled && <button className="del-btn" title="remove" onClick={() => remove(r.id)}>×</button>}
          </span>
        ))}
        {pct !== null && <span className="muted"><span className="spinner" /> {pct}%</span>}
        {!disabled && pct === null && (
          <>
            <input ref={inputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFile} />
            <button type="button" className="btn-ghost" onClick={() => inputRef.current?.click()}>
              {recordings.length ? '+ Add another recording' : '＋ Upload call recording'}
            </button>
          </>
        )}
      </div>
      {err && <div className="banner err" style={{ marginTop: 8 }}>{err}</div>}
    </div>
  );
}
