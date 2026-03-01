import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ScoreGauge from '../components/ScoreGauge';
import { getScoreColorHex } from '../utils/scoreUtils';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports/stats').then(res => res.json()),
      fetch('/api/reports?limit=5').then(res => res.json())
    ])
      .then(([statsData, reportsData]) => {
        setStats(statsData);
        setRecentReports(reportsData.reports || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const avgScore = stats?.averageScore || 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Link to="/audit">
          <button className="primary">New Audit</button>
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-label text-secondary">Total Reports</div>
          <div className="stat-value">{stats?.totalReports || 0}</div>
        </div>

        <div className="stat-card stat-card-gauge card">
          <div className="stat-label text-secondary">Average Score</div>
          <ScoreGauge score={avgScore} size={80} />
        </div>

        <div className="stat-card card">
          <div className="stat-label text-secondary">Grades</div>
          <div className="stat-value">
            {Object.keys(stats?.gradeDistribution || {}).length} types
          </div>
        </div>
      </div>

      {stats?.gradeDistribution && Object.keys(stats.gradeDistribution).length > 0 && (
        <div className="card grade-distribution">
          <div className="section-header">Grade Distribution</div>
          <div className="grade-bars">
            {['A', 'B', 'C', 'D', 'F'].map(grade => {
              const count = stats.gradeDistribution[grade] || 0;
              const total = stats.totalReports || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={grade} className="grade-bar-row">
                  <span className="grade-bar-label">{grade}</span>
                  <div className="grade-bar-track">
                    <div
                      className={`grade-bar-fill grade-bar-${grade.toLowerCase()}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="grade-bar-count text-secondary">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card recent-reports">
        <div className="section-header">Recent Reports</div>
        {recentReports.length === 0 ? (
          <p className="text-secondary">No reports yet. Run your first audit!</p>
        ) : (
          <div className="reports-list">
            {recentReports.map(report => (
              <Link key={report.id} to={`/reports/${report.id}`} className="report-row">
                <div className="report-url text-mono">{report.url}</div>
                <div className="report-meta">
                  <span
                    className="report-score"
                    style={{
                      color: getScoreColorHex(report.overallScore),
                      background: `${getScoreColorHex(report.overallScore)}15`
                    }}
                  >
                    {report.overallScore}
                  </span>
                  <span className="report-date text-secondary">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
