import type { GuideDefinition, GuideId } from "./types";

class GuideRegistry {
  private guides = new Map<GuideId, GuideDefinition>();

  register(guide: GuideDefinition): void {
    if (this.guides.has(guide.id)) {
      throw new Error(`Guide "${guide.id}" is already registered.`);
    }

    this.guides.set(guide.id, guide);
  }

  registerMany(guides: GuideDefinition[]): void {
    guides.forEach((guide) => this.register(guide));
  }

  get(id: GuideId): GuideDefinition | undefined {
    return this.guides.get(id);
  }

  getAll(): GuideDefinition[] {
    return Array.from(this.guides.values());
  }

  has(id: GuideId): boolean {
    return this.guides.has(id);
  }

  unregister(id: GuideId): void {
    this.guides.delete(id);
  }
}

export const guideRegistry = new GuideRegistry();