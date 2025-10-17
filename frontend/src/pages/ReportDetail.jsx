import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ReportDetail.css';

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/reports/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setReport(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!report) {
    return <div>Report not found</div>;
  }

  const scores = [
    { label: 'SSR Readiness', value: report.ssrScore, key: 'ssr' },
    { label: 'Schema Coverage', value: report.schemaScore, key: 'schema' },
    { label: 'Semantic HTML', value: report.semanticScore, key: 'semantic' },
    { label: 'Content Extract', value: report.contentScore, key: 'content' }
  ];

  return (
    <div className="report-detail">
      <div className="report-header">
        <div>
          <Link to="/reports" className="back-link">← Reports</Link>
          <h1>{report.url}</h1>
          <p className="text-secondary">
            {new Date(report.createdAt).toLocaleString()} • {formatDuration(report.duration)}
          </p>
        </div>
        <div className="overall-score-large">
          <div className="score-value">{report.overallScore}</div>
          <div className={`grade-badge-large grade-${report.grade.toLowerCase()}`}>
            Grade {report.grade}
          </div>
        </div>
      </div>

      <div className="scores-grid">
        {scores.map(score => (
          <div key={score.key} className="card score-card">
            <div className="score-label text-secondary">{score.label}</div>
            <div className="score-bar-container">
              <div
                className="score-bar"
                style={{
                  width: `${score.value}%`,
                  background: getScoreColor(score.value)
                }}
              />
            </div>
            <div className="score-value-small">{score.value}</div>
          </div>
        ))}
      </div>

      {report.detectedIndustry && (
        <div className="card">
          <div className="section-header">Detected Industry</div>
          <p className="text-mono">{report.detectedIndustry}</p>
        </div>
      )}

      {report.recommendations && (
        <div className="card">
          <div className="section-header">AI Recommendations</div>
          <div className="recommendations">
            {renderRecommendations(report.recommendations)}
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-header">Audit Details</div>
        <details>
          <summary>View full audit results</summary>
          <div className="audit-json">
            {renderColoredJSON(report.auditResults)}
          </div>
        </details>
      </div>
    </div>
  );
}

function formatDuration(ms) {
  if (!ms) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function renderRecommendations(recommendations) {
  if (typeof recommendations === 'string') {
    return <div className="recommendation-text">{recommendations}</div>;
  }

  if (typeof recommendations === 'object' && recommendations !== null) {
    return (
      <div className="recommendations-list">
        {Object.entries(recommendations).map(([key, value]) => (
          <div key={key} className="recommendation-section">
            <h3 className="recommendation-title">{formatAuditName(key)}</h3>
            {value.summary && <p className="recommendation-summary">{value.summary}</p>}
            {value.recommendations && Array.isArray(value.recommendations) && (
              <ul className="recommendation-items">
                {value.recommendations.map((rec, idx) => (
                  <li key={idx}>
                    {typeof rec === 'string' ? rec : (
                      <div className="recommendation-item">
                        <strong>{rec.title}</strong>
                        {rec.description && <p>{rec.description}</p>}
                        {rec.why_it_matters && <p><em>Why it matters:</em> {rec.why_it_matters}</p>}
                        {rec.effort && <span className="badge">Effort: {rec.effort}</span>}
                        {rec.impact && <span className="badge">Impact: {rec.impact}</span>}
                        {rec.priority && <span className="badge">Priority: {rec.priority}</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {value.fullText && (
              <details className="recommendation-details">
                <summary>View full analysis</summary>
                <pre className="recommendation-full-text">{value.fullText}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    );
  }

  return <pre className="recommendation-text">{JSON.stringify(recommendations, null, 2)}</pre>;
}

function formatAuditName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function renderColoredJSON(obj, depth = 0) {
  if (obj === null) return <span className="json-null">null</span>;
  if (typeof obj === 'undefined') return <span className="json-undefined">undefined</span>;
  if (typeof obj === 'string') return <span className="json-string">"{obj}"</span>;
  if (typeof obj === 'number') return <span className="json-number">{obj}</span>;
  if (typeof obj === 'boolean') return <span className="json-boolean">{obj.toString()}</span>;

  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return <span>[]</span>;
    return (
      <span>
        {'[\n'}
        {obj.map((item, idx) => (
          <span key={idx}>
            {childIndent}
            {renderColoredJSON(item, depth + 1)}
            {idx < obj.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {indent}{']'}
      </span>
    );
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return <span>{'{}'}</span>;
    return (
      <span>
        {'{\n'}
        {entries.map(([key, value], idx) => (
          <span key={key}>
            {childIndent}
            <span className="json-key">"{key}"</span>: {renderColoredJSON(value, depth + 1)}
            {idx < entries.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {indent}{'}'}
      </span>
    );
  }

  return <span>{String(obj)}</span>;
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--error)';
}
