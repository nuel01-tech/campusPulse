import { useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAsync, useNow, usePolling } from '@/hooks/useAsync';
import { getMyEnrollment, listMyCheckIns, listOpenSessions } from '@/services/student';
import { CheckInCard } from '@/features/checkin/CheckInCard';
import { EmptyState, ErrorAlert, PageLoader } from '@/components/ui';
import { formatDate, formatTime, isOpen } from '@/lib/format';
import type { Attendance } from '@/types';

export function StudentHome() {
  const { ready, role } = useAuth();

  if (!ready) return <PageLoader />;
  if (role === 'super_admin') return <Navigate to="/admin" replace />;
  if (role === 'rep') return <Navigate to="/rep" replace />;
  if (role !== 'student') return <Navigate to="/" replace />;
  return <StudentDashboard />;
}

function StudentDashboard() {
  const me = useAsync(getMyEnrollment, []);
  const classId = me.data?.student.class_id;

  const sessions = useAsync(
    () => (classId ? listOpenSessions(classId) : Promise.resolve([])),
    [classId],
  );
  const history = useAsync(() => (classId ? listMyCheckIns() : Promise.resolve([])), [classId]);
  const now = useNow(10_000);

  const refresh = useCallback(() => {
    void sessions.reload({ silent: true });
  }, [sessions]);
  usePolling(refresh, 15_000, Boolean(classId));

  if (me.loading) return <PageLoader />;
  if (me.error) {
    return (
      <div className="container narrow">
        <ErrorAlert error={me.error} onRetry={() => me.reload()} />
      </div>
    );
  }

  if (!me.data) {
    return (
      <div className="container narrow">
        <EmptyState
          title="This phone isn't linked to a student yet"
          action={
            <Link to="/" className="btn btn-primary btn-md">
              <span>Enter class code</span>
            </Link>
          }
        >
          Open the link your class rep shared, or enter the class code.
        </EmptyState>
      </div>
    );
  }

  const { student, className } = me.data;
  const open = (sessions.data ?? []).filter((s) => isOpen(s, now));
  const checkIns = history.data ?? [];
  const bySession = new Map<string, Attendance>(checkIns.map((a) => [a.session_id, a]));

  const addCheckIn = (row: Attendance) => {
    history.setData((prev) => [{ ...row, session: null }, ...(prev ?? [])]);
    void history.reload({ silent: true });
  };

  return (
    <div className="container narrow">
      <header className="student-header">
        <p className="eyebrow">{className}</p>
        <h1>{student.full_name}</h1>
        <p className="mono muted">{student.matric_no}</p>
      </header>

      <section aria-labelledby="open-heading" className="section">
        <div className="section-head">
          <h2 id="open-heading">Open now</h2>
          <button className="link-button" onClick={refresh} disabled={sessions.loading}>
            Refresh
          </button>
        </div>

        <ErrorAlert error={sessions.error} onRetry={() => sessions.reload()} />

        {sessions.loading && !sessions.data ? (
          <PageLoader label="Checking for sessions" />
        ) : open.length === 0 ? (
          <EmptyState title="No session is open">
            When your class rep starts one, it will show up here. This page refreshes by itself.
          </EmptyState>
        ) : (
          <div className="stack">
            {open.map((s) => (
              <CheckInCard
                key={s.id}
                session={s}
                student={student}
                now={now}
                checkedIn={bySession.get(s.id)}
                onCheckedIn={addCheckIn}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="history-heading" className="section">
        <h2 id="history-heading">Your recent check-ins</h2>
        <ErrorAlert error={history.error} onRetry={() => history.reload()} />
        {checkIns.filter((c) => c.session).length === 0 ? (
          <p className="muted">Nothing yet.</p>
        ) : (
          <ul className="history">
            {checkIns
              .filter((c) => c.session)
              .map((c) => (
                <li key={c.id}>
                  <span className="history-course">{c.session!.course_code}</span>
                  <span className="muted">Week {c.session!.week}</span>
                  <span className="history-when">
                    {formatDate(c.checked_in_at)}, {formatTime(c.checked_in_at)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
