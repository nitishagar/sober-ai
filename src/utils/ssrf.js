const dns = require('dns');
const net = require('net');

/**
 * Whether a single resolved IP address is private / loopback / link-local.
 * - IPv4: 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, 0.0.0.0/8
 * - IPv6: ::1, fc00::/7 (unique-local + link-local fe80::/10 is within fc00::/7? no —
 *   fe80::/10 is link-local; covered separately)
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    // Reject the literal loopback/link-local/private ranges, plus the all-zeros.
    return (
      ip.startsWith('10.') ||
      ip.startsWith('127.') ||
      ip.startsWith('169.254.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('0.') ||
      is172Private(ip)
    );
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||               // loopback
      lower.startsWith('fc') ||         // unique local fc00::/7 (fc.. and fd..)
      lower.startsWith('fd') ||
      lower.startsWith('fe80')          // link-local
    );
  }
  return false;
}

// 172.16.0.0 – 172.31.255.255 is private (172.16/12).
function is172Private(ip) {
  if (!ip.startsWith('172.')) return false;
  const second = parseInt(ip.split('.')[1], 10);
  return second >= 16 && second <= 31;
}

/**
 * SSRF guard (invariant I): reject URLs whose host resolves to a private,
 * loopback, or link-local IP. Safe-by-default: rejects if ANY resolved IP is
 * private (defends against DNS rebinding where a host resolves to both public
 * and private addresses). Env-gated so local dev that audits internal URLs can
 * disable it with SSRF_BLOCK_PRIVATE=0.
 *
 * @param {string} url
 * @returns {Promise<{blocked: boolean, reason?: string}>}
 */
async function isPrivateTarget(url) {
  // Skip the guard entirely when explicitly disabled (local dev / internal audits).
  if (process.env.SSRF_BLOCK_PRIVATE === '0') {
    return { blocked: false };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    // Malformed URLs are the validator's job (Phase 3); treat as not-our-problem here.
    return { blocked: false };
  }

  const host = parsed.hostname;
  if (!host) return { blocked: false };

  // Literal IP in the URL — check directly without DNS.
  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      return { blocked: true, reason: `Target IP ${host} is private/loopback` };
    }
    return { blocked: false };
  }

  // Resolve the hostname and reject if ANY address is private.
  let addresses;
  try {
    addresses = await dns.promises.lookup(host, { all: true });
  } catch (err) {
    // DNS failure (e.g. ENOTFOUND) — let the downstream audit report the error
    // rather than blocking here; SSRF guard only blocks known-private targets.
    return { blocked: false };
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      return { blocked: true, reason: `${host} resolves to private IP ${address}` };
    }
  }

  return { blocked: false };
}

module.exports = { isPrivateTarget, isPrivateIp };
