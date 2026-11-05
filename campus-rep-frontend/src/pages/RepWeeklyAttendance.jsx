import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api/axios";
import "./RepWeeklyAttendance.css";

const DEFAULT_ACADEMIC_YEAR = "2026/2027";
const WEEK_OPTIONS = Array.from({ length: 52 }, (_, index) => index + 1);
const STATUS_OPTIONS = [
  { value: "UNMARKED", label: "Not marked" },
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "EXCUSED", label: "Excused" },
];

function RepWeeklyAttendance() {
  const [academicYear, setAcademicYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [weekNumber, setWeekNumber] = useState(1);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [report, setReport] = useState({ weeks: [], students: [], summary: {} });
  const [draftStatuses, setDraftStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeRegister = useMemo(
    () => report.weeks.find((week) => week.week_number === Number(weekNumber)),
    [report.weeks, weekNumber],
  );

  const load = async (year = academicYear) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/attendance/weekly-register/", {
        params: { academic_year: year },
      });
      const nextReport = response.data || { weeks: [], students: [], summary: {} };
      setReport(nextReport);
      const latest = [...(nextReport.weeks || [])].sort(
        (a, b) => b.week_number - a.week_number,
      )[0];
      if (latest) setWeekNumber(latest.week_number);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not load the weekly attendance register.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(DEFAULT_ACADEMIC_YEAR);
    // Initial load is intentionally performed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the single selected week's editable values in sync with the loaded register.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!activeRegister) {
      setDraftStatuses({});
      return;
    }
    const next = {};
    for (const student of report.students) {
      next[student.id] = student.statuses?.[String(activeRegister.id)] || "UNMARKED";
    }
    setDraftStatuses(next);
  }, [activeRegister, report.students]);

  const changeAcademicYear = async (event) => {
    const value = event.target.value.trim();
    setAcademicYear(value);
    if (/^\d{4}\/\d{4}$/.test(value)) {
      await load(value);
    }
  };

  const createWeek = async () => {
    if (!/^\d{4}\/\d{4}$/.test(academicYear)) {
      setError("Enter the academic year in YYYY/YYYY format.");
      return;
    }
    if (!weekStartDate) {
      setError("Choose the Monday starting date for this week.");
      return;
    }
    setCreating(true);
    setError("");
    setNotice("");
    try {
      await api.post("/attendance/weekly-register/", {
        academic_year: academicYear,
        week_number: Number(weekNumber),
        week_start_date: weekStartDate,
      });
      await load(academicYear);
      setWeekNumber(Number(weekNumber));
      setNotice(`Week ${weekNumber} register created. Mark each student's status and save.`);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.response?.data?.week_number || "Could not create this week's register.");
      if (requestError.response?.status === 409) await load(academicYear);
    } finally {
      setCreating(false);
    }
  };

  const saveWeek = async () => {
    if (!activeRegister) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const entries = report.students.map((student) => ({
        student_id: student.id,
        status: draftStatuses[student.id] || "UNMARKED",
      }));
      const response = await api.patch(
        `/attendance/weekly-register/${activeRegister.id}/`,
        { entries },
      );
      setReport(response.data.report);
      setNotice(`Week ${weekNumber} attendance saved successfully.`);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.response?.data?.entries || "Could not save weekly attendance.");
    } finally {
      setSaving(false);
    }
  };

  const markedCount = Object.values(draftStatuses).filter((value) => value !== "UNMARKED").length;

  return (
    <AppShell role="CLASS_REP">
      <main className="cp-weekly-page">
        <header className="cp-weekly-header">
          <div>
            <span className="cp-page-eyebrow">Class representative workspace</span>
            <h1>Weekly attendance register</h1>
            <p>Choose one week, record each student's status, and print the complete class register.</p>
          </div>
          <button type="button" className="cp-weekly-print" onClick={() => window.print()} disabled={!report.weeks.length}>
            Print register
          </button>
        </header>

        {(error || notice) && (
          <div className={`cp-weekly-feedback ${error ? "is-error" : "is-success"}`} role={error ? "alert" : "status"}>
            {error || notice}
          </div>
        )}

        <section className="cp-weekly-controls">
          <label>
            <span>Academic year</span>
            <input value={academicYear} onChange={changeAcademicYear} placeholder="2026/2027" />
          </label>
          <label>
            <span>Select one week</span>
            <select value={weekNumber} onChange={(event) => setWeekNumber(Number(event.target.value))}>
              {WEEK_OPTIONS.map((week) => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
          </label>
          {!activeRegister ? (
            <>
              <label>
                <span>Week starting (Monday)</span>
                <input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} />
              </label>
              <button type="button" className="cp-weekly-primary" onClick={createWeek} disabled={creating || loading}>
                {creating ? "Creating…" : `Start Week ${weekNumber}`}
              </button>
            </>
          ) : (
            <div className="cp-weekly-selected">
              <span>Selected register</span>
              <strong>Week {activeRegister.week_number}</strong>
              <small>Starting {new Date(`${activeRegister.week_start_date}T00:00:00`).toLocaleDateString()}</small>
            </div>
          )}
        </section>

        <section className="cp-weekly-summary">
          <article><span>Students</span><strong>{report.summary?.students || 0}</strong></article>
          <article><span>Present marks</span><strong className="present-number">{report.summary?.present_marks || 0}</strong></article>
          <article><span>Absent marks</span><strong className="absent-number">{report.summary?.absent_marks || 0}</strong></article>
          <article><span>Weeks recorded</span><strong>{report.weeks.length}</strong></article>
        </section>

        <section className="cp-weekly-entry-panel">
          <div className="cp-weekly-section-heading">
            <div>
              <h2>{activeRegister ? `Record Week ${weekNumber}` : `Week ${weekNumber} is not open yet`}</h2>
              <p>{activeRegister ? `${markedCount} of ${report.students.length} students marked. Unmarked students are not counted as absent.` : "Create this week's register to begin recording attendance."}</p>
            </div>
            {activeRegister && (
              <button type="button" className="cp-weekly-primary" onClick={saveWeek} disabled={saving || loading || !report.students.length}>
                {saving ? "Saving…" : "Save week"}
              </button>
            )}
          </div>
          {loading ? <p className="cp-weekly-empty">Loading class register…</p> : !activeRegister ? (
            <p className="cp-weekly-empty">Select a week that has already been created, or create this week above.</p>
          ) : (
            <div className="cp-weekly-entry-list">
              {report.students.map((student, index) => (
                <label className="cp-weekly-entry-row" key={student.id}>
                  <span className="cp-weekly-student-number">{index + 1}</span>
                  <span className="cp-weekly-student-name">
                    <strong>{student.name}</strong>
                    <small>{student.matric_number || "Matric number not provided"}</small>
                  </span>
                  <select
                    aria-label={`Attendance status for ${student.name}`}
                    value={draftStatuses[student.id] || "UNMARKED"}
                    onChange={(event) => setDraftStatuses((current) => ({ ...current, [student.id]: event.target.value }))}
                  >
                    {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              ))}
              {!report.students.length && <p className="cp-weekly-empty">No active students were found in your department and level.</p>}
            </div>
          )}
        </section>

        <section className="cp-weekly-matrix-section">
          <div className="cp-weekly-print-heading">
            <h1>CampusPulse — Weekly Class Attendance Register</h1>
            <p>{report.department || "Department"} · {report.level || ""} Level · Academic year {academicYear}</p>
            <p>Present: P · Absent: A · Excused: E · —: Not marked</p>
          </div>
          <div className="cp-weekly-section-heading">
            <div>
              <h2>Class attendance matrix</h2>
              <p>Names run down the rows; each recorded week has its own column.</p>
            </div>
            <span className="cp-weekly-matrix-count">{report.weeks.length} weeks</span>
          </div>
          {loading ? <p className="cp-weekly-empty">Preparing printout…</p> : (
            <div className="cp-weekly-table-wrap">
              <table className="cp-weekly-table">
                <thead>
                  <tr>
                    <th className="student-column">Student name</th>
                    {report.weeks.map((week) => <th key={week.id}>W{week.week_number}</th>)}
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Excused</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.students.map((student) => (
                    <tr key={student.id}>
                      <th className="student-column">
                        <strong>{student.name}</strong>
                        {student.matric_number && <small>{student.matric_number}</small>}
                      </th>
                      {report.weeks.map((week) => {
                        const status = week.id === activeRegister?.id
                          ? (draftStatuses[student.id] || "UNMARKED")
                          : (student.statuses?.[String(week.id)] || "UNMARKED");
                        return <td key={week.id} className={`status-${status.toLowerCase()}`} title={status}>
                          {status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : status === "EXCUSED" ? "E" : "—"}
                        </td>;
                      })}
                      <td>{student.present}</td>
                      <td>{student.absent}</td>
                      <td>{student.excused}</td>
                      <td>{student.attendance_percentage}%</td>
                    </tr>
                  ))}
                  {!report.students.length && <tr><td colSpan={Math.max(5, report.weeks.length + 5)}>No students found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <div className="cp-weekly-legend">
            <span><b className="legend-present">P</b> Present</span>
            <span><b className="legend-absent">A</b> Absent</span>
            <span><b className="legend-excused">E</b> Excused</span>
            <span><b>—</b> Not marked</span>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

export default RepWeeklyAttendance;
