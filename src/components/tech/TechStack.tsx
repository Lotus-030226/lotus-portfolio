import { useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import type { TechItem, Locale } from '../../types/content';
import type { Messages } from '../../lib/i18n/messages';
import SectionHeading from '../layout/SectionHeading';
export default function TechStack({
  tech,
  locale,
  t,
  selected,
  onSelect,
}: {
  tech: TechItem[];
  locale: Locale;
  t: Messages;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const categories = [...new Set(tech.map((item) => item.category))];
  const [category, setCategory] = useState(categories[0] || '');
  const skill = tech.find((item) => item.id === selected) || tech[0];
  return (
    <section id="tech" className="content-section">
      <SectionHeading
        number="01"
        label={t.nav[1]}
        title={t.techTitle}
        subtitle={t.techSub}
      />
      <div className="tech-layout">
        <div>
          <div className="category-tabs" role="group" aria-label={t.nav[1]}>
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {t.categories[item as keyof typeof t.categories] || item}
              </button>
            ))}
          </div>
          <div className="skill-grid">
            {tech
              .filter((item) => item.category === category)
              .map((item) => (
                <button
                  className={
                    selected === item.id ? 'skill-key selected' : 'skill-key'
                  }
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  aria-pressed={selected === item.id}
                >
                  <span>{item.name}</span>
                  <CornerDownLeft size={14} />
                </button>
              ))}
          </div>
        </div>
        {skill && (
          <aside className="skill-detail" aria-live="polite">
            <span className="eyebrow">{skill.category}</span>
            <h3>{skill.name}</h3>
            <p>{skill.description[locale]}</p>
            <span className="detail-index">
              {String(tech.indexOf(skill) + 1).padStart(2, '0')} / {tech.length}
            </span>
          </aside>
        )}
      </div>
    </section>
  );
}
