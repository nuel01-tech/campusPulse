<<<<<<< HEAD
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

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

function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/accounts/reset-password/", {
        uid,
        token,
        new_password: password,
      });

      setDone(true);

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (e) {
      setError(
        e.response?.data?.detail || "This reset link is invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cp-auth-page cp-reset-page">
      <aside className="cp-auth-aside">
        <div className="cp-auth-aside-inner">
          <Link to="/" className="cp-auth-brand" aria-label="CampusPulse home">
            <span className="cp-auth-brand-mark">CP</span>
            <span className="cp-auth-brand-name">CampusPulse</span>
          </Link>

          <div className="cp-auth-aside-content">
            <span className="cp-auth-eyebrow">Secure account recovery</span>

            <h1>A secure reset, then back to your campus workspace.</h1>

            <p>
              Choose a new password for your CampusPulse account. Once updated,
              you can sign back in normally.
            </p>

            <div className="cp-reset-security-note">
              <span className="cp-reset-security-icon">
                <LockIcon />
              </span>

              <div>
                <strong>Keep your account protected</strong>
                <span>
                  Use a password that is unique to CampusPulse and avoid sharing
                  it with anyone.
                </span>
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
              <span className="cp-auth-eyebrow">Password recovery</span>

              <h2>Create a new password.</h2>

              <p>
                Set a new password below. Your recovery link can only be used
                for this reset.
              </p>
            </div>

            {done ? (
              <div
                className="cp-auth-feedback cp-auth-feedback-success"
                role="status"
              >
                <div className="cp-auth-feedback-icon">
                  <CheckIcon />
                </div>

                <div>
                  <strong>Password updated</strong>
                  <p>
                    Your password has been reset successfully. Redirecting you
                    to sign in…
                  </p>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div
                    className="cp-auth-feedback cp-auth-feedback-error"
                    role="alert"
                  >
                    <div className="cp-auth-feedback-icon">!</div>

                    <div>
                      <strong>Unable to reset password</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={submit} className="cp-auth-form cp-reset-form">
                  <div className="cp-auth-field">
                    <label htmlFor="reset-password">New password</label>

                    <input
                      id="reset-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                    />

                    <span className="cp-auth-field-hint">
                      Use at least 8 characters.
                    </span>
                  </div>

                  <div className="cp-auth-field">
                    <label htmlFor="reset-confirm-password">
                      Confirm password
                    </label>

                    <input
                      id="reset-confirm-password"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      minLength={8}
                      required
                      autoComplete="new-password"
                      placeholder="Enter the password again"
                    />
                  </div>

                  <button
                    type="submit"
                    className="cp-auth-submit"
                    disabled={loading}
                  >
                    <span>
                      {loading ? "Updating password…" : "Update password"}
                    </span>

                    {!loading && <ArrowIcon />}
                  </button>
                </form>
              </>
            )}

            <div className="cp-auth-divider">
              <span />
              <span>CampusPulse</span>
              <span />
            </div>

            <p className="cp-auth-back cp-reset-back">
              <Link to="/login">← Back to sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
=======
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Seo from '../components/Seo';

function ResetPassword() {
  const { uid, token } = useParams(); const navigate = useNavigate();
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false); const [loading, setLoading] = useState(false);
  const submit = async e => { e.preventDefault(); setError(''); if(password!==confirm){setError('Passwords do not match.');return;} setLoading(true); try { await api.post('/accounts/reset-password/',{uid,token,new_password:password}); setDone(true); setTimeout(()=>navigate('/login'),1200); } catch(e){setError(e.response?.data?.detail||'This reset link is invalid or expired.');} finally{setLoading(false);} };
  return <div className="auth-page"><Seo title="Reset Password | CampusPulse" description="Set a new CampusPulse password." path="/reset-password" noindex /><div className="auth-side"><div className="brand light-brand"><span className="brand-mark">CP</span><span>CampusPulse</span></div><div><span className="eyebrow light">Secure recovery</span><h1>Choose a new password and continue.</h1><p>Use a strong password that you do not reuse elsewhere.</p></div><span className="auth-side-foot">Olabisi Onabanjo University</span></div><div className="auth-main"><div className="auth-card"><div className="auth-mobile-brand"><div className="brand"><span className="brand-mark">CP</span><span>CampusPulse</span></div></div><span className="eyebrow">New password</span><h2>Create a new password.</h2><p className="auth-sub">Your reset link is single-use.</p>{done?<div className="notice success">Password reset successfully. Redirecting to sign in…</div>:<form onSubmit={submit} className="stack-form"><label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required autoComplete="new-password"/></label><label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} required autoComplete="new-password"/></label><button className="button primary large" disabled={loading}>{loading?'Updating…':'Update password'}</button>{error&&<div className="notice error">{error}</div>}</form>}<p className="auth-switch"><Link to="/login">Back to sign in</Link></p></div></div></div>;
>>>>>>> ca72c514c7af5177f6b6393ac54d55922b136504
}

export default ResetPassword;
