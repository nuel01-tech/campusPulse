import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAction, useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { ensureStudentSession } from '@/services/auth';
import { claimStudent, findClassByCode, getMyEnrollment } from '@/services/student';
import { Alert, Button, ErrorAlert, PageLoader, TextField } from '@/components/ui';
import { titleCase } from '@/lib/names';

export function JoinPage() {
  const { code: rawCode } = useParams();
  const code = (rawCode ?? '').toUpperCase();

  if (!code) return <Navigate to="/" replace />;
  return <ClaimForm code={code} />;
}

function ClaimForm({ code }: { code: string }) {
  const { ready, role } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [matric, setMatric] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);

  const klass = useAsync(() => findClassByCode(code), [code]);
  // If this phone has already claimed, skip the form. Evaluated once auth is
  // ready (not on every role change, so claiming doesn't flash a loader).
  const existing = useAsync(
    () => (ready && role === 'student' ? getMyEnrollment() : Promise.resolve(null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready],
  );

  const claim = useAction(async () => {
    await ensureStudentSession();
    return claimStudent(code, matric, name);
  });

  if (!ready || klass.loading || existing.loading) return <PageLoader />;
  if (existing.data) return <Navigate to="/me" replace />;

  if (klass.error) {
    return (
      <div className="container narrow">
        <ErrorAlert error={klass.error} onRetry={klass.error.code === 'NETWORK' ? () => klass.reload() : undefined} />
        <Link to="/" className="link-quiet">
          ← Enter a different code
        </Link>
      </div>
    );
  }

  const matricError = touched && matric.trim().length < 2 ? 'Enter your matric number.' : null;
  const nameError =
    touched && name.trim().split(/\s+/).filter(Boolean).length < 2 ? 'Enter at least your surname and first name.' : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (matric.trim().length < 2 || name.trim().split(/\s+/).length < 2) return;
    const student = await claim.run();
    if (student) {
      toast(`Welcome, ${titleCase(student.full_name)}`);
      navigate('/me', { replace: true });
    }
  };

  return (
    <div className="container narrow">
      <header className="page-header">
        <p className="eyebrow">Join class</p>
        <h1>{klass.data?.name}</h1>
        <p className="page-subtitle">
          Enter your details exactly as your class rep has them. You only do this once on this phone.
        </p>
      </header>

      {role === 'rep' || role === 'super_admin' ? (
        <Alert tone="warning" title="You're signed in as staff">
          Sign out first, or open this link on the student's own phone.
        </Alert>
      ) : (
        <form onSubmit={submit} noValidate className="stack">
          <TextField
            label="Matric number"
            value={matric}
            onChange={(e) => setMatric(e.target.value)}
            placeholder="e.g. CSC/2021/045"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            error={matricError}
            autoFocus
          />
          <TextField
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Surname and first name"
            autoComplete="name"
            hint="Order doesn't matter."
            error={nameError}
          />

          <ErrorAlert error={claim.error} />

          <Button type="submit" size="lg" block loading={claim.pending}>
            Claim my account
          </Button>
          <p className="fine-print">
            This phone will be linked to your matric number. If you change phones, ask your class rep to reset it.
          </p>
        </form>
      )}
    </div>
  );
}
