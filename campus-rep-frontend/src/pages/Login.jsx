import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/token/', { username: username.trim(), password });
      localStorage.setItem('access', r.data.access);
      localStorage.setItem('refresh', r.data.refresh);
      const d = jwtDecode(r.data.access);
      navigate(d.role === 'CLASS_REP' ? '/rep' : '/student');
    } catch {
      setError('Invalid username or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="brand light-brand">
          <span className="brand-mark">CP</span>
          <span>CampusPulse</span>
        </div>
        <div className="auth-side-content">
          <span className="eyebrow light">
            <span className="eyebrow-dot" /> University attendance, simplified
          </span>
          <h1>One clear workspace for the everyday campus routine.</h1>
          <p>Verify check-in coordinates, coordinate lectures, and stay informed with instant class updates.</p>
        </div>
        <span className="auth-side-foot">Olabisi Onabanjo University · Student &amp; Rep Portal</span>
      </div>

      <div className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <div className="brand">
              <span className="brand-mark">CP</span>
              <span>CampusPulse</span>
            </div>
          </div>

          <div className="auth-header">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Welcome back
            </span>
            <h2>Sign in to your account</h2>
            <p className="auth-sub">Enter your username and password to continue.</p>
          </div>

          {error && <div className="notice error">{error}</div>}

          <form onSubmit={submit} className="stack-form">
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jdoe"
                autoComplete="username"
                required
              />
            </label>

            <label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password</span>
                <Link className="forgot-link" to="/forgot-password" style={{ fontSize: '12px' }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="button primary large full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in to workspace'}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
