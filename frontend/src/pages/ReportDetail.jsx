import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ScoreGauge from '../components/ScoreGauge';
import { getScoreClass, getScoreColorHex } from '../utils/scoreUtils';
import './ReportDetail.css';

const AUDIT_CATEGORIES = [
  { key: 'ssrReadiness', label: 'SSR Readiness', scoreField: 'ssrScore', icon: '🖥️' },
  { key: 'schemaCoverage', label: 'Schema Coverage', scoreField: 'schemaScore', icon: '🏷️' },
  { key: 'semanticStructure', label: 'Semantic Structure', scoreField: 'semanticScore', icon: '🏗️' },
  { key: 'contentExtractability', label: 'Content Extractability', scoreField: 'contentScore', icon: '📄' },
  { key: 'machineReadability', label: 'Machine Readability', scoreField: 'machineReadabilityScore', icon: '🤖' }
];

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Report not found');
        return res.json();
      })
      .then(data => setReport(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="report-loading">Loading report...</div>;
  }

  if (error || !report) {
    return (
      <div className="report-loading">
        <p>{error || 'Report not found'}</p>
        <Link to="/reports" className="back-link">← Back to Reports</Link>
      </div>
    );
  }

  const scores = [
    { label: 'SSR Readiness', value: report.ssrScore, key: 'ssr' },
    { label: 'Schema Coverage', value: report.schemaScore, key: 'schema' },
    { label: 'Semantic HTML', value: report.semanticScore, key: 'semantic' },
    { label: 'Content Extract.', value: report.contentScore, key: 'content' },
    { label: 'Machine Readability', value: report.machineReadabilityScore, key: 'machine' }
  ];

  return (
    <div className="report-detail">
      {/* Header with URL and overall gauge */}
      <div className="report-header">
        <div className="report-header-info">
          <Link to="/reports" className="back-link">← Back to Reports</Link>
          <h1 className="report-url-title">{report.url}</h1>
          <p className="text-secondary">
            {new Date(report.createdAt).toLocaleString()} • {formatDuration(report.duration)}
            {report.detectedIndustry && ` • ${report.detectedIndustry}`}
          </p>
        </div>
        <div className="report-overall-gauge">
          <ScoreGauge score={report.overallScore} size={140} />
          <div className={`grade-badge grade-${getScoreClass(report.overallScore)}`}>
            Grade {report.grade}
          </div>
        </div>
      </div>

      {/* Category score gauges */}
      <div className="category-gauges">
        {scores.map(score => (
          <ScoreGauge
            key={score.key}
            score={score.value}
            label={score.label}
            size={100}
          />
        ))}
      </div>

      {/* Per-category audit sections */}
      {AUDIT_CATEGORIES.map(category => (
        <AuditCategorySection
          key={category.key}
          category={category}
          score={report[category.scoreField]}
          auditResult={report.auditResults?.[category.key]}
          recommendation={report.recommendations?.[category.key]}
        />
      ))}
    </div>
  );
}

function AuditCategorySection({ category, score, auditResult, recommendation }) {
  const [showFindings, setShowFindings] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const severity = auditResult?.severity || 'unknown';
  const findings = auditResult?.findings || [];
  const criticalCount = findings.filter(f => f.type === 'critical').length;
  const warningCount = findings.filter(f => f.type === 'warning').length;
  const passCount = findings.filter(f => f.type === 'pass').length;

  const hasRecommendations = recommendation?.recommendations?.length > 0;
  const isPassing = severity === 'pass';

  return (
    <div className="card audit-category-section">
      {/* Category Header */}
      <div className="category-header">
        <div className="category-header-left">
          <span className="category-icon">{category.icon}</span>
          <h2 className="category-title">{category.label}</h2>
          <SeverityBadge severity={severity} />
        </div>
        <div className="category-header-right">
          <span
            className="category-score"
            style={{ color: getScoreColorHex(score) }}
          >
            {score}
          </span>
        </div>
      </div>

      {/* Finding summary counts */}
      {findings.length > 0 && (
        <div className="finding-summary">
          {criticalCount > 0 && (
            <span className="finding-count finding-count-critical">{criticalCount} critical</span>
          )}
          {warningCount > 0 && (
            <span className="finding-count finding-count-warning">{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
          )}
          {passCount > 0 && (
            <span className="finding-count finding-count-pass">{passCount} passed</span>
          )}
        </div>
      )}

      {/* Recommendations */}
      {hasRecommendations ? (
        <RecommendationList recommendation={recommendation} />
      ) : isPassing ? (
        <div className="category-pass-message">
          No issues found — this category meets AI optimization standards.
        </div>
      ) : (
        <div className="category-no-recs">
          No AI recommendations available for this category.
        </div>
      )}

      {/* Findings toggle */}
      {findings.length > 0 && (
        <div className="category-toggle-section">
          <button
            className="category-toggle-btn"
            onClick={() => setShowFindings(!showFindings)}
          >
            {showFindings ? '▼' : '▶'} {findings.length} audit finding{findings.length !== 1 ? 's' : ''}
          </button>
          {showFindings && (
            <div className="findings-list">
              {findings.map((finding, idx) => (
                <FindingItem key={idx} finding={finding} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raw data toggle */}
      {auditResult && (
        <div className="category-toggle-section">
          <button
            className="category-toggle-btn"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? '▼' : '▶'} View raw audit data
          </button>
          {showRaw && (
            <div className="audit-json">
              <pre>{JSON.stringify(auditResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const labels = {
    pass: 'Passed',
    warning: 'Needs Work',
    critical: 'Critical'
  };
  return (
    <span className={`severity-badge severity-${severity}`}>
      {labels[severity] || severity}
    </span>
  );
}

function RecommendationList({ recommendation }) {
  const recs = recommendation.recommendations || [];
  return (
    <div className="rec-list">
      {recommendation.summary && (
        <p className="rec-summary">{recommendation.summary}</p>
      )}
      <div className="rec-items">
        {recs.map((rec, idx) => (
          <div key={idx} className="rec-item">
            {typeof rec === 'string' ? (
              <p>{rec}</p>
            ) : (
              <>
                <div className="rec-item-header">
                  <strong>{rec.title}</strong>
                  <div className="rec-badges">
                    {rec.priority && (
                      <span className={`rec-badge rec-priority-${String(rec.priority).toLowerCase()}`}>
                        {rec.priority}
                      </span>
                    )}
                    {rec.impact && <span className="rec-badge">{rec.impact} impact</span>}
                    {rec.effort && <span className="rec-badge">{rec.effort} effort</span>}
                  </div>
                </div>
                {rec.description && <p className="rec-item-desc">{rec.description}</p>}
                {rec.why_it_matters && (
                  <p className="rec-item-why">
                    <em>Why it matters:</em> {rec.why_it_matters}
                  </p>
                )}
                {rec.code_example && (
                  <pre className="rec-code-example">{rec.code_example}</pre>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {recommendation.raw && (
        <details className="rec-full-text-toggle">
          <summary>View full AI analysis</summary>
          <pre className="rec-full-text">{recommendation.raw}</pre>
        </details>
      )}
    </div>
  );
}

function FindingItem({ finding }) {
  return (
    <div className={`finding-item finding-type-${finding.type}`}>
      <div className="finding-item-header">
        <span className={`finding-type-badge finding-badge-${finding.type}`}>
          {finding.type}
        </span>
        <strong className="finding-title">{finding.title}</strong>
      </div>
      <p className="finding-message">{finding.message}</p>
      {finding.recommendation && (
        <p className="finding-recommendation">
          <em>Fix:</em> {finding.recommendation}
        </p>
      )}
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
