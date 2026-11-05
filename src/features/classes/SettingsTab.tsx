import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAction } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { deleteClass, updateClass } from '@/services/classes';
import { Button, ConfirmButton, ErrorAlert, TextField } from '@/components/ui';
import type { ClassRoom } from '@/types';

export function SettingsTab({ klass, onUpdated }: { klass: ClassRoom; onUpdated: (c: ClassRoom) => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(klass.name);
  const [start, setStart] = useState(klass.semester_start ?? '');

  const save = useAction(() => updateClass(klass.id, { name: name.trim(), semester_start: start || null }));
  const remove = useAction(async () => {
    await deleteClass(klass.id);
    return true;
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    const updated = await save.run();
    if (updated) {
      onUpdated(updated);
      toast('Saved');
    }
  };

  const handleDelete = async () => {
    if (await remove.run()) {
      toast('Class deleted');
      navigate('/rep', { replace: true });
    }
  };

  const dirty = name.trim() !== klass.name || (start || null) !== klass.semester_start;

  return (
    <div className="stack-lg">
      <form onSubmit={submit} className="panel stack" noValidate>
        <h2>Class details</h2>
        <TextField
          label="Class name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={name.trim().length < 2 ? 'Give the class a name.' : null}
        />
        <TextField
          label="Semester start date"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          hint="Week 1 is the week containing this date."
        />
        <ErrorAlert error={save.error} />
        <div>
          <Button type="submit" loading={save.pending} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>

      <section className="panel panel-danger stack">
        <h2>Delete class</h2>
        <p className="muted">Removes the class list, all sessions and all attendance records. This cannot be undone.</p>
        <ErrorAlert error={remove.error} />
        <div>
          <ConfirmButton onConfirm={handleDelete} loading={remove.pending} confirmText="Tap again to delete everything">
            Delete this class
          </ConfirmButton>
        </div>
      </section>
    </div>
  );
}
