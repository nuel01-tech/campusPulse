import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AppShell from "../components/AppShell";
import api from "../api/axios";
import { registerPasskey, fetchPasskeyStatus, removePasskey } from "../utils/passkey";

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

  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [passkeyStatus, setPasskeyStatus] = useState({ has_passkey: false, passkeys: [] });

  const loadPasskeyStatus = async () => {
    try {
      const data = await fetchPasskeyStatus();
      setPasskeyStatus(data);
    } catch {}
  };

  useEffect(() => {
    loadPasskeyStatus();
  }, []);

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
      setError(
        "Your new password must be different from your current password.",
      );
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

  const handlePasskeyRegistration = async () => {
    setPasskeyLoading(true);
    setPasskeyMessage("");
    setPasskeyError("");

    try {
      await registerPasskey("My device");
      setPasskeyMessage(
        "Passkey registered successfully! You can now mark attendance securely.",
      );
      await loadPasskeyStatus();
    } catch (err) {
      console.error("Passkey registration error:", err);
      setPasskeyError(
        err?.response?.data?.detail ||
          err?.message ||
          "Could not register your passkey. Please try again.",
      );
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handlePasskeyRemoval = async (id = null) => {
    if (!window.confirm("Are you sure you want to remove this passkey?")) {
      return;
    }
    setPasskeyLoading(true);
    setPasskeyMessage("");
    setPasskeyError("");

    try {
      await removePasskey(id);
      setPasskeyMessage("Passkey removed successfully.");
      await loadPasskeyStatus();
    } catch (err) {
      setPasskeyError(
        err?.response?.data?.detail ||
          err?.message ||
          "Could not remove passkey. Please try again.",
      );
    } finally {
      setPasskeyLoading(false);
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
            className={`cp-security-feedback ${
              message ? "success" : "error"
            }`}
            role="alert"
          >
            <span className="cp-security-feedback-icon">
              {message ? <CheckIcon /> : "!"}
            </span>

            <div>
              <strong>
                {message ? "Password updated" : "Update failed"}
              </strong>

              <span>{message || error}</span>
            </div>
          </div>
        )}

        <div className="cp-security-layout">
          <section className="cp-security-card cp-security-password-card">
            <div className="cp-security-card-header">
              <div>
                <span className="cp-security-section-label">
                  Credentials
                </span>

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

            {/* PASSKEY SECURITY */}
            <div className="cp-security-passkey-section">
              <div className="cp-security-card-header">
                <div>
                  <span className="cp-security-section-label">
                    Attendance security
                  </span>

                  <h2>{passkeyStatus.has_passkey ? "Your registered passkey" : "Set up your passkey"}</h2>

                  <p>
                    CampusPulse requires a passkey before you can mark
                    attendance. Your device will use Face ID, fingerprint, or
                    your device PIN to verify that it is really you.
                  </p>
                </div>

                <span className={`cp-security-status ${passkeyStatus.has_passkey ? "active" : ""}`} style={{ color: passkeyStatus.has_passkey ? "#10b981" : undefined }}>
                  <span style={{ backgroundColor: passkeyStatus.has_passkey ? "#10b981" : undefined }} />
                  {passkeyStatus.has_passkey ? "Configured & Active" : "Required"}
                </span>
              </div>

              {passkeyStatus.has_passkey && passkeyStatus.passkeys?.length > 0 && (
                <div style={{ margin: "1rem 0", padding: "1rem", borderRadius: "10px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <strong style={{ display: "block", color: "#065f46" }}>
                        🔒 {passkeyStatus.passkeys[0].device_name || "Device Passkey"}
                      </strong>
                      <span style={{ fontSize: "0.85rem", color: "#047857" }}>
                        Registered on {new Date(passkeyStatus.passkeys[0].created_at).toLocaleDateString()}
                        {passkeyStatus.passkeys[0].last_used_at && ` • Last verified ${new Date(passkeyStatus.passkeys[0].last_used_at).toLocaleDateString()}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePasskeyRemoval(passkeyStatus.passkeys[0].id)}
                      disabled={passkeyLoading}
                      style={{
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.82rem",
                        color: "#b91c1c",
                        backgroundColor: "transparent",
                        border: "1px solid rgba(185, 28, 28, 0.3)",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Remove passkey
                    </button>
                  </div>
                </div>
              )}

              {passkeyMessage && (
                <div
                  className="cp-security-feedback success"
                  role="alert"
                >
                  <span className="cp-security-feedback-icon">
                    <CheckIcon />
                  </span>

                  <div>
                    <strong>Passkey updated</strong>
                    <span>{passkeyMessage}</span>
                  </div>
                </div>
              )}

              {passkeyError && (
                <div
                  className="cp-security-feedback error"
                  role="alert"
                >
                  <span className="cp-security-feedback-icon">!</span>

                  <div>
                    <strong>Passkey operation failed</strong>
                    <span>{passkeyError}</span>
                  </div>
                </div>
              )}

              <div className="cp-security-form-footer">
                <span>
                  {passkeyStatus.has_passkey
                    ? "Your device passkey is active and ready for attendance check-ins."
                    : "You only need to set up your passkey once on this device."}
                </span>

                <button
                  type="button"
                  className="cp-security-submit"
                  onClick={handlePasskeyRegistration}
                  disabled={passkeyLoading}
                >
                  {passkeyLoading ? (
                    <>
                      <span className="cp-security-spinner" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      {passkeyStatus.has_passkey ? "Register new / replacement passkey" : "Set up passkey"}

                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h13" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
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
