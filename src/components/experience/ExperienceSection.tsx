import type { Experience, Locale } from '../../types/content';
import type { Messages } from '../../lib/i18n/messages';
import SectionHeading from '../layout/SectionHeading';
export default function ExperienceSection({
  experiences,
  locale,
  t,
}: {
  experiences: Experience[];
  locale: Locale;
  t: Messages;
}) {
  return (
    <section id="experience" className="content-section">
      <SectionHeading
        number="02"
        label={t.nav[2]}
        title={t.experienceTitle}
        subtitle={t.experienceSub}
      />
      <div className="timeline">
        {experiences.map((item) => (
          <article className="experience-card" key={item.id}>
            <div className="timeline-marker" />
            <div className="experience-meta">
              <span>{item.period}</span>
              <span>{item.company[locale]}</span>
            </div>
            <div>
              <h3>{item.title[locale]}</h3>
              <p>{item.summary[locale]}</p>
              <ul>
                {item.highlights.map((h, i) => (
                  <li key={i}>{h[locale]}</li>
                ))}
              </ul>
              <div className="tags">
                {item.technologies.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
