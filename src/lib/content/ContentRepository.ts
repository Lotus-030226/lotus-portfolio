import type {
  SiteConfig,
  TechItem,
  Experience,
  Project,
  ContactMethod,
} from '../../types/content';
export interface ContentRepository {
  getSiteConfig(): Promise<SiteConfig>;
  getTechStack(): Promise<TechItem[]>;
  getExperiences(): Promise<Experience[]>;
  getProjects(): Promise<Project[]>;
  getContactInfo(): Promise<ContactMethod[]>;
}
