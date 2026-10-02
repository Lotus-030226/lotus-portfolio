import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { Project, Locale } from '../../types/content';
import type { Messages } from '../../lib/i18n/messages';
import { assetPath } from '../../lib/utils/paths';
import ProjectArtwork from './ProjectArtwork';
export default function ProjectCard({
  project,
  index,
  locale,
  t,
  onOpen,
}: {
  project: Project;
  index: number;
  locale: Locale;
  t: Messages;
  onOpen: () => void;
}) {
  return (
    <button
      className="project-card"
      onClick={onOpen}
      aria-label={`${t.projectOpen} ${project.title[locale]}`}
    >
      <div className="project-cover">
        {project.cover ? (
          <Image
            src={assetPath(project.cover.src)}
            alt={project.cover.alt[locale]}
            width={640}
            height={380}
          />
        ) : (
          <ProjectArtwork index={index} label={project.tags[0] || 'SYSTEM'} />
        )}
        <span className="concept-label">{!project.cover && t.concept}</span>
      </div>
      <div className="project-card-copy">
        <div className="project-tagline">
          <span>{project.tags.join(' / ')}</span>
          <ArrowUpRight size={21} />
        </div>
        <h3>{project.title[locale]}</h3>
        <p>{project.summary[locale]}</p>
        <div className="tags">
          {project.technologies.slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
