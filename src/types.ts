export interface SocialLink {
  platform: string;
  icon: string;
  url: string;
}

export interface ProjectLink {
  label: string;
  icon: string;
  url: string;
}

/** An experience a project belongs to, shown in the card's experience ticker. */
export interface ProjectExperienceRef {
  id: string;
  title: string;
  company: string;
  period: string;
}

export interface Project {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  tech: string[];
  links: ProjectLink[];
  /** Experiences this project is part of; empty when it has none linked yet. */
  experiences: ProjectExperienceRef[];
  /** Short spoken summary the avatar reads aloud; built by the API. */
  narration: string;
}

export interface SkillCategory {
  title: string;
  skills: string[];
}

export interface About {
  bio: string[];
  skills: SkillCategory[];
}

export interface ExperienceItem {
  id: string;
  title: string;
  period: string;
  company: string;
  duties: string[];
  tech: string[];
}

export interface Profile {
  siteName: string;
  name: string;
  role: string;
  tagline: string;
  shortBio: string;
  image: string;
  email: string;
  phone: string;
  location: string;
  contactTitle: string;
  contactIntro: string;
  contactFormTitle: string;
  contactFormNamePlaceholder: string;
  contactFormEmailPlaceholder: string;
  contactFormMessagePlaceholder: string;
  contactFormSubmitText: string;
  contactFormSendingText: string;
  contactFormSuccessText: string;
  contactFormErrorText: string;
  contactFormMailtoSuccess: string;
}

export interface SiteData {
  profile: Profile;
  social: SocialLink[];
  about: About;
  experience: ExperienceItem[];
  projects: Project[];
  /** Projects for the Personal page; a separate list backed by its own tables. */
  personalProjects: Project[];
  formEndpoint: string;
}
