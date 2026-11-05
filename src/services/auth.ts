import type { Session as AuthSession, User } from '@supabase/supabase-js';
import { supabase } from './db';
import { AppError, appError, toAppError } from '@/lib/errors';
import type { Profile } from '@/types';

export type Role = 'super_admin' | 'rep' | 'student';

export async function getAuthSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  return data.session;
}

export function onAuthChange(cb: (session: AuthSession | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw toAppError(error);
  return (data as Profile | null) ?? null;
}

/** Returns true if a Super Admin account has already been set up. */
export async function hasSuperAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_super_admin');
  if (error) throw toAppError(error);
  return Boolean(data);
}

export async function signInStaff(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      throw new AppError('AUTH', 'Wrong email or password.');
    }
    throw toAppError(error);
  }
  const profile = data.user ? await getMyProfile(data.user.id) : null;
  if (!profile) {
    await supabase.auth.signOut();
    throw new AppError('AUTH', 'No staff profile found for this account.');
  }
  if (!profile.active) {
    await supabase.auth.signOut();
    throw appError('ACCOUNT_SUSPENDED');
  }
  return profile;
}

/**
 * Bootstraps the very first Super Admin account.
 * Once a Super Admin exists in `public.profiles`, the database trigger blocks
 * any further self-signups (`SIGNUP_NOT_ALLOWED`).
 */
export async function bootstrapSuperAdmin(fullName: string, email: string, password: string): Promise<Profile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: { data: { full_name: cleanName } },
  });
  if (error) {
    if (/SIGNUP_NOT_ALLOWED/i.test(error.message)) {
      throw appError('SIGNUP_NOT_ALLOWED');
    }
    throw toAppError(error);
  }
  // If Supabase did not return an active session (e.g. "Confirm email" was toggled on in dashboard),
  // our trigger already set `email_confirmed_at = now()`, so we can sign in immediately.
  if (!data.session) {
    return signInStaff(cleanEmail, password);
  }
  const profile = data.user ? await getMyProfile(data.user.id) : null;
  if (!profile) throw appError('UNKNOWN');
  return profile;
}

/** Students get an anonymous account, created the first time they open a join link. */
export async function ensureStudentSession(): Promise<User> {
  const session = await getAuthSession();
  if (session?.user) return session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    if (error && /anonymous sign-ins are disabled/i.test(error.message)) {
      throw new AppError('CONFIG', 'Student sign-in is not enabled yet. Tell your class rep.');
    }
    throw toAppError(error);
  }
  return data.user;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}
