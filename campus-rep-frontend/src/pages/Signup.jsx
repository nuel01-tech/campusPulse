import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Signup() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    department: '',
    level: '',
    classCode: '',
  });
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [retryMessage, setRetryMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const attemptRef = useRef(0);

  const loadDepartments = async (isAutoRetry = false) => {
    // 1. Instant fallback from session storage if available
    const cached = sessionStorage.getItem('campuspulse_departments');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDepartments(parsed);
          setLoadingDepartments(false);
        }
      } catch {}
    } else {
      setLoadingDepartments(true);
    }

    if (!isAutoRetry) {
      attemptRef.current = 0;
      setError('');
    }

    try {
      const r = await api.get(`/accounts/departments/?_t=${Date.now()}`);
      const data = r.data || [];
      setDepartments(data);
      setRetryMessage('');
      if (data.length > 0) {
        sessionStorage.setItem('campuspulse_departments', JSON.stringify(data));
        setError('');
      } else if (!cached) {
        setError('No departments found on the server. Please contact your rep.');
      }
    } catch {
      attemptRef.current += 1;
      if (attemptRef.current < 4) {
        setRetryMessage(`Loading departments… retrying (${attemptRef.current}/3)`);
        setTimeout(() => loadDepartments(true), 2500);
        return;
      }
      setRetryMessage('');
      if (!cached) {
        setError('Taking longer than usual to load departments. Tap retry below.');
      }
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const setField = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/accounts/signup/', {
        username: form.username.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        department: form.department,
        level: form.level,
        class_code: form.classCode.trim().toUpperCase(),
        terms_accepted: termsAccepted,
      });
      navigate('/login');
    } catch (e) {
      const serverError = e.response?.data;
      const message =
        serverError?.class_code?.[0] ||
        serverError?.department?.[0] ||
        serverError?.username?.[0] ||
        serverError?.email?.[0] ||
        serverError?.terms_accepted?.[0] ||
        serverError?.detail ||
        'Signup failed. Please check your details and class code.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page signup-page">
      <div className="auth-side">
        <div className="brand light-brand">
          <span className="brand-mark">CP</span>
          <span>CampusPulse</span>
        </div>
        <div className="auth-side-content">
          <span className="eyebrow light">
            <span className="eyebrow-dot" /> Join your class workspace
          </span>
          <h1>Built around the way university communities actually work.</h1>
          <p>Create your account and keep attendance, sessions and updates in one place.</p>
        </div>
        <span className="auth-side-foot">Olabisi Onabanjo University · Student &amp; Rep Portal</span>
      </div>

      <div className="auth-main">
        <div className="auth-card wide">
          <div className="auth-mobile-brand">
            <div className="brand">
              <span className="brand-mark">CP</span>
              <span>CampusPulse</span>
            </div>
          </div>

          <div className="auth-header">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Quick registration
            </span>
            <h2>Create your account</h2>
            <p className="auth-sub">Enter your details and class signup code to begin.</p>
          </div>

          {error && <div className="notice error">{error}</div>}

          <form onSubmit={submit} className="form-grid">
            <label>
              First name
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                placeholder="e.g. John"
                required
              />
            </label>

            <label>
              Last name
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                placeholder="e.g. Doe"
                required
              />
            </label>

            <label>
              Username
              <input
                type="text"
                value={form.username}
                onChange={(e) => setField('username', e.target.value)}
                placeholder="e.g. jdoe24"
                autoComplete="username"
                required
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Department</span>
                {departments.length === 0 && !loadingDepartments && (
                  <button
                    type="button"
                    onClick={() => loadDepartments(false)}
                    style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ↻ Reload
                  </button>
                )}
              </div>
              <select
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
                required
                disabled={loadingDepartments}
              >
                <option value="">
                  {loadingDepartments
                    ? 'Loading departments…'
                    : departments.length === 0
                    ? 'No departments loaded (tap reload)'
                    : 'Select your department'}
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.faculty ? `(${d.faculty})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Level
              <select value={form.level} onChange={(e) => setField('level', e.target.value)} required>
                <option value="">Select current level</option>
                {['100', '200', '300', '400', '500'].map((x) => (
                  <option key={x} value={x}>{x} Level</option>
                ))}
              </select>
            </label>

            <label className="full">
              Class Signup Code
              <input
                type="text"
                value={form.classCode}
                onChange={(e) => setField('classCode', e.target.value.toUpperCase())}
                placeholder="Enter the 6-character code from your class rep"
                required
              />
              <span className="field-hint">
                Ask your Course Representative for the code designated for your department &amp; level.
              </span>
            </label>

            <label className="full">
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </label>

            <div className="terms-check-wrapper full">
              <label className="terms-check">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                />
                <span>
                  I have read and agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-link">
                    Terms &amp; Conditions
                  </Link>
                </span>
              </label>
            </div>

            {loadingDepartments && (
              <div className="field-hint full" style={{ color: '#2563eb', fontWeight: 600 }}>
                {retryMessage || 'Connecting to department database…'}
              </div>
            )}

            <div className="full" style={{ marginTop: '8px' }}>
              <button type="submit" className="button primary large full" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Complete Registration'}
              </button>
            </div>
          </form>

          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in to your workspace</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
