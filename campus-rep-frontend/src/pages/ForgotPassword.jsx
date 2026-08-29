import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function ForgotPassword() {
  const [form, setForm] = useState({ username: '', email: '', classCode: '' });
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setMessage(''); setError(''); setResetUrl('');
    try {
      const r = await api.post('/accounts/forgot-password/', {
        username: form.username, email: form.email, class_code: form.classCode,
      });
      setMessage(r.data.detail);
      if (r.data.reset_url) setResetUrl(r.data.reset_url);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to process your request.');
    } finally { setLoading(false); }
  };

  return <div className="auth-page"><div className="auth-side"><div className="brand light-brand"><span className="brand-mark">CP</span><span>CampusPulse</span></div><div><span className="eyebrow light">Account recovery</span><h1>Get back into your campus workspace.</h1><p>We verify your account details and class code before sending a secure password reset link.</p></div><span className="auth-side-foot">Olabisi Onabanjo University</span></div><div className="auth-main"><div className="auth-card"><div className="auth-mobile-brand"><div className="brand"><span className="brand-mark">CP</span><span>CampusPulse</span></div></div><span className="eyebrow">Forgot password</span><h2>Reset your password.</h2><p className="auth-sub">Enter your account email, username and class code.</p><form onSubmit={submit} className="stack-form"><label>Username<input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required autoComplete="username"/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required autoComplete="email"/></label><label>Class code<input value={form.classCode} onChange={e=>setForm({...form,classCode:e.target.value.toUpperCase()})} placeholder="6-character class code" maxLength={6} required/></label><button className="button primary large" disabled={loading}>{loading?'Checking…':'Send reset link'}</button></form>{message&&<div className="notice success">{message}{resetUrl&&<div className="dev-reset"><span>Local development reset link</span><a href={resetUrl}>{resetUrl}</a></div>}</div>}{error&&<div className="notice error">{error}</div>}<p className="auth-switch"><Link to="/login">← Back to sign in</Link></p></div></div></div>;
}
export default ForgotPassword;
