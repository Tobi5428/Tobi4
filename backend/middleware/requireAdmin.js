const verifyJwt = require('./verifyJwt');

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || 'demo@example.com';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function requireAdmin(req, res, next) {
  return verifyJwt(req, res, () => {
    const role = String(req.user?.role || '').toLowerCase();
    const email = String(req.user?.email || '').toLowerCase();
    const adminEmails = parseAdminEmails();

    if (role === 'admin' || adminEmails.includes(email)) {
      return next();
    }

    return res.status(403).json({ message: 'Admin access required.' });
  });
}

module.exports = requireAdmin;
