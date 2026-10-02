import content from '../../content/generated/portfolio.json';
import type { Snapshot } from '../../types/content';
import type { ContentRepository } from './ContentRepository';
export class LocalContentRepository implements ContentRepository {
  private readonly content: Snapshot;
  constructor(snapshot: Snapshot = content as Snapshot) {
    this.content = snapshot;
  }
  async getSiteConfig() {
    return this.content.site;
  }
  async getTechStack() {
    return this.content.tech;
  }
  async getExperiences() {
    return this.content.experiences;
  }
  async getProjects() {
    return this.content.projects;
  }
  async getContactInfo() {
    return this.content.contact;
  }
}
