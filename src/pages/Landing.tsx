import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button, TextField } from '@/components/ui';

export function Landing() {
  const { ready, role } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (ready && role === 'student') return <Navigate to="/me" replace />;
  if (ready && role === 'super_admin') return <Navigate to="/admin" replace />;
  if (ready && role === 'rep') return <Navigate to="/rep" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(clean)) {
      setError('The class code has 6 letters and numbers, e.g. K7PM3Q.');
      return;
    }
    navigate(`/join/${clean}`);
  };

  return (
    <div className="container landing">
      <section className="landing-intro">
        <h1>Attendance, without the paper.</h1>
        <p className="lead">
          Your class rep opens a session in the lecture room. You tap <strong>Check in</strong> on your phone while
          you're there. That's it.
        </p>
      </section>

      <div className="landing-grid">
        <section className="panel">
          <h2>I'm a student</h2>
          <p className="muted">Use the link your class rep shared, or type the class code.</p>
          <form onSubmit={submit} noValidate className="stack">
            <TextField
              label="Class code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="K7PM3Q"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
              inputMode="text"
              className="code-input"
              error={error}
            />
            <Button type="submit" size="lg" block>
              Continue
            </Button>
          </form>
        </section>

        <section className="panel panel-quiet">
          <h2>Class rep / Admin</h2>
          <p className="muted">
            Sign in with the account created by your Super Admin to upload class lists, start GPS sessions, and export
            weekly sheets.
          </p>
          <div className="stack">
            <Link to="/rep/login" className="btn btn-secondary btn-lg btn-block">
              <span>Staff sign in</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
