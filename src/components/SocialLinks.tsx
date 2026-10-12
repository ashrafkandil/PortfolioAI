import type { SocialLink } from '../types';

interface SocialLinksProps {
  /** Links to render. The API only returns active links, so an empty list shows nothing. */
  links: SocialLink[];
  /** Class for the wrapping element, so each placement keeps its own layout. */
  className: string;
}

/** Icon row shared by the home page, the bottom bar, and the contact page. */
export default function SocialLinks({ links, className }: SocialLinksProps) {
  if (links.length === 0) return null;

  return (
    <div className={className}>
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.platform}
        >
          <i className={link.icon} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
