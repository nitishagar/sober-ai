// Cycle 3 — reconnect-header coverage (S9 decided: send).
//
// Pins two things:
//  1. byoAuditHeaders() contract against the real frontend/src/utils/byoKey.js
//     source (headers present when BYO is on with a key, null otherwise).
//  2. The Audit.jsx reconnect call-site spreads `...(byoAuditHeaders() || {})`
//     exactly like the initial POST, so a future edit cannot silently drop the
//     BYO headers on the session/.../stream resume path.
//
// NOTE: byoKey.js is a browser ESM module (frontend/vite), not require-able
// from this CommonJS suite, so it is loaded via source transform (strip the
// `export` keywords — the module has no imports) into a vm sandbox with a
// stubbed window.sessionStorage. The contract under test is the real file.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BYO_PATH = path.join(__dirname, '../../frontend/src/utils/byoKey.js');
const AUDIT_PATH = path.join(__dirname, '../../frontend/src/pages/Audit.jsx');

function loadByoKey(sessionData = {}) {
  const store = new Map(
    Object.entries(sessionData).map(([k, v]) => [String(k), String(v)])
  );
  const sessionStorage = {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => {
      store.set(String(k), String(v));
    },
    removeItem: (k) => {
      store.delete(String(k));
    }
  };
  const sandbox = { window: { sessionStorage }, console };
  sandbox.globalThis = sandbox;
  sandbox.module = { exports: {} };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  const src =
    fs.readFileSync(BYO_PATH, 'utf8').replace(/^export /gm, '') +
    '\n;module.exports = { isByoMode, setByoMode, getByoSettings, setByoSettings, clearByoSettings, byoAuditHeaders };';
  vm.runInContext(src, sandbox, { filename: 'byoKey.js' });
  return sandbox.module.exports;
}

const FULL_SETTINGS = JSON.stringify({
  provider: 'openai',
  apiKey: 'byo-test-key-123',
  endpoint: 'https://byo.example.com/v1',
  model: 'byo-model'
});

describe('byoAuditHeaders() contract (reconnect path sends BYO headers)', () => {
  it('returns null when BYO mode is off (no extra headers sent)', () => {
    const byo = loadByoKey();
    expect(byo.isByoMode()).toBe(false);
    expect(byo.byoAuditHeaders()).toBeNull();
  });

  it('returns null when BYO is on but no key is stored', () => {
    const byo = loadByoKey({ sober_byo_enabled: '1' });
    expect(byo.isByoMode()).toBe(true);
    expect(byo.byoAuditHeaders()).toBeNull();
  });

  it('returns the full X-LLM-* header set when BYO is on with a key', () => {
    const byo = loadByoKey({ sober_byo_enabled: '1', sober_byo: FULL_SETTINGS });
    expect(byo.byoAuditHeaders()).toEqual({
      'X-LLM-API-Key': 'byo-test-key-123',
      'X-LLM-Provider': 'openai',
      'X-LLM-Endpoint': 'https://byo.example.com/v1',
      'X-LLM-Model': 'byo-model'
    });
  });

  it('omits endpoint/model when unset and defaults the provider', () => {
    const byo = loadByoKey({
      sober_byo_enabled: '1',
      sober_byo: JSON.stringify({ apiKey: 'k-only' })
    });
    expect(byo.byoAuditHeaders()).toEqual({
      'X-LLM-API-Key': 'k-only',
      'X-LLM-Provider': 'openai'
    });
  });
});

describe('Audit.jsx reconnect call-site pin', () => {
  const src = fs.readFileSync(AUDIT_PATH, 'utf8');

  it('reconnect fetch spreads ...(byoAuditHeaders() || {})', () => {
    const reconnectIdx = src.indexOf('/session/${sessionIdRef.current}/stream');
    expect(reconnectIdx).toBeGreaterThan(-1);
    const window = src.slice(reconnectIdx, reconnectIdx + 500);
    expect(window).toContain('...(byoAuditHeaders() || {})');
  });

  it('initial POST still sends BYO headers via byoAuditHeaders() (no asymmetry)', () => {
    // The POST assigns `const byoHeaders = byoAuditHeaders()` then spreads
    // `...(byoHeaders || {})`; the reconnect spreads `...(byoAuditHeaders() || {})`
    // inline. Both resolve to the same header set — pin both halves.
    expect(src).toContain('const byoHeaders = byoAuditHeaders()');
    const postIdx = src.indexOf("'/api/audit-progress'");
    expect(postIdx).toBeGreaterThan(-1);
    const window = src.slice(postIdx, postIdx + 500);
    expect(window).toContain('...(byoHeaders || {})');
  });
});
