import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';
import AppShell from '../components/AppShell';

function Settings() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [level, setLevel] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  let user = {};
  try { const t = localStorage.getItem('access'); user = t ? jwtDecode(t) : {}; } catch {}

  const password = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      await api.patch('/accounts/change-password/', { current_password: currentPassword, new_password: newPassword });
      setMessage('Password updated successfully.');
      setCurrentPassword(''); setNewPassword('');
    } catch (e) { setError(e.response?.data?.detail || 'Failed to update password.'); }
  };

  const phone = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      await api.patch('/accounts/update-matric/', { phone_number: phoneNumber });
      setMessage('Phone number updated.');
    } catch (e) { setError(e.response?.data?.detail || 'Failed to update phone number.'); }
  };

  const matric = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      await api.patch('/accounts/update-matric/', { matric_number: matricNumber });
      setMessage('Matric number saved.');
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save matric number.'); }
  };

  const updateLevel = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      await api.patch('/accounts/update-matric/', { level });
      setMessage('Level updated.');
    } catch (e) { setError(e.response?.data?.detail || 'Failed to update level.'); }
  };

  return (
    <AppShell role={user.role === 'CLASS_REP' ? 'CLASS_REP' : 'STUDENT'}>
      <div className="dashboard-head settings-head">
        <div><span className="eyebrow">Account</span><h1>Settings & profile.</h1><p>Manage your account details and security preferences.</p></div>
      </div>
      {(message || error) && <div className={`notice ${message ? 'success' : 'error'}`}>{message || error}</div>}
      <div className="settings-layout">
        <aside className="settings-menu"><button className="active">Profile</button><button>Security</button><button>Preferences</button></aside>
        <div className="settings-content">
          <section className="panel profile-card">
            <div className="profile-hero">
              <div className="avatar large">{(user.username || 'S').slice(0, 1).toUpperCase()}</div>
              <div><span className="eyebrow">Signed in as</span><h2>{user.username || 'Student'}</h2><p>{user.role === 'CLASS_REP' ? 'Class representative' : 'Student'} account</p></div>
            </div>
            <div className="detail-grid">
              <div><span>Username</span><strong>{user.username || '—'}</strong></div>
              <div><span>Role</span><strong>{user.role === 'CLASS_REP' ? 'Class Representative' : 'Student'}</strong></div>
            </div>
          </section>

          {user.role !== 'CLASS_REP' && (
            <section className="panel">
              <div className="panel-head"><div><span className="eyebrow">Academic</span><h2>Matric number & level</h2></div></div>
              <p className="muted-copy">Required before you can check in to a class.</p>
              <form className="inline-form" onSubmit={matric}>
                <input value={matricNumber} onChange={e => setMatricNumber(e.target.value)} placeholder="e.g. OOU/2021/CSC/001" />
                <button className="button dark">Save</button>
              </form>
              <form className="inline-form" onSubmit={updateLevel} style={{ marginTop: '10px' }}>
                <select value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="">Select level</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level</option>
                </select>
                <button className="button dark">Save</button>
              </form>
            </section>
          )}

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">Contact</span><h2>Phone number</h2></div></div>
            <form className="inline-form" onSubmit={phone}>
              <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="e.g. 08012345678" />
              <button className="button dark">Save</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">Security</span><h2>Change password</h2></div></div>
            <form className="form-grid one-column" onSubmit={password}>
              <label>Current password<input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label>
              <label>New password<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></label>
              <div className="form-actions"><button className="button primary">Update password</button></div>
            </form>
          </section>
        </div>
      </div>
      <button className="back-link" onClick={() => navigate(-1)}>← Back</button>
    </AppShell>
  );
}

export default Settings;