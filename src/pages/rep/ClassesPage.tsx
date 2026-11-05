import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAction, useAsync } from '@/hooks/useAsync';
import { createClass, listClasses } from '@/services/classes';
import { Button, EmptyState, ErrorAlert, PageHeader, PageLoader, TextField } from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function ClassesPage() {
  const classes = useAsync(listClasses, []);
  const [showForm, setShowForm] = useState(false);

  if (classes.loading) return <PageLoader />;

  const list = classes.data ?? [];
  const formVisible = showForm || list.length === 0;

  return (
    <div className="container">
      <PageHeader
        title="Your classes"
        actions={
          !formVisible && (
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              New class
            </Button>
          )
        }
      />
      <ErrorAlert error={classes.error} onRetry={() => classes.reload()} />

      {formVisible && <NewClassForm onCancel={list.length ? () => setShowForm(false) : undefined} />}

      {list.length > 0 && (
        <ul className="list">
          {list.map((c) => (
            <li key={c.id}>
              <Link to={`/rep/class/${c.id}`} className="list-row">
                <div>
                  <p className="list-title">{c.name}</p>
                  <p className="muted small">Created {formatDate(c.created_at)}</p>
                </div>
                <span className="mono code-chip">{c.join_code}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!list.length && !classes.error && (
        <EmptyState title="Start by creating a class">
          A class is one set of students, e.g. "Computer Science 300L". You'll upload the class list next.
        </EmptyState>
      )}
    </div>
  );
}

function NewClassForm({ onCancel }: { onCancel?: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [touched, setTouched] = useState(false);
  const create = useAction(() => createClass(name, start || null));

  const nameError = touched && name.trim().length < 2 ? 'Give the class a name.' : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (name.trim().length < 2) return;
    const created = await create.run();
    if (created) navigate(`/rep/class/${created.id}/students`);
  };

  return (
    <form onSubmit={submit} noValidate className="panel stack">
      <h2>New class</h2>
      <TextField
        label="Class name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Computer Science 300L"
        error={nameError}
        maxLength={120}
      />
      <TextField
        label="Semester start date (optional)"
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        hint="Used to fill in the week number for each session. You can change it later."
      />
      <ErrorAlert error={create.error} />
      <div className="row">
        <Button type="submit" loading={create.pending}>
          Create class
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
