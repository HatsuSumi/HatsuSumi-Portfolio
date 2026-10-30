import './styles.css';
import { artworks } from './data/artworks';
import { projects } from './data/projects';
import type { Artwork, Project } from './types';

type Section = 'artworks' | 'projects';
type ArchiveItem = Artwork | Project;

const artworkCategoryNames: Record<string, string> = {
  all: '全部美术', painting: '绘画', modeling: '建模', animation: '动画',
};
const projectCategoryNames: Record<string, string> = {
  all: '全部项目', web: '网站', script: '脚本', game: '游戏', extension: '浏览器插件',
  'mobile-app': '移动应用', 'desktop-app': '桌面应用', other: '其他',
};
const sectionDescriptions: Record<Section, [string, string]> = {
  artworks: ['动画、动态壁纸、临摹与绘画过程。', '按时间，或者按兴趣浏览。'],
  projects: ['从小工具到长期项目，记录每次尝试。', '按项目类型，技术或状态浏览。'],
};

let activeSection: 'artworks' | 'projects' = 'artworks';
let activeFilter = 'all';
let searchTerm = '';
let returnFocus: HTMLElement | null = null;

const app = document.querySelector<HTMLDivElement>('#app');
const template = document.querySelector<HTMLTemplateElement>('#site-template');
if (!app || !template) throw new Error('Required application elements not found');
const siteTemplate = template;
const rootApp = app;

function cloneTemplate<T extends HTMLElement>(id: string): T {
  const template = document.querySelector<HTMLTemplateElement>(`#${id}`);
  const root = template?.content.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new Error(`Template #${id} must have a root element`);
  return root.cloneNode(true) as T;
}

function slot<T extends Element>(root: ParentNode, name: string): T {
  const element = root.querySelector<T>(`[data-slot="${name}"]`);
  if (!element) throw new Error(`Missing template slot: ${name}`);
  return element;
}

function setText(root: ParentNode, name: string, value: string): void {
  slot<HTMLElement>(root, name).textContent = value;
}

function assetUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

const formatCategory = (category: string) => artworkCategoryNames[category] ?? projectCategoryNames[category] ?? category;

function renderTags(tags: string[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  tags.forEach((tag) => {
    const element = cloneTemplate<HTMLSpanElement>('tag-template');
    element.textContent = tag;
    fragment.append(element);
  });
  return fragment;
}

function renderMetadata(entries: [string, string][]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  entries.forEach(([label, value]) => {
    const meta = cloneTemplate<HTMLDivElement>('detail-meta-template');
    setText(meta, 'label', label);
    setText(meta, 'value', value);
    fragment.append(meta);
  });
  return fragment;
}

function renderLinks(links: Project['links']): HTMLElement {
  if (!links.length) {
    const emptyState = cloneTemplate<HTMLSpanElement>('muted-template');
    emptyState.textContent = '暂无外部链接';
    return emptyState;
  }

  const container = cloneTemplate<HTMLDivElement>('external-links-template');
  links.forEach(({ name, url }) => {
    const link = cloneTemplate<HTMLAnchorElement>('external-link-template');
    link.href = url;
    link.rel = 'noopener noreferrer';
    setText(link, 'name', name);
    container.append(link);
  });
  return container;
}

function renderShell(root: HTMLDivElement): void {
  root.replaceChildren(siteTemplate.content.cloneNode(true));
  root.querySelectorAll<HTMLImageElement>('img[src^="/assets/"]').forEach((image) => {
    image.src = assetUrl(image.getAttribute('src') ?? '');
  });
  const stats = {
    artworks: String(artworks.length),
    projects: String(projects.length),
    technologies: `${new Set(projects.flatMap(({ tags }) => tags)).size}+`,
  };
  root.querySelector<HTMLElement>('[data-stat="artworks"]')!.textContent = stats.artworks;
  root.querySelector<HTMLElement>('[data-stat="projects"]')!.textContent = stats.projects;
  root.querySelector<HTMLElement>('[data-stat="technologies"]')!.textContent = stats.technologies;
  root.querySelector<HTMLElement>('[data-count="artworks"]')!.textContent = stats.artworks;
  root.querySelector<HTMLElement>('[data-count="projects"]')!.textContent = stats.projects;

  root.querySelectorAll<HTMLElement>('[data-section], [data-section-tab]').forEach((element) => {
    element.addEventListener('click', () => {
      const section = element.dataset.section ?? element.dataset.sectionTab;
      if (section === 'artworks' || section === 'projects') setSection(section);
    });
  });

  root.querySelectorAll<HTMLAnchorElement>('.back-to-top, .text-link, [data-about-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = root.querySelector<HTMLElement>(link.hash);
      if (target) animateScrollTo(target);
    });
  });

  root.querySelector<HTMLInputElement>('#search')?.addEventListener('input', (event) => {
    searchTerm = (event.currentTarget as HTMLInputElement).value.toLowerCase();
    renderContent(root);
  });
  root.querySelector<HTMLElement>('#filters')?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter ?? 'all';
    renderContent(root);
  });
  root.querySelector<HTMLElement>('#content-grid')?.addEventListener('click', (event) => {
    const card = (event.target as Element).closest<HTMLElement>('[data-id]');
    if (card) openDrawer(root, card.dataset.id ?? '');
  });
  root.querySelector<HTMLElement>('#content-grid')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = (event.target as Element).closest<HTMLElement>('[data-id]');
    if (!card) return;
    event.preventDefault();
    openDrawer(root, card.dataset.id ?? '');
  });
  root.querySelector('#close-drawer')?.addEventListener('click', () => closeDrawer(root));
  root.querySelector('#drawer-backdrop')?.addEventListener('click', () => closeDrawer(root));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer(root);
  });
  renderContent(root);
}

function animateScrollTo(target: HTMLElement): void {
  const start = window.scrollY;
  const end = Math.max(0, start + target.getBoundingClientRect().top);
  const distance = end - start;
  const duration = Math.min(900, Math.max(350, Math.abs(distance) * 0.65));
  const startedAt = performance.now();
  const easeInOutCubic = (progress: number): number => {
    if (progress < 0.5) return 4 * progress ** 3;
    return 1 - Math.pow(-2 * progress + 2, 3) / 2;
  };

  const frame = (now: number): void => {
    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo(0, start + distance * easeInOutCubic(progress));
    if (progress < 1) window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame(frame);
}

function setSection(section: Section): void {
  activeSection = section;
  activeFilter = 'all';
  searchTerm = '';

  const search = rootApp.querySelector<HTMLInputElement>('#search');
  if (search) search.value = '';

  rootApp.querySelectorAll<HTMLElement>('[data-section], [data-section-tab]').forEach((item) => {
    const isActive = item.dataset.section === section || item.dataset.sectionTab === section;
    item.classList.toggle('active', isActive);
  });

  const archive = rootApp.querySelector<HTMLElement>('#archive');
  if (archive) animateScrollTo(archive);
  renderContent(rootApp);
}

function renderContent(root: HTMLDivElement): void {
  const isArtworkSection = activeSection === 'artworks';
  const title = root.querySelector<HTMLElement>('#archive-title');
  const number = root.querySelector<HTMLElement>('#archive-number');
  const description = root.querySelector<HTMLElement>('#archive-description');
  const filters = root.querySelector<HTMLElement>('#filters');
  const grid = root.querySelector<HTMLElement>('#content-grid');
  const emptyState = root.querySelector<HTMLElement>('#empty-state');
  if (!title || !number || !description || !filters || !grid || !emptyState) return;

  title.textContent = isArtworkSection ? '美术作品' : '编程项目';
  number.textContent = isArtworkSection ? '01 / ARTWORKS' : '02 / PROJECTS';
  const [firstLine, secondLine] = sectionDescriptions[activeSection];
  setText(description, 'description-line-1', firstLine);
  setText(description, 'description-line-2', secondLine);

  const filterNames = isArtworkSection ? artworkCategoryNames : projectCategoryNames;
  const filterFragment = document.createDocumentFragment();
  Object.entries(filterNames).forEach(([key, label]) => {
    const button = cloneTemplate<HTMLButtonElement>('filter-template');
    button.dataset.filter = key;
    button.classList.toggle('active', key === activeFilter);
    button.textContent = label;
    filterFragment.append(button);
  });
  filters.replaceChildren(filterFragment);

  const items: ArchiveItem[] = isArtworkSection
    ? artworks.filter((item) => (activeFilter === 'all' || item.category === activeFilter) && matches(item))
    : projects.filter((item) => (activeFilter === 'all' || item.categories.includes(activeFilter as Project['categories'][number])) && matches(item));
  const cards = document.createDocumentFragment();
  items.forEach((item, index) => {
    cards.append(isArtworkSection ? artworkCard(item as Artwork, index) : projectCard(item as Project, index));
  });
  grid.replaceChildren(cards);
  emptyState.toggleAttribute('hidden', items.length > 0);
}

function matches(item: ArchiveItem): boolean {
  const text = 'subtitle' in item
    ? [item.title, item.subtitle, item.description, ...item.tags, ...item.roles]
    : [item.title, item.description, ...item.tags];
  return text.join(' ').toLowerCase().includes(searchTerm);
}
function artworkCard(item: Artwork, index: number): HTMLElement {
  const card = cloneTemplate<HTMLElement>('artwork-card-template');
  const image = slot<HTMLImageElement>(card, 'image');
  image.src = assetUrl(item.thumbnail);
  image.alt = item.title;
  card.dataset.id = item.id;
  card.setAttribute('aria-label', `查看作品：${item.title}`);
  card.style.setProperty('--delay', `${index * 55}ms`);
  setText(card, 'index', String(index + 1).padStart(2, '0'));
  setText(card, 'media-type', item.category === 'animation' ? '▶ VIDEO' : 'IMAGE');
  setText(card, 'date', item.date);
  setText(card, 'category', formatCategory(item.category));
  setText(card, 'title', item.title);
  setText(card, 'description', item.description);
  slot<HTMLElement>(card, 'tags').append(renderTags(item.tags));
  return card;
}

function projectCard(item: Project, index: number): HTMLElement {
  const card = cloneTemplate<HTMLElement>('project-card-template');
  card.dataset.id = item.id;
  card.setAttribute('aria-label', `查看项目：${item.title}`);
  card.style.setProperty('--delay', `${index * 55}ms`);
  setText(card, 'index', String(index + 1).padStart(2, '0'));
  setText(card, 'status', item.status);
  setText(card, 'date', item.releaseDate);
  setText(card, 'category', item.categories.map(formatCategory).join(' / '));
  setText(card, 'title', item.title);
  setText(card, 'subtitle', item.subtitle);
  setText(card, 'description', item.description);
  slot<HTMLElement>(card, 'tags').append(renderTags(item.tags));
  return card;
}

function openDrawer(root: HTMLDivElement, id: string): void {
  const item = [...artworks, ...projects].find((entry) => entry.id === id);
  const content = root.querySelector<HTMLElement>('#drawer-content');
  if (!item || !content) return;

  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  content.replaceChildren('image' in item ? artworkDetail(item) : projectDetail(item));
  root.querySelector('#detail-drawer')?.classList.add('open');
  root.querySelector('#drawer-backdrop')?.classList.add('visible');
  root.querySelector('#detail-drawer')?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
  root.querySelector<HTMLButtonElement>('#close-drawer')?.focus();
}

function closeDrawer(root: HTMLDivElement): void {
  const drawer = root.querySelector<HTMLElement>('#detail-drawer');
  if (!drawer?.classList.contains('open')) return;
  drawer.classList.remove('open');
  root.querySelector('#drawer-backdrop')?.classList.remove('visible');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
  returnFocus?.focus();
  returnFocus = null;
}

function artworkDetail(item: Artwork): HTMLElement {
  const detail = cloneTemplate<HTMLElement>('artwork-detail-template');
  setText(detail, 'eyebrow', `${formatCategory(item.category)} / ${item.id}`);
  setText(detail, 'title', item.title);
  setText(detail, 'description', item.description);

  const gallery = slot<HTMLElement>(detail, 'gallery');
  const sources = [item.image, ...(item.processImages ?? [])];
  const galleryItems = document.createDocumentFragment();
  sources.forEach((src, index) => {
    const figure = cloneTemplate<HTMLElement>('gallery-item-template');
    const label = item.processLabels?.[index] ?? (index === 0 ? '成品' : `过程 ${index}`);
    const image = slot<HTMLImageElement>(figure, 'image');
    image.src = assetUrl(src);
    image.alt = label;
    setText(figure, 'caption', label);
    galleryItems.append(figure);
  });
  gallery.append(galleryItems);

  slot<HTMLElement>(detail, 'metadata').append(renderMetadata([
    ['创作日期', item.date],
    ['创作周期', item.creationCycle],
    ['创作环境', item.creationEnvironment],
  ]));

  const videoUrl = item.processVideoUrl ?? item.videoUrl;
  if (videoUrl) {
    const videoContainer = slot<HTMLElement>(detail, 'video');
    videoContainer.hidden = false;
    const video = videoContainer.querySelector<HTMLVideoElement>('video');
    if (video) video.src = assetUrl(videoUrl);
  }

  slot<HTMLElement>(detail, 'tags').append(renderTags(item.tags));
  slot<HTMLElement>(detail, 'links').replaceChildren(renderLinks(item.links ?? []));
  return detail;
}

function projectDetail(item: Project): HTMLElement {
  const detail = cloneTemplate<HTMLElement>('project-detail-template');
  setText(detail, 'eyebrow', `${item.categories.map(formatCategory).join(' / ')} / ${item.id}`);
  setText(detail, 'title', item.title);
  setText(detail, 'subtitle', item.subtitle);
  setText(detail, 'description', item.description);
  slot<HTMLElement>(detail, 'metadata').append(renderMetadata([
    ['开发周期', item.developmentCycle],
    ['发布日期', item.releaseDate],
    ['项目状态', item.status],
    ['开发环境', item.developmentEnvironment],
  ]));
  slot<HTMLElement>(detail, 'roles').append(renderTags(item.roles));
  slot<HTMLElement>(detail, 'tags').append(renderTags(item.tags));
  slot<HTMLElement>(detail, 'links').replaceChildren(renderLinks(item.links));
  return detail;
}

renderShell(rootApp);
