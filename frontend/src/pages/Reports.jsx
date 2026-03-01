import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getScoreColorHex, getScoreClass } from '../utils/scoreUtils';
import './Reports.css';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchReports = (page = 1) => {
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.append('search', search);

    fetch(`/api/reports?${params}`)
      .then(res => res.json())
      .then(data => {
        setReports(data.reports || []);
        setPagination(data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [search]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return;

    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      setReports(reports.filter(r => r.id !== id));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>Reports</h1>
        <Link to="/audit">
          <button className="primary">New Audit</button>
        </Link>
      </div>

      <div className="card reports-container">
        <div className="reports-toolbar">
          <input
            type="text"
            placeholder="Search by URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {pagination && (
            <span className="text-secondary">
              {pagination.total} report{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {reports.length === 0 ? (
          <p className="text-secondary" style={{ padding: '20px' }}>
            No reports found. Run your first audit!
          </p>
        ) : (
          <div className="reports-table">
            <div className="table-header">
              <div>URL</div>
              <div>Score</div>
              <div>Grade</div>
              <div>Date</div>
              <div>Actions</div>
            </div>
            {reports.map(report => (
              <div key={report.id} className="table-row">
                <div className="text-mono">{report.url}</div>
                <div>
                  <span
                    className="score-badge"
                    style={{
                      color: getScoreColorHex(report.overallScore),
                      background: `${getScoreColorHex(report.overallScore)}15`
                    }}
                  >
                    {report.overallScore}
                  </span>
                </div>
                <div>
                  <span className={`grade-badge grade-${getScoreClass(report.overallScore)}`}>
                    {report.grade}
                  </span>
                </div>
                <div className="text-secondary">
                  {new Date(report.createdAt).toLocaleDateString()}
                </div>
                <div className="actions">
                  <Link to={`/reports/${report.id}`}>
                    <button>View</button>
                  </Link>
                  <button onClick={() => handleDelete(report.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="pagination">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => fetchReports(page)}
                className={page === pagination.page ? 'active' : ''}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
