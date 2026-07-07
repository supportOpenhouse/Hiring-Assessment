import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import MarketTracker from './pages/MarketTracker.jsx';
import BDTracker from './pages/BDTracker.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import CandidateDetail from './pages/admin/CandidateDetail.jsx';

function Loading() {
  return (
    <div className="center"><div className="muted"><span className="spinner" /> Loading…</div></div>
  );
}

function Protected({ children, admin }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={loading ? <Loading /> : user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/market" element={<Protected><MarketTracker /></Protected>} />
      <Route path="/bd" element={<Protected><BDTracker /></Protected>} />
      <Route path="/admin" element={<Protected admin><Dashboard /></Protected>} />
      <Route path="/admin/:id" element={<Protected admin><CandidateDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
