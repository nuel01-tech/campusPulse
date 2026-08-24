import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AppShell from '../components/AppShell';

function RepSessions() {
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/attendance/sessions/mine/').then(r => setSessions(r.data)).catch(() => {});
  }, []);

  return (
    <AppShell role="CLASS_REP">
      <div className="dashboard-head">
        <div><span className="eyebrow">Attendance control</span><h1>Sessions.</h1><p>Manage the lecture sessions created for your department.</p></div>
        <button className="button primary" onClick={() => navigate('/rep')}>+ New session</button>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Course</th><th>Venue</th><th>Level</th><th>Attendance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.course_code}</strong></td>
                  <td>{s.venue_name}</td>
                  <td>{s.level}</td>
                  <td>{s.attendee_count || 0}</td>
                  <td><span className={`status-badge ${s.has_ended ? 'neutral' : s.is_active ? 'green' : 'amber'}`}><i />{s.has_ended ? 'Ended' : s.is_active ? 'Live' : 'Ready'}</span></td>
                  <td><button className="small-action" onClick={() => navigate('/rep')}>Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessions.length === 0 && <div className="empty-state"><span>○</span><h3>No sessions yet</h3><p>Your sessions will appear here.</p></div>}
      </section>
    </AppShell>
  );
}

export default RepSessions;