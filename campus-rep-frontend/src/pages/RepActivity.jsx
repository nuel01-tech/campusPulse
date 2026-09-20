import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api/axios";
import LoadingSkeleton from "../components/LoadingSkeleton";

function ActivityIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

function RepActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/attendance/audit-log/")
      .then((r) => setLogs(r.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell role="CLASS_REP">
      <div className="cp-rep-activity-page">
        {/* Header */}
        <header className="cp-rep-page-header">
          <div>
            <span className="cp-page-eyebrow">Representative workspace</span>

            <h1>Activity log</h1>

            <p>
              A chronological record of important actions carried out in your
              class workspace.
            </p>
          </div>

          {!loading && (
            <div className="cp-activity-total">
              <strong>{logs.length}</strong>
              <span>Recorded actions</span>
            </div>
          )}
        </header>

        {/* Activity panel */}
        <section className="cp-activity-panel">
          <div className="cp-activity-panel-head">
            <div>
              <span className="cp-page-eyebrow">Audit trail</span>

              <h2>Recent activity</h2>
            </div>

            {!loading && logs.length > 0 && (
              <span className="cp-activity-count">
                {logs.length} {logs.length === 1 ? "entry" : "entries"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="cp-activity-loading">
              <LoadingSkeleton rows={5} />
            </div>
          ) : logs.length === 0 ? (
            <div className="cp-activity-empty">
              <div className="cp-activity-empty-icon">
                <ActivityIcon />
              </div>

              <h3>No activity yet</h3>

              <p>
                Session and announcement activity will appear here once actions
                are recorded.
              </p>
            </div>
          ) : (
            <div className="cp-activity-list">
              {logs.map((log, index) => (
                <article className="cp-activity-item" key={log.id}>
                  <div className="cp-activity-marker">
                    <span />
                  </div>

                  <div className="cp-activity-content">
                    <div className="cp-activity-main">
                      <div>
                        <span className="cp-activity-action">
                          {log.action?.toLowerCase().replace(/_/g, " ")}
                        </span>

                        <div className="cp-activity-details">
                          {log.course_code && <span>{log.course_code}</span>}

                          {log.course_code && log.venue_name && <i />}

                          {log.venue_name && <span>{log.venue_name}</span>}
                        </div>
                      </div>

                      <time
                        dateTime={log.timestamp}
                        className="cp-activity-time"
                      >
                        {new Date(log.timestamp).toLocaleString()}
                      </time>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default RepActivity;
