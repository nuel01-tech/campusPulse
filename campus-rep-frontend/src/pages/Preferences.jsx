import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import AppShell from '../components/AppShell';
import api from '../api/axios';

function Preferences() {
  const [prefs, setPrefs] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  let role = 'STUDENT';
  try {
    const t = localStorage.getItem('access');
    role = t ? jwtDecode(t).role : 'STUDENT';
  } catch {}

  useEffect(() => {
    api
      .get('/accounts/preferences/')
      .then((r) => setPrefs(r.data))
      .catch(() => setError('Unable to load preferences.'));
  }, []);

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.patch('/accounts/preferences/', prefs);
      setMessage('Preferences saved successfully.');
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    ['push_notifications', 'Push notifications', 'Receive instant browser alerts for live sessions and class announcements.'],
    ['email_notifications', 'Email notifications', 'Receive official academic summaries and security alerts by email.'],
    ['session_notifications', 'Lecture session alerts', 'Get notified the moment your course representative initiates attendance.'],
    ['announcement_notifications', 'Announcement broadcasts', 'Receive urgent notices, venue alterations, and assignment deadlines.'],
  ];

  return (
    <AppShell role={role}>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Notification Settings
          </span>
          <h1>Preferences.</h1>
          <p>Configure how CampusPulse sends alerts and lecture updates to you.</p>
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

      <section className="panel" style={{ maxWidth: '800px' }}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Notifications</span>
            <h2>Alert Channels</h2>
          </div>
        </div>

        <div style={{ display: 'grid' }}>
          {prefs &&
            rows.map(([key, title, desc]) => (
              <div className="preference-row" key={key}>
                <div style={{ paddingRight: '16px' }}>
                  <strong>{title}</strong>
                  <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '13px' }}>{desc}</p>
                </div>
                <button
                  type="button"
                  className={`toggle ${prefs[key] ? 'on' : ''}`}
                  onClick={() => toggle(key)}
                  aria-pressed={prefs[key]}
                >
                  <span />
                </button>
              </div>
            ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="button primary large" onClick={save} disabled={!prefs || saving}>
            {saving ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      </section>
    </AppShell>
  );
}

export default Preferences;
