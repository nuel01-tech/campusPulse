import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AppShell from "../components/AppShell";
import api from "../api/axios";
import LoadingSkeleton from "../components/LoadingSkeleton";

const ProfileIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
  </svg>
);

const SecurityIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const BellIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const preferenceRows = [
  {
    key: "push_notifications",
    title: "Push notifications",
    description:
      "Receive instant browser alerts for live sessions and class announcements.",
    label: "Browser",
  },
  {
    key: "email_notifications",
    title: "Email notifications",
    description:
      "Receive official academic summaries and security alerts by email.",
    label: "Email",
  },
  {
    key: "session_notifications",
    title: "Lecture session alerts",
    description:
      "Get notified when your course representative initiates attendance.",
    label: "Sessions",
  },
  {
    key: "announcement_notifications",
    title: "Announcement broadcasts",
    description:
      "Receive urgent notices, venue alterations, and assignment deadlines.",
    label: "Class updates",
  },
];

function Preferences() {
  const [prefs, setPrefs] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  let role = "STUDENT";

  try {
    const token = localStorage.getItem("access");
    role = token ? jwtDecode(token).role : "STUDENT";
  } catch {
    role = "STUDENT";
  }

  useEffect(() => {
    api
      .get("/accounts/preferences/")
      .then((r) => setPrefs(r.data))
      .catch(() => setError("Unable to load preferences."));
  }, []);

  const toggle = (key) => {
    setMessage("");
    setError("");

    setPrefs((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.patch("/accounts/preferences/", prefs);
      setMessage("Your notification preferences have been saved.");
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = prefs
    ? preferenceRows.filter(({ key }) => prefs[key]).length
    : 0;

  return (
    <AppShell role={role}>
      <div className="cp-preferences-page">
        {/* =====================================================
            HEADER
            ===================================================== */}
        <header className="cp-settings-header">
          <div>
            <span className="cp-page-eyebrow">Account settings</span>

            <h1>Preferences</h1>

            <p>
              Control how CampusPulse keeps you informed about lectures,
              announcements and account activity.
            </p>
          </div>

          {prefs && (
            <div className="cp-preferences-summary">
              <span className="cp-preferences-summary-number">
                {enabledCount}
              </span>

              <span>of {preferenceRows.length} alerts enabled</span>
            </div>
          )}
        </header>

        {/* =====================================================
            SETTINGS NAVIGATION
            ===================================================== */}
        <nav className="cp-settings-nav" aria-label="Account settings">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `cp-settings-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="cp-settings-nav-icon">
              <ProfileIcon />
            </span>

            <span>
              <strong>Profile</strong>
              <small>Personal details</small>
            </span>
          </NavLink>

          <NavLink
            to="/security"
            className={({ isActive }) =>
              `cp-settings-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="cp-settings-nav-icon">
              <SecurityIcon />
            </span>

            <span>
              <strong>Security</strong>
              <small>Password &amp; account</small>
            </span>
          </NavLink>

          <NavLink
            to="/preferences"
            className={({ isActive }) =>
              `cp-settings-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="cp-settings-nav-icon">
              <BellIcon />
            </span>

            <span>
              <strong>Preferences</strong>
              <small>Notifications &amp; alerts</small>
            </span>
          </NavLink>
        </nav>

        {/* =====================================================
            FEEDBACK
            ===================================================== */}
        {(message || error) && (
          <div
            className={`cp-preferences-feedback ${
              message ? "success" : "error"
            }`}
            role={error ? "alert" : "status"}
          >
            <span className="cp-preferences-feedback-mark">
              {message ? "✓" : "!"}
            </span>

            <span>{message || error}</span>
          </div>
        )}

        {/* =====================================================
            MAIN SETTINGS CARD
            ===================================================== */}
        <section className="cp-preferences-card">
          <div className="cp-preferences-card-header">
            <div>
              <span className="cp-page-eyebrow">Notifications</span>

              <h2>Alert channels</h2>

              <p>
                Choose which updates you want to receive. Changes are saved
                together when you select
                <strong> Save preferences</strong>.
              </p>
            </div>

            <div className="cp-preferences-card-icon">
              <BellIcon />
            </div>
          </div>

          {!prefs ? (
            <div className="cp-preferences-loading">
              <LoadingSkeleton rows={4} />
            </div>
          ) : (
            <div className="cp-preferences-list">
              {preferenceRows.map(({ key, title, description, label }) => {
                const enabled = Boolean(prefs[key]);

                return (
                  <div
                    className={`cp-preference-row ${
                      enabled ? "is-enabled" : ""
                    }`}
                    key={key}
                  >
                    <div className="cp-preference-row-icon">
                      <span>{enabled ? "✓" : "○"}</span>
                    </div>

                    <div className="cp-preference-copy">
                      <div className="cp-preference-title">
                        <strong>{title}</strong>

                        <span className="cp-preference-label">{label}</span>
                      </div>

                      <p>{description}</p>
                    </div>

                    <button
                      type="button"
                      className={`cp-preference-toggle ${enabled ? "on" : ""}`}
                      onClick={() => toggle(key)}
                      aria-pressed={enabled}
                      aria-label={`${enabled ? "Disable" : "Enable"} ${title}`}
                    >
                      <span />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="cp-preferences-card-footer">
            <div className="cp-preferences-save-copy">
              <span className="cp-preferences-save-dot" />

              <span>
                {saving
                  ? "Saving your settings…"
                  : "Your changes are not saved until you select Save preferences."}
              </span>
            </div>

            <button
              type="button"
              className="cp-preferences-save"
              onClick={save}
              disabled={!prefs || saving}
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default Preferences;
