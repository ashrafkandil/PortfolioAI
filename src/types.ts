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

export interface Project {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  tech: string[];
  links: ProjectLink[];
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
}

export interface SiteData {
  profile: Profile;
  social: SocialLink[];
  about: About;
  experience: ExperienceItem[];
  projects: Project[];
  formEndpoint: string;
}
