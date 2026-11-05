import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { signOut } from '@/services/auth';
import { toAppError } from '@/lib/errors';
import { Badge } from './ui';

export function Shell({ children }: { children: ReactNode }) {
  const { role, profile, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (e) {
      toast(toAppError(e).message, 'error');
    }
  };

  const homePath = role === 'super_admin' ? '/admin' : role === 'rep' ? '/rep' : role === 'student' ? '/me' : '/';
  const isStaff = role === 'super_admin' || role === 'rep';

  return (
    <div className="shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="row">
            <Link to={homePath} className="brand">
              <span className="brand-mark" aria-hidden="true" />
              Roll Call
            </Link>
            {role === 'super_admin' && (
              <nav className="topbar-nav" aria-label="Admin navigation">
                <NavLink to="/admin" className={({ isActive }) => `topbar-link ${isActive ? 'is-active' : ''}`}>
                  Class Reps
                </NavLink>
                <NavLink to="/rep" className={({ isActive }) => `topbar-link ${isActive ? 'is-active' : ''}`}>
                  Classes
                </NavLink>
              </nav>
            )}
          </div>
          {isStaff && (
            <div className="topbar-user">
              {role === 'super_admin' && <Badge tone="ok">Super Admin</Badge>}
              <span className="topbar-email">{profile?.full_name || user?.email}</span>
              <button className="link-button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
