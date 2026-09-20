import { useState } from "react";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AppShell from "../components/AppShell";
import api from "../api/axios";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <path d="M12 15v3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.7-2.8 8.3-7 10-4.2-1.7-7-5.3-7-10V6l7-3z" />
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

function Security() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  let role = "STUDENT";

  try {
    const token = localStorage.getItem("access");
    role = token ? jwtDecode(token).role : "STUDENT";
  } catch {}

  const submit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (newPassword !== confirm) {
      setError("New passwords do not match. Please re-enter.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Your new password must be different from your current password.");
      return;
    }

    setLoading(true);

    try {
      await api.patch("/accounts/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setMessage("Password updated successfully.");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch (e) {
      const responseError = e.response?.data;
      const validationError = Object.values(responseError || {})
        .flat()
        .find((value) => typeof value === "string");

      setError(
        validationError ||
          "Unable to update password. Please check your current password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell role={role}>
      <div className="cp-security-page">
        <header className="cp-settings-header">
          <div>
            <span className="cp-settings-eyebrow">
              <span className="cp-settings-eyebrow-dot" />
              Account Security
            </span>

            <h1>Security &amp; Password</h1>

            <p>
              Manage your password and keep your CampusPulse account secure.
            </p>
          </div>

          <div className="cp-security-header-badge">
            <span className="cp-security-header-icon">
              <ShieldIcon />
            </span>

            <span>
              <strong>Account protected</strong>
              <small>Credential controls active</small>
            </span>
          </div>
        </header>

        <nav className="cp-settings-nav" aria-label="Account settings">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `cp-settings-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="cp-settings-nav-icon">
              <UserIcon />
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
              <LockIcon />
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

        {(message || error) && (
          <div
            className={`cp-security-feedback ${message ? "success" : "error"}`}
            role="alert"
          >
            <span className="cp-security-feedback-icon">
              {message ? <CheckIcon /> : "!"}
            </span>

            <div>
              <strong>{message ? "Password updated" : "Update failed"}</strong>
              <span>{message || error}</span>
            </div>
          </div>
        )}

        <div className="cp-security-layout">
          <section className="cp-security-card cp-security-password-card">
            <div className="cp-security-card-header">
              <div>
                <span className="cp-security-section-label">Credentials</span>

                <h2>Change password</h2>

                <p>
                  Update your password regularly and avoid reusing passwords
                  from other services.
                </p>
              </div>

              <span className="cp-security-status">
                <span />
                Protected
              </span>
            </div>

            <form className="cp-security-form" onSubmit={submit}>
              <label className="cp-security-field">
                <span>Current password</span>

                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                />
              </label>

              <label className="cp-security-field">
                <span>New password</span>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNew(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                />

                <small>
                  Use at least 8 characters. A combination of letters, numbers
                  and symbols is recommended.
                </small>
              </label>

              <label className="cp-security-field">
                <span>Confirm new password</span>

                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                />
              </label>

              <div className="cp-security-form-footer">
                <span>
                  Your password will be updated immediately after submission.
                </span>

                <button
                  type="submit"
                  className="cp-security-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="cp-security-spinner" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Update password
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h13" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="cp-security-card cp-security-guidelines">
            <div className="cp-security-guidelines-header">
              <span className="cp-security-guidelines-icon">
                <ShieldIcon />
              </span>

              <div>
                <span className="cp-security-section-label">
                  Security guidelines
                </span>

                <h2>Keep your account safe</h2>
              </div>
            </div>

            <div className="cp-security-check-list">
              <div className="cp-security-check-item">
                <span>
                  <CheckIcon />
                </span>

                <p>
                  Use a unique password that you do not reuse on other websites.
                </p>
              </div>

              <div className="cp-security-check-item">
                <span>
                  <CheckIcon />
                </span>

                <p>
                  Never share your password or login credentials with
                  classmates.
                </p>
              </div>

              <div className="cp-security-check-item">
                <span>
                  <CheckIcon />
                </span>

                <p>
                  CampusPulse administrators will never ask you for your
                  password.
                </p>
              </div>
            </div>

            <div className="cp-security-note">
              <LockIcon />

              <p>
                If you believe someone else has access to your account, change
                your password immediately.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

export default Security;
