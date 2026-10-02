import { useState } from 'react';
import Link from 'next/link';
import type { Project, Locale } from '../../types/content';
import type { Messages } from '../../lib/i18n/messages';
import SectionHeading from '../layout/SectionHeading';
import ProjectCard from './ProjectCard';
import ProjectDetail from './ProjectDetail';
export default function ProjectsSection({
  projects,
  locale,
  t,
  all = false,
}: {
  projects: Project[];
  locale: Locale;
  t: Messages;
  all?: boolean;
}) {
  const [active, setActive] = useState<Project | null>(null);
  return (
    <section id="projects" className="content-section">
      <SectionHeading
        number="03"
        label={t.nav[3]}
        title={all ? undefined : t.projectsTitle}
        action={
          !all && (
            <Link
              href="/projects/"
              className="button secondary all-projects-link"
            >
              {t.allProjects}
            </Link>
          )
        }
      />
      <div className="project-grid">
        {(all ? projects : projects.filter((p) => p.featured)).map(
          (project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              locale={locale}
              t={t}
              onOpen={() => setActive(project)}
            />
          ),
        )}
      </div>
      {active && (
        <ProjectDetail
          project={active}
          locale={locale}
          t={t}
          close={() => setActive(null)}
        />
      )}
    </section>
  );
}
