import { useEffect, useState } from 'react';
import type { SiteData } from '../types';

const REFRESH_INTERVAL_MS = 5_000;

interface SiteDataState {
  data: SiteData | null;
  loading: boolean;
  error: string | null;
}

export function useSiteData(): SiteDataState {
  const [state, setState] = useState<SiteDataState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;

    const load = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;

      try {
        const response = await fetch('/api/site-data', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load data (HTTP ${response.status})`);
        }
        const data = (await response.json()) as SiteData;
        if (active && request === controller) setState({ data, loading: false, error: null });
      } catch (error) {
        if (
          !active ||
          request !== controller ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({ ...previous, loading: false, error: message }));
      } finally {
        if (active && request === controller) {
          request = undefined;
          timer = setTimeout(load, REFRESH_INTERVAL_MS);
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (timer) clearTimeout(timer);
      void load();
    };

    document.addEventListener('visibilitychange', refreshWhenVisible);
    void load();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      request?.abort();
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  return state;
}
