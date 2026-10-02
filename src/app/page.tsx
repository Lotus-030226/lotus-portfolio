import Portfolio from '../components/Portfolio';
import { LocalContentRepository } from '../lib/content/LocalContentRepository';
export default async function Page() {
  const repository = new LocalContentRepository();
  const [site, tech, experiences, projects, contact] = await Promise.all([
    repository.getSiteConfig(),
    repository.getTechStack(),
    repository.getExperiences(),
    repository.getProjects(),
    repository.getContactInfo(),
  ]);
  return (
    <Portfolio snapshot={{ site, tech, experiences, projects, contact }} />
  );
}
