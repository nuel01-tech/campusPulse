import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { authenticatePasskeyForSession } from "../utils/passkey";

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
  const [feedbackStatus, setFeedbackStatus] = useState("info");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");

  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError("");

    try {
      const response = await api.get("/accounts/profile/");
      setProfile(response.data);
    } catch (requestError) {
      setProfile(null);
      setProfileError(
        requestError.response?.data?.detail ||
          "We couldn't load your account details. Check your connection and try again.",
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/attendance/sessions/active/");
      setSessions(response.data || []);
    } catch (requestError) {
      setMessage("");
      setError(
        requestError.response?.data?.detail ||
          "Unable to load active sessions. Check your connection and try again.",
      );
      setFeedbackStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load sessions and account state needed to check in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
    loadProfile();
  }, []);

  const requestLocation = (onSuccess, onFailure) => {
    setLocationStatus("requesting");

    if (window.isSecureContext === false) {
      setLocationStatus("insecure");
      onFailure({ code: 4, insecureContext: true });
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      onFailure({ code: 0 });
      return;
    }

    const acceptPosition = (position) => {
      setLocationStatus("allowed");
      onSuccess(position);
    };
    const fail = (locationError) => {
      setLocationStatus(locationError.code === 1 ? "denied" : "idle");
      onFailure(locationError);
    };

    navigator.geolocation.getCurrentPosition(
      acceptPosition,
      (locationError) => {
        if (locationError.code === 1) {
          fail(locationError);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          acceptPosition,
          fail,
          { enableHighAccuracy: false, timeout: 30000, maximumAge: 15000 },
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
  };

  const checkIn = (id) => {
    setError("");
    setMessage("");
    setFeedbackStatus("info");

    if (profileLoading) {
      setMessage("Loading your account details. Please try again in a moment.");
      setFeedbackStatus("info");
      return;
    }

    if (profileError || !profile) {
      setMessage("");
      setError("Your account details could not be loaded. Retry loading your profile before checking in.");
      setFeedbackStatus("error");
      return;
    }

    if (!profile.registration_completed) {
      setMessage("");
      setError("Complete your registration details before checking in.");
      setFeedbackStatus("error");
      return;
    }

    setChecking(id);

    requestLocation(
      async (position) => {
        try {
          setMessage("Verifying your passkey on this device...");
          const attendanceGrant = await authenticatePasskeyForSession(id);

          setMessage("Submitting attendance check-in...");
          const response = await api.post(
            `/attendance/sessions/${id}/checkin/`,
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              attendance_grant: attendanceGrant,
            },
          );

          setError("");
          setMessage(response.data.detail || "Successfully checked in!");
          setFeedbackStatus("success");
          setSessions((current) =>
            current.map((session) =>
              session.id === id
                ? {
                    ...session,
                    has_checked_in: true,
                    attendee_count: (session.attendee_count || 0) + 1,
                  }
                : session,
            ),
          );
        } catch (requestError) {
          setMessage("");
          setError(
            requestError.response?.data?.detail ||
              "Check-in failed. Ensure you are physically inside the lecture hall.",
          );
          setFeedbackStatus("error");
        } finally {
          setChecking(null);
        }
      },
      (locationError) => {
        let locationMessage =
          "Location access is required for attendance check-in.";

        if (locationError.insecureContext) {
          locationMessage =
            "Your phone browser blocks location on this connection. Open CampusPulse using its secure HTTPS address, then allow location for the site.";
        } else if (locationError.code === 1) {
          locationMessage =
            "Location permission was denied. Use your browser site settings to allow location, then try again.";
        } else if (locationError.code === 2) {
          locationMessage =
            "Unable to determine your location. Turn on your device location and try again.";
        } else if (locationError.code === 3) {
          locationMessage =
            "Your phone did not return a location in time. Keep location services on and try again near an open area.";
        } else if (locationError.code === 0) {
          locationMessage = "Location is not supported by your browser.";
        }

        setMessage("");
        setError(locationMessage);
        setFeedbackStatus("error");
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
              Your passkey and GPS location verify that you are present within
              the designated lecture venue.
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
            className={`cp-attendance-feedback ${feedbackStatus}`}
            role={feedbackStatus === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            <span className="cp-attendance-feedback-icon">
              {feedbackStatus === "success" ? (
                <CheckIcon />
              ) : feedbackStatus === "error" ? (
                <AlertIcon />
              ) : (
                <LocationIcon />
              )}
            </span>

            <div>
              <strong>
                {feedbackStatus === "success"
                  ? "Attendance recorded"
                  : feedbackStatus === "error"
                    ? "Check-in issue"
                    : checking
                      ? "Check-in in progress"
                      : "Information"}
              </strong>

              <p>{message || error}</p>
            </div>
          </div>
        )}

        {profileError && (
          <div className="cp-attendance-feedback error" role="alert">
            <span className="cp-attendance-feedback-icon">
              <AlertIcon />
            </span>
            <div>
              <strong>Unable to load your account</strong>
              <p>{profileError}</p>
              <button
                type="button"
                className="cp-attendance-empty-button"
                onClick={loadProfile}
                disabled={profileLoading}
              >
                <RefreshIcon />
                {profileLoading ? "Loading profile..." : "Retry profile"}
              </button>
            </div>
          </div>
        )}

        {profileLoading && (
          <div className="cp-attendance-feedback info" role="status">
            <span className="cp-attendance-feedback-icon">
              <LocationIcon />
            </span>
            <div>
              <strong>Checking your account</strong>
              <p>Loading your registration details before enabling check-in.</p>
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
              Passkey + GPS verified
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
                      session.has_checked_in
                        ? "checked-in"
                        : checking === session.id
                          ? "checking"
                          : ""
                    }`}
                    onClick={() => checkIn(session.id)}
                    disabled={session.has_checked_in || checking === session.id}
                  >
                    {session.has_checked_in ? (
                      <>
                        <CheckIcon />
                        Checked in
                      </>
                    ) : checking === session.id ? (
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
              <strong>How attendance verification works</strong>
              <span>Attendance protection</span>
            </div>

            <p>
              CampusPulse confirms your device passkey, then checks your
              current location against the attendance radius configured for the
              live session. You must pass both checks to be marked present.
            </p>

            <div className="cp-attendance-tips">
              <span>
                <CheckIcon />
                Verify your device passkey
              </span>

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
