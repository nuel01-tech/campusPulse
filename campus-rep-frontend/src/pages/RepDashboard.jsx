import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";

function LocationIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" />
      <path d="M8.8 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.4l.7 1.5c.1.2.1.4-.1.6l-.5.6c.5.9 1.2 1.6 2.1 2.1l.6-.5c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5v.4c0 .3 0 .5-.4.7-.4.2-1.2.3-2.1-.1-1.1-.5-2.2-1.3-3.1-2.2-.9-.9-1.7-2-2.2-3.1-.4-.9-.3-1.7-.1-2.1Z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function RepDashboard() {
  const navigate = useNavigate();

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
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  let decoded = {};

  try {
    const token = localStorage.getItem("access");
    decoded = token ? jwtDecode(token) : {};
  } catch {
    decoded = {};
  }

  const copyCode = async () => {
    if (!classCode) return;

    try {
      await navigator.clipboard.writeText(classCode);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Unable to copy the class code.");
    }
  };

  const shareCodeToWhatsApp = () => {
    if (!classCode) return;

    const msg =
      `👋 Hello coursemates! Use this class signup code to join our class attendance workspace on CampusPulse:\n\n` +
      `*${classCode}*\n\n` +
      `Sign up here: ${window.location.origin}/signup`;

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const loadClassCode = async () => {
    try {
      const r = await api.get("/attendance/my-class-code/");
      setClassCode(r.data.code || "");
    } catch {
      setClassCode("");
    }
  };

  const load = async () => {
    try {
      const [s, a] = await Promise.all([
        api.get("/attendance/sessions/mine/"),
        api.get("/attendance/audit-log/"),
      ]);

      setSessions(s.data || []);
      setAuditLog(a.data || []);

      await loadClassCode();
    } catch {
      setError("Some dashboard data could not be loaded.");
    } finally {
      setDashboardLoading(false);
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
    if (
      !window.confirm(
        "Generate a new code? The old code will stop working immediately.",
      )
    ) {
      return;
    }

    setRegenerating(true);
    setError("");
    setNotice("");

    try {
      const r = await api.post("/attendance/my-class-code/");
      setClassCode(r.data.code);
      setNotice("Class signup code regenerated.");
    } catch {
      setError("Failed to regenerate code.");
    } finally {
      setRegenerating(false);
    }
  };

  const create = (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setNotice("");

    if (!navigator.geolocation) {
      setError("Your browser does not support location.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          await api.post("/attendance/sessions/create/", {
            course_code: courseCode,
            venue_name: venueName,
            level,
            radius_meters: radius,
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          });

          setCourseCode("");
          setVenueName("");
          setNotice("Session created successfully.");

          await load();
        } catch (e) {
          setError(e.response?.data?.detail || "Failed to create session.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Could not get your location. Please allow location access.");
        setLoading(false);
      },
    );
  };

  const post = async (e) => {
    e.preventDefault();

    setError("");
    setNotice("");
    setPostingAnnouncement(true);

    try {
      await api.post("/attendance/announcements/create/", {
        title: annTitle,
        body: annBody,
        category: annCategory,
        due_date:
          annCategory === "ASSIGNMENT" && annDueDate ? annDueDate : null,
      });

      setAnnTitle("");
      setAnnBody("");
      setAnnDueDate("");

      setNotice("Announcement published.");

      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to post announcement.");
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const toggle = async (id) => {
    setTogglingId(id);
    setError("");
    setNotice("");

    try {
      await api.post(`/attendance/sessions/${id}/toggle/`);

      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to update session.");
    } finally {
      setTogglingId(null);
    }
  };

  const exportSession = async (s) => {
    setExportingId(s.id);
    setError("");

    try {
      const r = await api.get(`/attendance/sessions/${s.id}/export/`, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(new Blob([r.data]));

      const a = document.createElement("a");
      a.href = url;
      a.download = `${s.course_code}_attendance.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export attendance.");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <AppShell role="CLASS_REP">
      <div className="cp-rep-dashboard">
        {/* =================================================
            HEADER
        ================================================== */}
        <header className="cp-rep-dashboard-header">
          <div>
            <span className="cp-page-eyebrow">Representative workspace</span>

            <h1>Good to see you, {decoded.username || "Representative"}.</h1>

            <p>
              Run today&apos;s sessions, monitor attendance and keep your class
              informed.
            </p>
          </div>

          <button
            type="button"
            className="cp-rep-primary-button"
            onClick={() =>
              document.getElementById("cp-create-session")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            <span>New session</span>
            <span aria-hidden="true">+</span>
          </button>
        </header>

        {/* =================================================
            FEEDBACK
        ================================================== */}
        {(notice || error) && (
          <div
            className={`cp-rep-feedback ${notice ? "success" : "error"}`}
            role={error ? "alert" : "status"}
          >
            <span>{notice ? "✓" : "!"}</span>
            <p>{notice || error}</p>
          </div>
        )}

        {/* =================================================
            OVERVIEW
        ================================================== */}
        <section className="cp-rep-overview">
          <div className="cp-rep-stat cp-rep-stat-live">
            <div className="cp-rep-stat-label">
              <span className="cp-live-indicator" />
              Live sessions
            </div>

            <strong>{dashboardLoading ? "—" : active}</strong>

            <small>currently running</small>
          </div>

          <div className="cp-rep-stat">
            <div className="cp-rep-stat-label">Sessions created</div>

            <strong>{dashboardLoading ? "—" : sessions.length}</strong>

            <small>in your workspace</small>
          </div>

          <div className="cp-rep-stat">
            <div className="cp-rep-stat-label">Check-ins recorded</div>

            <strong>{dashboardLoading ? "—" : totalAttendees}</strong>

            <small>{avg ? `~${avg} per session` : "No check-ins yet"}</small>
          </div>
        </section>

        {/* =================================================
            CLASS CODE
        ================================================== */}
        <section className="cp-rep-access">
          <div className="cp-rep-access-copy">
            <span className="cp-page-eyebrow">Access control</span>

            <h2>Class signup code</h2>

            <p>
              Share this code with your coursemates so only members of your
              class can create accounts for this attendance workspace.
            </p>
          </div>

          <div className="cp-rep-code-area">
            <div className="cp-rep-code-row">
              <span className="cp-rep-code">{classCode || "Loading…"}</span>

              <button
                type="button"
                className="cp-rep-secondary-button"
                onClick={copyCode}
                disabled={!classCode}
              >
                {copied ? (
                  <>
                    <CheckIcon />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    Copy code
                  </>
                )}
              </button>

              <button
                type="button"
                className="cp-rep-whatsapp-button"
                onClick={shareCodeToWhatsApp}
                disabled={!classCode}
              >
                <WhatsAppIcon />
                Share to WhatsApp
              </button>

              <button
                type="button"
                className="cp-rep-text-button"
                onClick={regenerateCode}
                disabled={regenerating}
              >
                {regenerating ? "Regenerating…" : "Regenerate code"}
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            CREATION WORKSPACE
        ================================================== */}
        <div className="cp-rep-workspace-grid">
          {/* Session creation */}
          <section className="cp-rep-workspace-card" id="cp-create-session">
            <div className="cp-rep-card-header">
              <div>
                <span className="cp-page-eyebrow">Session setup</span>

                <h2>Create lecture session</h2>

                <p>
                  Set the lecture details and capture the current venue
                  location.
                </p>
              </div>

              <span className="cp-location-label">
                <LocationIcon />
                Location required
              </span>
            </div>

            <form className="cp-rep-form" onSubmit={create}>
              <div className="cp-rep-form-grid">
                <label>
                  <span>Course code</span>

                  <input
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CSC 202"
                    required
                  />
                </label>

                <label>
                  <span>Venue</span>

                  <input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. Lecture Hall A"
                    required
                  />
                </label>

                <label>
                  <span>Level</span>

                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </label>

                <label>
                  <span>Attendance radius</span>

                  <div className="cp-radius-options">
                    {[30, 50, 100, 200].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={radius === r ? "active" : ""}
                        onClick={() => setRadius(r)}
                      >
                        {r}m
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    min={10}
                    max={20000000}
                  />
                </label>
              </div>

              <div className="cp-rep-form-footer">
                <span>
                  Your browser will request your current location when the
                  session is created.
                </span>

                <button
                  type="submit"
                  className="cp-rep-submit-button"
                  disabled={loading}
                >
                  {loading ? "Creating session…" : "Create & start session"}
                </button>
              </div>
            </form>
          </section>

          {/* Announcement */}
          <section className="cp-rep-workspace-card">
            <div className="cp-rep-card-header">
              <div>
                <span className="cp-page-eyebrow">Communication</span>

                <h2>New announcement</h2>

                <p>Send an update directly to your class notification feed.</p>
              </div>
            </div>

            <form className="cp-rep-form" onSubmit={post}>
              <div className="cp-rep-form-grid">
                <label>
                  <span>Category</span>

                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value)}
                  >
                    <option value="GENERAL">General</option>

                    <option value="ASSIGNMENT">Assignment</option>

                    <option value="VENUE_CHANGE">Venue Change</option>
                  </select>
                </label>

                {annCategory === "ASSIGNMENT" && (
                  <label>
                    <span>Due date</span>

                    <input
                      type="date"
                      value={annDueDate}
                      onChange={(e) => setAnnDueDate(e.target.value)}
                    />
                  </label>
                )}
              </div>

              <label>
                <span>Title</span>

                <input
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. CSC 202 Assignment 1"
                  required
                />
              </label>

              <label>
                <span>Message</span>

                <textarea
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  rows={5}
                  placeholder="Write the message for your classmates..."
                  required
                />
              </label>

              <div className="cp-rep-form-footer">
                <span>
                  The announcement will appear in the class notification feed.
                </span>

                <button
                  type="submit"
                  className="cp-rep-submit-button"
                  disabled={postingAnnouncement}
                >
                  {postingAnnouncement ? "Publishing…" : "Publish announcement"}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* =================================================
            SESSIONS
        ================================================== */}
        <section className="cp-rep-section">
          <div className="cp-rep-section-header">
            <div>
              <span className="cp-page-eyebrow">Session control</span>

              <h2>Your sessions</h2>

              <p>
                Quickly monitor and control your recent attendance sessions.
              </p>
            </div>

            <button
              type="button"
              className="cp-rep-outline-button"
              onClick={() => navigate("/rep/sessions")}
            >
              View all
              <ArrowIcon />
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="cp-rep-empty">
              <div className="cp-rep-empty-mark">—</div>
              <h3>No sessions created yet</h3>
              <p>
                Create your first lecture session above to begin recording
                attendance.
              </p>
            </div>
          ) : (
            <div className="cp-rep-session-list">
              {sessions.slice(0, 5).map((s) => (
                <article className="cp-rep-session" key={s.id}>
                  <div className="cp-rep-session-info">
                    <div className="cp-rep-course-icon">
                      {s.course_code?.slice(0, 2) || "CP"}
                    </div>

                    <div>
                      <div className="cp-rep-session-title">
                        <strong>{s.course_code}</strong>

                        <span
                          className={`cp-rep-status ${
                            s.has_ended
                              ? "ended"
                              : s.is_active
                                ? "live"
                                : "ready"
                          }`}
                        >
                          <i />
                          {s.has_ended
                            ? "Ended"
                            : s.is_active
                              ? "Live"
                              : "Ready"}
                        </span>
                      </div>

                      <p>
                        {s.venue_name} · {s.level} Level
                      </p>

                      <span className="cp-rep-checkins">
                        {s.attendee_count || 0} check-ins
                      </span>
                    </div>
                  </div>

                  <div className="cp-rep-session-actions">
                    {!s.has_ended && (
                      <button
                        type="button"
                        className={`cp-rep-session-action ${
                          s.is_active ? "secondary" : "primary"
                        }`}
                        onClick={() => toggle(s.id)}
                        disabled={togglingId === s.id}
                      >
                        {togglingId === s.id
                          ? "Updating…"
                          : s.is_active
                            ? "End session"
                            : "Start session"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="cp-rep-session-action secondary"
                      onClick={() => exportSession(s)}
                      disabled={exportingId === s.id}
                    >
                      <ExportIcon />
                      {exportingId === s.id ? "Exporting…" : "Export"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* =================================================
            AUDIT LOG
        ================================================== */}
        <section className="cp-rep-section">
          <div className="cp-rep-section-header">
            <div>
              <span className="cp-page-eyebrow">Activity</span>

              <h2>Recent audit log</h2>

              <p>
                A record of important actions performed in your representative
                workspace.
              </p>
            </div>

            <button
              type="button"
              className="cp-rep-outline-button"
              onClick={() => navigate("/rep/activity")}
            >
              Full activity
              <ArrowIcon />
            </button>
          </div>

          {auditLog.length === 0 ? (
            <div className="cp-rep-empty cp-rep-empty-small">
              <div className="cp-rep-empty-mark">—</div>
              <p>No activity recorded yet.</p>
            </div>
          ) : (
            <div className="cp-rep-audit-list">
              {auditLog.slice(0, 6).map((item) => (
                <div key={item.id} className="cp-rep-audit-row">
                  <div>
                    <strong>{item.action}</strong>

                    <span>
                      {item.course_code}
                      {item.venue_name ? ` · ${item.venue_name}` : ""}
                    </span>
                  </div>

                  <small>{item.rep_name}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default RepDashboard;
