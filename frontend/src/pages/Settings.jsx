import React, { useState, useEffect } from 'react';
import './Settings.css';
import {
  isByoMode,
  setByoMode,
  getByoSettings,
  setByoSettings
} from '../utils/byoKey';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [llmStatus, setLlmStatus] = useState(null);
  const [message, setMessage] = useState(null);
  // BYO mode: the browser holds the user's own key in sessionStorage (invariant H).
  const [byoMode, setByoModeState] = useState(false);
  const [byoSettings, setByoSettingsState] = useState(() => getByoSettings() || {
    provider: 'openai',
    apiKey: '',
    endpoint: '',
    model: ''
  });

  useEffect(() => {
    setByoModeState(isByoMode());
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/settings/providers').then(r => r.json())
    ])
      .then(([settingsData, providerData]) => {
        setSettings(settingsData);
        setProviders(providerData);
        // Auto-test connection silently on load (server-mode only)
        return fetch('/api/settings/test-connection', { method: 'POST' });
      })
      .then(r => r.json())
      .then(data => setLlmStatus(data))
      .catch(() => {})   // silent — user can still manually test
      .finally(() => setLoading(false));
  }, []);

  const toggleByoMode = (enabled) => {
    setByoMode(enabled);
    setByoModeState(enabled);
    setTestResult(null);
    setLlmStatus(null);
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const handleByoChange = (key, value) => {
    setByoSettingsState(prev => {
      const next = { ...prev, [key]: value };
      // Persist to sessionStorage immediately (invariant H: key stays in the browser).
      setByoSettings(next);
      return next;
    });
    setTestResult(null);
  };

  const handleSave = async () => {
    // In BYO mode the key never round-trips to the server — saving is client-side.
    if (byoMode) {
      setByoSettings(byoSettings);
      setMessage({ type: 'success', text: 'BYO settings saved to this browser session.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Settings saved: ${data.updated.join(', ')}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      let res;
      if (byoMode) {
        // Test the BYO provider from the body (does not persist the key server-side).
        res = await fetch('/api/settings/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: byoSettings.provider,
            apiKey: byoSettings.apiKey,
            endpoint: byoSettings.endpoint,
            model: byoSettings.model
          })
        });
      } else {
        res = await fetch('/api/settings/test-connection', { method: 'POST' });
      }
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ ok: false, message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="settings-page"><div className="settings-loading">Loading settings...</div></div>;
  }

  if (!settings) {
    return <div className="settings-page"><div className="settings-error">Failed to load settings</div></div>;
  }

  // In BYO mode, source the editable provider/key/endpoint/model from byoSettings;
  // otherwise from the server settings.
  const activeProvider = byoMode ? byoSettings.provider : settings.llm_provider;
  const currentProvider = providers.find(p => p.id === activeProvider) || providers[0];

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
        </div>
      )}

      <section className="settings-section">
        <h2>
          LLM Provider{' '}
          {llmStatus && (
            <span className={`llm-status-badge ${llmStatus.ok ? 'ok' : 'fail'}`}>
              {llmStatus.ok ? '● Connected' : '● Not connected'}
            </span>
          )}
        </h2>
        <p className="settings-description">
          Configure which AI model provider to use for generating audit recommendations.
        </p>

        <div className="settings-field settings-field--toggle">
          <label>
            <input
              type="checkbox"
              checked={byoMode}
              onChange={e => toggleByoMode(e.target.checked)}
              aria-label="Toggle bring-your-own-key mode"
            />
            {' '}Bring Your Own Key (this browser only)
          </label>
          <small className="settings-hint">
            {byoMode
              ? 'Your key is stored only in this browser session (sessionStorage) and sent per-request. It is never saved on the server.'
              : 'Store provider settings on the server. Enable to use your own key (e.g. NVIDIA NIM) without saving it server-side.'}
          </small>
        </div>

        {byoMode && (
          <div className="settings-message settings-message--info">
            BYO mode is on: provider, key, endpoint and model below are held in this browser only.
          </div>
        )}

        <div className="settings-field">
          <label>Provider</label>
          <select
            value={activeProvider}
            onChange={e => (byoMode
              ? handleByoChange('provider', e.target.value)
              : handleChange('llm_provider', e.target.value))}
          >
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {(activeProvider === 'ollama_local' || activeProvider === 'ollama_cloud') && !byoMode && (
          <>
            <div className="settings-field">
              <label>Ollama Endpoint</label>
              <input
                type="text"
                value={settings.ollama_endpoint}
                onChange={e => handleChange('ollama_endpoint', e.target.value)}
                placeholder="http://localhost:11434"
              />
            </div>

            <div className="settings-field">
              <label>Model</label>
              <input
                type="text"
                value={settings.ollama_model}
                onChange={e => handleChange('ollama_model', e.target.value)}
                placeholder="qwen3:4b"
              />
            </div>
          </>
        )}

        {activeProvider === 'ollama_cloud' && !byoMode && (
          <div className="settings-field">
            <label>Ollama API Key</label>
            <input
              type="password"
              value={settings.ollama_api_key}
              onChange={e => handleChange('ollama_api_key', e.target.value)}
              placeholder="Enter your Ollama API key"
            />
          </div>
        )}

        {byoMode ? (
          <>
            <div className="settings-field">
              <label>API Key</label>
              <input
                type="password"
                value={byoSettings.apiKey}
                onChange={e => handleByoChange('apiKey', e.target.value)}
                placeholder="Your API key (kept in this browser only)"
              />
            </div>

            <div className="settings-field">
              <label>Endpoint</label>
              <input
                type="text"
                value={byoSettings.endpoint}
                onChange={e => handleByoChange('endpoint', e.target.value)}
                placeholder="https://integrate.api.nvidia.com/v1"
              />
              <small className="settings-hint">
                Use <code>https://integrate.api.nvidia.com/v1</code> for NVIDIA NIM. Leave empty for the provider default.
              </small>
            </div>

            <div className="settings-field">
              <label>Model</label>
              <input
                type="text"
                value={byoSettings.model}
                onChange={e => handleByoChange('model', e.target.value)}
                placeholder="e.g. meta/llama-3.1-8b-instruct"
              />
            </div>
          </>
        ) : (
          <>
            {settings.llm_provider === 'openai' && (
              <>
                <div className="settings-field">
                  <label>OpenAI API Key</label>
                  <input
                    type="password"
                    value={settings.openai_api_key}
                    onChange={e => handleChange('openai_api_key', e.target.value)}
                    placeholder="sk-..."
                  />
                </div>

                <div className="settings-field">
                  <label>Endpoint</label>
                  <input
                    type="text"
                    value={settings.openai_endpoint}
                    onChange={e => handleChange('openai_endpoint', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                  <small className="settings-hint">
                    Use <code>https://integrate.api.nvidia.com/v1</code> for NVIDIA NIM. Defaults to the OpenAI API when empty.
                  </small>
                </div>

                <div className="settings-field">
                  <label>Model</label>
                  <input
                    type="text"
                    value={settings.openai_model}
                    onChange={e => handleChange('openai_model', e.target.value)}
                    placeholder="gpt-4o-mini"
                  />
                </div>
              </>
            )}

            {settings.llm_provider === 'anthropic' && (
              <>
                <div className="settings-field">
                  <label>Anthropic API Key</label>
                  <input
                    type="password"
                    value={settings.anthropic_api_key}
                    onChange={e => handleChange('anthropic_api_key', e.target.value)}
                    placeholder="your Anthropic API key"
                  />
                </div>

                <div className="settings-field">
                  <label>Model</label>
                  <input
                    type="text"
                    value={settings.anthropic_model}
                    onChange={e => handleChange('anthropic_model', e.target.value)}
                    placeholder="claude-haiku-4-5-20251001"
                  />
                </div>
              </>
            )}
          </>
        )}

        <div className="settings-actions">
          <button
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {testResult && (
          <div className={`settings-test-result ${testResult.ok ? 'success' : 'error'}`}>
            {testResult.ok ? 'Connected' : 'Failed'}: {testResult.message}
            {testResult.model && <span className="test-model"> (Model: {testResult.model})</span>}
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>About</h2>
        <p className="settings-description">
          SoberAI is a free, open-source AI optimization auditor. Configure your own LLM provider above
          to generate AI-powered recommendations for improving your website's AI-readiness.
        </p>
        <div className="settings-info">
          <span>Version: 0.3.0</span>
          <span>License: MIT</span>
        </div>
      </section>
    </div>
  );
}
