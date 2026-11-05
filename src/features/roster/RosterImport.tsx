import { useRef, useState } from 'react';
import { useAction } from '@/hooks/useAsync';
import { importRoster } from '@/services/roster';
import { Alert, Button, ErrorAlert } from '@/components/ui';
import { toAppError, type AppError } from '@/lib/errors';
import { pluralize } from '@/lib/format';
import { parseRoster, type ParsedRoster } from './parseRoster';
import { readSpreadsheet, ROSTER_ACCEPT } from './readSpreadsheet';

const PREVIEW_ROWS = 8;

interface Props {
  classId: string;
  existingCount: number;
  onDone: (imported: number) => void;
}

/** Pick file → preview with problems listed → confirm. Nothing is saved until confirm. */
export function RosterImport({ classId, existingCount, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedRoster | null>(null);
  const [readError, setReadError] = useState<AppError | null>(null);
  const [reading, setReading] = useState(false);
  const save = useAction(() => importRoster(classId, parsed?.entries ?? []));

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setParsed(null);
    setReadError(null);
    setReading(true);
    try {
      setParsed(parseRoster(await readSpreadsheet(file)));
    } catch (e) {
      setReadError(toAppError(e));
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirm = async () => {
    const count = await save.run();
    if (count !== undefined) onDone(count);
  };

  const entries = parsed?.entries ?? [];
  const issues = parsed?.issues ?? [];

  return (
    <section className="panel stack">
      <h3>Import class list</h3>
      <p className="muted small">
        CSV or Excel with a <strong>name</strong> column and a <strong>matric number</strong> column. Separate
        Surname / First name columns also work. Other columns are ignored.
      </p>

      <label className="dropzone">
        <input
          ref={inputRef}
          type="file"
          accept={ROSTER_ACCEPT}
          onChange={(e) => pick(e.target.files?.[0])}
          className="sr-only"
        />
        <span className="dropzone-action">{reading ? 'Reading…' : fileName ? 'Choose another file' : 'Choose file'}</span>
        <span className="muted small">{fileName || '.csv, .xlsx or .xls — up to 5 MB'}</span>
      </label>

      <ErrorAlert error={readError} />

      {parsed && (
        <>
          {entries.length > 0 && (
            <>
              <p>
                Found <strong>{pluralize(entries.length, 'student')}</strong>.
                {existingCount > 0 && ' Existing students with the same matric number will have their name updated; nobody is removed.'}
              </p>
              <div className="table-wrap">
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Matric No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, PREVIEW_ROWS).map((e) => (
                      <tr key={e.matric_no}>
                        <td>{e.full_name}</td>
                        <td className="mono">{e.matric_no}</td>
                      </tr>
                    ))}
                    {entries.length > PREVIEW_ROWS && (
                      <tr>
                        <td colSpan={2} className="muted">
                          …and {entries.length - PREVIEW_ROWS} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {issues.length > 0 && (
            <Alert tone={entries.length ? 'warning' : 'error'} title={`${pluralize(issues.length, 'row')} skipped`}>
              <ul className="issue-list">
                {issues.slice(0, 10).map((i, idx) => (
                  <li key={idx}>
                    {i.row > 0 && <span className="mono">Row {i.row}: </span>}
                    {i.message}
                  </li>
                ))}
                {issues.length > 10 && <li>…and {issues.length - 10} more</li>}
              </ul>
            </Alert>
          )}
        </>
      )}

      <ErrorAlert error={save.error} />

      <div className="row">
        <Button onClick={confirm} disabled={!entries.length} loading={save.pending}>
          {entries.length ? `Import ${pluralize(entries.length, 'student')}` : 'Import'}
        </Button>
        <Button variant="ghost" onClick={() => onDone(0)} disabled={save.pending}>
          Cancel
        </Button>
      </div>
    </section>
  );
}
