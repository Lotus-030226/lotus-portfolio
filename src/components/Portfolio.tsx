'use client';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Snapshot } from '../types/content';
import { useLocale } from '../hooks/useLocale';
import { messages } from '../lib/i18n/messages';
import Navbar from './layout/Navbar';
import SmoothScroll from './layout/SmoothScroll';
import Hero from './hero/Hero';
import TechStack from './tech/TechStack';
import ExperienceSection from './experience/ExperienceSection';
import ProjectsSection from './projects/ProjectsSection';
import ContactSection from './contact/ContactSection';
export default function Portfolio({ snapshot }: { snapshot: Snapshot }) {
  const [locale, change] = useLocale();
  const t = messages[locale];
  const [selected, setSelected] = useState(snapshot.tech[0]?.id || '');
  return (
    <>
      <SmoothScroll />
      <Navbar
        name={snapshot.site.displayName}
        locale={locale}
        change={change}
        t={t}
      />
      <main id="main">
        <Hero
          site={snapshot.site}
          tech={snapshot.tech}
          locale={locale}
          t={t}
          selected={selected}
          onSelect={setSelected}
        />
        <TechStack
          tech={snapshot.tech}
          locale={locale}
          t={t}
          selected={selected}
          onSelect={setSelected}
        />
        <ExperienceSection
          experiences={snapshot.experiences}
          locale={locale}
          t={t}
        />
        <ProjectsSection projects={snapshot.projects} locale={locale} t={t} />
        <ContactSection contacts={snapshot.contact} locale={locale} t={t} />
      </main>
      <footer className="footer">
        <span>
          © {new Date().getFullYear()} {snapshot.site.displayName}
        </span>
        <span>{t.footer}</span>
        <a href="#hero">
          {t.back}
          <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
