import { useEffect, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import "./LecturerDashboard.css";

function LecturerDirectory({ role }) {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .get("/accounts/lecturers/")
      .then((response) => {
        if (mounted) setLecturers(response.data || []);
      })
      .catch((requestError) => {
        if (mounted) {
          setError(
            requestError.response?.data?.detail ||
              "Unable to load lecturers for your class.",
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell role={role}>
      <main className="cp-lecturer-page">
        <header className="cp-lecturer-header">
          <div>
            <span className="cp-lecturer-eyebrow">Your class community</span>
            <h1>Lecturers</h1>
            <p>Approved lecturers assigned to your department and level.</p>
          </div>
        </header>
        {error && (
          <div className="cp-lecturer-feedback is-error" role="alert">
            {error}
          </div>
        )}
        <section className="cp-lecturer-panel">
          <div className="cp-lecturer-panel-heading">
            <div>
              <span className="cp-lecturer-eyebrow">Teaching staff</span>
              <h2>Class lecturer directory</h2>
            </div>
          </div>
          {loading ? (
            <p className="cp-lecturer-muted">Loading lecturers…</p>
          ) : lecturers.length === 0 ? (
            <p className="cp-lecturer-muted">
              No approved lecturers are listed for your department and level yet.
            </p>
          ) : (
            <div className="cp-lecturer-session-list">
              {lecturers.map((lecturer) => (
                <article className="cp-lecturer-session" key={lecturer.id}>
                  <div className="cp-lecturer-session-main">
                    <div className="cp-lecturer-session-title">
                      <h3>{lecturer.display_name}</h3>
                      <span className="cp-lecturer-status is-live">Verified</span>
                    </div>
                    <p>{lecturer.department} · {lecturer.level} Level</p>
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

export default LecturerDirectory;
