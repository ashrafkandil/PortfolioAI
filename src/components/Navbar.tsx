import { useState } from 'react';
import type { ViewId } from '../hooks/useActiveView';
import type { NavLink } from '../types';

interface NavbarProps {
  siteName: string;
  /** Same portrait the hero banner shows, rendered as a circle in the bar. */
  image?: string;
  /** The view currently loaded under the bar. */
  active: ViewId;
  /** Swap the loaded view — the bar never scrolls the page any more. */
  onNavigate: (view: ViewId) => void;
  /** Navigation links from site data */
  navLinks?: NavLink[];
}

const DEFAULT_LINKS: NavLink[] = [
  { key: 'home', label: 'Home' },
  { key: 'about', label: 'About' },
  { key: 'experience', label: 'Experience' },
  { key: 'projects', label: 'Projects' },
  { key: 'personal', label: 'Personal' },
  { key: 'contact', label: 'Contact' },
];

export default function Navbar({ siteName, image, active, onNavigate, navLinks }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Swap the view and keep the URL shareable. `preventDefault` stops the
   * browser's own anchor jump, which would fight the view's scroll reset.
   */
  const open = (view: ViewId) => {
    setMenuOpen(false);
    onNavigate(view);
  };

  const links = navLinks ?? DEFAULT_LINKS;

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
            {links.map((link) => (
              <li key={link.key}>
                <a
                  href={`#/${link.key}`}
                  className={`nav-link${active === link.key ? ' active' : ''}`}
                  aria-current={active === link.key ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    open(link.key);
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
