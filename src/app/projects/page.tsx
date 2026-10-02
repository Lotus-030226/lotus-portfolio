import type { Metadata } from 'next';
import { siteUrl } from '../../lib/utils/paths';
import ProjectCollection from '../../components/projects/ProjectCollection';
import { LocalContentRepository } from '../../lib/content/LocalContentRepository';
export default async function Page() {
  const repository = new LocalContentRepository();
  return <ProjectCollection projects={await repository.getProjects()} />;
}

export async function generateMetadata(): Promise<Metadata> {
  const url = siteUrl();
  return {
    title: 'Portfolio | Lotus',
    alternates: url
      ? {
          canonical: new URL(
            `${url.pathname.replace(/\/$/, '')}/projects/`,
            url,
          ).toString(),
        }
      : undefined,
  };
}
