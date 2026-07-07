import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import TopBar from '../components/TopBar.jsx';
import InstructionsModal from '../components/InstructionsModal.jsx';
import LegalFooter from '../components/LegalFooter.jsx';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState(null);

  return (
    <div className="wrap">
      <TopBar />
      <div className="mast">
        <div className="mast-left">
          <div className="kicker">Openhouse — Internship assignments</div>
          <h1>Choose your assignment</h1>
        </div>
      </div>
      <p className="note">Pick the role you’re applying for.</p>

      {user?.role === 'admin' && (
        <div className="banner ok">
          You’re signed in as an admin. <Link to="/admin">Open the hiring dashboard →</Link>
        </div>
      )}

      <div className="roles">
        <div className="role-card" onClick={() => navigate('/market')}>
          <div className="tag">Role 1</div>
          <h3>Market Research</h3>
          <p className="role-sub">Map a society’s pricing from the ground up — configurations, floor plans, and real broker quotes.</p>
          <div className="role-foot">
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); setInstructions('market'); }}
            >
              Read instructions
            </button>
            <span className="role-open">Open assignment →</span>
          </div>
        </div>
        <div className="role-card" onClick={() => navigate('/bd')}>
          <div className="tag">Role 2</div>
          <h3>Business Development</h3>
          <p className="role-sub">Set a defensible market price, then negotiate real owners down to it — on recorded calls.</p>
          <div className="role-foot">
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); setInstructions('bd'); }}
            >
              Read instructions
            </button>
            <span className="role-open">Open assignment →</span>
          </div>
        </div>
      </div>

      {instructions && (
        <InstructionsModal type={instructions} onClose={() => setInstructions(null)} />
      )}

      <LegalFooter />
    </div>
  );
}
