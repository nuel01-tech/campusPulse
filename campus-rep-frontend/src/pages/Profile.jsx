import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import AppShell from '../components/AppShell';
import api from '../api/axios';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    matric_number: '',
    phone_number: '',
    level: '',
    class_code: '',
    first_name: '',
    last_name: '',
  });
  const [picture, setPicture] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pictureSaving, setPictureSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedMatric, setCopiedMatric] = useState(false);
  const fileRef = useRef(null);

  let role = 'STUDENT';
  try {
    const t = localStorage.getItem('access');
    role = t ? jwtDecode(t).role : 'STUDENT';
  } catch {}

  const loadProfile = async () => {
    try {
      const r = await api.get('/accounts/profile/');
      setProfile(r.data);
      setForm({
        matric_number: r.data.matric_number || '',
        phone_number: r.data.phone_number || '',
        level: r.data.level || '',
        class_code: '',
        first_name: r.data.first_name || '',
        last_name: r.data.last_name || '',
      });
    } catch {
      setError('Unable to load your profile details.');
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const saveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const r = await api.patch('/accounts/update-matric/', {
        matric_number: form.matric_number.trim(),
        phone_number: form.phone_number.trim(),
        level: form.level,
        class_code: form.class_code.trim().toUpperCase(),
      });
      setMessage(r.data.detail || 'Profile details updated successfully.');
      await loadProfile();
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to update your profile details.');
    } finally {
      setSaving(false);
    }
  };

  const savePicture = async () => {
    if (!picture) return;
    setPictureSaving(true);
    setError('');
    setMessage('');
    try {
      const data = new FormData();
      data.append('profile_picture', picture);
      const r = await api.patch('/accounts/profile/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(r.data);
      setPicture(null);
      setMessage('Profile photo updated successfully.');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(
        e.response?.data?.profile_picture?.[0] ||
        e.response?.data?.detail ||
        'Unable to update profile photo.'
      );
    } finally {
      setPictureSaving(false);
    }
  };

  const choosePicture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile picture must be 5 MB or smaller.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG or WebP image.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPicture(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  };

  const copyMatric = () => {
    if (!profile?.matric_number) return;
    navigator.clipboard.writeText(profile.matric_number);
    setCopiedMatric(true);
    setTimeout(() => setCopiedMatric(false), 2000);
  };

  const deleteAccount = async () => {
    if (!window.confirm('Delete your representative account permanently? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete('/accounts/profile/');
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      window.location.href = '/';
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to delete your account.');
      setDeleting(false);
    }
  };

  const image = preview || profile?.profile_picture;
  const isRep = role === 'CLASS_REP';
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || 'Student';

  return (
    <AppShell role={role}>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Profile Settings
          </span>
          <h1>Your profile.</h1>
          <p>Manage your student identity, matric credentials, and account settings.</p>
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

      {/* Main Hero Card */}
      <div className="profile-hero-card">
        <div className="profile-avatar-container">
          {image ? (
            <img className="profile-avatar-img" src={image} alt="Profile" />
          ) : (
            <div className="profile-avatar-fallback">
              {(profile?.first_name || profile?.username || 'S')[0].toUpperCase()}
            </div>
          )}
          <label className="avatar-upload-badge" title="Change profile photo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={choosePicture}
            />
          </label>
        </div>

        <div className="profile-hero-info">
          <div className="hero-name-row">
            <h2>{fullName}</h2>
            <span className={`hero-role-badge ${isRep ? 'rep' : 'student'}`}>
              {profile?.role_label || (isRep ? 'Class Representative' : 'Student')}
            </span>
          </div>
          <p className="hero-handle">@{profile?.username} · {profile?.email || 'No email'}</p>

          {picture && (
            <div className="picture-save-bar">
              <span style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 600 }}>New photo selected</span>
              <button
                type="button"
                className="button primary small"
                onClick={savePicture}
                disabled={pictureSaving}
              >
                {pictureSaving ? 'Saving photo…' : 'Save Photo'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="profile-page-grid">
        {/* Left column: Academic Identity Overview */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Academic Records</span>
              <h2>Student Details</h2>
            </div>
          </div>

          <div className="identity-cards-grid">
            <div className="identity-item">
              <span className="identity-label">Matric Number</span>
              <div className="identity-value-row">
                <strong>{profile?.matric_number || 'Not added'}</strong>
                {profile?.matric_number && (
                  <button type="button" className="btn-copy-chip" onClick={copyMatric}>
                    {copiedMatric ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>

            <div className="identity-item">
              <span className="identity-label">Department</span>
              <strong>{profile?.department_name || '—'}</strong>
            </div>

            <div className="identity-item">
              <span className="identity-label">Faculty</span>
              <strong>{profile?.faculty || '—'}</strong>
            </div>

            <div className="identity-item">
              <span className="identity-label">Academic Level</span>
              <span className="level-chip" style={{ margin: 0, alignSelf: 'flex-start' }}>
                {profile?.level_label || `${profile?.level || '—'} Level`}
              </span>
            </div>

            <div className="identity-item">
              <span className="identity-label">Phone Number</span>
              <strong>{profile?.phone_number || 'Not added'}</strong>
            </div>

            <div className="identity-item">
              <span className="identity-label">Account Role</span>
              <strong>{profile?.role_label || (isRep ? 'Class Rep' : 'Student')}</strong>
            </div>
          </div>
        </section>

        {/* Right column: Update Details Form */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Edit Information</span>
              <h2>Update Details</h2>
            </div>
          </div>

          <form className="stack-form" onSubmit={saveDetails}>
            <div className="form-grid">
              <label>
                First name
                <input value={form.first_name} disabled title="Username/Name cannot be edited" style={{ opacity: 0.7 }} />
              </label>
              <label>
                Last name
                <input value={form.last_name} disabled title="Username/Name cannot be edited" style={{ opacity: 0.7 }} />
              </label>
            </div>

            <label>
              Matric number
              <input
                value={form.matric_number}
                onChange={(e) => setForm({ ...form, matric_number: e.target.value })}
                placeholder="e.g. 230401001"
              />
            </label>

            <label>
              Phone number
              <input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="08012345678"
              />
            </label>

            {!isRep && (
              <div className="level-change-box">
                <label>
                  Level
                  <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option value="">Select level</option>
                    {['100', '200', '300', '400', '500'].map((x) => (
                      <option key={x} value={x}>
                        {x} Level
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ marginTop: '12px' }}>
                  Class Signup Code
                  <input
                    value={form.class_code}
                    onChange={(e) => setForm({ ...form, class_code: e.target.value.toUpperCase() })}
                    maxLength={6}
                    placeholder="Required if changing level"
                  />
                  <span className="field-hint">
                    Enter the class rep code designated for your new level.
                  </span>
                </label>
              </div>
            )}

            <button type="submit" className="button primary large full" disabled={saving}>
              {saving ? 'Saving changes…' : 'Save Changes'}
            </button>
          </form>
        </section>
      </div>

      {isRep && (
        <section className="panel danger-panel" style={{ marginTop: '24px' }}>
          <div className="panel-head">
            <div>
              <span className="eyebrow" style={{ color: '#dc2626' }}>
                Danger zone
              </span>
              <h2>Delete Representative Account</h2>
            </div>
          </div>
          <p className="muted-copy" style={{ marginBottom: '16px' }}>
            Permanently remove your course representative account, lecture history, and access keys.
          </p>
          <button
            type="button"
            className="button danger"
            onClick={deleteAccount}
            disabled={deleting}
          >
            {deleting ? 'Deleting account…' : 'Delete My Account'}
          </button>
        </section>
      )}
    </AppShell>
  );
}

export default Profile;
