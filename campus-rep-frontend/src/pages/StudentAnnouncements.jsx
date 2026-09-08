import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';
import LoadingSkeleton from '../components/LoadingSkeleton';

function StudentAnnouncements() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const r = await api.get('/attendance/announcements/');
      setItems(r.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((a) => {
      const matchCat = category === 'ALL' || a.category === category;
      const matchSearch =
        !search ||
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.body?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [items, category, search]);

  const shareToWhatsApp = (a) => {
    const text = `📢 *${a.title}*\n\n${a.body}\n${a.due_date ? `\n⏳ *Due Date:* ${new Date(a.due_date).toLocaleDateString()}` : ''}\n\n— Shared via CampusPulse`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <AppShell role="STUDENT">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Department updates</span>
          <h1>Announcements.</h1>
          <p>Important updates, assignments and venue changes from your class representative.</p>
        </div>
        <button className="btn-refresh" onClick={loadAnnouncements} disabled={loading}>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
            <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search announcements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '360px',
            padding: '9px 14px',
            borderRadius: '10px',
            border: '1px solid #dfe4eb',
            fontSize: '13px',
            background: '#ffffff',
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${category === 'ALL' ? 'active' : ''}`}
          onClick={() => setCategory('ALL')}
        >
          All Updates ({items.length})
        </button>
        <button
          className={`filter-tab ${category === 'ASSIGNMENT' ? 'active' : ''}`}
          onClick={() => setCategory('ASSIGNMENT')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          Assignments ({items.filter((i) => i.category === 'ASSIGNMENT').length})
        </button>
        <button
          className={`filter-tab ${category === 'VENUE_CHANGE' ? 'active' : ''}`}
          onClick={() => setCategory('VENUE_CHANGE')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
          Venue Changes ({items.filter((i) => i.category === 'VENUE_CHANGE').length})
        </button>
        <button
          className={`filter-tab ${category === 'GENERAL' ? 'active' : ''}`}
          onClick={() => setCategory('GENERAL')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.41 2 2 0 0 1 3.55 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 5.6 5.59l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
          General ({items.filter((i) => i.category === 'GENERAL').length})
        </button>
      </div>

      <div className="announcement-page-list">
        {loading ? (
          <section className="panel"><LoadingSkeleton rows={4} /></section>
        ) : filteredItems.length === 0 ? (
          <section className="panel empty-state">
            <span>—</span>
            <h3>No announcements found</h3>
            <p>
              {search
                ? 'No announcements match your search.'
                : 'Your class rep has not posted any updates in this category.'}
            </p>
          </section>
        ) : (
          filteredItems.map((a) => (
            <article className="panel announcement-detail" key={a.id} style={{ position: 'relative' }}>
              <div className="announcement-meta">
                <span>
                  {a.category === 'ASSIGNMENT' ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '3px' }}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>Assignment</>
                  ) : a.category === 'VENUE_CHANGE' ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '3px' }}><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>Venue Change</>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '3px' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.41 2 2 0 0 1 3.55 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 5.6 5.59l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>Department Update</>
                  )}
                </span>
                <time>{new Date(a.created_at).toLocaleDateString()}</time>
              </div>
              <h2>{a.title}</h2>
              <p>{a.body}</p>

              {a.due_date && (
                <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  <span>Submission Deadline: {new Date(a.due_date).toLocaleDateString()}</span>
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="share-btn-whatsapp"
                  onClick={() => shareToWhatsApp(a)}
                >
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </AppShell>
  );
}

export default StudentAnnouncements;
