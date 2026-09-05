import { useEffect, useState } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';

function StudentAttendance() {
  const [sessions, setSessions] = useState([]);
  const [checking, setChecking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSessions = async () => {
    setLoading(true);
    try {
      const r = await api.get('/attendance/sessions/active/');
      setSessions(r.data || []);
    } catch {
      setError('Unable to load active sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const checkIn = (id) => {
    setChecking(id);
    setError('');
    setMessage('');

    if (!navigator.geolocation) {
      setError('Location is not supported by your browser.');
      setChecking(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const r = await api.post(`/attendance/sessions/${id}/checkin/`, {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          });
          setMessage(r.data.detail || 'Successfully checked in!');
          await loadSessions();
        } catch (e) {
          setError(e.response?.data?.detail || 'Check-in failed. Ensure you are physically inside the lecture hall.');
        } finally {
          setChecking(null);
        }
      },
      (err) => {
        let msg = 'Location access is required for attendance check-in.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please allow location in your browser site settings.';
        } else if (err.code === 2) {
          msg = 'Unable to determine your GPS location. Please turn on your device GPS/Location.';
        }
        setError(msg);
        setChecking(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <AppShell role="STUDENT">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Attendance check-in</span>
          <h1>Check in to a live class.</h1>
          <p>Your GPS location verifies that you are present within the designated lecture hall.</p>
        </div>
        <button className="btn-refresh" onClick={loadSessions} disabled={loading}>
          <span>↻</span> {loading ? 'Checking…' : 'Refresh sessions'}
        </button>
      </div>

      {(message || error) && (
        <div className={`notice ${message ? 'success' : 'error'}`}>
          {message || error}
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Live sessions</span>
            <h2>Available now ({sessions.length})</h2>
          </div>
          <span className="secure-label">⌖ GPS-verified check-in</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Looking for active classes…</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <span>○</span>
            <h3>No classes currently live</h3>
            <p>When your class rep initiates an attendance session, it will display here automatically.</p>
            <button className="btn-refresh" onClick={loadSessions} style={{ marginTop: '14px' }}>
              Tap to check again
            </button>
          </div>
        ) : (
          <div className="session-list">
            {sessions.map((s) => (
              <div className="session-row" key={s.id}>
                <div className="session-icon" style={{ background: '#edf4ff', color: '#1f5eff' }}>
                  {s.course_code?.slice(0, 2) || 'CP'}
                </div>
                <div className="session-info">
                  <strong>{s.course_code}</strong>
                  <span>
                    📍 {s.venue_name} · {s.level} Level · {s.radius_meters || 50}m radius
                  </span>
                </div>
                <div className="session-status">
                  <span className="radar-dot" style={{ marginRight: '6px' }} /> Live
                </div>
                <button
                  className="button primary"
                  onClick={() => checkIn(s.id)}
                  disabled={checking === s.id}
                  style={{ minWidth: '95px' }}
                >
                  {checking === s.id ? 'Checking…' : 'Check in'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="info-card">
        <div className="info-icon">⌖</div>
        <div>
          <strong>Location verification tips</strong>
          <p>
            Make sure your device GPS is turned on and set to high accuracy. You must be physically inside
            or within the radius of the lecture venue to be marked present.
          </p>
        </div>
      </section>
    </AppShell>
  );
}

export default StudentAttendance;
