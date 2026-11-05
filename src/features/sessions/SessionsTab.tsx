import { Link } from 'react-router-dom';
import { useAsync, useNow } from '@/hooks/useAsync';
import { listSessionsWithCounts } from '@/services/sessions';
import { Badge, EmptyState, ErrorAlert, PageLoader } from '@/components/ui';
import { formatDate, formatTime, isOpen, timeLeft } from '@/lib/format';
import type { ClassRoom } from '@/types';

export function SessionsTab({ klass }: { klass: ClassRoom }) {
  const sessions = useAsync(() => listSessionsWithCounts(klass.id), [klass.id]);
  const now = useNow(30_000);

  const newLink = (
    <Link to={`/rep/class/${klass.id}/new-session`} className="btn btn-primary btn-md">
      <span>Start a session</span>
    </Link>
  );

  if (sessions.loading) return <PageLoader />;

  const list = sessions.data ?? [];
  return (
    <div className="stack">
      <div className="section-head">
        <h2>Sessions</h2>
        {list.length > 0 && newLink}
      </div>
      <ErrorAlert error={sessions.error} onRetry={() => sessions.reload()} />

      {list.length === 0 && !sessions.error ? (
        <EmptyState title="No sessions yet" action={newLink}>
          Start a session when you're in the lecture room. Students within the radius can check in until it closes.
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Venue</th>
                <th className="num">Week</th>
                <th>Date</th>
                <th className="num">Present</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const live = isOpen(s, now);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/rep/session/${s.id}`} className="strong-link">
                        {s.course_code}
                      </Link>
                    </td>
                    <td>{s.venue}</td>
                    <td className="num">{s.week}</td>
                    <td className="nowrap">
                      {formatDate(s.starts_at)}, {formatTime(s.starts_at)}
                    </td>
                    <td className="num">{s.present}</td>
                    <td>{live ? <Badge tone="live">Live · {timeLeft(s.ends_at, now)}</Badge> : <Badge tone="muted">Closed</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
