import type { Profile, SocialLink } from '../types';

interface FooterProps {
  profile: Profile;
  social: SocialLink[];
}

export default function Footer({ profile, social }: FooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <p>
          &copy; {year} {profile.name}. All rights reserved.
        </p>
        <div className="footer-links">
          {social
            .filter((link) => ['GitHub', 'LinkedIn', 'Twitter'].includes(link.platform))
            .map((link) => (
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
      </div>
    </footer>
  );
}
