import { useEffect, useRef, useState } from "react";
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

const CameraIcon = () => (
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
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

function Profile() {
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    matric_number: "",
    phone_number: "",
    level: "",
    class_code: "",
    first_name: "",
    last_name: "",
  });

  const [picture, setPicture] = useState(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pictureSaving, setPictureSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedMatric, setCopiedMatric] = useState(false);
  const [loading, setLoading] = useState(true);

  const fileRef = useRef(null);

  let role = "STUDENT";

  try {
    const token = localStorage.getItem("access");
    role = token ? jwtDecode(token).role : "STUDENT";
  } catch {
    role = "STUDENT";
  }

  const loadProfile = async () => {
    try {
      const r = await api.get("/accounts/profile/");

      setProfile(r.data);

      setForm({
        matric_number: r.data.matric_number || "",
        phone_number: r.data.phone_number || "",
        level: r.data.level || "",
        class_code: "",
        first_name: r.data.first_name || "",
        last_name: r.data.last_name || "",
      });

      setError("");
    } catch {
      setError("Unable to load your profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const saveDetails = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const r = await api.patch("/accounts/update-matric/", {
        matric_number: form.matric_number.trim(),
        phone_number: form.phone_number.trim(),
        level: form.level,
        class_code: form.class_code.trim().toUpperCase(),
      });

      setMessage(r.data.detail || "Profile details updated successfully.");
      window.dispatchEvent(new Event("campuspulse:profile-updated"));

      await loadProfile();
    } catch (e) {
      setError(
        e.response?.data?.detail || "Unable to update your profile details.",
      );
    } finally {
      setSaving(false);
    }
  };

  const choosePicture = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile picture must be 5 MB or smaller.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a JPG, PNG or WebP image.");
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPicture(file);
    setPreview(URL.createObjectURL(file));
    setError("");
    setMessage("");
  };

  const savePicture = async () => {
    if (!picture) return;

    setPictureSaving(true);
    setError("");
    setMessage("");

    try {
      const data = new FormData();

      data.append("profile_picture", picture);

      const r = await api.patch("/accounts/profile/", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setProfile(r.data);
      setPicture(null);
      setPreview("");

      setMessage("Profile photo updated successfully.");

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (e) {
      setError(
        e.response?.data?.profile_picture?.[0] ||
          e.response?.data?.detail ||
          "Unable to update profile photo.",
      );
    } finally {
      setPictureSaving(false);
    }
  };

  const cancelPicture = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview("");
    setPicture(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const copyMatric = async () => {
    if (!profile?.matric_number) return;

    try {
      await navigator.clipboard.writeText(profile.matric_number);

      setCopiedMatric(true);

      setTimeout(() => setCopiedMatric(false), 2000);
    } catch {
      setError("Unable to copy the matric number.");
    }
  };

  const deleteAccount = async () => {
    if (
      !window.confirm(
        "Delete your representative account permanently? This cannot be undone.",
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await api.delete("/accounts/profile/");

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      window.location.href = "/";
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to delete your account.");

      setDeleting(false);
    }
  };

  const image = preview || profile?.profile_picture;

  const isRep = role === "CLASS_REP";

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.username ||
    "Student";

  return (
    <AppShell role={role}>
      <div className="cp-profile-page">
        {/* =====================================================
            PAGE HEADER
            ===================================================== */}
        <header className="cp-settings-header">
          <div>
            <span className="cp-page-eyebrow">Account settings</span>

            <h1>Your profile</h1>

            <p>
              Manage your student identity, academic information and profile
              photo.
            </p>
          </div>
        </header>

        {/* =====================================================
            SETTINGS NAV
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
            className={`cp-profile-feedback ${message ? "success" : "error"}`}
            role={error ? "alert" : "status"}
          >
            <span className="cp-profile-feedback-mark">
              {message ? "✓" : "!"}
            </span>

            <span>{message || error}</span>
          </div>
        )}

        {/* =====================================================
            PROFILE HERO
            ===================================================== */}
        {loading ? (
          <section className="cp-profile-hero cp-profile-loading">
            <LoadingSkeleton rows={1} />
          </section>
        ) : (
          <section className="cp-profile-hero">
            <div className="cp-profile-avatar-wrap">
              <div className="cp-profile-avatar">
                {image ? (
                  <img src={image} alt={`${fullName} profile`} />
                ) : (
                  <span>
                    {(profile?.first_name ||
                      profile?.username ||
                      "S")[0].toUpperCase()}
                  </span>
                )}
              </div>

              <label className="cp-profile-camera" title="Change profile photo">
                <CameraIcon />

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={choosePicture}
                />
              </label>
            </div>

            <div className="cp-profile-hero-copy">
              <div className="cp-profile-name-row">
                <h2>{fullName}</h2>

                <span
                  className={`cp-profile-role ${isRep ? "rep" : "student"}`}
                >
                  {profile?.role_label ||
                    (isRep ? "Class Representative" : "Student")}
                </span>
              </div>

              <p className="cp-profile-handle">
                @{profile?.username}
                <span />
                {profile?.email || "No email"}
              </p>

              <div className="cp-profile-hero-meta">
                <span>
                  {profile?.department_name || "Department not available"}
                </span>

                <span>
                  {profile?.level_label || `${profile?.level || "—"} Level`}
                </span>
              </div>

              {picture && (
                <div className="cp-profile-photo-actions">
                  <div>
                    <strong>New photo selected</strong>
                    <span>Save it to update your profile.</span>
                  </div>

                  <div className="cp-profile-photo-buttons">
                    <button
                      type="button"
                      className="cp-profile-cancel"
                      onClick={cancelPicture}
                      disabled={pictureSaving}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="cp-profile-save-photo"
                      onClick={savePicture}
                      disabled={pictureSaving}
                    >
                      {pictureSaving ? "Saving photo…" : "Save photo"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            CONTENT GRID
            ===================================================== */}
        <div className="cp-profile-grid">
          {/* =================================================
              ACADEMIC IDENTITY
              ================================================= */}
          <section className="cp-profile-section">
            <div className="cp-profile-section-header">
              <div>
                <span className="cp-page-eyebrow">Academic record</span>

                <h2>Student details</h2>

                <p>Your academic identity as recorded by CampusPulse.</p>
              </div>
            </div>

            {loading ? (
              <div className="cp-profile-section-loading">
                <LoadingSkeleton rows={4} />
              </div>
            ) : (
              <div className="cp-identity-grid">
                <div className="cp-identity-item matric">
                  <span className="cp-identity-label">Matric number</span>

                  <div className="cp-identity-value">
                    <strong>{profile?.matric_number || "Not added"}</strong>

                    {profile?.matric_number && (
                      <button
                        type="button"
                        className="cp-copy-button"
                        onClick={copyMatric}
                      >
                        {copiedMatric ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="cp-identity-item">
                  <span className="cp-identity-label">Department</span>

                  <strong>{profile?.department_name || "—"}</strong>
                </div>

                <div className="cp-identity-item">
                  <span className="cp-identity-label">Faculty</span>

                  <strong>{profile?.faculty || "—"}</strong>
                </div>

                <div className="cp-identity-item">
                  <span className="cp-identity-label">Academic level</span>

                  <span className="cp-level-badge">
                    {profile?.level_label || `${profile?.level || "—"} Level`}
                  </span>
                </div>

                <div className="cp-identity-item">
                  <span className="cp-identity-label">Phone number</span>

                  <strong>{profile?.phone_number || "Not added"}</strong>
                </div>

                <div className="cp-identity-item">
                  <span className="cp-identity-label">Account role</span>

                  <strong>
                    {profile?.role_label ||
                      (isRep ? "Class Representative" : "Student")}
                  </strong>
                </div>
              </div>
            )}
          </section>

          {/* =================================================
              UPDATE DETAILS
              ================================================= */}
          <section className="cp-profile-section">
            <div className="cp-profile-section-header">
              <div>
                <span className="cp-page-eyebrow">Edit information</span>

                <h2>Update details</h2>

                <p>Keep your contact and academic information current.</p>
              </div>
            </div>

            <form className="cp-profile-form" onSubmit={saveDetails}>
              <div className="cp-profile-form-grid">
                <label>
                  First name
                  <input
                    value={form.first_name}
                    disabled
                    title="Name cannot be edited here"
                  />
                </label>

                <label>
                  Last name
                  <input
                    value={form.last_name}
                    disabled
                    title="Name cannot be edited here"
                  />
                </label>
              </div>

              <label>
                Matric number
                <input
                  value={form.matric_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      matric_number: e.target.value,
                    })
                  }
                  placeholder="e.g. 230401001"
                  required={!isRep}
                />
              </label>

              <label>
                WhatsApp number
                <input
                  value={form.phone_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone_number: e.target.value,
                    })
                  }
                  placeholder="08012345678"
                  inputMode="tel"
                  required={!isRep}
                />
              </label>

              {!isRep && (
                <div className="cp-profile-level-box">
                  <label>
                    Level
                    <select
                      value={form.level}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          level: e.target.value,
                        })
                      }
                    >
                      <option value="">Select level</option>

                      {["100", "200", "300", "400", "500"].map((level) => (
                        <option key={level} value={level}>
                          {level} Level
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Class signup code
                    <input
                      value={form.class_code}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          class_code: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={6}
                      placeholder="Enter your class code"
                      required
                    />
                    <span className="cp-field-hint">
                      Required to complete registration and unlock attendance.
                    </span>
                  </label>
                </div>
              )}

              <div className="cp-profile-form-footer">
                <span>Changes are saved to your CampusPulse account.</span>

                <button
                  type="submit"
                  className="cp-profile-save"
                  disabled={saving}
                >
                  {saving ? "Saving changes…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* =====================================================
            DANGER ZONE
            ===================================================== */}
        {isRep && (
          <section className="cp-profile-danger">
            <div>
              <span className="cp-profile-danger-eyebrow">Danger zone</span>

              <h2>Delete representative account</h2>

              <p>
                Permanently remove your course representative account, lecture
                history and access keys. This action cannot be undone.
              </p>
            </div>

            <button
              type="button"
              className="cp-profile-delete"
              onClick={deleteAccount}
              disabled={deleting}
            >
              {deleting ? "Deleting account…" : "Delete my account"}
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}

export default Profile;
