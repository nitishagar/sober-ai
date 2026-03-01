import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PhaseIndicator from '../components/PhaseIndicator';
import './Audit.css';

export default function Audit() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const startTimer = () => {
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setProgress('Starting audit...');
    setProgressPercent(0);
    setElapsed(0);
    setEta(null);
    startTimer();

    try {
      const response = await fetch('/api/audit-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Audit failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.status === 'completed') {
                setProgress(data.message);
                setProgressPercent(100);
                setCurrentPhase(4);
                setEta(null);
                stopTimer();

                setTimeout(() => {
                  navigate(`/reports/${data.reportId}`);
                }, 1000);
                return;
              } else if (data.status === 'error') {
                setError(data.message);
                setLoading(false);
                setCurrentPhase(0);
                setEta(null);
                stopTimer();
                return;
              } else if (data.status === 'processing' || data.status === 'started') {
                setProgress(data.message);
                setProgressPercent(Math.min(data.progress || 0, 99));

                if (data.phase) {
                  setCurrentPhase(data.phase);
                }
                if (data.eta !== undefined && data.eta !== null) {
                  setEta(prev => {
                    if (prev === null) return data.eta;
                    // Exponential moving average: 70% new value, 30% previous
                    return Math.max(5, Math.round(data.eta * 0.7 + prev * 0.3));
                  });
                }
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
      stopTimer();
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
            <>
              <PhaseIndicator currentPhase={currentPhase} />

              <div className="progress-container">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  ></div>
                </div>
                <div className="progress-info">
                  <span className="text-secondary">{progress}</span>
                  <span className="progress-percent">{Math.min(progressPercent, 100)}%</span>
                </div>
                <div className="progress-timing">
                  <span className="text-secondary">Elapsed: {formatTime(elapsed)}</span>
                  {eta && <span className="text-secondary">~{formatTime(eta)} remaining</span>}
                </div>
              </div>
            </>
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
