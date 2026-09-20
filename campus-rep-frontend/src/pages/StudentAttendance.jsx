import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function getSessionInitials(courseCode) {
  if (!courseCode) return "CP";

  return courseCode
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

function StudentAttendance() {
  const [sessions, setSessions] = useState([]);
  const [checking, setChecking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");

  const loadSessions = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/attendance/sessions/active/");
      setSessions(response.data || []);
    } catch {
      setError("Unable to load active sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    api
      .get("/accounts/profile/")
      .then((response) => setProfile(response.data))
      .catch(() => {});
  }, []);

  const requestLocation = (onSuccess, onFailure) => {
    setLocationStatus("requesting");

    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      onFailure({ code: 0 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus("allowed");
        onSuccess(position);
      },
      (locationError) => {
        setLocationStatus(locationError.code === 1 ? "denied" : "idle");
        onFailure(locationError);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const checkIn = (id) => {
    setError("");
    setMessage("");

    if (!profile?.registration_completed) {
      setError("Complete your registration details before checking in.");
      return;
    }

    setChecking(id);

    requestLocation(
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

          await loadSessions();
        } catch (requestError) {
          setError(
            requestError.response?.data?.detail ||
              "Check-in failed. Ensure you are physically inside the lecture hall.",
          );
        } finally {
          setChecking(null);
        }
      },
      (locationError) => {
        let locationMessage =
          "Location access is required for attendance check-in.";

        if (locationError.code === 1) {
          locationMessage =
            "Location permission was denied. Use your browser site settings to allow location, then try again.";
        } else if (locationError.code === 2) {
          locationMessage =
            "Unable to determine your location. Turn on your device location and try again.";
        } else if (locationError.code === 0) {
          locationMessage = "Location is not supported by your browser.";
        }

        setError(locationMessage);
        setChecking(null);
      },
    );
  };

  return (
    <AppShell role="STUDENT">
      <div className="cp-student-attendance">
        <header className="cp-attendance-header">
          <div>
            <span className="cp-page-eyebrow">
              <span />
              Attendance check-in
            </span>

            <h1>Check in to a live class.</h1>

            <p>
              Your GPS location verifies that you are present within the
              designated lecture venue.
            </p>
          </div>

          <button
            type="button"
            className="cp-attendance-refresh"
            onClick={loadSessions}
            disabled={loading}
          >
            <RefreshIcon />
            {loading ? "Checking..." : "Refresh sessions"}
          </button>
        </header>

        {(message || error) && (
          <div
            className={`cp-attendance-feedback ${
              message ? "success" : "error"
            }`}
            role="status"
          >
            <span className="cp-attendance-feedback-icon">
              {message ? <CheckIcon /> : <AlertIcon />}
            </span>

            <div>
              <strong>
                {message ? "Attendance recorded" : "Check-in issue"}
              </strong>

              <p>{message || error}</p>
            </div>
          </div>
        )}

        {profile && !profile.registration_completed && (
          <div className="cp-attendance-feedback error" role="status">
            <span className="cp-attendance-feedback-icon">
              <AlertIcon />
            </span>

            <div>
              <strong>Complete registration to check in</strong>

              <p>
                Add your matric number, WhatsApp number, and class
                representative code in your profile first. <Link to="/profile">Complete your profile</Link>
              </p>
            </div>
          </div>
        )}

        {profile?.registration_completed && locationStatus !== "allowed" && (
          <div className="cp-attendance-feedback">
            <span className="cp-attendance-feedback-icon">
              <LocationIcon />
            </span>

            <div>
              <strong>Allow browser location</strong>

              <p>
                Location is only used to verify that you are at the lecture
                venue when checking in.
              </p>

              <button
                type="button"
                className="cp-attendance-empty-button"
                onClick={() =>
                  requestLocation(
                    () => setMessage("Location access is ready for check-in."),
                    () => {},
                  )
                }
                disabled={locationStatus === "requesting"}
              >
                <LocationIcon />
                {locationStatus === "requesting"
                  ? "Requesting location..."
                  : "Allow location access"}
              </button>
            </div>
          </div>
        )}

        <section className="cp-attendance-panel">
          <div className="cp-attendance-panel-header">
            <div>
              <span className="cp-attendance-section-label">Live sessions</span>

              <h2>
                {loading
                  ? "Available classes"
                  : `${sessions.length} ${
                      sessions.length === 1 ? "class" : "classes"
                    } available now`}
              </h2>
            </div>

            <div className="cp-attendance-secure">
              <span>
                <LocationIcon />
              </span>
              GPS verified
            </div>
          </div>

          {loading ? (
            <div className="cp-attendance-loading">
              <LoadingSkeleton rows={3} />
            </div>
          ) : sessions.length === 0 ? (
            <div className="cp-attendance-empty">
              <div className="cp-attendance-empty-icon">
                <LocationIcon />
              </div>

              <span className="cp-attendance-section-label">Nothing live</span>

              <h3>No classes currently live</h3>

              <p>
                When your class representative starts an attendance session, it
                will appear here.
              </p>

              <button
                type="button"
                className="cp-attendance-empty-button"
                onClick={loadSessions}
              >
                <RefreshIcon />
                Check again
              </button>
            </div>
          ) : (
            <div className="cp-attendance-session-list">
              {sessions.map((session, index) => (
                <article
                  className="cp-attendance-session"
                  key={session.id}
                  style={{
                    "--cp-attendance-index": index,
                  }}
                >
                  <div className="cp-attendance-course-mark">
                    {getSessionInitials(session.course_code)}
                  </div>

                  <div className="cp-attendance-session-main">
                    <div className="cp-attendance-session-heading">
                      <h3>{session.course_code}</h3>

                      <span className="cp-attendance-live">
                        <i />
                        Live
                      </span>
                    </div>

                    <div className="cp-attendance-session-meta">
                      <span>
                        <LocationIcon />
                        {session.venue_name}
                      </span>

                      <span>{session.level} Level</span>

                      <span>{session.radius_meters || 50}m radius</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`cp-attendance-check-button ${
                      checking === session.id ? "checking" : ""
                    }`}
                    onClick={() => checkIn(session.id)}
                    disabled={checking === session.id}
                  >
                    {checking === session.id ? (
                      <>
                        <span className="cp-attendance-spinner" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <LocationIcon />
                        Check in
                      </>
                    )}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="cp-attendance-guide">
          <div className="cp-attendance-guide-icon">
            <ShieldIcon />
          </div>

          <div className="cp-attendance-guide-content">
            <div className="cp-attendance-guide-heading">
              <strong>How GPS verification works</strong>
              <span>Attendance protection</span>
            </div>

            <p>
              CampusPulse checks your current location against the attendance
              radius configured for the live session. You must be physically
              within that area for the check-in to be accepted.
            </p>

            <div className="cp-attendance-tips">
              <span>
                <CheckIcon />
                Turn on device Location
              </span>

              <span>
                <CheckIcon />
                Allow browser location access
              </span>

              <span>
                <CheckIcon />
                Stay within the lecture venue
              </span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default StudentAttendance;
