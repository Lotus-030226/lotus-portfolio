import { ArrowDown, ArrowUpRight } from 'lucide-react';
import type { SiteConfig, TechItem } from '../../types/content';
import type { Locale } from '../../lib/i18n/locale';
import type { Messages } from '../../lib/i18n/messages';
import HeroKeyboard3D from './HeroKeyboard3D';
export default function Hero({
  site,
  tech,
  locale,
  t,
  selected,
  onSelect,
}: {
  site: SiteConfig;
  tech: TechItem[];
  locale: Locale;
  t: Messages;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section id="hero" className="hero">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" />
          {t.heroEyebrow}
        </div>
        <h1>
          {site.displayName}
          <span className="name-period">.</span>
        </h1>
        <div className="hero-roles">
          {site.roles.map((role, i) => (
            <span key={role}>
              {i > 0 && <i> / </i>}
              {role}
            </span>
          ))}
        </div>
        <p>{site.intro[locale]}</p>
        <div className="hero-actions">
          <a href="#projects" className="button primary">
            {t.viewProjects}
            <ArrowUpRight size={18} />
          </a>
          <a href="#contact" className="button secondary">
            {t.contactMe}
            <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="service-tags">
          {site.services.map((service, i) => (
            <span key={i}>{service[locale]}</span>
          ))}
        </div>
      </div>
      <HeroKeyboard3D
        skills={tech}
        selected={selected}
        onSelect={onSelect}
        sceneUrl={site.sceneUrl}
        model={site}
        t={t}
      />
      <a href="#tech" className="hero-scroll">
        <ArrowDown size={16} />
        <span>{t.scroll}</span>
        <span className="scroll-line" />
      </a>
    </section>
  );
}
