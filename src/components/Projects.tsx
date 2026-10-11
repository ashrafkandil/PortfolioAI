import type { Project } from '../types';
import FadeIn from './FadeIn';
import { requestNarration } from './Avatar/avatarBus';

interface ProjectsProps {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <FadeIn className="project-card-wrapper">
      <article className="project-card" data-narration={project.narration}>
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
            <i className="fa-solid fa-volume-high" aria-hidden="true" /> Listen
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
