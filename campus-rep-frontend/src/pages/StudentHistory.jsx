import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";

function CheckIcon({ size = 14 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CloseIcon({ size = 14 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
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
}

function AttendanceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h2" />
      <path d="M8 16h2" />
      <path d="m14 12 1.5 1.5L18 11" />
    </svg>
  );
}

function StudentHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [histRes, statsRes] = await Promise.all([
        api.get("/attendance/my-history/"),
        api.get("/attendance/my-stats/"),
      ]);

      setHistory(histRes.data || []);
      setStats(statsRes.data || null);
    } catch {
      setError("Unable to load your attendance history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const attendedCount = useMemo(
    () => history.filter((item) => item.status === "attended").length,
    [history],
  );

  const missedCount = useMemo(
    () => history.filter((item) => item.status === "missed").length,
    [history],
  );

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((item) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "ATTENDED" && item.status === "attended") ||
        (filter === "MISSED" && item.status === "missed");

      const matchesSearch =
        !query ||
        item.course_code?.toLowerCase().includes(query) ||
        item.venue_name?.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [history, filter, search]);

  const rate =
    stats?.rate ??
    (history.length ? Math.round((attendedCount / history.length) * 100) : 0);

  const threshold = stats?.eligibility_threshold ?? 70;
  const isEligible = rate >= threshold;

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <AppShell role="STUDENT">
      <div className="cp-history-page">
        {/* Page header */}
        <header className="cp-student-page-header">
          <div>
            <div className="cp-student-eyebrow">
              <span className="cp-student-eyebrow-dot" />
              Attendance record
            </div>

            <h1>Class history.</h1>

            <p>
              Review your attendance record and keep track of your academic
              attendance standing.
            </p>
          </div>

          <button
            type="button"
            className="cp-student-refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshIcon />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {error && (
          <div className="cp-history-feedback cp-history-feedback-error">
            <span className="cp-history-feedback-mark">
              <CloseIcon size={13} />
            </span>
            <div>
              <strong>Could not load attendance</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Attendance overview */}
        <section className="cp-history-overview">
          <div className="cp-history-rate-card">
            <div className="cp-history-rate-top">
              <div>
                <span className="cp-history-card-label">
                  Overall attendance
                </span>
                <strong className="cp-history-rate-value">{rate}%</strong>
              </div>

              <div
                className={`cp-history-rate-ring ${
                  isEligible ? "eligible" : "attention"
                }`}
                style={{
                  "--cp-history-rate": `${Math.min(rate, 100)}%`,
                }}
              >
                <span>{rate}%</span>
              </div>
            </div>

            <div className="cp-history-progress">
              <span style={{ width: `${Math.min(rate, 100)}%` }} />
            </div>

            <div className="cp-history-rate-footer">
              <span>
                {attendedCount} of {history.length} recorded classes attended
              </span>

              <span
                className={`cp-history-standing ${
                  isEligible ? "eligible" : "attention"
                }`}
              >
                {isEligible ? (
                  <>
                    <CheckIcon size={12} />
                    Meeting requirement
                  </>
                ) : (
                  <>
                    <span className="cp-history-standing-dot" />
                    Below requirement
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="cp-history-summary-card">
            <div className="cp-history-summary-icon attended">
              <CheckIcon size={17} />
            </div>

            <div>
              <span>Classes attended</span>
              <strong>{attendedCount}</strong>
              <small>GPS-verified attendance</small>
            </div>
          </div>

          <div className="cp-history-summary-card">
            <div className="cp-history-summary-icon missed">
              <CloseIcon size={17} />
            </div>

            <div>
              <span>Classes missed</span>
              <strong>{missedCount}</strong>
              <small>
                {missedCount === 0
                  ? "No missed classes recorded"
                  : "Unattended sessions"}
              </small>
            </div>
          </div>
        </section>

        {/* Eligibility notice */}
        <section
          className={`cp-history-eligibility ${
            isEligible ? "eligible" : "attention"
          }`}
        >
          <div className="cp-history-eligibility-icon">
            {isEligible ? <CheckIcon size={17} /> : <span>!</span>}
          </div>

          <div className="cp-history-eligibility-content">
            <strong>
              {isEligible
                ? "Your attendance is currently above the required threshold."
                : "Your attendance is currently below the required threshold."}
            </strong>

            <span>
              The recorded attendance threshold is {threshold}%.
              {isEligible
                ? " Keep attending classes consistently."
                : " Continue attending classes to improve your attendance rate."}
            </span>
          </div>

          <div className="cp-history-eligibility-value">
            <span>Required</span>
            <strong>{threshold}%</strong>
          </div>
        </section>

        {/* Attendance records */}
        <section className="cp-history-record-panel">
          <div className="cp-history-record-header">
            <div>
              <div className="cp-history-section-label">
                <AttendanceIcon />
                Lecture records
              </div>

              <h2>
                Attendance history
                <span>{filteredHistory.length}</span>
              </h2>
            </div>

            <div className="cp-history-search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search course or venue"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search attendance history"
              />

              {search && (
                <button
                  type="button"
                  className="cp-history-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="cp-history-toolbar">
            <div className="cp-history-filter-tabs">
              <button
                type="button"
                className={filter === "ALL" ? "active" : ""}
                onClick={() => setFilter("ALL")}
              >
                All
                <span>{history.length}</span>
              </button>

              <button
                type="button"
                className={filter === "ATTENDED" ? "active" : ""}
                onClick={() => setFilter("ATTENDED")}
              >
                <CheckIcon size={12} />
                Attended
                <span>{attendedCount}</span>
              </button>

              <button
                type="button"
                className={filter === "MISSED" ? "active" : ""}
                onClick={() => setFilter("MISSED")}
              >
                <CloseIcon size={12} />
                Missed
                <span>{missedCount}</span>
              </button>
            </div>

            {(search || filter !== "ALL") && (
              <button
                type="button"
                className="cp-history-clear-filters"
                onClick={() => {
                  setSearch("");
                  setFilter("ALL");
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="cp-history-loading">
              <LoadingSkeleton rows={5} />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="cp-history-empty">
              <div className="cp-history-empty-icon">
                <AttendanceIcon />
              </div>

              <h3>No attendance records found</h3>

              <p>
                {search
                  ? "No classes match your search."
                  : filter === "MISSED"
                    ? "You have no missed classes in the current record."
                    : filter === "ATTENDED"
                      ? "You have no attended classes in the current record."
                      : "Attendance records will appear here after classes are recorded."}
              </p>

              {(search || filter !== "ALL") && (
                <button
                  type="button"
                  className="cp-history-empty-action"
                  onClick={() => {
                    setSearch("");
                    setFilter("ALL");
                  }}
                >
                  View all records
                </button>
              )}
            </div>
          ) : (
            <div className="cp-history-list">
              {filteredHistory.map((item, index) => {
                const isPresent = item.status === "attended";

                return (
                  <article
                    className={`cp-history-row ${
                      isPresent ? "attended" : "missed"
                    }`}
                    key={item.id}
                    style={{
                      "--cp-history-row-index": index,
                    }}
                  >
                    <div
                      className={`cp-history-course-mark ${
                        isPresent ? "attended" : "missed"
                      }`}
                    >
                      {item.course_code?.slice(0, 2) || "CP"}
                    </div>

                    <div className="cp-history-row-main">
                      <div className="cp-history-row-title">
                        <strong>{item.course_code || "Unknown course"}</strong>

                        <span
                          className={`cp-history-status ${
                            isPresent ? "attended" : "missed"
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <CheckIcon size={11} />
                              Attended
                            </>
                          ) : (
                            <>
                              <CloseIcon size={11} />
                              Missed
                            </>
                          )}
                        </span>
                      </div>

                      <div className="cp-history-row-meta">
                        <span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
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
                          {item.venue_name || "Venue unavailable"}
                        </span>

                        <span className="cp-history-meta-separator">·</span>

                        <span>{formatDate(item.date)}</span>

                        {formatTime(item.date) && (
                          <>
                            <span className="cp-history-meta-separator">·</span>
                            <span>{formatTime(item.date)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="cp-history-row-date">
                      <span>{formatDate(item.date)}</span>
                      <small>{formatTime(item.date)}</small>
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

export default StudentHistory;
