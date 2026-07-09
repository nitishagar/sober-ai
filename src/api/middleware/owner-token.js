const crypto = require('crypto');

const COOKIE_NAME = 'sober_owner';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Parse the Cookie header into a plain object without requiring cookie-parser.
 * @param {string|undefined} cookieHeader
 * @returns {Object<string,string>}
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const cookies = {};
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

/**
 * Whether report isolation by owner token is active for this process.
 * Active when OWNER_TOKEN_REQUIRED is truthy, OR in production by default.
 * Inactive (null token → reports stay global) otherwise, preserving desktop/local.
 */
function isolationActive() {
  const flag = process.env.OWNER_TOKEN_REQUIRED;
  if (flag !== undefined && flag !== null && flag !== '') {
    return flag === '1' || flag.toLowerCase() === 'true';
  }
  return process.env.NODE_ENV === 'production';
}

/**
 * Issues / reads an ephemeral owner token (invariant G: per-browser report
 * isolation, no signup). The token is an opaque httpOnly cookie so XSS cannot
 * read it. When isolation is inactive (local/desktop), req.ownerToken is null
 * and reports stay global/legacy-visible.
 */
function ownerTokenMiddleware(req, res, next) {
  if (!isolationActive()) {
    req.ownerToken = null;
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  let token = cookies[COOKIE_NAME];

  // Issue a new token if none is present (idempotent — no DB write).
  if (!token) {
    token = crypto.randomUUID();
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS
      // No `secure` flag: required to work over plain-http Electron / http-terminated cloud.
    });
  }

  req.ownerToken = token;
  next();
}

module.exports = { ownerTokenMiddleware, COOKIE_NAME, parseCookies, isolationActive };
