import { useEffect, useState } from 'react';
import type { SiteData } from '../types';

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
    fetch('/api/site-data', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load data (HTTP ${response.status})`);
        }
        return response.json() as Promise<SiteData>;
      })
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (active) setState({ data: null, loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
