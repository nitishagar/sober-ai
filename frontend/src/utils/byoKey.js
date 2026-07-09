/**
 * Browser-side BYO-key storage (invariant H).
 *
 * In BYO mode the user's own LLM key, endpoint, provider and model selection
 * live in sessionStorage — NOT localStorage, and never round-tripped through
 * PUT /api/settings. sessionStorage survives a refresh but is cleared on tab
 * close, limiting persistent XSS exposure while there is no CSP.
 */

const SETTINGS_KEY = 'sober_byo';
const ENABLED_KEY = 'sober_byo_enabled';

function safeStorage() {
  try {
    // Guard against environments where sessionStorage is unavailable (SSR, disabled).
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch (_) {
    return null;
  }
}

/**
 * Whether BYO mode is enabled for this browser session.
 * @returns {boolean}
 */
export function isByoMode() {
  const storage = safeStorage();
  if (!storage) return false;
  return storage.getItem(ENABLED_KEY) === '1';
}

/**
 * Enable or disable BYO mode. Disabling does NOT clear a stored key — call
 * clearByoSettings() for that — it only switches the mode toggle.
 * @param {boolean} enabled
 */
export function setByoMode(enabled) {
  const storage = safeStorage();
  if (!storage) return;
  if (enabled) {
    storage.setItem(ENABLED_KEY, '1');
  } else {
    storage.removeItem(ENABLED_KEY);
  }
}

/**
 * Read the stored BYO settings (provider/apiKey/endpoint/model).
 * Returns null when nothing is stored.
 * @returns {{provider:string,apiKey:string,endpoint:string,model:string}|null}
 */
export function getByoSettings() {
  const storage = safeStorage();
  if (!storage) return null;
  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider || 'openai',
      apiKey: parsed.apiKey || '',
      endpoint: parsed.endpoint || '',
      model: parsed.model || ''
    };
  } catch (_) {
    return null;
  }
}

/**
 * Persist BYO settings to sessionStorage.
 * @param {{provider?:string,apiKey?:string,endpoint?:string,model?:string}} settings
 */
export function setByoSettings(settings = {}) {
  const storage = safeStorage();
  if (!storage) return;
  const current = getByoSettings() || {};
  const merged = {
    provider: settings.provider ?? current.provider ?? 'openai',
    apiKey: settings.apiKey ?? current.apiKey ?? '',
    endpoint: settings.endpoint ?? current.endpoint ?? '',
    model: settings.model ?? current.model ?? ''
  };
  storage.setItem(SETTINGS_KEY, JSON.stringify(merged));
}

/**
 * Remove stored BYO settings (e.g. on explicit clear / log-out).
 */
export function clearByoSettings() {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(SETTINGS_KEY);
}

/**
 * The headers to send on the audit POST when in BYO mode, or null when BYO
 * mode is off or no key is stored. Used by the Audit page.
 * @returns {{'X-LLM-API-Key':string,'X-LLM-Provider':string,'X-LLM-Endpoint':string,'X-LLM-Model':string}|null}
 */
export function byoAuditHeaders() {
  if (!isByoMode()) return null;
  const settings = getByoSettings();
  if (!settings || !settings.apiKey) return null;
  const headers = {
    'X-LLM-API-Key': settings.apiKey,
    'X-LLM-Provider': settings.provider || 'openai'
  };
  if (settings.endpoint) headers['X-LLM-Endpoint'] = settings.endpoint;
  if (settings.model) headers['X-LLM-Model'] = settings.model;
  return headers;
}
