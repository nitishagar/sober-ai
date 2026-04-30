import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './Compare.css';

const DELTAS = [
  { key: 'scoreDelta', label: 'Overall Score' },
  { key: 'ssrDelta', label: 'SSR Readiness' },
  { key: 'schemaDelta', label: 'Schema Coverage' },
  { key: 'semanticDelta', label: 'Semantic Structure' },
  { key: 'contentDelta', label: 'Content Extractability' }
];

function DeltaRow({ label, value }) {
  const cls = value > 0 ? 'delta-up' : value < 0 ? 'delta-down' : 'delta-zero';
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '—';
  return (
    <div className={`delta-row ${cls}`}>
      <span className="delta-label">{label}</span>
      <span className="delta-value">{arrow} {value > 0 ? '+' : ''}{value}</span>
    </div>
  );
}

function ReportColumn({ report, title }) {
  return (
    <div className="compare-column card">
      <div className="compare-column-title">{title}</div>
      <div className="text-mono compare-url">{report.url}</div>
      <div className="compare-stats">
        <div><span className="text-secondary">Score:</span> <strong>{report.overallScore}</strong></div>
        <div><span className="text-secondary">Grade:</span> <strong>{report.grade}</strong></div>
        <div><span className="text-secondary">Date:</span> {new Date(report.createdAt).toLocaleString()}</div>
      </div>
      <Link to={`/reports/${report.id}`}>View full report →</Link>
    </div>
  );
}

export default function Compare() {
  const { id1, id2 } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/reports/compare/${id1}/${id2}`)
      .then(res => {
        if (!res.ok) throw new Error('One or both reports not found');
        return res.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id1, id2]);

  if (loading) return <div className="compare-loading">Loading comparison...</div>;
  if (error || !data) {
    return (
      <div className="compare-loading">
        <p>{error || 'Comparison not found'}</p>
        <Link to="/reports" className="back-link">← Back to Reports</Link>
      </div>
    );
  }

  const { report1, report2, comparison } = data;

  return (
    <div className="compare-page">
      <div className="compare-header">
        <Link to="/reports" className="back-link">← Back to Reports</Link>
        <h1>Compare Reports</h1>
      </div>

      <div className="compare-columns">
        <ReportColumn report={report1} title="Report A" />
        <ReportColumn report={report2} title="Report B" />
      </div>

      <div className="card compare-deltas">
        <h2>Deltas (B − A)</h2>
        {DELTAS.map(d => (
          <DeltaRow key={d.key} label={d.label} value={comparison[d.key] ?? 0} />
        ))}
      </div>
    </div>
  );
}
