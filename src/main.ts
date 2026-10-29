import './styles.css';
import { artworks } from './data/artworks';
import { projects } from './data/projects';
import type { Artwork, Project } from './types';

const artworkCategoryNames: Record<string, string> = {
  all: '全部美术', painting: '绘画', modeling: '建模', animation: '动画',
};
const projectCategoryNames: Record<string, string> = {
  all: '全部项目', web: '网站', script: '脚本', game: '游戏', extension: '浏览器插件',
  'mobile-app': '移动应用', 'desktop-app': '桌面应用', other: '其他',
};

let activeSection: 'artworks' | 'projects' = 'artworks';
let activeFilter = 'all';
let searchTerm = '';
let returnFocus: HTMLElement | null = null;

const app = document.querySelector<HTMLDivElement>('#app');
const template = document.querySelector<HTMLTemplateElement>('#site-template');
if (!app || !template) throw new Error('Required application elements not found');
const siteTemplate = template;

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));
const formatCategory = (category: string) => artworkCategoryNames[category] ?? projectCategoryNames[category] ?? category;
const linksMarkup = (links: { name: string; url: string }[] = []) => links.length ? `<div class="external-links">${links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.name)} <span>↗</span></a>`).join('')}</div>` : '<span class="muted">暂无外部链接</span>';

function renderShell(root: HTMLDivElement) {
  root.replaceChildren(siteTemplate.content.cloneNode(true));
  document.querySelector<HTMLElement>('[data-stat="artworks"]')!.textContent = String(artworks.length);
  document.querySelector<HTMLElement>('[data-stat="projects"]')!.textContent = String(projects.length);
  document.querySelector<HTMLElement>('[data-stat="technologies"]')!.textContent = `${new Set(projects.flatMap((project) => project.tags)).size}+`;
  document.querySelector<HTMLElement>('[data-count="artworks"]')!.textContent = String(artworks.length);
  document.querySelector<HTMLElement>('[data-count="projects"]')!.textContent = String(projects.length);

  document.querySelectorAll<HTMLElement>('[data-section], [data-section-tab]').forEach((element) => element.addEventListener('click', () => setSection((element.dataset.section ?? element.dataset.sectionTab) as 'artworks' | 'projects')));
  document.querySelectorAll<HTMLAnchorElement>('.back-to-top, .text-link, [data-about-link]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.querySelector<HTMLElement>(link.hash);
    if (target) animateScrollTo(target);
  }));
  document.querySelector<HTMLInputElement>('#search')?.addEventListener('input', (event) => { searchTerm = (event.target as HTMLInputElement).value.toLowerCase(); renderContent(); });
  document.querySelector('#close-drawer')?.addEventListener('click', closeDrawer);
  document.querySelector('#drawer-backdrop')?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  renderContent();
}

const animateScrollTo = (target: HTMLElement) => {
  const start = window.scrollY;
  const end = Math.max(0, start + target.getBoundingClientRect().top);
  const distance = end - start;
  const duration = Math.min(900, Math.max(350, Math.abs(distance) * 0.65));
  const startedAt = performance.now();
  const easeInOutCubic = (progress: number) => progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  const frame = (now: number) => { const progress = Math.min(1, (now - startedAt) / duration); window.scrollTo(0, start + distance * easeInOutCubic(progress)); if (progress < 1) window.requestAnimationFrame(frame); };
  window.requestAnimationFrame(frame);
};

function setSection(section: 'artworks' | 'projects') {
  activeSection = section; activeFilter = 'all'; searchTerm = '';
  const search = document.querySelector<HTMLInputElement>('#search'); if (search) search.value = '';
  document.querySelectorAll('[data-section], [data-section-tab]').forEach((item) => item.classList.toggle('active', item.getAttribute('data-section') === section || item.getAttribute('data-section-tab') === section));
  const archive = document.querySelector<HTMLElement>('#archive'); if (archive) animateScrollTo(archive);
  renderContent();
}

function renderContent() {
  const isArt = activeSection === 'artworks';
  const archiveTitle = document.querySelector('#archive-title'); if (archiveTitle) archiveTitle.textContent = isArt ? '美术作品' : '编程项目';
  const archiveNumber = document.querySelector('#archive-number'); if (archiveNumber) archiveNumber.textContent = isArt ? '01 / ARTWORKS' : '02 / PROJECTS';
  const archiveDescription = document.querySelector('#archive-description'); if (archiveDescription) archiveDescription.innerHTML = isArt ? '动画、动态壁纸、临摹与绘画过程。<br>按时间，或者按兴趣浏览。' : '从小工具到长期项目，记录每次尝试。<br>按项目类型，技术或状态浏览。';
  const filters = isArt ? artworkCategoryNames : projectCategoryNames;
  const filterElement = document.querySelector('#filters');
  if (filterElement) filterElement.innerHTML = Object.entries(filters).map(([key, label]) => `<button class="filter ${key === activeFilter ? 'active' : ''}" data-filter="${key}">${label}</button>`).join('');
  filterElement?.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter ?? 'all'; renderContent(); }));
  const items = isArt ? artworks.filter((item) => (activeFilter === 'all' || item.category === activeFilter) && matches(item)) : projects.filter((item) => (activeFilter === 'all' || item.categories.includes(activeFilter as Project['categories'][number])) && matches(item));
  const grid = document.querySelector('#content-grid'); if (grid) grid.innerHTML = items.map((item, index) => isArt ? artworkCard(item as Artwork, index) : projectCard(item as Project, index)).join('');
  document.querySelector('#empty-state')?.toggleAttribute('hidden', items.length > 0);
  grid?.querySelectorAll<HTMLElement>('[data-id]').forEach((card) => { const open = () => openDrawer(card.dataset.id ?? ''); card.addEventListener('click', open); card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }); });
}

function matches(item: Artwork | Project) { const text = 'subtitle' in item ? [item.title, item.subtitle, item.description, ...item.tags, ...item.roles].join(' ') : [item.title, item.description, ...item.tags].join(' '); return text.toLowerCase().includes(searchTerm); }
function artworkCard(item: Artwork, index: number) { return `<article class="archive-card artwork-card" data-id="${item.id}" tabindex="0" role="button" aria-label="查看作品：${escapeHtml(item.title)}" style="--delay:${index * 55}ms"><div class="card-image"><img src="${item.thumbnail}" alt="${escapeHtml(item.title)}" loading="lazy"><span class="card-index">${String(index + 1).padStart(2, '0')}</span><span class="media-type">${item.category === 'animation' ? '▶ VIDEO' : 'IMAGE'}</span></div><div class="card-body"><div class="card-meta"><span>${item.date}</span><span>${formatCategory(item.category)}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><div class="tag-row">${item.tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div></article>`; }
function projectCard(item: Project, index: number) { return `<article class="archive-card project-card" data-id="${item.id}" tabindex="0" role="button" aria-label="查看项目：${escapeHtml(item.title)}" style="--delay:${index * 55}ms"><div class="project-card-top"><span class="card-index">${String(index + 1).padStart(2, '0')}</span><span class="project-status">${escapeHtml(item.status)}</span></div><div class="project-symbol">{ }</div><div class="card-body"><div class="card-meta"><span>${item.releaseDate}</span><span>${item.categories.map(formatCategory).join(' / ')}</span></div><h3>${escapeHtml(item.title)}</h3><div class="project-subtitle">${escapeHtml(item.subtitle)}</div><p>${escapeHtml(item.description)}</p><div class="tag-row">${item.tags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div></article>`; }

function openDrawer(id: string) { const item = [...artworks, ...projects].find((entry) => entry.id === id); if (!item) return; returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; const content = document.querySelector('#drawer-content'); if (!content) return; content.innerHTML = 'image' in item ? artworkDetail(item) : projectDetail(item); document.querySelector('#detail-drawer')?.classList.add('open'); document.querySelector('#drawer-backdrop')?.classList.add('visible'); document.querySelector('#detail-drawer')?.setAttribute('aria-hidden', 'false'); document.body.classList.add('drawer-open'); document.querySelector<HTMLButtonElement>('#close-drawer')?.focus(); }
function closeDrawer() { const drawer = document.querySelector('#detail-drawer'); if (!drawer?.classList.contains('open')) return; drawer.classList.remove('open'); document.querySelector('#drawer-backdrop')?.classList.remove('visible'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('drawer-open'); returnFocus?.focus(); returnFocus = null; }
function detailMeta(label: string, value: string) { return `<div class="detail-meta"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`; }
function artworkDetail(item: Artwork) { const gallery = [item.image, ...(item.processImages ?? [])]; return `<div class="drawer-header"><span class="eyebrow">${formatCategory(item.category)} / ${item.id}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></div><div class="detail-gallery">${gallery.map((src, i) => `<figure><img src="${src}" alt="${escapeHtml(item.processLabels?.[i] ?? item.title)}"><figcaption>${escapeHtml(item.processLabels?.[i] ?? (i === 0 ? '成品' : `过程 ${i}`))}</figcaption></figure>`).join('')}</div><div class="detail-grid">${detailMeta('创作日期', item.date)}${detailMeta('创作周期', item.creationCycle)}${detailMeta('创作环境', item.creationEnvironment)}</div>${item.processVideoUrl || item.videoUrl ? `<div class="detail-video"><span class="eyebrow">MOTION / PROCESS</span><video controls preload="metadata" src="${item.processVideoUrl ?? item.videoUrl}"></video></div>` : ''}<div class="detail-tags">${item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>${linksMarkup(item.links)}</div>`; }
function projectDetail(item: Project) { return `<div class="drawer-header project-detail-header"><span class="eyebrow">${item.categories.map(formatCategory).join(' / ')} / ${item.id}</span><h2>${escapeHtml(item.title)}</h2><div class="project-subtitle">${escapeHtml(item.subtitle)}</div><p>${escapeHtml(item.description)}</p></div><div class="detail-grid">${detailMeta('开发周期', item.developmentCycle)}${detailMeta('发布日期', item.releaseDate)}${detailMeta('项目状态', item.status)}${detailMeta('开发环境', item.developmentEnvironment)}</div><div class="detail-block"><span class="eyebrow">ROLE / 参与角色</span><div class="detail-tags">${item.roles.map((role) => `<span>${escapeHtml(role)}</span>`).join('')}</div></div><div class="detail-block"><span class="eyebrow">STACK / 技术栈</span><div class="detail-tags">${item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div><div class="detail-block"><span class="eyebrow">LINKS / 外部链接</span>${linksMarkup(item.links)}</div></div>`; }

renderShell(app);
