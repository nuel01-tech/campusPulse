import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

function StudentDashboard() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(null);
  const navigate = useNavigate();
  let decoded = {};
  try {
    const token = localStorage.getItem("access");
    decoded = token ? jwtDecode(token) : {};
  } catch {}
  useEffect(() => {
    const load = async () => {
      try {
        const [s, a, st] = await Promise.all([
          api.get("/attendance/sessions/active/"),
          api.get("/attendance/announcements/"),
          api.get("/attendance/my-stats/"),
        ]);
        setActiveSessions(s.data);
        setAnnouncements(a.data);
        setStats(st.data);
      } catch {
        setError("Some dashboard data could not be loaded.");
      }
    };
    load();
  }, []);
  const handleCheckIn = (id) => {
    setChecking(id);
    setError("");
    setMessage("");
    if (!navigator.geolocation) {
      setError("Your browser does not support location.");
      setChecking(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const r = await api.post(`/attendance/sessions/${id}/checkin/`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setMessage(r.data.detail);
        } catch (e) {
          setError(e.response?.data?.detail || "Check-in failed.");
        } finally {
          setChecking(null);
        }
      },
      () => {
        setError("Could not get your location. Please allow location access.");
        setChecking(null);
      },
    );
  };
  const rate = stats?.rate ?? 0;
  return (
    <AppShell role="STUDENT">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">
            {getGreeting()}, {decoded.username || "Student"}
          </span>
          <h1>Your campus at a glance.</h1>
          <p>Keep up with attendance, live classes and department updates.</p>
        </div>
        <button
          className="button secondary"
          onClick={() => navigate("/settings")}
        >
          View profile
        </button>
      </div>
      {(message || error) && (
        <div className={`notice ${message ? "success" : "error"}`}>
          {message || error}
        </div>
      )}
      <div className="stat-grid">
        <div className="stat-card accent">
          <span>Attendance rate</span>
          <strong>{rate}%</strong>
          <div className="progress">
            <i style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <small>
            {stats
              ? `${stats.attended} of ${stats.total_sessions} classes attended`
              : "Loading your attendance"}
          </small>
        </div>
        <div className="stat-card">
          <span>Current streak</span>
          <strong>{stats?.streak ?? "—"}</strong>
          <small>consecutive classes</small>
          <div className="stat-mark">↗</div>
        </div>
        <div className="stat-card">
          <span>Active classes</span>
          <strong>{activeSessions.length}</strong>
          <small>available right now</small>
          <div className="live-pill">
            <i /> Live
          </div>
        </div>
      </div>
      <div className="content-grid">
        <section className="panel main-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Right now</span>
              <h2>Active classes</h2>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("/student/attendance")}
            >
              View all →
            </button>
          </div>
          {activeSessions.length === 0 ? (
            <div className="empty-state">
              <span>○</span>
              <h3>No live classes</h3>
              <p>There are no active attendance sessions at the moment.</p>
            </div>
          ) : (
            <div className="session-list">
              {activeSessions.map((s) => (
                <div className="session-row" key={s.id}>
                  <div className="session-icon">
                    {s.course_code?.slice(0, 2)}
                  </div>
                  <div className="session-info">
                    <strong>{s.course_code}</strong>
                    <span>
                      {s.venue_name} · {s.level} Level
                    </span>
                  </div>
                  <div className="session-status">
                    <i /> Live
                  </div>
                  <button
                    className="button primary small"
                    disabled={checking === s.id}
                    onClick={() => handleCheckIn(s.id)}
                  >
                    {checking === s.id ? "Checking…" : "Check in"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Updates</span>
              <h2>Announcements</h2>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("/student/announcements")}
            >
              See all →
            </button>
          </div>
          {announcements.length === 0 ? (
            <div className="empty-state compact">
              <span>—</span>
              <p>No new announcements yet.</p>
            </div>
          ) : (
            <div className="announcement-list">
              {announcements.slice(0, 4).map((a) => (
                <article key={a.id}>
  <div className="announcement-meta">
    <span>{a.category === 'ASSIGNMENT' ? '📝 Assignment' : a.category === 'VENUE_CHANGE' ? '📍 Venue Change' : 'Department update'}</span>
    <time>{new Date(a.created_at).toLocaleDateString()}</time>
  </div>
  <h3>{a.title}</h3>
  <p>{a.body}</p>
  {a.due_date && <p className="due-date">Due: {new Date(a.due_date).toLocaleDateString()}</p>}
</article>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="eligibility-strip">
        <div>
          <span className="status-dot green" />
          <div>
            <strong>
              {rate >= (stats?.eligibility_threshold ?? 70)
                ? "You are in good standing"
                : "Attendance needs attention"}
            </strong>
            <span>
              {stats
                ? `The current requirement is ${stats.eligibility_threshold}%.`
                : "Attendance requirement"}
            </span>
          </div>
        </div>
        <button
          className="text-button"
          onClick={() => navigate("/student/history")}
        >
          Review history →
        </button>
      </section>
    </AppShell>
  );
}
export default StudentDashboard;
