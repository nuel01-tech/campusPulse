import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { jwtDecode } from 'jwt-decode';

function getRole() {
  try {
    const t = localStorage.getItem('access');
    if (t) return jwtDecode(t).role || 'STUDENT';
  } catch {}
  return 'STUDENT';
}

function Avatar({ person, size = 64 }) {
  const initials =
    [person.first_name, person.last_name]
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
    ['#f5f3ff', '#7c3aed'],
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
          border: '3px solid #ffffff',
          boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
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
        border: '3px solid #ffffff',
        boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function StudentCard({ person }) {
  const isRep = person.role === 'CLASS_REP';
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username;

  return (
    <div className="classmate-card modern-card student-view">
      {isRep && (
        <span className="role-tag rep-tag">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Class Rep
        </span>
      )}

      <div className="card-avatar-wrap">
        <Avatar person={person} size={64} />
      </div>

      <div className="card-info">
        <h3 className="person-name" title={fullName}>{fullName}</h3>
        <span className="person-username">@{person.username}</span>
      </div>

      <div className="level-chip">
        {person.level_label || `${person.level} Level`}
      </div>
    </div>
  );
}

function RepCard({ person, onToggleSuspend, onDeleteAccount }) {
  const isRep = person.role === 'CLASS_REP';
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username;
  const rawPhone = (person.phone_number || '').replace(/\D/g, '');
  const whatsappNumber = rawPhone.startsWith('00')
    ? rawPhone.slice(2)
    : rawPhone.startsWith('0')
    ? `234${rawPhone.slice(1)}`
    : rawPhone;
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';
  const isSuspended = person.is_active === false;

  return (
    <div className={`classmate-card modern-card rep-view ${isSuspended ? 'is-suspended' : ''}`}>
      <div className="card-top-badges">
        {isRep ? (
          <span className="role-tag rep-tag">Class Rep</span>
        ) : (
          <span className={`status-pill ${isSuspended ? 'suspended' : 'active'}`}>
            <span className="status-dot-pulse" />
            {isSuspended ? 'Suspended' : 'Active'}
          </span>
        )}
      </div>

      <div className="card-avatar-wrap">
        <Avatar person={person} size={60} />
      </div>

      <div className="card-info">
        <h3 className="person-name" title={fullName}>{fullName}</h3>
        <span className="person-username">@{person.username}</span>
      </div>

      <div className="details-box">
        <div className="detail-item">
          <span className="detail-label">Matric</span>
          <span className="detail-value">{person.matric_number || 'Not added'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Email</span>
          <span className="detail-value text-truncate" title={person.email || ''}>{person.email || 'Not added'}</span>
        </div>
      </div>

      <div className="level-chip">
        {person.level_label || `${person.level} Level`}
      </div>

      <div className="card-actions-grid">
        {whatsappUrl ? (
          <a
            className="btn-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            title="Open WhatsApp chat with student"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            WhatsApp DM
          </a>
        ) : (
          <div className="btn-whatsapp disabled" title="No valid phone number found">
            <span>No Phone</span>
          </div>
        )}

        {!isRep && (
          <div className="admin-actions-row">
            <button
              type="button"
              className={`btn-action-sm ${isSuspended ? 'btn-activate' : 'btn-suspend'}`}
              onClick={() => onToggleSuspend(person)}
              title={isSuspended ? 'Reactivate student account' : 'Suspend student account'}
            >
              {isSuspended ? 'Reactivate' : 'Suspend'}
            </button>
            <button
              type="button"
              className="btn-action-sm btn-delete"
              onClick={() => onDeleteAccount(person)}
              title="Delete duplicate or mistakenly created account"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Classmates() {
  const currentRole = getRole();
  const isRepRole = currentRole === 'CLASS_REP';

  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [search, setSearch] = useState('');

  // Modals state
  const [suspendModal, setSuspendModal] = useState({ open: false, person: null, processing: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, person: null, processing: false });

  const loadClassmates = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/accounts/classmates/');
      setClassmates(r.data || []);
    } catch {
      setError('Unable to load your classmates. Make sure your profile level and department are configured.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassmates();
  }, []);

  const handleToggleSuspendConfirm = async () => {
    if (!suspendModal.person) return;
    setSuspendModal((prev) => ({ ...prev, processing: true }));
    setError('');
    try {
      const r = await api.patch(`/accounts/classmates/${suspendModal.person.id}/toggle-suspend/`);
      setSuccessNotice(r.data.detail || 'Student account status updated.');
      setClassmates((prev) =>
        prev.map((c) => (c.id === suspendModal.person.id ? { ...c, is_active: r.data.is_active } : c))
      );
      setSuspendModal({ open: false, person: null, processing: false });
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update student status.');
      setSuspendModal((prev) => ({ ...prev, processing: false }));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.person) return;
    setDeleteModal((prev) => ({ ...prev, processing: true }));
    setError('');
    try {
      const r = await api.delete(`/accounts/classmates/${deleteModal.person.id}/delete-account/`);
      setSuccessNotice(r.data.detail || 'Mistaken account deleted successfully.');
      setClassmates((prev) => prev.filter((c) => c.id !== deleteModal.person.id));
      setDeleteModal({ open: false, person: null, processing: false });
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete student account.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return classmates;
    const q = search.toLowerCase();
    return classmates.filter(
      (p) =>
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.matric_number?.toLowerCase().includes(q)
    );
  }, [classmates, search]);

  const reps = filtered.filter((p) => p.role === 'CLASS_REP');
  const students = filtered.filter((p) => p.role !== 'CLASS_REP');

  return (
    <AppShell role={currentRole}>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Your class directory
          </span>
          <h1>Classmates.</h1>
          <p>
            {isRepRole
              ? 'Manage registered students, direct-message via WhatsApp, and moderate class membership.'
              : 'Connect with everyone in your department and level on CampusPulse.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {successNotice && <div className="notice success">{successNotice}</div>}
      {error && <div className="notice error">{error}</div>}

      {/* Directory search & stats bar */}
      <div className="directory-toolbar">
        <div className="search-box-wrap">
          <svg
            className="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={isRepRole ? "Search name, matric, email or username…" : "Search classmates by name or username…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>

        <div className="directory-count-badge">
          <strong>{classmates.length}</strong> {classmates.length === 1 ? 'Classmate' : 'Classmates'}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <div className="empty-state modern-empty">
          <div className="empty-icon-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3>{search ? 'No classmates match your search.' : 'No classmates found.'}</h3>
          <p>
            {search
              ? 'Try searching by a different name, keyword or matric number.'
              : 'Your coursemates will appear here once they sign up with your class code.'}
          </p>
        </div>
      ) : (
        <>
          {/* Class Reps section */}
          {reps.length > 0 && (
            <section className="panel section-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">Leadership</span>
                  <h2>Class Representative{reps.length > 1 ? 's' : ''}</h2>
                </div>
                <span className="counter-pill">{reps.length}</span>
              </div>
              <div className="classmates-grid">
                {reps.map((p) =>
                  isRepRole ? (
                    <RepCard
                      key={p.id}
                      person={p}
                      onToggleSuspend={(target) => setSuspendModal({ open: true, person: target, processing: false })}
                      onDeleteAccount={(target) => setDeleteModal({ open: true, person: target, processing: false })}
                    />
                  ) : (
                    <StudentCard key={p.id} person={p} />
                  )
                )}
              </div>
            </section>
          )}

          {/* All students section */}
          {students.length > 0 && (
            <section className="panel section-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">Students</span>
                  <h2>All Classmates</h2>
                </div>
                <span className="counter-pill neutral">{students.length}</span>
              </div>
              <div className="classmates-grid">
                {students.map((p) =>
                  isRepRole ? (
                    <RepCard
                      key={p.id}
                      person={p}
                      onToggleSuspend={(target) => setSuspendModal({ open: true, person: target, processing: false })}
                      onDeleteAccount={(target) => setDeleteModal({ open: true, person: target, processing: false })}
                    />
                  ) : (
                    <StudentCard key={p.id} person={p} />
                  )
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendModal.open && suspendModal.person && (
        <div className="modal-backdrop" onClick={() => !suspendModal.processing && setSuspendModal({ open: false, person: null, processing: false })}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className={`modal-icon-badge ${suspendModal.person.is_active === false ? 'reactivate' : 'warning'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3>{suspendModal.person.is_active === false ? 'Reactivate Account' : 'Suspend Student Account'}</h3>
                <p>
                  {suspendModal.person.first_name} {suspendModal.person.last_name} (@{suspendModal.person.username})
                </p>
              </div>
            </div>

            <p className="modal-body-text">
              {suspendModal.person.is_active === false
                ? 'Reactivating this account will restore student access to lecture check-in, announcements and course materials.'
                : 'Suspending this student will temporarily block their access to session attendance and class portal activities until reactivated.'}
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={suspendModal.processing}
                onClick={() => setSuspendModal({ open: false, person: null, processing: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`button ${suspendModal.person.is_active === false ? 'primary' : 'danger'}`}
                disabled={suspendModal.processing}
                onClick={handleToggleSuspendConfirm}
              >
                {suspendModal.processing ? 'Updating…' : suspendModal.person.is_active === false ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Mistaken Account Modal */}
      {deleteModal.open && deleteModal.person && (
        <div className="modal-backdrop" onClick={() => !deleteModal.processing && setDeleteModal({ open: false, person: null, processing: false })}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-badge danger">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div>
                <h3>Delete Mistaken Account</h3>
                <p>
                  {deleteModal.person.first_name} {deleteModal.person.last_name} (@{deleteModal.person.username})
                </p>
              </div>
            </div>

            <div className="modal-warning-box">
              <strong>Caution: Permanent Action</strong>
              <p>
                Use this strictly to remove duplicate or mistakenly registered accounts. All attendance and profile data for this account will be permanently deleted.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={deleteModal.processing}
                onClick={() => setDeleteModal({ open: false, person: null, processing: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button danger"
                disabled={deleteModal.processing}
                onClick={handleDeleteConfirm}
              >
                {deleteModal.processing ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default Classmates;
