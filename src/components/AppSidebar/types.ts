export interface PageMenuIconIconify {
  type: 'iconify';
  name: string;
}

export interface PageMenuIconImage {
  type: 'image';
  src: string;
  alt?: string;
}

export type PageMenuIcon = PageMenuIconIconify | PageMenuIconImage;
