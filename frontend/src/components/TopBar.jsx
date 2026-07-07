import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function TopBar({ back }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {back && <Link to={back} className="btn-ghost" style={{ textDecoration: 'none' }}>← Back</Link>}
        <Link to="/" aria-label="Openhouse home">
          <img src="/openhouse-logo.png" alt="Openhouse" className="brand-logo-sm" />
        </Link>
      </div>
      <div className="who">
        {user?.picture && <img src={user.picture} alt="" referrerPolicy="no-referrer" />}
        <span>{user?.name || user?.email}{user?.role === 'admin' ? ' · admin' : ''}</span>
        <button className="btn-ghost" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
      </div>
    </div>
  );
}
