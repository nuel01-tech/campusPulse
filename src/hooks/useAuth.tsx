import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session as AuthSession, User } from '@supabase/supabase-js';
import { getAuthSession, getMyProfile, onAuthChange, signOut, type Role } from '@/services/auth';
import type { Profile } from '@/types';

interface AuthState {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
}

const AuthContext = createContext<AuthState>({ ready: false, user: null, profile: null, role: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncSession(s: AuthSession | null) {
      if (!active) return;
      setSession(s);
      const user = s?.user ?? null;
      if (!user || user.is_anonymous) {
        setProfile(null);
        setReady(true);
        return;
      }
      try {
        const p = await getMyProfile(user.id);
        if (!active) return;
        if (p && !p.active) {
          await signOut().catch(() => {});
          setSession(null);
          setProfile(null);
        } else {
          setProfile(p);
        }
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setReady(true);
      }
    }

    getAuthSession()
      .then((s) => syncSession(s))
      .catch(() => active && setReady(true));

    const unsubscribe = onAuthChange((s) => {
      void syncSession(s);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    const role: Role | null = !user ? null : user.is_anonymous ? 'student' : (profile?.role ?? null);
    return { ready, user, profile, role };
  }, [ready, session, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
