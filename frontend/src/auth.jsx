import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user } = await api.me();
          setUser(user);
        } catch {
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  // When any request hits a 401, the api layer clears the token and fires this
  // event; drop React auth state too so routing sends the user back to login.
  useEffect(() => {
    function onExpired() {
      setToken(null);
      setUser(null);
    }
    window.addEventListener('oh:auth-expired', onExpired);
    return () => window.removeEventListener('oh:auth-expired', onExpired);
  }, []);

  async function loginWithGoogleCredential(idToken) {
    const { token, user } = await api.loginWithGoogle(idToken);
    setToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, loginWithGoogleCredential, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
