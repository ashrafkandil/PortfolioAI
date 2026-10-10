import { useCallback, useEffect, useState } from 'react';

/**
 * The nav bar no longer scrolls a long page between sections: each entry is a
 * view that is loaded into the area under the bar. The list is the single
 * source of truth for both the nav links and the URL hash.
 */
export const VIEWS = ['home', 'about', 'experience', 'projects', 'contact'] as const;

export type ViewId = (typeof VIEWS)[number];

export const DEFAULT_VIEW: ViewId = 'home';

/**
 * Read the view out of `location.hash`.
 *
 * Hashes are written as `#/about`, not `#about`: an element with id "about"
 * exists in the page, and if the fragment matched it the browser would run its
 * own scroll-to-anchor inside the view region after React mounts, leaving the
 * area scrolled a few pixels off the top. The slash keeps the fragment ours
 * alone. Both spellings are accepted so old links keep working.
 *
 * Returns `null` for anything that is not a known view so unrelated fragments —
 * notably `#main`, the skip-link target — leave the current view alone instead
 * of bouncing the visitor back to Home.
 */
function viewFromHash(): ViewId | null {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (VIEWS as readonly string[]).includes(raw) ? (raw as ViewId) : null;
}

/**
 * Hash-driven view state.
 *
 * `navigate` writes the hash rather than calling `setView` directly, so the
 * browser back/forward buttons walk through the views the visitor has opened
 * and a link to `/index.html#/projects` still lands on Projects.
 */
export function useActiveView(): { view: ViewId; navigate: (view: ViewId) => void } {
  const [view, setView] = useState<ViewId>(() => viewFromHash() ?? DEFAULT_VIEW);

  useEffect(() => {
    const sync = () => {
      const next = viewFromHash();
      if (next) setView(next);
    };

    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = useCallback((next: ViewId) => {
    if (viewFromHash() === next) {
      // Same hash (e.g. clicking "Home" while already on Home): no event will
      // fire, so sync the state ourselves.
      setView(next);
      return;
    }
    window.location.hash = `/${next}`;
  }, []);

  return { view, navigate };
}
