import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { loginWithGoogleCredential } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState('');
  const [consent, setConsent] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="center">
      <div className="card-auth">
        <img src="/openhouse-logo.png" alt="Openhouse" className="brand-logo" />
        <div className="kicker">Internship</div>
        <h1>Assignment Portal</h1>
        <p>Sign in with Google to access your assignment. We use this only to keep the process serious and tie your work to you.</p>
        {!clientId && (
          <div className="banner err" style={{ marginTop: 18 }}>
            Google sign-in isn’t configured yet (missing <span className="mono">VITE_GOOGLE_CLIENT_ID</span>).
          </div>
        )}

        <label className="consent-row">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I agree to the <Link to="/terms">Terms &amp; Conditions</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>, and I confirm I will only upload call
            recordings I am legally entitled to share.
          </span>
        </label>

        <div className="gsi-wrap">
          {consent ? (
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
          ) : (
            <button
              className="btn btn-primary"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              onClick={() => setErr('Please accept the Terms & Privacy Policy to continue.')}
            >
              Sign in with Google
            </button>
          )}
        </div>
        {err && <div className="banner err" style={{ marginTop: 18 }}>{err}</div>}
      </div>
    </div>
  );
}
