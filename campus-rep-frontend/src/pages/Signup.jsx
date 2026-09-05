import { useEffect, useState } from 'react';
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
const [termsAccepted, setTermsAccepted] = useState(false);
const [error, setError] = useState('');
const navigate = useNavigate();

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const r = await api.get('/accounts/departments/');
      const data = r.data || [];
      setDepartments(data);
      if (data.length === 0) {
        setError('No departments found on the server. Please check backend database.');
      } else {
        setError('');
      }
    } catch {
      setError('Failed to load departments. Please check server connection.');
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
    try {
      await api.post('/accounts/signup/', {
        username: form.username,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        password: form.password,
        department: form.department,
        level: form.level,
        class_code: form.classCode,
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
        'Signup failed. Please check your details.';
      setError(message);
    }
  };
  return (
    <div className="auth-page signup-page">
      <div className="auth-side">
        <div className="brand light-brand">
          <span className="brand-mark">CP</span>
          <span>CampusPulse</span>
        </div>
        <div>
          <span className="eyebrow light">Join your campus workspace.</span>
          <h1>Built around the way university communities actually work.</h1>
          <p>Create your account and keep attendance, sessions and updates in one place.</p>
        </div>
        <span className="auth-side-foot">Olabisi Onabanjo University</span>
      </div>
      <div className="auth-main">
        <div className="auth-card wide">
          <div className="auth-mobile-brand">
            <div className="brand">
              <span className="brand-mark">CP</span>
              <span>CampusPulse</span>
            </div>
          </div>
          <span className="eyebrow">Get started</span>
          <h2>Create your account.</h2>
          <p className="auth-sub">A few details and you're ready to go.</p>
          <form onSubmit={submit} className="form-grid">
            <label>
              First name
              <input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
            </label>
            <label>
              Last name
              <input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
            </label>
            <label>
              Username
              <input value={form.username} onChange={(e) => setField('username', e.target.value)} required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
            </label>
            <label>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Department</span>
                {departments.length === 0 && !loadingDepartments && (
                  <button
                    type="button"
                    onClick={loadDepartments}
                    style={{ border: 'none', background: 'none', color: '#1f5eff', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ↻ Retry loading
                  </button>
                )}
              </span>
              <select value={form.department} onChange={(e) => setField('department', e.target.value)} required disabled={loadingDepartments}>
                <option value="">
                  {loadingDepartments
                    ? 'Loading departments…'
                    : departments.length === 0
                    ? 'No departments loaded (tap retry)'
                    : 'Select department'}
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
                <option value="">Select level</option>
                {['100', '200', '300', '400', '500'].map((x) => (
                  <option key={x} value={x}>{x} Level</option>
                ))}
              </select>
            </label>
            <label className="full">
              Class code
              <input
                value={form.classCode}
                onChange={(e) => setField('classCode', e.target.value)}
                placeholder="Enter code from your class rep"
                required
              />
              <small style={{ display: 'block', marginTop: '6px', color: '#64748b', fontSize: '12px' }}>
                Ask your class rep for the code for your department and level.
              </small>
            </label>
            <label className="full">
              Password
              <input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} minLength={8} required />
            </label>
            <label className="terms-check full">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} required />
              <span>I agree to the <Link to="/terms">Terms & Conditions</Link>.</span>
            </label>
           {loadingDepartments && <div className="field-hint full">Loading the department list…</div>}
            {error && <div className="form-error full">{error}</div>}
            <button type="submit" className="button primary full">
              Create account
            </button>
            <div className="auth-switch">
              <span>Already have an account?</span>
              <Link to="/login">Log in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
export default Signup;
