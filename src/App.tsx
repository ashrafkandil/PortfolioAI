import { useCallback, useEffect, useRef } from 'react';
import { useSiteData } from './hooks/useSiteData';
import { useActiveView, type ViewId } from './hooks/useActiveView';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Experience from './components/Experience';
import Projects from './components/Projects';
import Personal from './components/Personal';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AvatarWidget from './components/Avatar/AvatarWidget';

/**
 * Sections that need site data cannot render before it arrives; say so instead
 * of painting an empty view.
 */
function StatusView({ message }: { message: string }) {
  return (
    <section className="view-status">
      <div className="container">
        <p className="data-status">{message}</p>
      </div>
    </section>
  );
}

export default function App() {
  const { data, loading, error } = useSiteData();
  const { view, navigate: go } = useActiveView();
  const viewRef = useRef<HTMLElement>(null);

  /** Each view starts at its own top, including re-clicking the open view. */
  const resetScroll = useCallback(() => {
    if (viewRef.current) viewRef.current.scrollTop = 0;
  }, []);

  useEffect(resetScroll, [view, resetScroll]);

  const navigate = useCallback(
    (next: ViewId) => {
      go(next);
      resetScroll();
    },
    [go, resetScroll]
  );

  const placeholder = error ? `Could not load site data: ${error}` : 'Loading site data…';

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar
        siteName={data?.profile.siteName ?? 'Portfolio'}
        image={data?.profile.image}
        active={view}
        onNavigate={navigate}
      />
      {/* The only scrollable region: everything below the navbar lives here. */}
      <main id="main" className="view" ref={viewRef} tabIndex={-1}>
        {view === 'home' &&
          (data ? (
            <Hero
              profile={data.profile}
              social={data.social}
              about={data.about}
              experience={data.experience}
              onNavigate={navigate}
            />
          ) : (
            <StatusView message={placeholder} />
          ))}
        {view === 'about' && (data ? <About about={data.about} /> : <StatusView message={placeholder} />)}
        {view === 'experience' && (
          <Experience experience={data?.experience ?? []} loading={loading} error={error} />
        )}
        {view === 'projects' && (
          <Projects projects={data?.projects ?? []} loading={loading} error={error} />
        )}
        {view === 'personal' && (
          <Personal projects={data?.personalProjects ?? []} loading={loading} error={error} />
        )}
        {view === 'contact' &&
          (data ? (
            <Contact profile={data.profile} social={data.social} formEndpoint={data.formEndpoint} />
          ) : (
            <StatusView message={placeholder} />
          ))}
        {data && <Footer profile={data.profile} social={data.social} />}
      </main>
      {data && <AvatarWidget profile={data.profile} view={view} onNavigate={navigate} />}
    </div>
  );
}
