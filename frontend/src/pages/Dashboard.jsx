import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    Promise.all([
      fetch('/api/reports/stats', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('/api/reports?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json())
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

  const planLimits = {
    FREE: 10,
    PROFESSIONAL: 100,
    TEAM: '∞',
    ENTERPRISE: '∞'
  };

  const limit = planLimits[user?.plan] || 10;
  const used = user?.auditsThisMonth || 0;

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

        <div className="stat-card card">
          <div className="stat-label text-secondary">Average Score</div>
          <div className="stat-value">{stats?.averageScore || 0}</div>
        </div>

        <div className="stat-card card">
          <div className="stat-label text-secondary">This Month</div>
          <div className="stat-value">
            {used} / {limit}
          </div>
        </div>
      </div>

      {stats?.gradeDistribution && (
        <div className="card grade-distribution">
          <div className="section-header">Grade Distribution</div>
          <div className="grades">
            {Object.entries(stats.gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="grade-item">
                <span className="grade-label">{grade}</span>
                <span className="grade-count text-secondary">{count}</span>
              </div>
            ))}
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
                  <span className={`score score-${report.grade.toLowerCase()}`}>
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
