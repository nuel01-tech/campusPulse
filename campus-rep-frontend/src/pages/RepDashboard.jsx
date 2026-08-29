import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";
import AppShell from "../components/AppShell";
function RepDashboard() {
  const [courseCode, setCourseCode] = useState("");
  const [classCode, setClassCode] = useState("");
  const [venueName, setVenueName] = useState("");
  const [annCategory, setAnnCategory] = useState("GENERAL");
  const [annDueDate, setAnnDueDate] = useState("");
  const [level, setLevel] = useState("100");
  const [radius, setRadius] = useState(50);
  const [sessions, setSessions] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  let decoded = {};
  try {
    const token = localStorage.getItem("access");
    decoded = token ? jwtDecode(token) : {};
  } catch {}
  const loadClassCode = async () => {
    try {
      const r = await api.get('/attendance/my-class-code/');
      setClassCode(r.data.code || '');
    } catch {
      setClassCode('');
    }
  };
  const load = async () => {
    try {
      const [s, a] = await Promise.all([
        api.get('/attendance/sessions/mine/'),
        api.get('/attendance/audit-log/'),
      ]);
      setSessions(s.data);
      setAuditLog(a.data);
      await loadClassCode();
    } catch {
      setError('Some dashboard data could not be loaded.');
    }
  };
  useEffect(() => {
    load();
  }, []);
  const active = sessions.filter((s) => s.is_active).length;
  const totalAttendees = sessions.reduce(
    (n, s) => n + (s.attendee_count || 0),
    0,
  );
  const avg = sessions.length
    ? Math.round(
        sessions.reduce((n, s) => n + (s.attendee_count || 0), 0) /
          sessions.length,
      )
    : 0;
  const regenerateCode = async () => {
    if (!window.confirm('Generate a new code? The old code will stop working immediately.')) return;
    try {
      const r = await api.post('/attendance/my-class-code/');
      setClassCode(r.data.code);
    } catch {
      setError('Failed to regenerate code.');
    }
  };
  const create = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError('Your browser does not support location.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          await api.post('/attendance/sessions/create/', {
            course_code: courseCode,
            venue_name: venueName,
            level,
            radius_meters: radius,
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          });
          setCourseCode('');
          setVenueName('');
          setNotice('Session created successfully.');
          load();
        } catch (e) {
          setError(e.response?.data?.detail || 'Failed to create session.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Could not get your location. Please allow location access.');
        setLoading(false);
      },
    );
  };
  const post = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/attendance/announcements/create/', {
        title: annTitle,
        body: annBody,
        category: annCategory,
        due_date: annCategory === 'ASSIGNMENT' && annDueDate ? annDueDate : null,
      });
      setAnnTitle('');
      setAnnBody('');
      setAnnDueDate('');
      setNotice('Announcement published.');
      load();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to post announcement.');
    }
  };
  const toggle = async (id) => {
    try {
      await api.post(`/attendance/sessions/${id}/toggle/`);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update session.');
    }
  };
  const exportSession = async (s) => {
    try {
      const r = await api.get(`/attendance/sessions/${s.id}/export/`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${s.course_code}_attendance.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export attendance.');
    }
  };
  return (
    <AppShell role="CLASS_REP">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Good to see you, {decoded.username || 'Representative'}</span>
          <h1>Representative workspace.</h1>
          <p>Run today's sessions, monitor attendance and keep your class informed.</p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            document.getElementById('create-session')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          + New session
        </button>
      </div>
      {(notice || error) && (
        <div className={`notice ${notice ? 'success' : 'error'}`}>
          {notice || error}
        </div>
      )}
      <div className="stat-grid">
        <div className="stat-card accent">
          <span>Live sessions</span>
          <strong>{active}</strong>
          <small>currently running</small>
        </div>
        <div className="stat-card">
          <span>Sessions created</span>
          <strong>{sessions.length}</strong>
          <small>in your workspace</small>
        </div>
        <div className="stat-card">
          <span>Check-ins recorded</span>
          <strong>{totalAttendees}</strong>
          <small>{avg ? `~${avg} per session` : 'No check-ins yet'}</small>
        </div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Access control</span>
            <h2>Class sign-up code</h2>
          </div>
        </div>
        <p className="muted-copy">
          Share this code with your coursemates so only they can create accounts for your class.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 700,
              letterSpacing: '2px',
              background: '#f1f5f9',
              padding: '8px 16px',
              borderRadius: '10px',
            }}
          >
            {classCode}
          </span>
          <button className="button secondary small" onClick={regenerateCode}>
            Regenerate
          </button>
        </div>
      </section>
      <div className="content-grid rep-grid">
        <section className="panel" id="new-session">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Session setup</span>
              <h2>Create lecture session</h2>
            </div>
            <span className="secure-label">⌖ Location required</span>
          </div>
          <form className="form-grid" onSubmit={create}>
            <label>
              Course code
              <input
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. CSC 202"
                required
              />
            </label>
            <label>
              Venue
              <input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Lecture Hall A"
                required
              />
            </label>
            <label>
              Level
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
              </select>
            </label>
            <label>
              Radius
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                min={10}
                max={20000000}
              />
            </label>
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create session'}
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Communication</span>
              <h2>New announcement</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={post}>
            <label>
              Category
              <select value={annCategory} onChange={(e) => setAnnCategory(e.target.value)}>
                <option value="GENERAL">General</option>
                <option value="ASSIGNMENT">Assignment</option>
                <option value="VENUE_CHANGE">Venue Change</option>
              </select>
            </label>
            {annCategory === 'ASSIGNMENT' && (
              <label>
                Due date
                <input type="date" value={annDueDate} onChange={(e) => setAnnDueDate(e.target.value)} />
              </label>
            )}
            <label className="full">
              Title
              <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required />
            </label>
            <label className="full">
              Message
              <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} rows={5} required />
            </label>
            <button type="submit" className="button primary">
              Publish announcement
            </button>
          </form>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Session control</span>
            <h2>Your sessions</h2>
          </div>
          <button className="button secondary small" onClick={() => navigate('/rep/sessions')}>View all</button>
        </div>
        {sessions.length === 0 ? (
          <div className="empty-state compact"><p>No sessions created yet.</p></div>
        ) : (
          <div className="session-table-list">
            {sessions.slice(0, 5).map((s) => (
              <div className="rep-session-card compact" key={s.id}>
                <div className="rep-session-main">
                  <div className="session-icon">{s.course_code?.slice(0, 2) || 'CP'}</div>
                  <div><div className="rep-session-title-row"><strong>{s.course_code}</strong><span className={`status-badge ${s.has_ended ? 'neutral' : s.is_active ? 'green' : 'amber'}`}><i />{s.has_ended ? 'Ended' : s.is_active ? 'Live' : 'Ready'}</span></div><p>{s.venue_name} · {s.level} Level · {s.attendee_count || 0} check-ins</p></div>
                </div>
                <div className="rep-session-actions">
                  {!s.has_ended && <button className={`button ${s.is_active ? 'secondary' : 'primary'} small`} onClick={() => toggle(s.id)}>{s.is_active ? 'End session' : 'Start session'}</button>}
                  <button className="button secondary small" onClick={() => exportSession(s)}>Export</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Activity</span>
            <h2>Recent audit log</h2>
          </div>
        </div>
        {auditLog.length === 0 ? (
          <div className="empty-state compact">
            <span>—</span>
            <p>No activity yet.</p>
          </div>
        ) : (
          <div className="audit-list">
            {auditLog.map((item) => (
              <div key={item.id} className="audit-row">
                <div>
                  <strong>{item.action}</strong>
                  <span>{item.course_code} · {item.venue_name}</span>
                </div>
                <small>{item.rep_name}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
export default RepDashboard;
