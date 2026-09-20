import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const icons = {
  grid: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  ),

  calendar: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  ),

  megaphone: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 13 15 5V6L4 11v2Z" />
      <path d="M4 13v4a2 2 0 0 0 2 2h1" />
      <path d="M19 9a3 3 0 0 1 0 6" />
    </svg>
  ),

  clock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),

  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path
        d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1A2 2 0 0 1 3 15.1l.1-.1A2 2 0 0 0 1.7 11.6h-.2a2 2 0 0 1 0-4h.2A2 2 0 0 0 3.1 4.2L3 4.1A2 2 0 0 1 5.8 1.3l.1.1a2 2 0 0 0 3.4-1.4v-.2a2 2 0 0 1 4 0V0a2 2 0 0 0 3.4 1.4l.1-.1A2 2 0 0 1 19.6 4l-.1.1a2 2 0 0 0 1.4 3.4h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.5 3.5Z"
        transform="scale(.75) translate(4 4)"
      />
    </svg>
  ),

  user: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),

  logout: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />
    </svg>
  ),

  menu: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),

  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),

  file: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  ),

  bell: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  ),

  location: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),

  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

function Logo() {
  return (
    <div className="cp-brand">
      <span className="cp-brand-mark">CP</span>

      <span className="cp-brand-copy">
        <strong>CampusPulse</strong>
        <small>OOU Attendance</small>
      </span>
    </div>
  );
}

function AppShell({ role = "STUDENT", children }) {
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [profile, setProfile] = useState(null);

  const username = useMemo(() => {
    try {
      const token = localStorage.getItem("access");

      if (!token) return "Student";

      return JSON.parse(atob(token.split(".")[1])).username || "Student";
    } catch {
      return "Student";
    }
  }, []);

  const isRep = role === "CLASS_REP";
  const registrationProgress = profile
    ? Math.round(
        ((Boolean(profile.matric_number) +
          Boolean(profile.phone_number) +
          Boolean(profile.registration_completed)) /
          3) *
          100,
      )
    : 0;

  /*
   * Navigation is intentionally grouped.
   * The routes themselves remain unchanged.
   */
  const navigation = isRep
    ? {
        overview: [
          ["/rep", "Dashboard", "grid"],
          ["/rep/sessions", "Sessions", "calendar"],
          ["/rep/announcements", "Announcements", "megaphone"],
          ["/rep/activity", "Activity log", "clock"],
        ],
        community: [
          ["/rep/classmates", "Classmates", "users"],
          ["/documents", "Documents", "file"],
        ],
        account: [
          ["/notifications", "Notifications", "bell"],
          ["/profile", "Profile", "user"],
          ["/security", "Security", "settings"],
          ["/preferences", "Preferences", "settings"],
        ],
      }
    : {
        overview: [
          ["/student", "Dashboard", "grid"],
          ["/student/attendance", "Attendance", "calendar"],
          ["/student/announcements", "Announcements", "megaphone"],
          ["/student/history", "History", "clock"],
        ],
        community: [
          ["/student/classmates", "Classmates", "users"],
          ["/documents", "Documents", "file"],
        ],
        account: [
          ["/notifications", "Notifications", "bell"],
          ["/profile", "Profile", "user"],
          ["/security", "Security", "settings"],
          ["/preferences", "Preferences", "settings"],
        ],
      };

  const bottomLinks = isRep
    ? [
        ["/rep", "Home", "grid"],
        ["/rep/sessions", "Sessions", "calendar"],
        ["/rep/announcements", "Updates", "megaphone"],
        ["/rep/activity", "Audit", "clock"],
        ["/rep/classmates", "Classmates", "users"],
        ["/profile", "Profile", "user"],
      ]
    : [
        ["/student", "Home", "grid"],
        ["/student/attendance", "Check-in", "location"],
        ["/student/announcements", "Updates", "megaphone"],
        ["/student/classmates", "Classmates", "users"],
        ["/profile", "Profile", "user"],
      ];

  useEffect(() => {
    const loadProfile = () => {
      api
        .get("/accounts/profile/")
        .then((response) => setProfile(response.data))
        .catch(() => {});
    };

    loadProfile();
    window.addEventListener("campuspulse:profile-updated", loadProfile);

    return () => {
      window.removeEventListener("campuspulse:profile-updated", loadProfile);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = () => {
      api
        .get("/attendance/notifications/")
        .then((response) => {
          if (!mounted) return;

          const notifications = response.data || [];

          setUnread(
            notifications.filter((notification) => !notification.is_read)
              .length,
          );
        })
        .catch(() => {});
    };

    loadNotifications();

    const timer = setInterval(loadNotifications, 20000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/");
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const renderNavGroup = (title, links) => (
    <div className="cp-nav-group" key={title}>
      <span className="cp-nav-label">{title}</span>

      <div className="cp-nav-links">
        {links.map(([to, label, icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/student" || to === "/rep"}
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `cp-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="cp-nav-icon">{icons[icon]}</span>

            <span className="cp-nav-text">{label}</span>

            {label === "Notifications" && unread > 0 && (
              <span className="cp-nav-count">{unread > 9 ? "9+" : unread}</span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );

  const avatarContent = profile?.profile_picture ? (
    <img src={profile.profile_picture} alt="" className="cp-avatar-image" />
  ) : (
    <span>{username.slice(0, 1).toUpperCase()}</span>
  );

  return (
    <div className="cp-app-shell">
      {mobileOpen && (
        <button
          className="cp-mobile-overlay"
          onClick={closeMobileMenu}
          aria-label="Close navigation"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`cp-sidebar ${mobileOpen ? "cp-sidebar-open" : ""}`}>
        <div className="cp-sidebar-header">
          <Logo />

          <button
            type="button"
            className="cp-mobile-close"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            {icons.close}
          </button>
        </div>

        <div className="cp-workspace">
          <span className="cp-workspace-dot" />

          <div>
            <span className="cp-workspace-label">Workspace</span>

            <strong>{isRep ? "Class Representative" : "Student Portal"}</strong>
          </div>
        </div>

        <nav className="cp-sidebar-nav" aria-label="Main navigation">
          {renderNavGroup("Overview", navigation.overview)}
          {renderNavGroup("Community", navigation.community)}
          {renderNavGroup("Account", navigation.account)}
        </nav>

        <div className="cp-sidebar-footer">
          <button
            type="button"
            className="cp-user-card"
            onClick={() => {
              navigate("/profile");
              closeMobileMenu();
            }}
          >
            <span className="cp-avatar">{avatarContent}</span>

            <span className="cp-user-info">
              <strong>{username}</strong>
              <small>{isRep ? "Class Representative" : "Student"}</small>
            </span>

            <span className="cp-user-arrow">›</span>
          </button>

          <button type="button" className="cp-logout" onClick={logout}>
            <span className="cp-nav-icon">{icons.logout}</span>

            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="cp-main">
        <header className="cp-topbar">
          <div className="cp-topbar-left">
            <button
              type="button"
              className="cp-mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              {icons.menu}
            </button>

            <div className="cp-location-context">
              <span className="cp-location-icon">{icons.location}</span>

              <div>
                <span>Olabisi Onabanjo University</span>

                <strong>
                  {isRep ? "Representative workspace" : "Student workspace"}
                </strong>
              </div>
            </div>
          </div>

          <div className="cp-topbar-actions">
            <button
              type="button"
              className={`cp-notification-button ${
                unread > 0 ? "has-unread" : ""
              }`}
              aria-label="Notifications"
              onClick={() => navigate("/notifications")}
            >
              {icons.bell}

              {unread > 0 && (
                <span className="cp-notification-dot">
                  <span />
                </span>
              )}
            </button>

            <button
              type="button"
              className="cp-topbar-profile"
              onClick={() => navigate("/profile")}
            >
              <span className="cp-avatar cp-avatar-small">{avatarContent}</span>

              <span className="cp-topbar-user">
                <strong>{username}</strong>
                <small>{isRep ? "Class Rep" : "Student"}</small>
              </span>

              <span className="cp-profile-chevron">↓</span>
            </button>
          </div>
        </header>

        {profile?.role === "STUDENT" && !profile.registration_completed && (
          <div className="cp-registration-alert" role="status">
            <div className="cp-registration-alert-copy">
              <span className="cp-registration-alert-icon">!</span>

              <div>
                <strong>Complete your account setup</strong>
                <span>
                  Add your matric number, WhatsApp number, and class code to
                  unlock attendance check-in.
                </span>
              </div>
            </div>

            <div className="cp-registration-progress">
              <div className="cp-registration-progress-label">
                <span>Account setup</span>
                <strong>{registrationProgress}%</strong>
              </div>

              <div className="cp-registration-progress-track">
                <span style={{ width: `${registrationProgress}%` }} />
              </div>
            </div>

            <button
              type="button"
              className="cp-registration-alert-action"
              onClick={() => navigate("/profile")}
            >
              Complete now
            </button>
          </div>
        )}

        <div className="cp-page-content">{children}</div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="cp-mobile-bottom-nav" aria-label="Mobile navigation">
        {bottomLinks.map(([to, label, icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/student" || to === "/rep"}
            className={({ isActive }) =>
              `cp-bottom-item ${isActive ? "active" : ""}`
            }
          >
            <span className="cp-bottom-icon">
              {icons[icon]}

              {label === "Updates" && unread > 0 && (
                <span className="cp-bottom-badge">
                  {unread > 9 ? "9+" : unread}
                </span>
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
