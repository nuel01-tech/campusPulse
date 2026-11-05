import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { AppError, toAppError } from '@/lib/errors';

export interface AsyncState<T> {
  data: T | undefined;
  error: AppError | null;
  loading: boolean;
  /** Re-runs the loader. `silent` keeps current data visible while loading. */
  reload: (opts?: { silent?: boolean }) => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T | undefined)) => void;
}

/** Loads data on mount / when deps change. Ignores results from stale runs. */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const runId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++runId.current;
    if (!silent) setLoading(true);
    try {
      const result = await loaderRef.current();
      if (id !== runId.current) return;
      setDataState(result);
      setError(null);
    } catch (e) {
      if (id !== runId.current) return;
      setError(toAppError(e));
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
    return () => {
      runId.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater: T | ((prev: T | undefined) => T | undefined)) => {
    setDataState((prev) =>
      typeof updater === 'function' ? (updater as (p: T | undefined) => T | undefined)(prev) : updater,
    );
  }, []);

  return { data, error, loading, reload: run, setData };
}

export interface ActionState<A extends unknown[], R> {
  run: (...args: A) => Promise<R | undefined>;
  pending: boolean;
  error: AppError | null;
  clearError: () => void;
}

/** Wraps a mutation: tracks pending state and captures errors instead of throwing. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>): ActionState<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args: A) => {
    setPending(true);
    setError(null);
    try {
      return await fnRef.current(...args);
    } catch (e) {
      if (mounted.current) setError(toAppError(e));
      return undefined;
    } finally {
      if (mounted.current) setPending(false);
    }
  }, []);

  return { run, pending, error, clearError: useCallback(() => setError(null), []) };
}

/** Calls `fn` every `ms` while the tab is visible, and once when it regains focus. */
export function usePolling(fn: () => void, ms: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const tick = () => document.visibilityState === 'visible' && fnRef.current();
    const timer = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms, enabled]);
}

/** Current time, updated every `ms`. Useful for countdowns. */
export function useNow(ms = 15_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
