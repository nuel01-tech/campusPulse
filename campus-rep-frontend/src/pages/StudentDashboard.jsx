import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const LocationIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const RefreshIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

const ArrowIcon = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const HistoryIcon = ({ size = 19 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const AnnouncementIcon = ({ size = 19 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 11v2a2 2 0 0 0 2 2h2l3 4h2l-1.5-4H13l7 3V6l-7 3H5a2 2 0 0 0-2 2Z" />
  </svg>
);

const DocumentIcon = ({ size = 19 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h5" />
  </svg>
);

const CheckIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const FlameIcon = ({ size = 17 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22a7 7 0 0 0 7-7c0-3.2-2.2-5.8-4.8-7.9.2 2.3-.5 3.8-1.8 4.8.1-3.6-1.6-6.4-4.1-8.9.1 3.1-2.3 5.1-2.3 8.3A7 7 0 0 0 12 22Z" />
  </svg>
);

const getCategoryLabel = (category) => {
  if (category === "ASSIGNMENT") return "Assignment";
  if (category === "VENUE_CHANGE") return "Venue change";
  return "Department update";
};

function StudentDashboard() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  let decoded = {};

  try {
    const token = localStorage.getItem("access");
    decoded = token ? jwtDecode(token) : {};
  } catch {
    decoded = {};
  }

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [sessionsResponse, announcementsResponse, statsResponse] =
        await Promise.all([
          api.get("/attendance/sessions/active/"),
          api.get("/attendance/announcements/"),
          api.get("/attendance/my-stats/"),
        ]);

      setActiveSessions(sessionsResponse.data || []);
      setAnnouncements(announcementsResponse.data || []);
      setStats(statsResponse.data || null);
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
          const response = await api.post(
            `/attendance/sessions/${id}/checkin/`,
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          );

          setMessage(response.data.detail || "Successfully checked in!");
          await loadData();
        } catch (e) {
          setError(
            e.response?.data?.detail ||
              "Check-in failed. Please make sure you are inside the lecture room.",
          );
        } finally {
          setChecking(null);
        }
      },
      (err) => {
        let locationMessage =
          "Could not get your location. Please allow location access.";

        if (err.code === 1) {
          locationMessage =
            "Location permission denied. Please allow location in your browser settings.";
        } else if (err.code === 2) {
          locationMessage =
            "Position unavailable. Please ensure GPS/Location is turned on.";
        }

        setError(locationMessage);
        setChecking(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  const shareToWhatsApp = (announcement) => {
    const text = `📢 *${announcement.title}*\n\n${announcement.body}${
      announcement.due_date
        ? `\n⏳ *Due Date:* ${new Date(
            announcement.due_date,
          ).toLocaleDateString()}`
        : ""
    }\n\n— Shared via CampusPulse`;

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  const rate = stats?.rate ?? 0;
  const threshold = stats?.eligibility_threshold ?? 70;
  const isEligible = rate >= threshold;

  const primarySession = activeSessions[0];

  return (
    <AppShell role="STUDENT">
      <div className="cp-student-dashboard">
        {/* Header */}
        <header className="cp-student-header">
          <div>
            <span className="cp-student-eyebrow">
              {getGreeting()}, {decoded.username || "Student"}
            </span>

            <h1>Welcome back.</h1>

            <p>
              Keep track of your attendance, class updates and course resources
              from one place.
            </p>
          </div>

          <div className="cp-student-header-actions">
            <button
              className="cp-student-refresh"
              onClick={loadData}
              disabled={loading}
              type="button"
            >
              <RefreshIcon />
              {loading ? "Refreshing…" : "Refresh"}
            </button>

            <button
              className="cp-student-profile-button"
              onClick={() => navigate("/profile")}
              type="button"
            >
              Profile
            </button>
          </div>
        </header>

        {/* Feedback */}
        {(message || error) && (
          <div
            className={`cp-student-feedback ${message ? "success" : "error"}`}
            role="status"
          >
            <span className="cp-student-feedback-icon">
              {message ? <CheckIcon /> : "!"}
            </span>

            <span>{message || error}</span>
          </div>
        )}

        {/* Live attendance */}
        {primarySession && (
          <section className="cp-student-live">
            <div className="cp-student-live-main">
              <div className="cp-student-live-topline">
                <span className="cp-student-live-status">
                  <span className="cp-student-live-dot" />
                  Live attendance
                </span>

                {activeSessions.length > 1 && (
                  <span className="cp-student-live-count">
                    {activeSessions.length} sessions active
                  </span>
                )}
              </div>

              <div className="cp-student-live-content">
                <div>
                  <span className="cp-student-live-label">
                    Class currently taking attendance
                  </span>

                  <h2>{primarySession.course_code}</h2>

                  <div className="cp-student-live-meta">
                    <span>
                      <LocationIcon size={14} />
                      {primarySession.venue_name}
                    </span>

                    <span>{primarySession.level} Level</span>

                    <span>{primarySession.radius_meters || 50}m radius</span>
                  </div>
                </div>

                <button
                  className="cp-student-checkin"
                  disabled={checking === primarySession.id}
                  onClick={() => handleCheckIn(primarySession.id)}
                  type="button"
                >
                  {checking === primarySession.id ? (
                    <>
                      <span className="cp-student-button-spinner" />
                      Verifying location…
                    </>
                  ) : (
                    <>
                      <LocationIcon size={16} />
                      Check in with GPS
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="cp-student-live-note">
              <LocationIcon size={15} />
              <span>
                You must be within the lecture venue radius to be marked
                present.
              </span>
            </div>
          </section>
        )}

        {/* Attendance summary */}
        <section className="cp-student-summary">
          <div className="cp-student-section-heading">
            <div>
              <span className="cp-student-section-kicker">Your attendance</span>
              <h2>Current progress</h2>
            </div>

            <button
              className="cp-student-text-link"
              onClick={() => navigate("/student/history")}
              type="button"
            >
              View history
              <ArrowIcon size={14} />
            </button>
          </div>

          <div className="cp-student-stat-grid">
            <article className="cp-student-stat-card cp-student-stat-primary">
              <div className="cp-student-stat-top">
                <span>Attendance rate</span>

                <span
                  className={`cp-student-stat-status ${
                    isEligible ? "eligible" : "attention"
                  }`}
                >
                  {isEligible ? "On track" : "Needs attention"}
                </span>
              </div>

              <strong>{rate}%</strong>

              <div className="cp-student-progress">
                <span
                  style={{
                    width: `${Math.min(Math.max(rate, 0), 100)}%`,
                  }}
                />
              </div>

              <small>
                {stats
                  ? `${stats.attended} of ${stats.total_sessions} classes attended`
                  : "Attendance data loading"}
              </small>
            </article>

            <article className="cp-student-stat-card">
              <div className="cp-student-stat-icon">
                <FlameIcon />
              </div>

              <span>Current streak</span>

              <strong>{stats?.streak ?? 0}</strong>

              <small>consecutive classes present</small>
            </article>

            <article className="cp-student-stat-card">
              <div className="cp-student-stat-icon live">
                <span />
              </div>

              <span>Live now</span>

              <strong>{activeSessions.length}</strong>

              <small>
                {activeSessions.length === 1
                  ? "class available"
                  : "classes available"}
              </small>
            </article>
          </div>
        </section>

        {/* Quick navigation */}
        <section className="cp-student-quick">
          <div className="cp-student-section-heading">
            <div>
              <span className="cp-student-section-kicker">Workspace</span>
              <h2>Quick access</h2>
            </div>
          </div>

          <div className="cp-student-quick-grid">
            <button
              className="cp-student-quick-item"
              onClick={() => navigate("/student/attendance")}
              type="button"
            >
              <span className="cp-student-quick-icon attendance">
                <LocationIcon size={19} />
              </span>

              <span className="cp-student-quick-copy">
                <strong>Attendance</strong>
                <small>Check in to live classes</small>
              </span>

              <ArrowIcon />
            </button>

            <button
              className="cp-student-quick-item"
              onClick={() => navigate("/student/history")}
              type="button"
            >
              <span className="cp-student-quick-icon history">
                <HistoryIcon />
              </span>

              <span className="cp-student-quick-copy">
                <strong>Attendance history</strong>
                <small>Review previous classes</small>
              </span>

              <ArrowIcon />
            </button>

            <button
              className="cp-student-quick-item"
              onClick={() => navigate("/student/announcements")}
              type="button"
            >
              <span className="cp-student-quick-icon announcements">
                <AnnouncementIcon />
              </span>

              <span className="cp-student-quick-copy">
                <strong>Announcements</strong>
                <small>
                  {announcements.length}{" "}
                  {announcements.length === 1 ? "update" : "updates"}
                </small>
              </span>

              <ArrowIcon />
            </button>

            <button
              className="cp-student-quick-item"
              onClick={() => navigate("/documents")}
              type="button"
            >
              <span className="cp-student-quick-icon documents">
                <DocumentIcon />
              </span>

              <span className="cp-student-quick-copy">
                <strong>Course documents</strong>
                <small>Lecture notes and PDFs</small>
              </span>

              <ArrowIcon />
            </button>
          </div>
        </section>

        {/* Main content */}
        <div className="cp-student-content-grid">
          {/* Live sessions */}
          <section className="cp-student-panel">
            <div className="cp-student-panel-header">
              <div>
                <span className="cp-student-section-kicker">Attendance</span>
                <h2>Live sessions</h2>
              </div>

              <button
                className="cp-student-text-link"
                onClick={() => navigate("/student/attendance")}
                type="button"
              >
                Open attendance
                <ArrowIcon size={14} />
              </button>
            </div>

            {loading ? (
              <LoadingSkeleton rows={3} />
            ) : activeSessions.length === 0 ? (
              <div className="cp-student-empty">
                <div className="cp-student-empty-icon">
                  <LocationIcon size={21} />
                </div>

                <strong>No classes are live right now</strong>

                <p>
                  Active attendance sessions will appear here when your class
                  representative starts one.
                </p>

                <button
                  className="cp-student-secondary-button"
                  onClick={loadData}
                  type="button"
                >
                  <RefreshIcon size={13} />
                  Check again
                </button>
              </div>
            ) : (
              <div className="cp-student-session-list">
                {activeSessions.map((session) => (
                  <div className="cp-student-session" key={session.id}>
                    <div className="cp-student-course-mark">
                      {session.course_code?.slice(0, 2) || "CP"}
                    </div>

                    <div className="cp-student-session-info">
                      <strong>{session.course_code}</strong>

                      <span>
                        {session.venue_name} · {session.level} Level ·{" "}
                        {session.radius_meters || 50}m
                      </span>
                    </div>

                    <span className="cp-student-session-live">
                      <i />
                      Live
                    </span>

                    <button
                      className="cp-student-session-button"
                      disabled={checking === session.id}
                      onClick={() => handleCheckIn(session.id)}
                      type="button"
                    >
                      {checking === session.id ? "Checking…" : "Check in"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Announcements */}
          <section className="cp-student-panel">
            <div className="cp-student-panel-header">
              <div>
                <span className="cp-student-section-kicker">Notice board</span>
                <h2>Latest updates</h2>
              </div>

              <button
                className="cp-student-text-link"
                onClick={() => navigate("/student/announcements")}
                type="button"
              >
                See all
                <ArrowIcon size={14} />
              </button>
            </div>

            {loading ? (
              <LoadingSkeleton rows={3} />
            ) : announcements.length === 0 ? (
              <div className="cp-student-empty compact">
                <div className="cp-student-empty-icon">
                  <AnnouncementIcon size={20} />
                </div>

                <strong>No announcements yet</strong>

                <p>Updates from your class representative will appear here.</p>
              </div>
            ) : (
              <div className="cp-student-announcement-list">
                {announcements.slice(0, 4).map((announcement) => (
                  <article
                    className="cp-student-announcement"
                    key={announcement.id}
                  >
                    <div className="cp-student-announcement-top">
                      <span
                        className={`cp-student-category ${(
                          announcement.category || "GENERAL"
                        ).toLowerCase()}`}
                      >
                        {getCategoryLabel(announcement.category)}
                      </span>

                      <time>
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </time>
                    </div>

                    <h3>{announcement.title}</h3>

                    <p>{announcement.body}</p>

                    {announcement.due_date && (
                      <div className="cp-student-due-date">
                        <span>Due</span>
                        {new Date(announcement.due_date).toLocaleDateString()}
                      </div>
                    )}

                    <button
                      className="cp-student-share"
                      onClick={() => shareToWhatsApp(announcement)}
                      type="button"
                    >
                      Share on WhatsApp
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Eligibility */}
        <section
          className={`cp-student-eligibility ${
            isEligible ? "eligible" : "attention"
          }`}
        >
          <div className="cp-student-eligibility-indicator">
            <span />
          </div>

          <div className="cp-student-eligibility-copy">
            <span>Examination attendance status</span>

            <strong>
              {isEligible
                ? "Your attendance is currently on track."
                : "Your attendance needs attention."}
            </strong>

            <p>
              Current rate: <b>{rate}%</b>. Examination threshold:{" "}
              <b>{threshold}%</b>.
            </p>
          </div>

          <button
            className="cp-student-eligibility-action"
            onClick={() => navigate("/student/history")}
            type="button"
          >
            Review history
            <ArrowIcon size={14} />
          </button>
        </section>
      </div>
    </AppShell>
  );
}

export default StudentDashboard;
