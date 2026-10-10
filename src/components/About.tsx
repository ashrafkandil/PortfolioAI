import type { About as AboutData } from '../types';

interface AboutProps {
  about: AboutData;
}

export default function About({ about }: AboutProps) {
  return (
    <section id="about" className="about">
      <div className="container">
        <h2 className="section-title">About Me</h2>
        <div className="about-content">
          <div className="about-text">
            {about.bio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="skills-grid">
            {about.skills.map((category) => (
              <div className="skill-category" key={category.title}>
                <h3>{category.title}</h3>
                <div className="skill-tags">
                  {category.skills.map((skill) => (
                    <span className="skill-tag" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
