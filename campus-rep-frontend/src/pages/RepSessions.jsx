import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";

function LiveIcon() {
  return (
    <span className="cp-session-live-icon" aria-hidden="true">
      <span />
    </span>
  );
}

function SessionIcon({ courseCode }) {
  const initials =
    courseCode?.replace(/\s+/g, "")?.slice(0, 2)?.toUpperCase() || "CP";

  return (
    <div className="cp-session-course-icon" aria-hidden="true">
      {initials}
    </div>
  );
}

function RepSessions() {
  const [sessions, setSessions] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const r = await api.get("/attendance/sessions/mine/");
      setSessions(r.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to load your sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSession = async (session) => {
    setBusyId(session.id);
    setError("");
    setNotice("");

    try {
      const r = await api.post(`/attendance/sessions/${session.id}/toggle/`);

      setNotice(
        r.data?.detail ||
          (session.is_active ? "Session ended." : "Session started."),
      );

      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to update the session.");
    } finally {
      setBusyId(null);
    }
  };

  const exportSession = async (session) => {
    setBusyId(`export-${session.id}`);
    setError("");
    setNotice("");

    try {
      const response = await api.get(
        `/attendance/sessions/${session.id}/export/`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${session.course_code.replace(
        /\s+/g,
        "_",
      )}_attendance.xlsx`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);

      setNotice("Attendance report exported.");
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to export attendance.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteSession = async (session) => {
    const warning = session.is_active
      ? "This session is currently LIVE. Deleting it will remove it and its attendance data permanently — students will lose any check-ins already recorded. Continue?"
      : "Delete this session permanently? This also removes its attendance records and cannot be undone.";

    if (!window.confirm(warning)) return;

    setBusyId(`delete-${session.id}`);
    setError("");
    setNotice("");

    try {
      await api.delete(`/attendance/sessions/${session.id}/delete/`);

      setNotice("Session deleted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to delete the session.");
    } finally {
      setBusyId(null);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (filter === "LIVE") return session.is_active;
    if (filter === "ENDED") return session.has_ended;
    return true;
  });

  const liveCount = sessions.filter((session) => session.is_active).length;

  const endedCount = sessions.filter((session) => session.has_ended).length;

  const readyCount = sessions.filter(
    (session) => !session.is_active && !session.has_ended,
  ).length;

  return (
    <AppShell role="CLASS_REP">
      <div className="cp-rep-sessions-page">
        <header className="cp-rep-page-header">
          <div>
            <span className="cp-page-eyebrow">Attendance control</span>

            <div className="cp-rep-page-title-row">
              <h1>Sessions</h1>

              {liveCount > 0 && (
                <span className="cp-rep-live-summary">
                  <LiveIcon />
                  {liveCount} live now
                </span>
              )}
            </div>

            <p>
              Start, monitor, end and export attendance sessions created for
              your class.
            </p>
          </div>

          <div className="cp-rep-page-actions">
            <button
              type="button"
              className="cp-rep-refresh-button"
              onClick={load}
              disabled={loading}
            >
              <span aria-hidden="true">↻</span>
              {loading ? "Loading…" : "Refresh"}
            </button>

            <button
              type="button"
              className="cp-rep-primary-button"
              onClick={() => navigate("/rep#create-session")}
            >
              <span aria-hidden="true">+</span>
              New session
            </button>
          </div>
        </header>

        {(notice || error) && (
          <div
            className={`cp-rep-feedback ${notice ? "success" : "error"}`}
            role={error ? "alert" : "status"}
          >
            <span className="cp-rep-feedback-mark">{notice ? "✓" : "!"}</span>

            <span>{notice || error}</span>
          </div>
        )}

        <section className="cp-session-overview">
          <div className="cp-session-overview-item">
            <span className="cp-session-overview-label">Total sessions</span>
            <strong>{sessions.length}</strong>
            <span className="cp-session-overview-note">
              Created in your workspace
            </span>
          </div>

          <div className="cp-session-overview-divider" />

          <div className="cp-session-overview-item">
            <span className="cp-session-overview-label">Live now</span>

            <strong className="live-number">{liveCount}</strong>

            <span className="cp-session-overview-note">
              Currently accepting attendance
            </span>
          </div>

          <div className="cp-session-overview-divider" />

          <div className="cp-session-overview-item">
            <span className="cp-session-overview-label">Ready</span>

            <strong>{readyCount}</strong>

            <span className="cp-session-overview-note">
              Created but not started
            </span>
          </div>

          <div className="cp-session-overview-divider" />

          <div className="cp-session-overview-item">
            <span className="cp-session-overview-label">Ended</span>

            <strong>{endedCount}</strong>

            <span className="cp-session-overview-note">Completed sessions</span>
          </div>
        </section>

        <div className="cp-session-filter-bar">
          <div>
            <span className="cp-session-filter-label">Session history</span>

            <strong>
              {filteredSessions.length}{" "}
              {filteredSessions.length === 1 ? "session" : "sessions"}
            </strong>
          </div>

          <div
            className="cp-session-filter-tabs"
            role="tablist"
            aria-label="Filter sessions"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === "ALL"}
              className={`cp-session-filter ${
                filter === "ALL" ? "active" : ""
              }`}
              onClick={() => setFilter("ALL")}
            >
              All
              <span>{sessions.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filter === "LIVE"}
              className={`cp-session-filter ${
                filter === "LIVE" ? "active" : ""
              }`}
              onClick={() => setFilter("LIVE")}
            >
              <LiveIcon />
              Live
              <span>{liveCount}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filter === "ENDED"}
              className={`cp-session-filter ${
                filter === "ENDED" ? "active" : ""
              }`}
              onClick={() => setFilter("ENDED")}
            >
              Ended
              <span>{endedCount}</span>
            </button>
          </div>
        </div>

        <section className="cp-session-list-panel">
          {loading ? (
            <div className="cp-session-loading">
              <LoadingSkeleton rows={5} />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="cp-session-empty">
              <div className="cp-session-empty-icon">
                <span />
              </div>

              <span className="cp-page-eyebrow">No sessions</span>

              <h2>No sessions found</h2>

              <p>
                {filter === "LIVE"
                  ? "There are no sessions currently running."
                  : filter === "ENDED"
                    ? "No ended sessions are available yet."
                    : "Create your first lecture session from the representative dashboard."}
              </p>

              {filter === "ALL" && (
                <button
                  type="button"
                  className="cp-rep-primary-button"
                  onClick={() => navigate("/rep#create-session")}
                >
                  <span aria-hidden="true">+</span>
                  Create first session
                </button>
              )}

              {filter !== "ALL" && (
                <button
                  type="button"
                  className="cp-rep-secondary-button"
                  onClick={() => setFilter("ALL")}
                >
                  View all sessions
                </button>
              )}
            </div>
          ) : (
            <div className="cp-session-list">
              {filteredSessions.map((session, index) => {
                const state = session.has_ended
                  ? "Ended"
                  : session.is_active
                    ? "Live"
                    : "Ready";

                const isBusy = busyId === session.id;

                const exporting = busyId === `export-${session.id}`;

                const deleting = busyId === `delete-${session.id}`;

                return (
                  <article
                    className={`cp-session-row ${
                      session.is_active
                        ? "is-live"
                        : session.has_ended
                          ? "is-ended"
                          : "is-ready"
                    }`}
                    key={session.id}
                    style={{
                      "--cp-session-index": index,
                    }}
                  >
                    <div className="cp-session-main">
                      <SessionIcon courseCode={session.course_code} />

                      <div className="cp-session-information">
                        <div className="cp-session-heading">
                          <div className="cp-session-course">
                            <strong>{session.course_code}</strong>

                            <span
                              className={`cp-session-status ${
                                session.has_ended
                                  ? "ended"
                                  : session.is_active
                                    ? "live"
                                    : "ready"
                              }`}
                            >
                              {session.is_active && <LiveIcon />}

                              {!session.is_active && !session.has_ended && (
                                <span className="cp-status-dot" />
                              )}

                              {state}
                            </span>
                          </div>
                        </div>

                        <div className="cp-session-details">
                          <span>{session.venue_name}</span>

                          <span className="cp-session-detail-separator" />

                          <span>{session.level} Level</span>

                          <span className="cp-session-detail-separator" />

                          <span>{session.radius_meters}m radius</span>
                        </div>

                        <div className="cp-session-meta">
                          <span className="cp-session-attendees">
                            <strong>{session.attendee_count || 0}</strong>{" "}
                            check-in
                            {session.attendee_count === 1 ? "" : "s"}
                          </span>

                          <span className="cp-session-meta-separator" />

                          <span>
                            {new Date(session.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="cp-session-actions">
                      {!session.has_ended && (
                        <button
                          type="button"
                          className={`cp-session-action ${
                            session.is_active ? "end" : "start"
                          }`}
                          disabled={isBusy}
                          onClick={() => toggleSession(session)}
                        >
                          {isBusy
                            ? "Updating…"
                            : session.is_active
                              ? "End session"
                              : "Start session"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="cp-session-action secondary"
                        disabled={exporting}
                        onClick={() => exportSession(session)}
                      >
                        {exporting ? "Exporting…" : "Export Excel"}
                      </button>

                      <button
                        type="button"
                        className="cp-session-action danger"
                        disabled={deleting}
                        onClick={() => deleteSession(session)}
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default RepSessions;
