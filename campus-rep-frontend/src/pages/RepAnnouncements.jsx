import { useEffect, useState } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';

function RepAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [dueDate, setDueDate] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const r = await api.get('/attendance/announcements/');
      setAnnouncements(r.data || []);
    } catch {
      setError('Unable to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsPosting(true);

    try {
      await api.post('/attendance/announcements/create/', {
        title,
        body,
        category,
        due_date: category === 'ASSIGNMENT' && dueDate ? dueDate : null,
      });

      setTitle('');
      setBody('');
      setDueDate('');
      setNotice('Announcement published to all class members.');
      setShowComposer(false);
      await loadAnnouncements();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post announcement.');
    } finally {
      setIsPosting(false);
    }
  };

  const broadcastToWhatsApp = (a) => {
    const text = `📢 *${a.title}*\n\n${a.body}\n${a.due_date ? `\n⏳ *Due Date:* ${new Date(a.due_date).toLocaleDateString()}` : ''}\n\n— Class Rep Announcement via CampusPulse`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <AppShell role="CLASS_REP">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Class Communication</span>
          <h1>Announcements.</h1>
          <p>Publish verified class updates, assignments and timetable/venue notices.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn-refresh" onClick={loadAnnouncements} disabled={loading}>
            <span>↻</span> {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            className="button primary"
            onClick={() => setShowComposer(!showComposer)}
          >
            {showComposer ? 'Close form' : '+ New announcement'}
          </button>
        </div>
      </div>

      {(notice || error) && (
        <div className={`notice ${notice ? 'success' : 'error'}`}>
          {notice || error}
        </div>
      )}

      {/* Composer Card */}
      {showComposer && (
        <section className="panel" style={{ marginBottom: '22px', border: '1px solid #93c5fd', background: '#f8fafc' }}>
          <div className="panel-head">
            <div>
              <span className="eyebrow">Composer</span>
              <h2>Publish update to class</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={handlePost}>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="GENERAL">General Notice</option>
                <option value="ASSIGNMENT">Assignment</option>
                <option value="VENUE_CHANGE">Venue / Time Change</option>
              </select>
            </label>

            {category === 'ASSIGNMENT' && (
              <label>
                Due date
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>
            )}

            <label className="full">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CSC 202 Assignment 1 or Class Postponed"
                required
              />
            </label>

            <label className="full">
              Message details
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Type your message here for your classmates..."
                required
              />
            </label>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button type="submit" className="button primary" disabled={isPosting}>
                {isPosting ? 'Publishing…' : 'Publish announcement'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowComposer(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Published</span>
            <h2>All Announcements ({announcements.length})</h2>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading announcement feed…</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <span>—</span>
            <h3>No announcements posted yet</h3>
            <p>Share important course info, venue changes or assignment deadlines with your class.</p>
            <button
              className="button primary"
              style={{ marginTop: '14px' }}
              onClick={() => setShowComposer(true)}
            >
              Write first announcement
            </button>
          </div>
        ) : (
          <div className="announcement-page-list">
            {announcements.map((a) => (
              <article className="panel announcement-detail" key={a.id} style={{ position: 'relative' }}>
                <div className="announcement-meta">
                  <span>
                    {a.category === 'ASSIGNMENT'
                      ? '📝 Assignment'
                      : a.category === 'VENUE_CHANGE'
                      ? '📍 Venue Change'
                      : '📢 General Update'}
                  </span>
                  <time>{new Date(a.created_at).toLocaleDateString()}</time>
                </div>
                <h2>{a.title}</h2>
                <p>{a.body}</p>

                {a.due_date && (
                  <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>
                    <span>⏳ Deadline: {new Date(a.due_date).toLocaleDateString()}</span>
                  </div>
                )}

                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="share-btn-whatsapp"
                    onClick={() => broadcastToWhatsApp(a)}
                  >
                    <span>Broadcast to WhatsApp Group</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default RepAnnouncements;
