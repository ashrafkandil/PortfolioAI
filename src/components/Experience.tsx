import type { ExperienceItem } from '../types';
import FadeIn from './FadeIn';

interface ExperienceProps {
  experience: ExperienceItem[];
  loading: boolean;
  error: string | null;
}

export default function Experience({ experience, loading, error }: ExperienceProps) {
  return (
    <section id="experience" className="experience">
      <div className="container">
        <h2 className="section-title">Work Experience</h2>
        {loading && <p className="data-status">Loading experience&hellip;</p>}
        {!loading && error && (
          <p className="data-status error" role="alert">
            Could not load experience: {error}
          </p>
        )}
        {!loading && !error && experience.length === 0 && (
          <p className="data-status">No experience found in data.json.</p>
        )}
        {!loading && !error && experience.length > 0 && (
          <div className="timeline">
            {experience.map((item) => (
              <FadeIn key={item.id}>
                <div className="timeline-item">
                  <div className="timeline-dot" aria-hidden="true" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <h3>{item.title}</h3>
                      <span className="timeline-date">{item.period}</span>
                    </div>
                    <h4 className="company">{item.company}</h4>
                    <ul className="duties-list">
                      {item.duties.map((duty) => (
                        <li key={duty}>{duty}</li>
                      ))}
                    </ul>
                    <div className="tech-stack">
                      <h5>Technologies Used:</h5>
                      <div className="tech-tags">
                        {item.tech.map((tech) => (
                          <span key={tech}>{tech}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
