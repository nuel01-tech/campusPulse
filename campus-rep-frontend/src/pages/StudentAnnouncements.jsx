import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';

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
          <span>↻</span> {loading ? 'Loading…' : 'Refresh'}
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
          📝 Assignments ({items.filter((i) => i.category === 'ASSIGNMENT').length})
        </button>
        <button
          className={`filter-tab ${category === 'VENUE_CHANGE' ? 'active' : ''}`}
          onClick={() => setCategory('VENUE_CHANGE')}
        >
          📍 Venue Changes ({items.filter((i) => i.category === 'VENUE_CHANGE').length})
        </button>
        <button
          className={`filter-tab ${category === 'GENERAL' ? 'active' : ''}`}
          onClick={() => setCategory('GENERAL')}
        >
          📢 General ({items.filter((i) => i.category === 'GENERAL').length})
        </button>
      </div>

      <div className="announcement-page-list">
        {loading ? (
          <section className="panel empty-state">
            <p>Loading announcements…</p>
          </section>
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
                  {a.category === 'ASSIGNMENT'
                    ? '📝 Assignment'
                    : a.category === 'VENUE_CHANGE'
                    ? '📍 Venue Change'
                    : '📢 Department Update'}
                </span>
                <time>{new Date(a.created_at).toLocaleDateString()}</time>
              </div>
              <h2>{a.title}</h2>
              <p>{a.body}</p>

              {a.due_date && (
                <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>
                  <span>⏳ Submission Deadline: {new Date(a.due_date).toLocaleDateString()}</span>
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