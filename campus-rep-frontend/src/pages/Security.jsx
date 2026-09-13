import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import AppShell from '../components/AppShell';
import api from '../api/axios';

function Security() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  let role = 'STUDENT';
  try {
    const t = localStorage.getItem('access');
    role = t ? jwtDecode(t).role : 'STUDENT';
  } catch {}

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirm) {
      setError('New passwords do not match. Please re-enter.');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/accounts/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage('Password updated successfully.');
      setCurrent('');
      setNew('');
      setConfirm('');
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell role={role}>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Account Security
          </span>
          <h1>Security &amp; Password.</h1>
          <p>Protect your account credentials and maintain access integrity.</p>
        </div>
      </div>

      {/* Profile Section Tabs */}
      <div className="profile-tabs-nav">
        <NavLink to="/profile" className={({ isActive }) => `profile-tab-item ${isActive ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
          Profile Details
        </NavLink>
        <NavLink to="/security" className={({ isActive }) => `profile-tab-item ${isActive ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Security &amp; Password
        </NavLink>
        <NavLink to="/preferences" className={({ isActive }) => `profile-tab-item ${isActive ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Preferences
        </NavLink>
      </div>

      {(message || error) && (
        <div className={`notice ${message ? 'success' : 'error'}`}>
          {message || error}
        </div>
      )}

      <div className="content-grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Credentials</span>
              <h2>Change Password</h2>
            </div>
            <span className="status-pill active" style={{ fontSize: '11px' }}>
              <span className="status-dot-pulse" /> Protected
            </span>
          </div>

          <form className="stack-form" onSubmit={submit}>
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Re-enter new password"
              />
            </label>

            <div style={{ marginTop: '8px' }}>
              <button type="submit" className="button primary large full" disabled={loading}>
                {loading ? 'Updating password…' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel" style={{ background: '#f8fafc' }}>
          <div className="panel-head">
            <div>
              <span className="eyebrow">Security Guidelines</span>
              <h2>Account Safety</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '14px', fontSize: '13.5px', color: '#475569' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
              <span>Use a unique password with a mix of letters, numbers, and symbols.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
              <span>Never share your login credentials with classmates.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
              <span>CampusPulse administrators will never ask for your account password.</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default Security;
