import type { Profile, SocialLink } from '../types';
import SocialLinks from './SocialLinks';

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
        <SocialLinks links={social} className="footer-links" />
      </div>
    </footer>
  );
}
