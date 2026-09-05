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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  let decoded = {};
  try {
    const token = localStorage.getItem("access");
    decoded = token ? jwtDecode(token) : {};
  } catch {}

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, a, st] = await Promise.all([
        api.get("/attendance/sessions/active/"),
        api.get("/attendance/announcements/"),
        api.get("/attendance/my-stats/"),
      ]);
      setActiveSessions(s.data || []);
      setAnnouncements(a.data || []);
      setStats(st.data || null);
    } catch {
      setError("Some dashboard data could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
          setMessage(r.data.detail || "Successfully checked in!");
          await loadData();
        } catch (e) {
          setError(
            e.response?.data?.detail ||
              "Check-in failed. Please make sure you are inside the lecture room."
          );
        } finally {
          setChecking(null);
        }
      },
      (err) => {
        let msg = "Could not get your location. Please allow location access.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location in your browser settings.";
        } else if (err.code === 2) {
          msg = "Position unavailable. Please ensure GPS/Location is turned on.";
        }
        setError(msg);
        setChecking(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const shareToWhatsApp = (a) => {
    const text = `📢 *${a.title}*\n\n${a.body}\n${a.due_date ? `\n⏳ *Due Date:* ${new Date(a.due_date).toLocaleDateString()}` : ''}\n\n— Shared via CampusPulse`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const rate = stats?.rate ?? 0;
  const isEligible = rate >= (stats?.eligibility_threshold ?? 70);

  return (
    <AppShell role="STUDENT">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">
            {getGreeting()}, {decoded.username || "Student"}
          </span>
          <h1>Your campus at a glance.</h1>
          <p>Stay up to date with live attendance, announcements and lecture progress.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-refresh" onClick={loadData} disabled={loading}>
            <span>↻</span> {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="button secondary"
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`notice ${message ? "success" : "error"}`}>
          {message || error}
        </div>
      )}

      {/* Live Class Hero Beacon if any active session exists */}
      {activeSessions.length > 0 && (
        <div className="live-session-hero">
          <div className="live-hero-header">
            <span className="live-badge-glow">
              <span className="radar-dot" /> Live Class in Progress
            </span>
            <span style={{ fontSize: "11px", opacity: 0.9 }}>
              {activeSessions.length} active now
            </span>
          </div>
          <h2 className="live-hero-title">
            {activeSessions[0].course_code}
          </h2>
          <div className="live-hero-subtitle">
            <span>📍 {activeSessions[0].venue_name}</span>
            <span>🎓 {activeSessions[0].level} Level</span>
            <span>🎯 Radius: {activeSessions[0].radius_meters || 50}m</span>
          </div>
          <button
            className="live-checkin-btn"
            disabled={checking === activeSessions[0].id}
            onClick={() => handleCheckIn(activeSessions[0].id)}
          >
            {checking === activeSessions[0].id ? "Verifying GPS Location…" : "✓ Tap to Check In with GPS"}
          </button>
        </div>
      )}

      {/* Quick Action Cards Grid for Mobile Ergonomics */}
      <div className="quick-action-grid">
        <div className="action-tile" onClick={() => navigate("/student/attendance")}>
          <div className="action-tile-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
            📍
          </div>
          <div>
            <strong>Live Check-in</strong>
            <span>{activeSessions.length} session{activeSessions.length === 1 ? "" : "s"} live</span>
          </div>
        </div>

        <div className="action-tile" onClick={() => navigate("/student/history")}>
          <div className="action-tile-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            📋
          </div>
          <div>
            <strong>Class History</strong>
            <span>{stats ? `${stats.attended} attended` : "View history"}</span>
          </div>
        </div>

        <div className="action-tile" onClick={() => navigate("/student/announcements")}>
          <div className="action-tile-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            📢
          </div>
          <div>
            <strong>Announcements</strong>
            <span>{announcements.length} update{announcements.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="action-tile" onClick={() => navigate("/documents")}>
          <div className="action-tile-icon" style={{ background: "#f3e8ff", color: "#7c3aed" }}>
            📁
          </div>
          <div>
            <strong>Course Docs</strong>
            <span>Lecture notes & PDFs</span>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="stat-grid">
        <div className={`stat-card ${isEligible ? "accent" : ""}`}>
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
          <strong>🔥 {stats?.streak ?? 0}</strong>
          <small>consecutive classes present</small>
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

      {/* Main Content: Sessions & Announcements */}
      <div className="content-grid">
        <section className="panel main-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Classes</span>
              <h2>Available sessions</h2>
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
              <h3>No classes live right now</h3>
              <p>When your class representative starts attendance, it will appear here instantly.</p>
              <button
                className="btn-refresh"
                onClick={loadData}
                style={{ marginTop: "12px" }}
              >
                Check again
              </button>
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
                      {s.venue_name} · {s.level} Level · {s.radius_meters || 50}m
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
              <span className="eyebrow">Notice board</span>
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
                    <span>
                      {a.category === "ASSIGNMENT"
                        ? "📝 Assignment"
                        : a.category === "VENUE_CHANGE"
                        ? "📍 Venue Change"
                        : "📢 Department update"}
                    </span>
                    <time>{new Date(a.created_at).toLocaleDateString()}</time>
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.body}</p>
                  {a.due_date && (
                    <p style={{ fontSize: "11px", color: "#d97706", fontWeight: 700, margin: "6px 0" }}>
                      ⏳ Due: {new Date(a.due_date).toLocaleDateString()}
                    </p>
                  )}
                  <div style={{ marginTop: "8px" }}>
                    <button
                      className="share-btn-whatsapp"
                      onClick={() => shareToWhatsApp(a)}
                    >
                      <span>Share on WhatsApp</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Exam Eligibility Strip */}
      <section className="eligibility-strip">
        <div>
          <span className={`status-dot ${isEligible ? "green" : "amber"}`} />
          <div>
            <strong>
              {isEligible
                ? "You are in good standing for exams"
                : "Attendance needs attention (< 70%)"}
            </strong>
            <span>
              {stats
                ? `The OOU examination attendance threshold is ${stats.eligibility_threshold || 70}%.`
                : "Attendance requirement"}
            </span>
          </div>
        </div>
        <button
          className="text-button"
          onClick={() => navigate("/student/history")}
        >
          Review full history →
        </button>
      </section>
    </AppShell>
  );
}

export default StudentDashboard;

