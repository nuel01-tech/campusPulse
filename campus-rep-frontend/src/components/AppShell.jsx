import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const icons = {
  grid: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>,
  calendar: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>,
  megaphone: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 13 15 5V6L4 11v2Z"/><path d="M4 13v4a2 2 0 0 0 2 2h1"/><path d="M19 9a3 3 0 0 1 0 6"/></svg>,
  clock: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>,
  settings: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1A2 2 0 0 1 3 15.1l.1-.1A2 2 0 0 0 1.7 11.6h-.2a2 2 0 0 1 0-4h.2A2 2 0 0 0 3.1 4.2L3 4.1A2 2 0 0 1 5.8 1.3l.1.1a2 2 0 0 0 3.4-1.4v-.2a2 2 0 0 1 4 0V0a2 2 0 0 0 3.4 1.4l.1-.1A2 2 0 0 1 19.6 4l-.1.1a2 2 0 0 0 1.4 3.4h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.5 3.5Z" transform="scale(.75) translate(4 4)"/></svg>,
  user: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>,
  logout: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/></svg>,
  menu: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  file: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>,
  bell: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>,
  location: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
};

function Logo() {
  return <div className="brand"><span className="brand-mark">CP</span><span>CampusPulse</span></div>;
}

function AppShell({ role = 'STUDENT', children }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const username = useMemo(() => {
    try {
      const token = localStorage.getItem('access');
      if (!token) return 'Student';
      return JSON.parse(atob(token.split('.')[1])).username || 'Student';
    } catch { return 'Student'; }
  }, []);

  const isRep = role === 'CLASS_REP';
  const links = isRep
    ? [
        ['/rep', 'Dashboard', 'grid'],
        ['/rep/sessions', 'Sessions', 'calendar'],
        ['/rep/announcements', 'Announcements', 'megaphone'],
        ['/rep/activity', 'Activity log', 'clock'],
        ['/notifications', 'Notifications', 'bell'],
        ['/documents', 'Documents', 'file'],
        ['/profile', 'Profile', 'user'],
        ['/security', 'Security', 'settings'],
        ['/preferences', 'Preferences', 'settings'],
      ]
    : [
        ['/student', 'Dashboard', 'grid'],
        ['/student/attendance', 'Attendance', 'calendar'],
        ['/student/announcements', 'Announcements', 'megaphone'],
        ['/student/history', 'History', 'clock'],
        ['/notifications', 'Notifications', 'bell'],
        ['/documents', 'Documents', 'file'],
        ['/profile', 'Profile', 'user'],
        ['/security', 'Security', 'settings'],
        ['/preferences', 'Preferences', 'settings'],
      ];

  const bottomLinks = isRep
    ? [
        ['/rep', 'Home', 'grid'],
        ['/rep/sessions', 'Sessions', 'calendar'],
        ['/rep/announcements', 'Updates', 'megaphone'],
        ['/rep/activity', 'Audit', 'clock'],
        ['/profile', 'Profile', 'user'],
      ]
    : [
        ['/student', 'Home', 'grid'],
        ['/student/attendance', 'Check-in', 'location'],
        ['/student/announcements', 'Updates', 'megaphone'],
        ['/student/history', 'History', 'clock'],
        ['/profile', 'Profile', 'user'],
      ];

  const [unread, setUnread] = useState(0);
  const [profile, setProfile] = useState(null);
  useEffect(() => { api.get('/accounts/profile/').then(r => setProfile(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    let mounted = true;
    const load = () => api.get('/attendance/notifications/').then(r => { if (mounted) setUnread((r.data || []).filter(n => !n.is_read).length); }).catch(() => {});
    load();
    const timer = setInterval(load, 20000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    navigate('/');
  };

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top"><Logo /><button className="mobile-close" onClick={() => setMobileOpen(false)}>×</button></div>
        <div className="workspace-label">{isRep ? 'Class representative' : 'Student portal'}</div>
        <nav className="side-nav">
          {links.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/student' || to === '/rep'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <span className="side-icon">{icons[icon]}</span><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-profile">{profile?.profile_picture ? <img className="avatar profile-avatar-image" src={profile.profile_picture} alt="" /> : <div className="avatar">{username.slice(0, 1).toUpperCase()}</div>}<div><strong>{username}</strong><span>{isRep ? 'Class Rep' : 'Student'}</span></div></div>
          <button className="logout-link" onClick={logout}><span className="side-icon">{icons.logout}</span>Sign out</button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu">{icons.menu}</button>
          <div className="topbar-title"><span>Olabisi Onabanjo University</span><strong>{isRep ? 'Representative workspace' : 'Student workspace'}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications" onClick={() => navigate('/notifications')}>{icons.bell}{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}</button>
            <button className="profile-button" onClick={() => navigate('/profile')}>{profile?.profile_picture ? <img className="avatar small profile-avatar-image" src={profile.profile_picture} alt="" /> : <span className="avatar small">{username.slice(0, 1).toUpperCase()}</span>}<span className="profile-name">{username}</span></button>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>

      {/* Persistent Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {bottomLinks.map(([to, label, icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/student' || to === '/rep'}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">
              {icons[icon]}
              {label === 'Updates' && unread > 0 && (
                <span className="bottom-nav-badge">{unread > 9 ? '9+' : unread}</span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export { icons };
export default AppShell;
