export type ArtworkCategory = 'painting' | 'modeling' | 'animation';
export type ProjectCategory = 'game' | 'web' | 'script' | 'extension' | 'mobile-app' | 'other' | 'desktop-app';

export interface ExternalLink {
  name: string;
  url: string;
}

export interface Artwork {
  id: string;
  title: string;
  image: string;
  thumbnail: string;
  category: ArtworkCategory;
  tags: string[];
  description: string;
  date: string;
  creationCycle: string;
  creationEnvironment: string;
  processImages?: string[];
  processLabels?: string[];
  processVideoUrl?: string;
  videoUrl?: string;
  links?: ExternalLink[];
}

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  categories: ProjectCategory[];
  developmentCycle: string;
  developmentEnvironment: string;
  status: string;
  releaseDate: string;
  roles: string[];
  links: ExternalLink[];
}
