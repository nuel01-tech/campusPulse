import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAction, useAsync } from '@/hooks/useAsync';
import { bootstrapSuperAdmin, hasSuperAdmin, signInStaff } from '@/services/auth';
import { Alert, Button, ErrorAlert, PageLoader, TextField } from '@/components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RepAuthPage() {
  const { ready, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const adminExists = useAsync(hasSuperAdmin, []);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const isBootstrap = adminExists.data === false;

  const action = useAction(async () => {
    if (isBootstrap) {
      return bootstrapSuperAdmin(fullName, email, password);
    }
    return signInStaff(email, password);
  });

  if (!ready || adminExists.loading) return <PageLoader />;
  if (role === 'super_admin') return <Navigate to={from ?? '/admin'} replace />;
  if (role === 'rep') return <Navigate to={from ?? '/rep'} replace />;

  const nameError = isBootstrap && touched && fullName.trim().length < 2 ? 'Enter your full name.' : null;
  const emailError = touched && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : null;
  const passwordError =
    touched && password.length < (isBootstrap ? 8 : 1)
      ? isBootstrap
        ? 'Use at least 8 characters.'
        : 'Enter your password.'
      : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (isBootstrap && fullName.trim().length < 2) return;
    if (!EMAIL_RE.test(email.trim()) || password.length < (isBootstrap ? 8 : 1)) return;
    const profile = await action.run();
    if (profile) {
      navigate(profile.role === 'super_admin' ? '/admin' : (from ?? '/rep'), { replace: true });
    }
  };

  return (
    <div className="container narrow">
      <header className="page-header">
        <p className="eyebrow">{isBootstrap ? 'First-time setup' : 'Staff access'}</p>
        <h1>{isBootstrap ? 'Create Super Admin account' : 'Sign in'}</h1>
        <p className="page-subtitle">
          {isBootstrap
            ? 'No Super Admin exists yet. Create the master account below — you will use it to create Class Rep accounts.'
            : 'Sign in as Super Admin or with the Class Rep credentials given to you.'}
        </p>
      </header>

      <ErrorAlert error={adminExists.error} onRetry={() => adminExists.reload()} />

      {role === 'student' && (
        <Alert tone="warning">
          This phone is linked to a student. Signing in as staff here will unlink it. Use a different browser or device
          for your staff account.
        </Alert>
      )}

      <form onSubmit={submit} noValidate className="stack">
        {isBootstrap && (
          <TextField
            label="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Dr. Adewale Musa"
            autoComplete="name"
            error={nameError}
            autoFocus
          />
        )}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          error={emailError}
          autoFocus={!isBootstrap}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isBootstrap ? 'new-password' : 'current-password'}
          hint={isBootstrap ? 'At least 8 characters.' : undefined}
          error={passwordError}
        />
        <ErrorAlert error={action.error} />
        <Button type="submit" size="lg" block loading={action.pending}>
          {isBootstrap ? 'Create Super Admin' : 'Sign in'}
        </Button>
        {!isBootstrap && (
          <p className="fine-print center">
            Class reps cannot sign up on their own. Ask the Super Admin to create your account.
          </p>
        )}
      </form>
    </div>
  );
}
