import { useState } from 'react';
import type { ViewId } from '../hooks/useActiveView';

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const;

interface NavbarProps {
  siteName: string;
  /** Same portrait the hero banner shows, rendered as a circle in the bar. */
  image?: string;
  /** The view currently loaded under the bar. */
  active: ViewId;
  /** Swap the loaded view — the bar never scrolls the page any more. */
  onNavigate: (view: ViewId) => void;
}

export default function Navbar({ siteName, image, active, onNavigate }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Swap the view and keep the URL shareable. `preventDefault` stops the
   * browser's own anchor jump, which would fight the view's scroll reset.
   */
  const open = (view: ViewId) => {
    setMenuOpen(false);
    onNavigate(view);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-wrapper">
          <a
            href="#/home"
            className="logo"
            onClick={(event) => {
              event.preventDefault();
              open('home');
            }}
          >
            {/* The circle is always rendered at its fixed size so the navbar
                height never jumps while the portrait loads. */}
            <span className="nav-avatar" aria-hidden="true">
              {image ? <img src={image} alt="" /> : null}
            </span>
            <span className="logo-text">{siteName}</span>
          </a>
          <button
            className={`menu-toggle${menuOpen ? ' active' : ''}`}
            aria-expanded={menuOpen}
            aria-controls="navMenu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <ul className={`nav-menu${menuOpen ? ' active' : ''}`} id="navMenu">
            {LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#/${link.id}`}
                  className={`nav-link${active === link.id ? ' active' : ''}`}
                  aria-current={active === link.id ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    open(link.id);
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
