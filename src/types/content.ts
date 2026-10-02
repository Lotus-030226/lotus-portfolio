export type Locale = 'zh-TW' | 'en';
export type LocalizedText = Record<Locale, string>;
export interface PublicAsset {
  src: string;
  alt: LocalizedText;
  source?: string;
}
export interface TechItem {
  id: string;
  name: string;
  category: string;
  description: LocalizedText;
  sceneObjectName?: string | null;
}
export interface Experience {
  id: string;
  title: LocalizedText;
  company: LocalizedText;
  summary: LocalizedText;
  period: string | null;
  highlights: LocalizedText[];
  technologies: string[];
}
export interface Project {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  tags: string[];
  technologies: string[];
  cover: PublicAsset | null;
  gallery: PublicAsset[];
  role: LocalizedText | null;
  period: string | null;
  highlights: LocalizedText[];
  githubUrl: string | null;
  demoUrl: string | null;
  featured: boolean;
}
export interface ContactMethod {
  id: string;
  kind: string;
  label: LocalizedText;
  value: string;
  url: string | null;
}
export interface ModelBinding {
  technology: string;
  node: string;
  press: string;
  release: string;
}
export interface SiteConfig {
  modelUrl?: string | null;
  modelBindings?: ModelBinding[];
  modelInteraction?: 'hover' | 'click';
  displayName: string;
  roles: string[];
  intro: LocalizedText;
  services: LocalizedText[];
  description: string;
  sceneUrl: string | null;
}
export interface Snapshot {
  site: SiteConfig;
  tech: TechItem[];
  experiences: Experience[];
  projects: Project[];
  contact: ContactMethod[];
}
