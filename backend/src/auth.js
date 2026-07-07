const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { one } = require('./db');
const { GOOGLE_CLIENT_ID, SESSION_SECRET, ADMIN_EMAILS } = require('./config');

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function isAdmin(email) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase());
}

// Verify a Google ID token (from Google Identity Services on the frontend)
// and return the verified profile.
async function verifyGoogleIdToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const p = ticket.getPayload();
  if (!p || !p.email || !p.email_verified) {
    const err = new Error('Google account email not verified');
    err.status = 401;
    throw err;
  }
  return { email: p.email.toLowerCase(), name: p.name, picture: p.picture };
}

// Upsert the user record and return it.
async function upsertUser({ email, name, picture }) {
  const role = isAdmin(email) ? 'admin' : 'candidate';
  return one(
    `insert into users (email, name, picture, role)
       values ($1, $2, $3, $4)
     on conflict (email) do update
       set name = coalesce(excluded.name, users.name),
           picture = coalesce(excluded.picture, users.picture),
           role = $4
     returning *`,
    [email, name || null, picture || null, role]
  );
}

// Issue our own 7-day session token so we don't depend on Google's 1h token.
function issueSession(user) {
  return jwt.sign(
    { uid: user.id, email: user.email, role: user.role },
    SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

function verifySession(token) {
  return jwt.verify(token, SESSION_SECRET);
}

// Express middleware — requires a valid Bearer session token.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = verifySession(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired' });
  }
}

// Admin routes re-check the role from the database rather than trusting the
// (up to 7-day-old) role claim baked into the JWT — demotions and deletions
// take effect immediately.
function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const user = await one(`select role from users where id = $1`, [req.user.uid]);
      if (!user) return res.status(401).json({ error: 'Not authenticated' });
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      next();
    } catch (e) {
      next(e);
    }
  });
}

module.exports = {
  verifyGoogleIdToken,
  upsertUser,
  issueSession,
  verifySession,
  requireAuth,
  requireAdmin,
  isAdmin,
  GOOGLE_CLIENT_ID,
};
