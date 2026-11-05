import { useMemo, useState, type FormEvent } from 'react';
import { useAction, useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { addStudent, deleteStudent, listStudents, resetClaim, setStudentSuspended } from '@/services/roster';
import { Badge, Button, ConfirmButton, EmptyState, ErrorAlert, PageLoader, TextField } from '@/components/ui';
import { AppError, toAppError } from '@/lib/errors';
import { pluralize } from '@/lib/format';
import { RosterImport } from './RosterImport';
import type { Student } from '@/types';

export function RosterTab({ classId }: { classId: string }) {
  const students = useAsync(() => listStudents(classId), [classId]);
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'none' | 'import' | 'add'>('none');

  const list = students.data ?? [];
  const claimed = list.filter((s) => s.user_id).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s.full_name.toLowerCase().includes(q) || s.matric_no.toLowerCase().includes(q));
  }, [list, query]);

  const replace = (updated: Student) =>
    students.setData((prev) => (prev ?? []).map((s) => (s.id === updated.id ? updated : s)));

  const handleToggleSuspend = async (s: Student) => {
    try {
      const updated = await setStudentSuspended(s.id, !s.suspended);
      replace(updated);
      toast(updated.suspended ? `${s.full_name} suspended from check-in` : `${s.full_name} reactivated`);
    } catch (e) {
      toast(toAppError(e).message, 'error');
    }
  };

  const handleReset = async (s: Student) => {
    try {
      replace(await resetClaim(s.id));
      toast(`${s.full_name} can now claim again on a new phone`);
    } catch (e) {
      toast(toAppError(e).message, 'error');
    }
  };

  const handleDelete = async (s: Student) => {
    try {
      await deleteStudent(s.id);
      students.setData((prev) => (prev ?? []).filter((x) => x.id !== s.id));
      toast(`Removed ${s.full_name}`);
    } catch (e) {
      toast(toAppError(e).message, 'error');
    }
  };

  if (students.loading) return <PageLoader />;

  return (
    <div className="stack">
      <div className="section-head">
        <div>
          <h2>Students</h2>
          {list.length > 0 && (
            <p className="muted small">
              {pluralize(list.length, 'student')} · {claimed} claimed
            </p>
          )}
        </div>
        {mode === 'none' && (
          <div className="row">
            <Button onClick={() => setMode('import')}>Import list</Button>
            <Button variant="secondary" onClick={() => setMode('add')}>
              Add one
            </Button>
          </div>
        )}
      </div>

      <ErrorAlert error={students.error} onRetry={() => students.reload()} />

      {mode === 'import' && (
        <RosterImport
          classId={classId}
          existingCount={list.length}
          onDone={(count) => {
            setMode('none');
            if (count) {
              toast(`Imported ${pluralize(count, 'student')}`);
              void students.reload({ silent: true });
            }
          }}
        />
      )}

      {mode === 'add' && (
        <AddStudentForm
          classId={classId}
          onDone={(s) => {
            setMode('none');
            if (s) {
              students.setData((prev) => [...(prev ?? []), s].sort((a, b) => a.full_name.localeCompare(b.full_name)));
              toast(`Added ${s.full_name}`);
            }
          }}
        />
      )}

      {list.length === 0 && mode === 'none' && !students.error && (
        <EmptyState
          title="No students yet"
          action={<Button onClick={() => setMode('import')}>Import a CSV or Excel file</Button>}
        >
          Upload the class list with each student's name and matric number. Students use these to claim their account.
        </EmptyState>
      )}

      {list.length > 0 && (
        <>
          <TextField
            label="Search"
            className="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or matric number"
          />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Matric No</th>
                  <th>Status</th>
                  <th className="actions-col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className={s.suspended ? 'muted' : undefined}>{s.full_name}</span>
                    </td>
                    <td className="mono">{s.matric_no}</td>
                    <td>
                      {s.suspended ? (
                        <Badge tone="muted">Suspended</Badge>
                      ) : s.user_id ? (
                        <Badge tone="ok">Claimed</Badge>
                      ) : (
                        <Badge tone="muted">Not yet</Badge>
                      )}
                    </td>
                    <td className="actions-col">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleSuspend(s)}
                      >
                        {s.suspended ? 'Reactivate' : 'Suspend'}
                      </Button>
                      {s.user_id && (
                        <ConfirmButton size="sm" onConfirm={() => handleReset(s)} confirmText="Confirm reset">
                          Reset phone
                        </ConfirmButton>
                      )}
                      <ConfirmButton size="sm" onConfirm={() => handleDelete(s)} confirmText="Confirm remove">
                        Remove
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted center">
                      No match for “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AddStudentForm({ classId, onDone }: { classId: string; onDone: (s?: Student) => void }) {
  const [name, setName] = useState('');
  const [matric, setMatric] = useState('');
  const [touched, setTouched] = useState(false);
  const add = useAction(() => addStudent(classId, { full_name: name, matric_no: matric }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (name.trim().length < 2 || matric.trim().length < 2) return;
    const s = await add.run();
    if (s) onDone(s);
  };

  return (
    <form onSubmit={submit} className="panel stack" noValidate>
      <h3>Add a student</h3>
      <div className="grid-2">
        <TextField
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={touched && name.trim().length < 2 ? 'Enter a name.' : null}
          autoFocus
        />
        <TextField
          label="Matric number"
          value={matric}
          onChange={(e) => setMatric(e.target.value)}
          autoCapitalize="characters"
          error={touched && matric.trim().length < 2 ? 'Enter a matric number.' : null}
        />
      </div>
      {add.error && (
        <ErrorAlert
          error={
            add.error.code === 'DUPLICATE'
              ? new AppError('DUPLICATE', 'A student with this matric number is already on the list.')
              : add.error
          }
        />
      )}
      <div className="row">
        <Button type="submit" loading={add.pending}>
          Add student
        </Button>
        <Button type="button" variant="ghost" onClick={() => onDone()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
