import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';

function StudentHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [histRes, statsRes] = await Promise.all([
        api.get('/attendance/my-history/'),
        api.get('/attendance/my-stats/'),
      ]);
      setHistory(histRes.data || []);
      setStats(statsRes.data || null);
    } catch {
      setError('Unable to load your attendance history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const attendedCount = useMemo(
    () => history.filter((h) => h.status === 'attended').length,
    [history]
  );
  const missedCount = useMemo(
    () => history.filter((h) => h.status === 'missed').length,
    [history]
  );

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesFilter =
        filter === 'ALL'
          ? true
          : filter === 'ATTENDED'
          ? item.status === 'attended'
          : item.status === 'missed';

      const matchesSearch =
        !search ||
        item.course_code?.toLowerCase().includes(search.toLowerCase()) ||
        item.venue_name?.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [history, filter, search]);

  const rate = stats?.rate ?? (history.length ? Math.round((attendedCount / history.length) * 100) : 0);
  const isEligible = rate >= (stats?.eligibility_threshold ?? 70);

  return (
    <AppShell role="STUDENT">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Attendance record</span>
          <h1>Your Class History.</h1>
          <p>Track every lecture session, verify your presence, and monitor exam eligibility.</p>
        </div>
        <button className="btn-refresh" onClick={loadData} disabled={loading}>
          <span>↻</span> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      {/* Summary Stat Grid */}
      <div className="stat-grid">
        <div className={`stat-card ${isEligible ? 'accent' : ''}`}>
          <span>Attendance rate</span>
          <strong>{rate}%</strong>
          <div className="progress">
            <i style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <small>
            {isEligible
              ? '✓ Eligible for semester examinations'
              : `⚠️ Below ${stats?.eligibility_threshold ?? 70}% requirement`}
          </small>
        </div>

        <div className="stat-card">
          <span>Classes attended</span>
          <strong style={{ color: '#16a34a' }}>{attendedCount}</strong>
          <small>marked present with GPS</small>
        </div>

        <div className="stat-card">
          <span>Classes missed</span>
          <strong style={{ color: missedCount > 0 ? '#dc2626' : '#64748b' }}>{missedCount}</strong>
          <small>unattended lecture sessions</small>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="eyebrow">Lecture records</span>
            <h2>History log ({filteredHistory.length})</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search course code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #dfe4eb',
                fontSize: '12px',
                width: '180px',
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All Classes ({history.length})
          </button>
          <button
            className={`filter-tab ${filter === 'ATTENDED' ? 'active' : ''}`}
            onClick={() => setFilter('ATTENDED')}
          >
            ✓ Attended ({attendedCount})
          </button>
          <button
            className={`filter-tab ${filter === 'MISSED' ? 'active' : ''}`}
            onClick={() => setFilter('MISSED')}
          >
            ✕ Missed ({missedCount})
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading attendance history…</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="empty-state">
            <span>○</span>
            <h3>No classes found</h3>
            <p>
              {search
                ? 'No classes match your search query.'
                : filter === 'MISSED'
                ? 'Great job! You have not missed any recorded classes.'
                : 'No attendance records have been registered yet for your level.'}
            </p>
          </div>
        ) : (
          <div>
            {filteredHistory.map((item) => {
              const isPresent = item.status === 'attended';
              return (
                <div className="history-card" key={item.id}>
                  <div className="history-main">
                    <div
                      className="session-icon"
                      style={{
                        background: isPresent ? '#dcfce7' : '#fee2e2',
                        color: isPresent ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {item.course_code?.slice(0, 2) || 'CP'}
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px' }}>{item.course_code}</strong>
                      <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        {item.venue_name} · {new Date(item.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <span className={`history-badge ${isPresent ? 'present' : 'absent'}`}>
                    {isPresent ? '✓ Attended' : '✕ Missed'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default StudentHistory;
