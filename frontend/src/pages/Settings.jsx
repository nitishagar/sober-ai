import React, { useState, useEffect } from 'react';
import './Settings.css';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [llmStatus, setLlmStatus] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/settings/providers').then(r => r.json())
    ])
      .then(([settingsData, providerData]) => {
        setSettings(settingsData);
        setProviders(providerData);
        // Auto-test connection silently on load
        return fetch('/api/settings/test-connection', { method: 'POST' });
      })
      .then(r => r.json())
      .then(data => setLlmStatus(data))
      .catch(() => {})   // silent — user can still manually test
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const handleSave = async () => {
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
      const res = await fetch('/api/settings/test-connection', { method: 'POST' });
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

  const currentProvider = providers.find(p => p.id === settings.llm_provider) || providers[0];

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

        <div className="settings-field">
          <label>Provider</label>
          <select
            value={settings.llm_provider}
            onChange={e => handleChange('llm_provider', e.target.value)}
          >
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {(settings.llm_provider === 'ollama_local' || settings.llm_provider === 'ollama_cloud') && (
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

        {settings.llm_provider === 'ollama_cloud' && (
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
