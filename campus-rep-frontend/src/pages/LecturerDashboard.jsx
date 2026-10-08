import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import "./LecturerDashboard.css";

const EMPTY_FORM = {
  assignment: "",
  course_code: "",
  venue_name: "",
  radius_meters: 50,
};

function getErrorMessage(error, fallback) {
  const data = error.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const firstError = Object.values(data).flat(Infinity)[0];
    if (typeof firstError === "string") return firstError;
  }
  return fallback;
}

function LecturerDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedAssignment = useMemo(
    () => assignments.find((item) => String(item.id) === form.assignment),
    [assignments, form.assignment],
  );

  const load = async () => {
    setError("");
    try {
      const [assignmentResponse, sessionResponse] = await Promise.all([
        api.get("/accounts/lecturer/assignments/"),
        api.get("/attendance/sessions/mine/"),
      ]);
      setAssignments(assignmentResponse.data || []);
      setSessions(sessionResponse.data || []);
      setForm((current) => ({
        ...current,
        assignment:
          current.assignment ||
          String(assignmentResponse.data?.[0]?.id || ""),
      }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load your lecturer workspace."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const captureLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Location access is not available in this browser.");
      return;
    }
    setBusy("location");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setBusy("");
        setNotice("Lecture venue location captured.");
      },
      (locationError) => {
        setBusy("");
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Allow location access to set the attendance venue."
            : "Unable to get your location. Try again near the lecture venue.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const createSession = async (event) => {
    event.preventDefault();
    setBusy("create");
    setError("");
    setNotice("");
    if (!selectedAssignment) {
      setError("Choose one of your approved department and level assignments.");
      setBusy("");
      return;
    }
    if (!coordinates) {
      setError("Capture your current location before creating the session.");
      setBusy("");
      return;
    }

    try {
      await api.post("/attendance/sessions/create/", {
        department: selectedAssignment.department,
        level: selectedAssignment.level,
        course_code: form.course_code.trim().toUpperCase(),
        venue_name: form.venue_name.trim(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius_meters: Number(form.radius_meters),
      });
      setForm((current) => ({
        ...EMPTY_FORM,
        assignment: current.assignment,
      }));
      setCoordinates(null);
      setNotice("Lecture session created. Start it when you are ready to take attendance.");
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create this lecture session."));
    } finally {
      setBusy("");
    }
  };

  const toggleSession = async (session) => {
    setBusy(`toggle-${session.id}`);
    setError("");
    setNotice("");
    try {
      const response = await api.post(
        `/attendance/sessions/${session.id}/toggle/`,
      );
      setNotice(response.data?.detail || "Session status updated.");
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to update this session."));
    } finally {
      setBusy("");
    }
  };

  const exportSession = async (session) => {
    setBusy(`export-${session.id}`);
    setError("");
    setNotice("");
    try {
      const response = await api.get(
        `/attendance/sessions/${session.id}/export/`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(response.data);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${session.course_code.replace(/\s+/g, "_")}_attendance.xlsx`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotice("Attendance spreadsheet downloaded.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to export attendance."));
    } finally {
      setBusy("");
    }
  };

  const activeCount = sessions.filter((session) => session.is_active).length;
  const attendeeCount = sessions.reduce(
    (total, session) => total + (session.attendee_count || 0),
    0,
  );

  return (
    <AppShell role="LECTURER">
      <main className="cp-lecturer-page">
        <header className="cp-lecturer-header">
          <div>
            <span className="cp-lecturer-eyebrow">Lecturer workspace</span>
            <h1>Lecture dashboard</h1>
            <p>Create attendance sessions, control check-in, and export class records.</p>
          </div>
          <button
            type="button"
            className="cp-lecturer-secondary-button"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {(error || notice) && (
          <div
            className={`cp-lecturer-feedback ${error ? "is-error" : "is-success"}`}
            role={error ? "alert" : "status"}
          >
            {error || notice}
          </div>
        )}

        <section className="cp-lecturer-stats" aria-label="Session summary">
          <article><span>Sessions</span><strong>{sessions.length}</strong></article>
          <article><span>Live now</span><strong>{activeCount}</strong></article>
          <article><span>Check-ins recorded</span><strong>{attendeeCount}</strong></article>
          <article><span>Approved classes</span><strong>{assignments.length}</strong></article>
        </section>

        <section className="cp-lecturer-panel" id="new-session">
          <div className="cp-lecturer-panel-heading">
            <div>
              <span className="cp-lecturer-eyebrow">Attendance setup</span>
              <h2>Create a lecture session</h2>
            </div>
          </div>
          {assignments.length === 0 ? (
            <p className="cp-lecturer-muted">
              No approved teaching assignments are available. Contact an administrator to update your lecturer profile.
            </p>
          ) : (
            <form className="cp-lecturer-form" onSubmit={createSession}>
              <label>
                <span>Department and level</span>
                <select
                  value={form.assignment}
                  onChange={(event) =>
                    setForm({ ...form, assignment: event.target.value })
                  }
                  required
                >
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.department_name} · {assignment.level} Level
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Course code</span>
                <input
                  value={form.course_code}
                  onChange={(event) =>
                    setForm({ ...form, course_code: event.target.value })
                  }
                  maxLength={10}
                  placeholder="e.g. CSC 301"
                  required
                />
              </label>
              <label>
                <span>Lecture venue</span>
                <input
                  value={form.venue_name}
                  onChange={(event) =>
                    setForm({ ...form, venue_name: event.target.value })
                  }
                  maxLength={100}
                  placeholder="e.g. LT 1"
                  required
                />
              </label>
              <label>
                <span>Check-in radius (metres)</span>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={form.radius_meters}
                  onChange={(event) =>
                    setForm({ ...form, radius_meters: event.target.value })
                  }
                  required
                />
              </label>
              <div className="cp-lecturer-location-row">
                <button
                  type="button"
                  className="cp-lecturer-secondary-button"
                  onClick={captureLocation}
                  disabled={busy === "location"}
                >
                  {busy === "location" ? "Getting location…" : "Use current venue location"}
                </button>
                <span>
                  {coordinates
                    ? `Location captured (${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)})`
                    : "Location is used to verify student check-ins."}
                </span>
              </div>
              <button
                type="submit"
                className="cp-lecturer-primary-button"
                disabled={busy === "create"}
              >
                {busy === "create" ? "Creating…" : "Create session"}
              </button>
            </form>
          )}
        </section>

        <section className="cp-lecturer-panel">
          <div className="cp-lecturer-panel-heading">
            <div>
              <span className="cp-lecturer-eyebrow">Session controls</span>
              <h2>Your lecture sessions</h2>
            </div>
            <span className="cp-lecturer-muted">{sessions.length} total</span>
          </div>
          {loading ? (
            <p className="cp-lecturer-muted">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="cp-lecturer-muted">You have not created any sessions yet.</p>
          ) : (
            <div className="cp-lecturer-session-list">
              {sessions.map((session) => (
                <article className="cp-lecturer-session" key={session.id}>
                  <div className="cp-lecturer-session-main">
                    <div className="cp-lecturer-session-title">
                      <h3>{session.course_code}</h3>
                      <span className={`cp-lecturer-status ${session.is_active ? "is-live" : session.has_ended ? "is-ended" : ""}`}>
                        {session.is_active ? "Live" : session.has_ended ? "Ended" : "Ready"}
                      </span>
                    </div>
                    <p>{session.department_name || selectedAssignment?.department_name} · {session.level} Level · {session.venue_name}</p>
                    <small>
                      {session.attendee_count || 0} check-ins · {new Date(session.created_at).toLocaleString()}
                    </small>
                  </div>
                  <div className="cp-lecturer-session-actions">
                    {!session.has_ended && (
                      <button
                        type="button"
                        className={session.is_active ? "cp-lecturer-secondary-button" : "cp-lecturer-primary-button"}
                        onClick={() => toggleSession(session)}
                        disabled={busy === `toggle-${session.id}`}
                      >
                        {busy === `toggle-${session.id}`
                          ? "Updating…"
                          : session.is_active
                            ? "Stop session"
                            : "Start session"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="cp-lecturer-secondary-button"
                      onClick={() => exportSession(session)}
                      disabled={busy === `export-${session.id}`}
                    >
                      {busy === `export-${session.id}` ? "Exporting…" : "Export Excel"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

export default LecturerDashboard;
