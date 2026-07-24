import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getScoreColorHex, getScoreClass } from '../utils/scoreUtils';
import './Reports.css';

const SORTABLE = { url: 'URL', overallScore: 'Score', grade: 'Grade', createdAt: 'Date' };

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const navigate = useNavigate();

  // AbortController-per-fetch: cancels any in-flight list fetch when a newer one
  // starts, closing both the pre-existing search/sort last-resolve-wins race and the
  // delete-vs-fetch resurrection window (invariant I-3). Holds the latest controller.
  const fetchAbortRef = useRef(null);

  const fetchReports = (targetPage = page) => {
    // Cancel any prior in-flight fetch so a slow, stale .then can never overwrite a
    // fresh result (and is aborted before re-adding a just-deleted row).
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    const params = new URLSearchParams({
      page: targetPage,
      limit: pageSize,
      sortBy,
      sortOrder
    });
    if (search) params.append('search', search);

    fetch(`/api/reports?${params}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load reports');
        return res.json();
      })
      .then(data => {
        setReports(data.reports || []);
        setPagination(data.pagination);
        setError(null);
      })
      .catch(err => {
        // An aborted fetch is the expected cancellation path — ignore it. Surface
        // all other failures rather than silently console.error-ing them.
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load reports');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    fetchReports(page);
    // Abort the in-flight fetch on unmount / deps change so a late-arriving
    // response cannot setState after unmount (no setState-after-unmount).
    return () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy, sortOrder, pageSize, page]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return;
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        // No state mutation on failure: a failed delete must not silently remove
        // the row. Surface the error to the user instead.
        setError('Failed to delete report');
        return;
      }
      setError(null);
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Refetch (AbortController-guarded) rather than hand-filtering state, so a
      // concurrent in-flight list fetch cannot resurrect the deleted row.
      fetchReports(page);
    } catch (err) {
      setError(err.message || 'Failed to delete report');
    }
  };

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(parseInt(e.target.value, 10));
    setPage(1);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompare = () => {
    const [a, b] = [...selected];
    navigate(`/app/compare/${a}/${b}`);
  };

  const handleExportCsv = async () => {
    const params = new URLSearchParams({
      page: 1,
      limit: 10000,
      sortBy,
      sortOrder
    });
    if (search) params.append('search', search);
    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    const rows = (data.reports || []).map(r => [
      csvEscape(r.url),
      csvEscape(r.overallScore),
      csvEscape(r.grade),
      csvEscape(new Date(r.createdAt).toISOString())
    ].join(','));
    const csv = ['URL,Score,Grade,Date', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sortIndicator = (col) => {
    if (sortBy !== col) return '';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  if (loading) return <div>Loading...</div>;

  const canCompare = selected.size === 2;

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>Reports</h1>
        <Link to="/app/audit">
          <button className="primary">New Audit</button>
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card reports-container">
        <div className="reports-toolbar">
          <input
            type="text"
            placeholder="Search by URL..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="search-input"
          />
          <div className="reports-toolbar-actions">
            <select
              className="page-size-selector"
              value={pageSize}
              onChange={handlePageSizeChange}
              aria-label="Page size"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              onClick={handleCompare}
              disabled={!canCompare}
              title={canCompare ? 'Compare selected reports' : 'Select exactly 2 reports'}
            >
              Compare Selected
            </button>
            <button onClick={handleExportCsv}>Export CSV</button>
            {pagination && (
              <span className="text-secondary">
                {pagination.total} report{pagination.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {reports.length === 0 ? (
          <p className="text-secondary" style={{ padding: '20px' }}>
            No reports found. Run your first audit!
          </p>
        ) : (
          <div className="reports-table">
            <div className="table-header">
              <div></div>
              {Object.entries(SORTABLE).map(([col, label]) => (
                <button
                  key={col}
                  type="button"
                  className="sort-header"
                  onClick={() => toggleSort(col)}
                >
                  {label}{sortIndicator(col)}
                </button>
              ))}
              <div>Actions</div>
            </div>
            {reports.map(report => (
              <div key={report.id} className="table-row">
                <div>
                  <input
                    type="checkbox"
                    checked={selected.has(report.id)}
                    onChange={() => toggleSelect(report.id)}
                    aria-label={`Select ${report.url}`}
                  />
                </div>
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
                  <Link to={`/app/reports/${report.id}`}>
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
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={p === pagination.page ? 'active' : ''}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
