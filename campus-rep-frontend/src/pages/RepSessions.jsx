import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AppShell from '../components/AppShell';

function RepSessions() {
  const [sessions, setSessions] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/attendance/sessions/mine/');
      setSessions(r.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to load your sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSession = async (session) => {
    setBusyId(session.id);
    setError('');
    setNotice('');
    try {
      const r = await api.post(`/attendance/sessions/${session.id}/toggle/`);
      setNotice(r.data?.detail || (session.is_active ? 'Session ended.' : 'Session started.'));
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to update the session.');
    } finally {
      setBusyId(null);
    }
  };

  const exportSession = async (session) => {
    setBusyId(`export-${session.id}`);
    setError('');
    try {
      const response = await api.get(`/attendance/sessions/${session.id}/export/`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${session.course_code.replace(/\s+/g, '_')}_attendance.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setNotice('Attendance report exported.');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to export attendance.');
    } finally {
      setBusyId(null);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'LIVE') return s.is_active;
    if (filter === 'ENDED') return s.has_ended;
    return true;
  });

  return (
    <AppShell role="CLASS_REP">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Attendance control</span>
          <h1>Sessions.</h1>
          <p>Start, end and export the lecture sessions created for your class.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn-refresh" onClick={load} disabled={loading}>
            <span>↻</span> {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button className="button primary" onClick={() => navigate('/rep#new-session')}>+ New session</button>
        </div>
      </div>

      {(notice || error) && <div className={`notice ${notice ? 'success' : 'error'}`}>{notice || error}</div>}

      <div className="filter-tabs">
        <button className={`filter-tab ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
          All Sessions ({sessions.length})
        </button>
        <button className={`filter-tab ${filter === 'LIVE' ? 'active' : ''}`} onClick={() => setFilter('LIVE')}>
          <span className="radar-dot" style={{ marginRight: '6px' }} /> Live Now ({sessions.filter(s => s.is_active).length})
        </button>
        <button className={`filter-tab ${filter === 'ENDED' ? 'active' : ''}`} onClick={() => setFilter('ENDED')}>
          Ended ({sessions.filter(s => s.has_ended).length})
        </button>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Your sessions</span>
            <h2>{filteredSessions.length} session{filteredSessions.length === 1 ? '' : 's'}</h2>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <span>○</span>
            <h3>No sessions found</h3>
            <p>
              {filter === 'LIVE'
                ? 'No sessions are currently running.'
                : filter === 'ENDED'
                ? 'No ended sessions found.'
                : 'Create your first lecture session from the representative dashboard.'}
            </p>
          </div>
        ) : (
          <div className="session-table-list">
            {filteredSessions.map((session) => {
              const state = session.has_ended ? 'Ended' : session.is_active ? 'Live' : 'Ready';
              const loading = busyId === session.id;
              const exporting = busyId === `export-${session.id}`;
              return (
                <article className="rep-session-card" key={session.id}>
                  <div className="rep-session-main">
                    <div className="session-icon">{session.course_code?.slice(0, 2) || 'CP'}</div>
                    <div>
                      <div className="rep-session-title-row">
                        <strong>{session.course_code}</strong>
                        <span className={`status-badge ${session.has_ended ? 'neutral' : session.is_active ? 'green' : 'amber'}`}><i />{state}</span>
                      </div>
                      <p>{session.venue_name} · {session.level} Level · {session.radius_meters}m radius</p>
                      <small>{session.attendee_count || 0} check-in{session.attendee_count === 1 ? '' : 's'} · {new Date(session.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                  <div className="rep-session-actions">
                    {!session.has_ended && (
                      <button className={`button ${session.is_active ? 'secondary' : 'primary'} small`} disabled={loading} onClick={() => toggleSession(session)}>
                        {loading ? 'Updating…' : session.is_active ? 'End session' : 'Start session'}
                      </button>
                    )}
                    <button className="button secondary small" disabled={exporting} onClick={() => exportSession(session)}>
                      {exporting ? 'Exporting…' : 'Export Excel'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default RepSessions;
