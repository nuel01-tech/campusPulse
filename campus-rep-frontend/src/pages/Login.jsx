import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const r = await api.post("/token/", {
        username: username.trim(),
        password,
      });

      localStorage.setItem("access", r.data.access);
      localStorage.setItem("refresh", r.data.refresh);

      const d = jwtDecode(r.data.access);

      navigate(d.role === "CLASS_REP" ? "/rep" : "/student");
    } catch {
      setError("Invalid username or password. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cp-auth-page cp-login-page">
      {/* =====================================================
          INFORMATION PANEL
          ===================================================== */}
      <aside className="cp-auth-aside">
        <div className="cp-auth-aside-inner">
          <Link to="/" className="cp-auth-brand" aria-label="CampusPulse home">
            <span className="cp-auth-brand-mark">CP</span>

            <span className="cp-auth-brand-name">CampusPulse</span>
          </Link>

          <div className="cp-auth-aside-content">
            <span className="cp-auth-eyebrow">University attendance</span>

            <h1>One clear workspace for the everyday campus routine.</h1>

            <p>
              Check attendance, coordinate lectures, follow class updates and
              keep your academic records organized in one place.
            </p>

            <div className="cp-auth-feature-list">
              <div className="cp-auth-feature-item">
                <span className="cp-auth-feature-mark">✓</span>

                <div>
                  <strong>Location-verified attendance</strong>
                  <span>
                    Check into active sessions from the lecture venue.
                  </span>
                </div>
              </div>

              <div className="cp-auth-feature-item">
                <span className="cp-auth-feature-mark">✓</span>

                <div>
                  <strong>Class communication</strong>
                  <span>Stay updated with announcements from your class.</span>
                </div>
              </div>

              <div className="cp-auth-feature-item">
                <span className="cp-auth-feature-mark">✓</span>

                <div>
                  <strong>Organized records</strong>
                  <span>
                    Keep attendance history and class information together.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="cp-auth-aside-footer">
            <span>Olabisi Onabanjo University</span>

            <span className="cp-auth-footer-dot" />

            <span>Student &amp; Rep Portal</span>
          </div>
        </div>
      </aside>

      {/* =====================================================
          LOGIN PANEL
          ===================================================== */}
      <section className="cp-auth-main">
        <div className="cp-auth-mobile-header">
          <Link to="/" className="cp-auth-brand" aria-label="CampusPulse home">
            <span className="cp-auth-brand-mark">CP</span>

            <span className="cp-auth-brand-name">CampusPulse</span>
          </Link>
        </div>

        <div className="cp-auth-form-wrap">
          <div className="cp-auth-card">
            <div className="cp-auth-heading">
              <span className="cp-auth-eyebrow">Welcome back</span>

              <h2>Sign in to your workspace.</h2>

              <p>
                Enter your CampusPulse username and password to continue to your
                dashboard.
              </p>
            </div>

            {error && (
              <div
                className="cp-auth-feedback cp-auth-feedback-error"
                role="alert"
              >
                <div className="cp-auth-feedback-icon">!</div>

                <div>
                  <strong>Sign in unsuccessful</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="cp-auth-form cp-login-form">
              <div className="cp-auth-field">
                <label htmlFor="login-username">Username</label>

                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="cp-auth-field">
                <div className="cp-auth-label-row">
                  <label htmlFor="login-password">Password</label>

                  <Link to="/forgot-password" className="cp-auth-inline-link">
                    Forgot password?
                  </Link>
                </div>

                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="cp-auth-submit"
                disabled={loading}
              >
                <span>{loading ? "Signing in…" : "Sign in to workspace"}</span>

                {!loading && <ArrowIcon />}
              </button>
            </form>

            <div className="cp-auth-divider">
              <span />
              <span>CampusPulse</span>
              <span />
            </div>

            <p className="cp-auth-back cp-login-create">
              Don&apos;t have an account?{" "}
              <Link to="/signup">Create an account</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;
