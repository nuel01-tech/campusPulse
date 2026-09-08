import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { jwtDecode } from 'jwt-decode';

let currentRole = 'STUDENT';
try {
  const t = localStorage.getItem('access');
  if (t) currentRole = jwtDecode(t).role || 'STUDENT';
} catch {}

function Avatar({ person, size = 56 }) {
  const initials = [person.first_name, person.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || person.username?.[0]?.toUpperCase() || '?';

  const colors = [
    ['#eff6ff', '#2563eb'],
    ['#f0fdf4', '#16a34a'],
    ['#fef3c7', '#d97706'],
    ['#fdf2f8', '#9333ea'],
    ['#fff1f2', '#e11d48'],
    ['#f0fdfa', '#0d9488'],
  ];
  const [bg, fg] = colors[(person.username?.charCodeAt(0) || 0) % colors.length];

  if (person.profile_picture) {
    return (
      <img
        src={person.profile_picture}
        alt={`${person.first_name || person.username}'s profile`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          border: '2px solid rgba(255,255,255,0.7)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.36,
        border: '2px solid rgba(255,255,255,0.7)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function ClassmateCard({ person }) {
  const isRep = person.role === 'CLASS_REP';
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username;

  return (
    <div
      className="classmate-card"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        padding: '20px 16px 16px',
        background: '#ffffff',
        borderRadius: '16px',
        border: isRep ? '1.5px solid #bfdbfe' : '1px solid #f1f5f9',
        boxShadow: isRep
          ? '0 4px 20px rgba(37,99,235,0.10)'
          : '0 2px 12px rgba(0,0,0,0.05)',
        textAlign: 'center',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = isRep
          ? '0 8px 28px rgba(37,99,235,0.16)'
          : '0 6px 22px rgba(0,0,0,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isRep
          ? '0 4px 20px rgba(37,99,235,0.10)'
          : '0 2px 12px rgba(0,0,0,0.05)';
      }}
    >
      {isRep && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#2563eb',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '20px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Rep
        </div>
      )}

      <Avatar person={person} size={60} />

      <div style={{ width: '100%' }}>
        <strong
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={fullName}
        >
          {fullName}
        </strong>
        <span
          style={{
            fontSize: '11px',
            color: '#64748b',
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={`@${person.username}`}
        >
          @{person.username}
        </span>
      </div>

      <div
        style={{
          fontSize: '10px',
          color: isRep ? '#2563eb' : '#94a3b8',
          fontWeight: 600,
          background: isRep ? '#eff6ff' : '#f8fafc',
          padding: '3px 9px',
          borderRadius: '20px',
          border: isRep ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
        }}
      >
        {person.level_label || `${person.level} Level`}
      </div>
    </div>
  );
}

function Classmates() {
  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadClassmates = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/accounts/classmates/');
      setClassmates(r.data || []);
    } catch {
      setError('Unable to load your classmates. Make sure your profile level is set.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassmates();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return classmates;
    const q = search.toLowerCase();
    return classmates.filter(
      (p) =>
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q)
    );
  }, [classmates, search]);

  const reps = filtered.filter((p) => p.role === 'CLASS_REP');
  const students = filtered.filter((p) => p.role !== 'CLASS_REP');

  return (
    <AppShell role={currentRole}>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Your class</span>
          <h1>Classmates.</h1>
          <p>
            Everyone in your department and level on CampusPulse —{' '}
            <strong>{classmates.length}</strong> student{classmates.length !== 1 ? 's' : ''} registered.
          </p>
        </div>
        <button className="btn-refresh" onClick={loadClassmates} disabled={loading}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ verticalAlign: 'middle', marginRight: '4px' }}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      {/* Search */}
      <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
        <div style={{ position: 'relative' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              background: '#ffffff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.25, marginBottom: '8px' }}
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3>{search ? 'No classmates match your search.' : 'No classmates found.'}</h3>
          <p>
            {search
              ? 'Try a different name or username.'
              : 'Your classmates will appear here once they create their accounts using your class code.'}
          </p>
        </div>
      ) : (
        <>
          {/* Class Reps section */}
          {reps.length > 0 && (
            <section className="panel" style={{ marginBottom: '24px' }}>
              <div className="panel-head" style={{ marginBottom: '16px' }}>
                <div>
                  <span className="eyebrow">Leadership</span>
                  <h2>Class Representative{reps.length > 1 ? 's' : ''}</h2>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: '#eff6ff',
                    color: '#2563eb',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  {reps.length}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '14px',
                }}
              >
                {reps.map((p) => (
                  <ClassmateCard key={p.id} person={p} />
                ))}
              </div>
            </section>
          )}

          {/* All students section */}
          {students.length > 0 && (
            <section className="panel">
              <div className="panel-head" style={{ marginBottom: '16px' }}>
                <div>
                  <span className="eyebrow">Your class</span>
                  <h2>All classmates</h2>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {students.length}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '14px',
                }}
              >
                {students.map((p) => (
                  <ClassmateCard key={p.id} person={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}

export default Classmates;
