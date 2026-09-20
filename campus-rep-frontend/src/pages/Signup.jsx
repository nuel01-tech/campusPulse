import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function AcademicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 9 9-5 9 5-9 5-9-5Z" />
      <path d="M7 11.5V16c2.8 2.4 7.2 2.4 10 0v-4.5" />
      <path d="M21 9v6" />
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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
      <path d="M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
      <path d="M20 20v-5h-5" />
    </svg>
  );
}

function Signup() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    department: "",
    level: "",
  });

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [retryMessage, setRetryMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const attemptRef = useRef(0);

  const loadDepartments = async (isAutoRetry = false) => {
    const cached = sessionStorage.getItem("campuspulse_departments");

    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        if (Array.isArray(parsed) && parsed.length > 0) {
          setDepartments(parsed);
          setLoadingDepartments(false);
        }
      } catch {}
    } else {
      setLoadingDepartments(true);
    }

    if (!isAutoRetry) {
      attemptRef.current = 0;
      setError("");
    }

    try {
      const response = await api.get(`/accounts/departments/?_t=${Date.now()}`);

      const data = response.data || [];

      setDepartments(data);
      setRetryMessage("");

      if (data.length > 0) {
        sessionStorage.setItem("campuspulse_departments", JSON.stringify(data));

        setError("");
      } else if (!cached) {
        setError(
          "No departments found on the server. Please contact your class representative.",
        );
      }
    } catch {
      attemptRef.current += 1;

      if (attemptRef.current < 4) {
        setRetryMessage(
          `Loading departments… retrying (${attemptRef.current}/3)`,
        );

        setTimeout(() => loadDepartments(true), 2500);
        return;
      }

      setRetryMessage("");

      if (!cached) {
        setError(
          "Taking longer than usual to load departments. Use retry below.",
        );
      }
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    loadDepartments();

    return () => {
      // No active request cancellation was used by the original flow.
    };
  }, []);

  const setField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await api.post("/accounts/signup/", {
        username: form.username.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        department: form.department,
        level: form.level,
        terms_accepted: termsAccepted,
      });

      navigate("/login");
    } catch (e) {
      const serverError = e.response?.data;

      const message =
        serverError?.department?.[0] ||
        serverError?.username?.[0] ||
        serverError?.email?.[0] ||
        serverError?.terms_accepted?.[0] ||
        serverError?.detail ||
        "Signup failed. Please check your details and class code.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cp-auth-page cp-signup-page">
      <aside className="cp-auth-aside">
        <div className="cp-auth-aside-content">
          <Link to="/" className="cp-auth-brand">
            <span className="cp-auth-brand-mark">CP</span>
            <span className="cp-auth-brand-name">CampusPulse</span>
          </Link>

          <div className="cp-signup-aside-copy">
            <span className="cp-auth-eyebrow cp-auth-eyebrow-light">
              <span className="cp-auth-eyebrow-dot" />
              Join your class workspace
            </span>

            <h1>Your academic workspace starts here.</h1>

            <p>
              Create your CampusPulse account to manage attendance, class
              updates, announcements and academic records in one place.
            </p>
          </div>

          <div className="cp-signup-benefits">
            <div className="cp-signup-benefit">
              <span>
                <CheckIcon />
              </span>

              <div>
                <strong>Attendance made simple</strong>
                <small>
                  Check in to active class sessions using verified location.
                </small>
              </div>
            </div>

            <div className="cp-signup-benefit">
              <span>
                <CheckIcon />
              </span>

              <div>
                <strong>Stay connected to your class</strong>
                <small>
                  Receive announcements and important course updates.
                </small>
              </div>
            </div>

            <div className="cp-signup-benefit">
              <span>
                <CheckIcon />
              </span>

              <div>
                <strong>Built for OOU communities</strong>
                <small>
                  Your department, level and class determine your workspace.
                </small>
              </div>
            </div>
          </div>
        </div>

        <span className="cp-auth-aside-foot">Olabisi Onabanjo University</span>
      </aside>

      <main className="cp-auth-main cp-signup-main">
        <div className="cp-auth-mobile-header">
          <Link to="/" className="cp-auth-brand">
            <span className="cp-auth-brand-mark">CP</span>
            <span className="cp-auth-brand-name">CampusPulse</span>
          </Link>

          <span className="cp-signup-mobile-step">Account setup</span>
        </div>

        <div className="cp-auth-form-wrap cp-signup-form-wrap">
          <div className="cp-auth-heading cp-signup-heading">
            <span className="cp-auth-eyebrow">
              <span className="cp-auth-eyebrow-dot" />
              Quick registration
            </span>

            <h2>Create your account</h2>

            <p>
              Create your account first. You will complete your class details
              after signing in.
            </p>
          </div>

          {error && (
            <div className="cp-auth-feedback error" role="alert">
              <span className="cp-auth-feedback-icon">!</span>

              <div>
                <strong>Registration could not be completed</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="cp-signup-form">
            <div className="cp-signup-section">
              <div className="cp-signup-section-heading">
                <span className="cp-signup-section-icon">
                  <UserIcon />
                </span>

                <div>
                  <strong>Personal information</strong>
                  <span>Use the name associated with your student record.</span>
                </div>
              </div>

              <div className="cp-signup-fields">
                <label className="cp-auth-field">
                  <span>First name</span>

                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    placeholder="e.g. John"
                    autoComplete="given-name"
                    required
                  />
                </label>

                <label className="cp-auth-field">
                  <span>Last name</span>

                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    placeholder="e.g. Doe"
                    autoComplete="family-name"
                    required
                  />
                </label>

                <label className="cp-auth-field">
                  <span>Username</span>

                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setField("username", e.target.value)}
                    placeholder="e.g. jdoe24"
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="cp-auth-field">
                  <span>Email address</span>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </label>
              </div>
            </div>

            <div className="cp-signup-section">
              <div className="cp-signup-section-heading">
                <span className="cp-signup-section-icon academic">
                  <AcademicIcon />
                </span>

                <div>
                  <strong>Academic information</strong>
                  <span>Choose your department and current level.</span>
                </div>
              </div>

              <div className="cp-signup-fields">
                <label className="cp-auth-field">
                  <span className="cp-signup-label-row">
                    <span>Department</span>

                    {departments.length === 0 && !loadingDepartments && (
                      <button
                        type="button"
                        className="cp-signup-reload"
                        onClick={() => loadDepartments(false)}
                      >
                        <RefreshIcon />
                        Retry
                      </button>
                    )}
                  </span>

                  <select
                    value={form.department}
                    onChange={(e) => setField("department", e.target.value)}
                    required
                    disabled={loadingDepartments}
                  >
                    <option value="">
                      {loadingDepartments
                        ? "Loading departments…"
                        : departments.length === 0
                          ? "No departments loaded"
                          : "Select your department"}
                    </option>

                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                        {department.faculty ? ` (${department.faculty})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="cp-auth-field">
                  <span>Level</span>

                  <select
                    value={form.level}
                    onChange={(e) => setField("level", e.target.value)}
                    required
                  >
                    <option value="">Select current level</option>

                    {["100", "200", "300", "400", "500"].map((level) => (
                      <option key={level} value={level}>
                        {level} Level
                      </option>
                    ))}
                  </select>
                </label>

              </div>
            </div>

            <div className="cp-signup-section">
              <div className="cp-signup-section-heading">
                <span className="cp-signup-section-icon security">
                  <ShieldIcon />
                </span>

                <div>
                  <strong>Account security</strong>
                  <span>Choose a password you do not reuse elsewhere.</span>
                </div>
              </div>

              <label className="cp-auth-field">
                <span>Password</span>

                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />

                <small>
                  Use at least 8 characters with a combination of letters,
                  numbers and symbols where possible.
                </small>
              </label>
            </div>

            <label className="cp-signup-terms">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />

              <span>
                I have read and agree to the{" "}
                <Link to="/terms" target="_blank">
                  Terms &amp; Conditions
                </Link>
                .
              </span>
            </label>

            {(loadingDepartments || retryMessage) && (
              <div className="cp-signup-department-status">
                <span className="cp-signup-status-spinner" />

                <span>
                  {retryMessage || "Connecting to the department database…"}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="cp-auth-submit cp-signup-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="cp-auth-submit-spinner" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowIcon />
                </>
              )}
            </button>
          </form>

          <p className="cp-auth-switch">
            Already registered?{" "}
            <Link to="/login">Sign in to your workspace</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Signup;
