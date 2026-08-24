import { useEffect, useState } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';

function StudentAnnouncements() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/attendance/announcements/').then(r => setItems(r.data)).catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Department updates</span>
          <h1>Announcements.</h1>
          <p>Important updates from your class representative, all in one place.</p>
        </div>
      </div>
      <div className="announcement-page-list">
        {items.length === 0 ? (
          <section className="panel empty-state">
            <span>—</span>
            <h3>No announcements yet</h3>
            <p>New department updates will appear here.</p>
          </section>
        ) : (
          items.map(a => (
            <article className="panel announcement-detail" key={a.id}>
              <div className="announcement-meta">
                <span>{a.category === 'ASSIGNMENT' ? '📝 Assignment' : a.category === 'VENUE_CHANGE' ? '📍 Venue Change' : 'Department update'}</span>
                <time>{new Date(a.created_at).toLocaleDateString()}</time>
              </div>
              <h2>{a.title}</h2>
              <p>{a.body}</p>
              {a.due_date && <p className="due-date">Due: {new Date(a.due_date).toLocaleDateString()}</p>}
            </article>
          ))
        )}
      </div>
    </AppShell>
  );
}

export default StudentAnnouncements;