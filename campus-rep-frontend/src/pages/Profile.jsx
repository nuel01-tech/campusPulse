import { useEffect, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import AppShell from '../components/AppShell';
import api from '../api/axios';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ matric_number: '', phone_number: '', level: '', class_code: '', first_name: '', last_name: '' });
  const [picture, setPicture] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pictureSaving, setPictureSaving] = useState(false);
  const fileRef = useRef(null);
  let role = 'STUDENT';
  try { const t = localStorage.getItem('access'); role = t ? jwtDecode(t).role : 'STUDENT'; } catch {}

  const loadProfile = async () => {
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
  };

  useEffect(() => { loadProfile().catch(() => setError('Unable to load your profile.')); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const saveDetails = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const r = await api.patch('/accounts/update-matric/', {
        matric_number: form.matric_number,
        phone_number: form.phone_number,
        level: form.level,
        class_code: form.class_code,
      });
      setMessage(r.data.detail || 'Profile details saved.');
      await loadProfile();
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to save your details.');
    } finally { setSaving(false); }
  };

  const savePicture = async () => {
    if (!picture) return;
    setPictureSaving(true); setError(''); setMessage('');
    try {
      const data = new FormData();
      data.append('profile_picture', picture);
      const r = await api.patch('/accounts/profile/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(r.data);
      setPicture(null);
      setMessage('Profile picture updated.');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(e.response?.data?.profile_picture?.[0] || e.response?.data?.detail || 'Unable to update your profile picture.');
    } finally { setPictureSaving(false); }
  };

  const choosePicture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Profile picture must be 5 MB or smaller.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Use a JPG, PNG or WebP image.'); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPicture(file); setPreview(URL.createObjectURL(file)); setError('');
  };

  const image = preview || profile?.profile_picture;

  return <AppShell role={role}>
    <div className="dashboard-head"><div><span className="eyebrow">Profile</span><h1>Your profile.</h1><p>View the academic and account information connected to your CampusPulse account.</p></div></div>
    {(message || error) && <div className={`notice ${message ? 'success' : 'error'}`}>{message || error}</div>}
    <div className="profile-page-grid">
      <section className="panel profile-card">
        <div className="profile-hero">
          {image ? <img className="avatar large profile-avatar-image" src={image} alt="Profile" /> : <div className="avatar large">{(profile?.first_name || profile?.username || 'S').slice(0, 1).toUpperCase()}</div>}
          <div><span className="eyebrow">Account</span><h2>{profile?.first_name || profile?.username || 'Student'} {profile?.last_name || ''}</h2><p>{profile?.role_label || 'Student'}</p></div>
        </div>
        <div className="profile-picture-editor">
          <div><strong>Profile picture</strong><p>Use a clear JPG, PNG or WebP image up to 5 MB.</p></div>
          <div className="picture-actions"><label className="button secondary small">Choose image<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choosePicture} /></label>{picture && <button className="button primary small" onClick={savePicture} disabled={pictureSaving}>{pictureSaving ? 'Saving…' : 'Save picture'}</button>}</div>
        </div>
        <div className="detail-grid three">
          <div><span>Username</span><strong>{profile?.username || '—'}</strong><small className="immutable-note">Username cannot be changed</small></div>
          <div><span>Email</span><strong>{profile?.email || '—'}</strong></div>
          <div><span>Phone</span><strong>{profile?.phone_number || 'Not added'}</strong></div>
          <div><span>Department</span><strong>{profile?.department_name || '—'}</strong></div>
          <div><span>Faculty</span><strong>{profile?.faculty || '—'}</strong></div>
          <div><span>Level</span><strong>{profile?.level_label || 'Not set'}</strong></div>
          <div><span>Matric number</span><strong>{profile?.matric_number || 'Not added'}</strong></div>
          <div><span>Role</span><strong>{profile?.role_label || '—'}</strong></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Academic details</span><h2>Update your details</h2></div></div>
        <form className="stack-form" onSubmit={saveDetails}>
          <label>First name<input value={form.first_name} disabled title="Name editing is not enabled in this profile workflow yet" /></label>
          <label>Last name<input value={form.last_name} disabled title="Name editing is not enabled in this profile workflow yet" /></label>
          <label>Matric number<input value={form.matric_number} onChange={e => setForm({ ...form, matric_number: e.target.value })} placeholder="e.g. 230401001" /></label>
          <label>Phone number<input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="08012345678" /></label>
          {role !== 'CLASS_REP' && <><label>Level<select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}><option value="">Select level</option>{['100','200','300','400','500'].map(x => <option key={x} value={x}>{x} Level</option>)}</select></label><label>Class code <span className="field-hint">Required only when changing level</span><input value={form.class_code} onChange={e => setForm({ ...form, class_code: e.target.value.toUpperCase() })} maxLength={6} placeholder="Class rep code" /></label></>}
          <button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      </section>
    </div>
  </AppShell>;
}

export default Profile;
