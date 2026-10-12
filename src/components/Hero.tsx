import type { About, ExperienceItem, Profile, SocialLink } from '../types';
import type { ViewId } from '../hooks/useActiveView';
import SocialLinks from './SocialLinks';

interface HeroProps {
  profile: Profile;
  social: SocialLink[];
  about: About;
  experience: ExperienceItem[];
  /** Loads another view into the area under the navbar. */
  onNavigate: (view: ViewId) => void;
}

interface Fact {
  label: string;
  value: string;
  icon: string;
  href?: string;
}

/** How many skills to surface per category, and in total, on the "Core stack" line. */
const SKILLS_PER_CATEGORY = 2;
const MAX_SKILLS = 6;

function coreStack(about: About): string {
  const picked: string[] = [];
  for (const category of about.skills) {
    for (const skill of category.skills.slice(0, SKILLS_PER_CATEGORY)) {
      if (!picked.includes(skill)) picked.push(skill);
    }
    if (picked.length >= MAX_SKILLS) break;
  }
  return picked.slice(0, MAX_SKILLS).join(' · ');
}

/**
 * Resume-style bullets for the hero sidebar. Every value is derived from the
 * same site data the rest of the page renders, so there is no second copy of
 * the truth that could drift out of sync.
 */
function buildFacts(profile: Profile, about: About, experience: ExperienceItem[]): Fact[] {
  const facts: Fact[] = [{ label: 'Role', value: profile.role, icon: 'fa-solid fa-briefcase' }];

  const current = experience[0];
  if (current) {
    // Company strings read "Acme Inc. | City, ST"; the sidebar lists the
    // location on its own line, so keep just the employer name here.
    const company = current.company.split('|')[0].trim();
    facts.push({
      label: 'Current',
      value: `${current.title} · ${company} (${current.period})`,
      icon: 'fa-solid fa-building',
    });
  }

  if (profile.location) {
    facts.push({ label: 'Location', value: profile.location, icon: 'fa-solid fa-location-dot' });
  }

  if (profile.email) {
    facts.push({
      label: 'Email',
      value: profile.email,
      icon: 'fa-solid fa-envelope',
      href: `mailto:${profile.email}`,
    });
  }

  const stack = coreStack(about);
  if (stack) {
    facts.push({ label: 'Core stack', value: stack, icon: 'fa-solid fa-code' });
  }

  return facts;
}

export default function Hero({ profile, social, about, experience, onNavigate }: HeroProps) {
  const facts = buildFacts(profile, about, experience);

  return (
    <section id="home" className="hero">
      {/* The dock is a direct child of the section (not of .container) so it can
          sit flush against the left edge of the viewport at full screen height. */}
      <aside className="hero-banner">
        <img className="hero-image" src={profile.image} alt={`Photo of ${profile.name}`} />
        <div className="hero-resume">
          <p className="hero-bio">{profile.shortBio}</p>
          <h2 className="hero-resume-title">At a glance</h2>
          <ul className="hero-resume-list">
            {facts.map((fact) => (
              <li key={fact.label}>
                <i className={fact.icon} aria-hidden="true" />
                <span>
                  <strong>{fact.label}:</strong>{' '}
                  {fact.href ? (
                    <a href={fact.href} className="hero-resume-link">
                      {fact.value}
                    </a>
                  ) : (
                    fact.value
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="hero-body">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Hi, I'm <span className="highlight">{profile.name}</span>
            </h1>
            <p className="hero-subtitle">{profile.role}</p>
            <p className="hero-description">{profile.tagline}</p>
            <div className="hero-buttons">
              <a
                href="#/projects"
                className="btn btn-primary"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate('projects');
                }}
              >
                View My Work
              </a>
              <a
                href="#/contact"
                className="btn btn-secondary"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate('contact');
                }}
              >
                Get In Touch
              </a>
            </div>
            <SocialLinks links={social} className="social-links" />
          </div>
        </div>
      </div>
    </section>
  );
}
