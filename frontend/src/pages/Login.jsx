import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { loginWithGoogleCredential } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="center">
      <div className="card-auth">
        <div className="kicker">Openhouse — Internship</div>
        <h1>Assignment Portal</h1>
        <p>Sign in with Google to access your assignment. We use this only to keep the process serious and tie your work to you.</p>
        {!clientId && (
          <div className="banner err" style={{ marginTop: 18 }}>
            Google sign-in isn’t configured yet (missing <span className="mono">VITE_GOOGLE_CLIENT_ID</span>).
          </div>
        )}
        <div className="gsi-wrap">
          <GoogleLogin
            onSuccess={async (cred) => {
              setErr('');
              try {
                await loginWithGoogleCredential(cred.credential);
                navigate('/');
              } catch (e) {
                setErr(e.message);
              }
            }}
            onError={() => setErr('Google sign-in failed. Please try again.')}
          />
        </div>
        {err && <div className="banner err" style={{ marginTop: 18 }}>{err}</div>}
      </div>
    </div>
  );
}
