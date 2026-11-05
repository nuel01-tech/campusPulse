import { supabase } from '@/lib/supabase';
import { AppError, toAppError } from '@/lib/errors';

/**
 * Fetches every row of a query, paging past PostgREST's default 1000-row cap.
 * `build` must return a fresh query each call (queries are single-use).
 */
export async function fetchAll<T>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> },
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw toAppError(error);
    const page = data ?? [];
    out.push(...page);
    if (page.length < pageSize) return out;
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new AppError('NOT_AUTHENTICATED', 'Your session has expired. Please sign in again.');
  return id;
}

export { supabase };
