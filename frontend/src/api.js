import { upload } from '@vercel/blob/client';

// Single-project deploy: frontend and API share one origin, so default to
// relative "/api" paths in production. In dev, fall back to the local backend.
const BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');
const TOKEN_KEY = 'oh_session';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    setToken(null);
    throw new Error('Session expired — please sign in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  base: BASE,
  loginWithGoogle: (idToken) => req('/api/auth/google', { method: 'POST', body: { idToken } }),
  me: () => req('/api/me'),

  getSubmission: (type) => req(`/api/submission/${type}`),
  updateSubmission: (type, fields) => req(`/api/submission/${type}`, { method: 'PUT', body: fields }),
  addRow: (type, table, row) => req(`/api/submission/${type}/rows/${table}`, { method: 'POST', body: row }),
  deleteRow: (type, table, id) => req(`/api/submission/${type}/rows/${table}/${id}`, { method: 'DELETE' }),
  submit: (type) => req(`/api/submission/${type}/submit`, { method: 'POST' }),

  registerRecording: (payload) => req('/api/recordings', { method: 'POST', body: payload }),
  deleteRecording: (id) => req(`/api/recordings/${id}`, { method: 'DELETE' }),

  adminCandidates: () => req('/api/admin/candidates'),
  adminSubmission: (id) => req(`/api/admin/submission/${id}`),
  adminRescore: (id) => req(`/api/admin/rescore/${id}`, { method: 'POST' }),
};

// Upload an audio file straight to Vercel Blob using a token minted by our backend.
export async function uploadAudio(file, onProgress) {
  const token = getToken();
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const pathname = `recordings/${Date.now()}_${safe}`;
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: `${BASE}/api/upload`,
    clientPayload: JSON.stringify({}),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onUploadProgress: onProgress ? (e) => onProgress(e.percentage) : undefined,
  });
  return blob; // { url, pathname, contentType, ... }
}
