import type { Project } from '../types';
import FadeIn from './FadeIn';
import { requestNarration } from './Avatar/avatarBus';

interface ProjectsProps {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

/**
 * Scrolling ticker listing the experiences a project was delivered in. Shown
 * above the project name on the card. The text is duplicated so the marquee
 * loops seamlessly; the duplicate is hidden from assistive technology.
 */
function ProjectExperienceTicker({ project }: { project: Project }) {
  if (project.experiences.length === 0) return null;

  const tickerText = project.experiences
    .map((experience) => `${experience.title} @ ${experience.company} (${experience.period})`)
    .join('  •  ');

  return (
    <div className="project-experience-ticker">
      <div className="project-experience-ticker-track">
        <span className="project-experience-ticker-text">{tickerText}</span>
        <span className="project-experience-ticker-text" aria-hidden="true">
          {tickerText}
        </span>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <FadeIn className="project-card-wrapper">
      <article
        className="project-card"
        id={`project-${project.id}`}
        data-narration={project.narration}
      >
        <ProjectExperienceTicker project={project} />
        <div className="project-header">
          <i className={`${project.icon} project-icon`} aria-hidden="true" />
          <h3>{project.title}</h3>
        </div>
        <p className="project-description">{project.description}</p>
        <div className="project-details">
          <h4>Key Features:</h4>
          <ul>
            {project.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
        <div className="project-tech">
          <h5>Technologies:</h5>
          <div className="tech-tags">
            {project.tech.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        </div>
        <div className="project-links">
          <button
            type="button"
            className="project-link project-listen"
            onClick={() => requestNarration(project.narration)}
            aria-label={`Listen to a summary of ${project.title}`}
          >
            <i className="fa-solid fa-volume-high" aria-hidden="true" />
          </button>
          {project.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              className="project-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className={link.icon} aria-hidden="true" /> {link.label}
            </a>
          ))}
        </div>
      </article>
    </FadeIn>
  );
}

export default function Projects({ projects, loading, error }: ProjectsProps) {
  return (
    <section id="projects" className="projects">
      <div className="container">
        <h2 className="section-title">Featured Projects</h2>
        {loading && <p className="data-status">Loading projects&hellip;</p>}
        {!loading && error && (
          <p className="data-status error" role="alert">
            Could not load projects: {error}
          </p>
        )}
        {!loading && !error && projects.length === 0 && (
          <p className="data-status">No projects found in data.json.</p>
        )}
        {!loading && !error && projects.length > 0 && (
          <div className="projects-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
