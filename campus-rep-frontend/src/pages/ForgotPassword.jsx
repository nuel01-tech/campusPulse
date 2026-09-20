import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function ForgotPassword() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    classCode: '',
  });

  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage('');
    setError('');
    setResetUrl('');

    try {
      const r = await api.post('/accounts/forgot-password/', {
        username: form.username,
        email: form.email,
        class_code: form.classCode,
      });

      setMessage(r.data.detail);

      if (r.data.reset_url) {
        setResetUrl(r.data.reset_url);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to process your request.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cp-auth-page cp-recovery-page">
      {/* Brand / information panel */}
      <aside className="cp-auth-aside">
        <div className="cp-auth-aside-inner">
          <Link to="/" className="cp-auth-brand" aria-label="CampusPulse home">
            <span className="cp-auth-brand-mark">CP</span>

            <span className="cp-auth-brand-name">
              CampusPulse
            </span>
          </Link>

          <div className="cp-auth-aside-content">
            <span className="cp-auth-eyebrow">
              Account recovery
            </span>

            <h1>
              Securely regain access to your campus workspace.
            </h1>

            <p>
              Confirm your account details and class code to receive
              a secure password reset link.
            </p>

            <div className="cp-auth-trust-list">
              <div className="cp-auth-trust-item">
                <span className="cp-auth-trust-icon">01</span>
                <div>
                  <strong>Verify your account</strong>
                  <span>
                    Use the details associated with your CampusPulse account.
                  </span>
                </div>
              </div>

              <div className="cp-auth-trust-item">
                <span className="cp-auth-trust-icon">02</span>
                <div>
                  <strong>Receive a reset link</strong>
                  <span>
                    Follow the secure link to create a new password.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="cp-auth-aside-footer">
            <span>Olabisi Onabanjo University</span>
            <span className="cp-auth-footer-dot" />
            <span>CampusPulse</span>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="cp-auth-main">
        <div className="cp-auth-mobile-header">
          <Link to="/" className="cp-auth-brand" aria-label="CampusPulse home">
            <span className="cp-auth-brand-mark">CP</span>

            <span className="cp-auth-brand-name">
              CampusPulse
            </span>
          </Link>
        </div>

        <div className="cp-auth-form-wrap">
          <div className="cp-auth-card">
            <div className="cp-auth-heading">
              <span className="cp-auth-eyebrow">
                Forgot password
              </span>

              <h2>Reset your password.</h2>

              <p>
                Enter your username, email and class code. We’ll use
                them to verify your account before continuing.
              </p>
            </div>

            <form onSubmit={submit} className="cp-auth-form">
              <div className="cp-auth-field">
                <label htmlFor="forgot-username">
                  Username
                </label>

                <input
                  id="forgot-username"
                  value={form.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: e.target.value,
                    })
                  }
                  autoComplete="username"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="cp-auth-field">
                <label htmlFor="forgot-email">
                  Email address
                </label>

                <input
                  id="forgot-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="cp-auth-field">
                <div className="cp-auth-label-row">
                  <label htmlFor="forgot-class-code">
                    Class code
                  </label>

                  <span>6 characters</span>
                </div>

                <input
                  id="forgot-class-code"
                  value={form.classCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      classCode: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. ABC123"
                  maxLength={6}
                  required
                  autoCapitalize="characters"
                />
              </div>

              <button
                type="submit"
                className="cp-auth-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? 'Checking account…'
                    : 'Send reset link'}
                </span>

                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            {message && (
              <div
                className="cp-auth-feedback cp-auth-feedback-success"
                role="status"
              >
                <div className="cp-auth-feedback-icon">✓</div>

                <div>
                  <strong>Request received</strong>
                  <p>{message}</p>

                  {resetUrl && (
                    <div className="cp-dev-reset">
                      <span>Local development reset link</span>

                      <a
                        href={resetUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open reset link
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div
                className="cp-auth-feedback cp-auth-feedback-error"
                role="alert"
              >
                <div className="cp-auth-feedback-icon">!</div>

                <div>
                  <strong>We couldn't continue</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <div className="cp-auth-divider">
              <span />
              <span>or</span>
              <span />
            </div>

            <p className="cp-auth-back">
              <Link to="/login">
                <span aria-hidden="true">←</span>
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;