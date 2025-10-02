import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Audit.css';

export default function Audit() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setProgress('Starting audit...');
    setProgressPercent(0);

    const token = localStorage.getItem('token');

    try {
      // Make a fetch request with streaming response
      const response = await fetch('/api/audit-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Audit failed');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.status === 'completed') {
                setProgress(data.message);
                setProgressPercent(100);

                setTimeout(() => {
                  navigate(`/reports/${data.reportId}`);
                }, 1000);
                return;
              } else if (data.status === 'error') {
                setError(data.message);
                setLoading(false);
                return;
              } else if (data.status === 'processing' || data.status === 'started') {
                setProgress(data.message);
                setProgressPercent(data.progress || 0);
              }
            } catch (err) {
              console.error('Failed to parse progress:', err);
            }
          }
        }
      }

    } catch (err) {
      console.error('Audit error:', err);
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  return (
    <div className="audit-page">
      <div className="audit-header">
        <h1>New Audit</h1>
        <p className="text-secondary">Enter a URL to analyze its SEO readiness</p>
      </div>

      <div className="card audit-form-container">
        <form onSubmit={handleSubmit} className="audit-form">
          <div className="form-group">
            <label>Website URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading && (
            <div className="progress-container">
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="progress-info">
                <span className="text-secondary">{progress}</span>
                <span className="progress-percent">{progressPercent}%</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="primary audit-button"
            disabled={loading}
          >
            {loading ? 'Running Audit...' : 'Run Audit'}
          </button>
        </form>
      </div>

      <div className="card audit-info">
        <div className="section-header">What we analyze</div>
        <ul className="info-list">
          <li>SSR (Server-Side Rendering) readiness</li>
          <li>Schema.org structured data coverage</li>
          <li>Semantic HTML structure</li>
          <li>Content extractability for AI crawlers</li>
          <li>Industry-specific recommendations</li>
        </ul>
      </div>
    </div>
  );
}
