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
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
            <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {loading ? 'Refreshing…' : 'Refresh'}
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
            {isEligible ? (
              <><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '3px', color: '#16a34a' }}><polyline points="20 6 9 17 4 12" /></svg>Eligible for semester examinations</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '3px', color: '#d97706' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>Below {stats?.eligibility_threshold ?? 70}% requirement</>
            )}
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
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px', color: '#16a34a' }}><polyline points="20 6 9 17 4 12" /></svg>
            Attended ({attendedCount})
          </button>
          <button
            className={`filter-tab ${filter === 'MISSED' ? 'active' : ''}`}
            onClick={() => setFilter('MISSED')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px', color: '#dc2626' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            Missed ({missedCount})
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading attendance history…</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><circle cx="12" cy="12" r="10" /></svg>
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
                    {isPresent ? (
                      <><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '3px' }}><polyline points="20 6 9 17 4 12" /></svg>Attended</>
                    ) : (
                      <><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '3px' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>Missed</>
                    )}
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
