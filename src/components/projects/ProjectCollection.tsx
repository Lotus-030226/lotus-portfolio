'use client';
import Link from 'next/link';
import type { Project } from '../../types/content';
import { useLocale } from '../../hooks/useLocale';
import { messages } from '../../lib/i18n/messages';
import ProjectsSection from './ProjectsSection';
export default function ProjectCollection({
  projects,
}: {
  projects: Project[];
}) {
  const [locale, change] = useLocale();
  const t = messages[locale];
  return (
    <main id="main" className="collection-page">
      <header className="collection-nav">
        <Link href="/#projects">← {t.returnProjects}</Link>
        <div aria-label="Language">
          <button
            onClick={() => change('zh-TW')}
            aria-pressed={locale === 'zh-TW'}
          >
            中
          </button>
          <span> / </span>
          <button onClick={() => change('en')} aria-pressed={locale === 'en'}>
            EN
          </button>
        </div>
      </header>
      <ProjectsSection projects={projects} locale={locale} t={t} all />
    </main>
  );
}
