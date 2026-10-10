let activeCat = "todos";
let activeDevice = "todos";
let currentSort = "date-desc";

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function catById(id){
  return CATEGORIES.find(c => c.id === id);
}

function readableTextColor(bgColor){
  if(!bgColor || typeof bgColor !== 'string' || bgColor[0] !== '#') return '#ffffff';
  let hex = bgColor.slice(1);
  if(hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
  if(hex.length !== 6) return '#ffffff';
  const num = parseInt(hex, 16);
  if(Number.isNaN(num)) return '#ffffff';
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.6 ? '#16232f' : '#ffffff';
}

const DL_PATTERN = /mediafire\.com|drive\.google\.com|mega\.nz|mega\.co\.nz|dropbox\.com|1drv\.ms|onedrive\.live\.com|drive\.usercontent\.google\.com|\.apk|\.zip|\.7z|\.rar|\.exe/i;
function linkify(escapedText){
  const urlPattern = /((https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"])/gi;
  let out = '';
  let lastIndex = 0;
  let match;
  while((match = urlPattern.exec(escapedText)) !== null){
    const before = escapedText.slice(lastIndex, match.index);
    const url = match[0];
    const href = url.startsWith('http') ? url : `https://${url}`;
    if(DL_PATTERN.test(href)){
      out += before.trim().length ? `<span class="dl-label">${before}</span>` : before;
      out += `<a class="dl-btn" href="${href}" target="_blank" rel="noopener noreferrer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar</a>`;
    } else {
      out += before;
      out += `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    }
    lastIndex = urlPattern.lastIndex;
  }
  out += escapedText.slice(lastIndex);
  return out;
}

function cleanBodyText(text){
  return text;
}

/* Fecha: "hoy/ayer/hace N días" para los últimos 6 días,
   luego formato ISO YYYY-MM-DD para el resto. */
function relativeDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diffDays = Math.round((today - d) / 86400000);
  if(diffDays === 0) return 'hoy';
  if(diffDays === 1) return 'ayer';
  if(diffDays > 1 && diffDays <= 6) return `hace ${diffDays} días`;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* Numeración de entradas: asigna "Nº 0001", "Nº 0002"... según orden
   cronológico ascendente. Se calcula una vez por entrada y se guarda
   en el objeto para no recalcularlo en cada render. */
function computeEntryNumbers(){
  const visible = POSTS.filter(p => !p.hidden);
  const sortedAsc = visible.slice().sort((a,b) => new Date(a.date) - new Date(b.date));
  sortedAsc.forEach((p, i) => {
    p._entryNumber = String(i + 1).padStart(4, '0');
  });
}

function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2800);
}

function renderCatButtons(){
  const cats = document.getElementById('cats');
  const todosBtn = document.querySelector('.cat-btn[data-cat="todos"]');
  const visiblePosts = POSTS.filter(p => !p.hidden);
  todosBtn.innerHTML = `Todos <span class="count">${visiblePosts.length}</span>`;
  CATEGORIES.forEach(c => {
    const count = visiblePosts.filter(p => p.category === c.id).length;
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.cat = c.id;
    btn.style.setProperty('--c', c.color);
    btn.style.setProperty('--cat-ink', readableTextColor(c.color));
    btn.innerHTML = `${escapeHtml(c.label)} <span class="count">${count}</span>`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeCat = c.id;
      renderWithFade();
      btn.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
    });
    cats.appendChild(btn);
  });
  todosBtn.addEventListener('click', function(){
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    this.classList.add('active');
    this.setAttribute('aria-selected', 'true');
    activeCat = 'todos';
    renderWithFade();
    this.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
  });
}

function renderWithFade(){
  const list = document.getElementById('list');
  list.classList.add('fade-out');
  clearTimeout(renderWithFade._t);
  renderWithFade._t = setTimeout(() => {
    render();
    list.classList.remove('fade-out');
  }, 140);
}

let featuredId = null;
function pickFeatured(){
  const visible = POSTS.filter(p => !p.hidden);
  if(visible.length === 0){ featuredId = null; return; }
  const sorted = visible.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
  const useRandom = sorted.length > 1 && Math.random() < 0.3;
  featuredId = useRandom ? sorted[Math.floor(Math.random() * sorted.length)].id : sorted[0].id;
}

const tileObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        const el = entry.target;
        el.style.backgroundImage = `url("${el.dataset.thumb}")`;
        tileObserver.unobserve(el);
      });
    }, { rootMargin: '200px 0px' })
  : null;

function getFilteredItems(){
  const q = document.getElementById('search').value.trim().toLowerCase();
  let items = POSTS.filter(p => !p.hidden);

  if(activeCat !== "todos"){
    items = items.filter(p => p.category === activeCat);
  }
  if(activeDevice !== "todos"){
    items = items.filter(p => (p.device || '').toLowerCase() === activeDevice.toLowerCase());
  }
  if(q){
    items = items.filter(p => {
      const haystack = [p.title, p.summary, p.device, ...(p.body || [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  items = items.slice().sort((a, b) => {
    if(currentSort === 'date-desc') return new Date(b.date) - new Date(a.date);
    if(currentSort === 'date-asc') return new Date(a.date) - new Date(b.date);
    return 0;
  });
  return items;
}

function renderActiveFilters(){
  const wrap = document.getElementById('active-filters');
  const q = document.getElementById('search').value.trim();
  const chips = [];

  if(activeCat !== 'todos'){
    const cat = catById(activeCat);
    chips.push({ key: 'cat', label: cat ? cat.label : activeCat });
  }
  if(activeDevice !== 'todos'){
    chips.push({ key: 'dev', label: activeDevice });
  }
  if(q){
    chips.push({ key: 'q', label: `“${q}”` });
  }

  if(chips.length === 0){
    wrap.innerHTML = '';
    return;
  }

  let html = chips.map(c => `
    <span class="filter-chip">
      ${escapeHtml(c.label)}
      <button type="button" data-clear="${c.key}" aria-label="Quitar filtro ${escapeHtml(c.label)}">×</button>
    </span>`).join('');
  if(chips.length > 1){
    html += `<button type="button" class="clear-all-btn" id="clear-all-filters">Limpiar todo</button>`;
  }
  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.clear;
      if(k === 'cat'){
        activeCat = 'todos';
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        const todos = document.querySelector('.cat-btn[data-cat="todos"]');
        if(todos){ todos.classList.add('active'); todos.setAttribute('aria-selected', 'true'); }
      } else if(k === 'dev'){
        activeDevice = 'todos';
        document.querySelectorAll('.dev-btn').forEach(b => b.classList.remove('active'));
        const all = document.querySelector('.dev-btn[data-dev="todos"]');
        if(all) all.classList.add('active');
      } else if(k === 'q'){
        document.getElementById('search').value = '';
      }
      renderWithFade();
    });
  });
  const clearAll = document.getElementById('clear-all-filters');
  if(clearAll){
    clearAll.addEventListener('click', () => {
      activeCat = 'todos';
      activeDevice = 'todos';
      document.getElementById('search').value = '';
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      const todos = document.querySelector('.cat-btn[data-cat="todos"]');
      if(todos){ todos.classList.add('active'); todos.setAttribute('aria-selected', 'true'); }
      document.querySelectorAll('.dev-btn').forEach(b => b.classList.remove('active'));
      const all = document.querySelector('.dev-btn[data-dev="todos"]');
      if(all) all.classList.add('active');
      renderWithFade();
    });
  }
}

function render(){
  const q = document.getElementById('search').value.trim().toLowerCase();
  const list = document.getElementById('list');
  const isDefaultView = (activeCat === "todos" && !q && activeDevice === "todos" && currentSort === "date-desc");

  let items = getFilteredItems();
  renderActiveFilters();

  list.innerHTML = "";

  if(POSTS.filter(p => !p.hidden).length === 0){
    list.innerHTML = '<div class="state-msg">Aún no hay entradas publicadas.</div>';
    return;
  }
  if(items.length === 0){
    const msg = q
      ? `Sin resultados para "${escapeHtml(document.getElementById('search').value.trim())}".`
      : 'Sin entradas con estos filtros.';
    list.innerHTML = `<div class="state-msg">${msg}</div>`;
    return;
  }

  const pageItems = items;

  const featuredItem = isDefaultView ? pageItems.find(p => p.id === featuredId) : null;
  const restItems = featuredItem ? pageItems.filter(p => p.id !== featuredId) : pageItems;
  const mostRecentDate = restItems.length
    ? new Date(restItems[0].date + 'T00:00:00')
    : null;
  const today0 = new Date(); today0.setHours(0,0,0,0);
  const showDivider = isDefaultView
    && featuredItem
    && restItems.length > 0
    && mostRecentDate
    && Math.round((today0 - mostRecentDate) / 86400000) <= 14;

  if(featuredItem){
    appendTile(featuredItem, 0, true, list);
  }

  if(showDivider){
    const div = document.createElement('div');
    div.className = 'section-divider';
    div.innerHTML = '<span>RECIENTES</span>';
    list.appendChild(div);
  }

  restItems.forEach((p, i) => {
    appendTile(p, featuredItem ? i + 1 : i, false, list);
  });
}

function appendTile(p, animIdx, isWide, list){
  const cat = catById(p.category);
  const color = p.bgColor || (cat ? cat.color : 'var(--steel)');
  const label = cat ? cat.label : '';
  const thumb = (p.images && p.images[0] && p.images[0].src) ? p.images[0].src : null;
  const today = new Date(); today.setHours(0,0,0,0);
  const postDate = new Date(p.date + 'T00:00:00');
  const isNew = Math.round((today - postDate) / 86400000) <= 7;
  const dateStr = relativeDate(p.date);
  const numberStr = p._entryNumber || '';

  const tile = document.createElement('div');
  tile.className = 'tile' + (isWide ? ' wide' : '') + (thumb ? ' has-thumb' : '');
  tile.setAttribute('role', 'listitem');
  tile.setAttribute('tabindex', '0');
  tile.style.setProperty('--c', color);
  tile.style.color = thumb ? '#ffffff' : readableTextColor(color);
  if(thumb){
    tile.dataset.thumb = thumb;
    if(tileObserver) tileObserver.observe(tile);
    else tile.style.backgroundImage = `url("${thumb}")`;
  }
  if(p.tileAspect) tile.style.aspectRatio = p.tileAspect;
  tile.innerHTML = `
    ${isNew ? '<div class="badge-new">NUEVO</div>' : ''}
    ${isWide ? '<div class="tile-wide-star">★ DESTACADO</div>' : ''}
    ${numberStr ? `<div class="tile-number">Nº ${numberStr}</div>` : ''}
    ${label ? `<div class="tile-cat">${escapeHtml(label)}</div>` : ''}
    <div class="tile-title">${escapeHtml(p.title)}</div>
    <div class="tile-date">${dateStr}</div>
  `;
  const open = () => openDetail(p);
  tile.addEventListener('click', open);
  tile.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }
  });
  tile.classList.add('tile-animate');
  tile.style.animationDelay = `${animIdx * 30}ms`;
  list.appendChild(tile);
}

const detailScreen = document.getElementById('detail-screen');
const detailInner = document.getElementById('detail-inner');

let currentPost = null;

let activeCarouselNav = null;

function initCarousel(root, imgs){
  activeCarouselNav = null;
  const carousel = root.querySelector('.carousel');
  if(!carousel || !imgs.length) return;
  const frame = carousel.querySelector('.carousel-frame');
  const slides = [...frame.querySelectorAll('img')];
  const prevBtn = frame.querySelector('.prev');
  const nextBtn = frame.querySelector('.next');
  const countEl = frame.querySelector('.carousel-count');
  const captionEl = carousel.querySelector('.carousel-caption');

  function markLoaded(img){
    img.classList.add('loaded');
    if(img.classList.contains('active')) frame.classList.remove('loading');
  }
  slides.forEach(img => {
    if(img.complete && img.naturalWidth > 0){
      markLoaded(img);
    } else {
      img.addEventListener('load', () => markLoaded(img));
      img.addEventListener('error', () => markLoaded(img));
    }
  });
  if(slides[0] && !slides[0].classList.contains('loaded')) frame.classList.add('loading');

  if(slides.length < 2) return;
  let idx = 0;
  function show(n){
    idx = (n + slides.length) % slides.length;
    slides.forEach((img, i) => img.classList.toggle('active', i === idx));
    frame.classList.toggle('loading', !slides[idx].classList.contains('loaded'));
    if(countEl) countEl.textContent = `${idx + 1} / ${slides.length}`;
    if(captionEl){
      const cap = imgs[idx].caption || '';
      captionEl.textContent = cap;
      captionEl.style.display = cap ? '' : 'none';
    }
  }
  prevBtn.addEventListener('click', () => show(idx - 1));
  nextBtn.addEventListener('click', () => show(idx + 1));
  activeCarouselNav = { prev: () => show(idx - 1), next: () => show(idx + 1) };
}

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    if(navSheet.classList.contains('open')){ closeMenu(); return; }
    if(detailScreen.classList.contains('open')){ closeDetail(); return; }
  }
  if(!activeCarouselNav) return;
  if(!detailScreen.classList.contains('open')) return;
  if(e.key === 'ArrowLeft'){ activeCarouselNav.prev(); }
  else if(e.key === 'ArrowRight'){ activeCarouselNav.next(); }
});

function openDetail(p, pushHash = true){
  currentPost = p;
  const cat = catById(p.category);
  const color = p.bgColor || (cat ? cat.color : 'var(--steel)');
  const label = cat ? cat.label : '';
  const d = new Date(p.date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' });

  const bodyHtml = (p.body || []).map(par => {
    const trimmed = par.trim();
    if(trimmed.startsWith('!')){
      const noteText = trimmed.slice(1).trim();
      return `<div class="note">${linkify(escapeHtml(cleanBodyText(noteText)))}</div>`;
    }
    const cleaned = cleanBodyText(trimmed);
    const onlyUrl = /^(https?:\/\/|www\.)\S+$/.test(cleaned);
    if(onlyUrl && DL_PATTERN.test(cleaned)){
      return linkify(escapeHtml(cleaned));
    }
    return `<p>${linkify(escapeHtml(cleaned))}</p>`;
  }).join('');

  const imgs = p.images || [];
  let galleryHtml = '';
  if(imgs.length){
    const slidesHtml = imgs.map((img, i) => {
      const w = img.w || 100, h = img.h || 100;
      return `<img data-idx="${i}" class="${i === 0 ? 'active' : ''}" src="${img.src}" alt="${escapeHtml(img.caption || p.title)}" loading="lazy" style="width:${w}%; height:${h}%;">`;
    }).join('');
    const showControls = imgs.length > 1;
    galleryHtml = `
      <div class="carousel">
        <div class="carousel-frame">
          ${slidesHtml}
          ${showControls ? `
            <button class="carousel-btn prev" aria-label="Imagen anterior">‹</button>
            <button class="carousel-btn next" aria-label="Imagen siguiente">›</button>
            <div class="carousel-count">1 / ${imgs.length}</div>` : ''}
        </div>
        <div class="carousel-caption" style="${imgs[0].caption ? '' : 'display:none'}">${escapeHtml(imgs[0].caption || '')}</div>
      </div>`;
  }

  detailScreen.style.setProperty('--c', color);

  const isDark = document.body.classList.contains('dark-mode');
  let bgColor = color;
  let textColor = '#ffffff';
  let linkColor = '#bfe0ff';

  if(isDark && color && color[0] === '#'){
    let hex = color.slice(1);
    if(hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const cr = parseInt(hex.slice(0,2),16), cg = parseInt(hex.slice(2,4),16), cb = parseInt(hex.slice(4,6),16);
    const br = 8, bg = 15, bb = 26;
    const mix = (c, b, t) => Math.round(c * t + b * (1 - t));
    const mr = mix(cr, br, 0.28), mg = mix(cg, bg, 0.28), mb = mix(cb, bb, 0.28);
    bgColor = `rgb(${mr},${mg},${mb})`;
    textColor = '#d8eaf8';
    const lr = mix(cr, 200, 0.55), lg = mix(cg, 220, 0.55), lb = mix(cb, 255, 0.55);
    linkColor = `rgb(${lr},${lg},${lb})`;
  } else {
    const lightBg = readableTextColor(color) === '#16232f';
    textColor = lightBg ? '#16232f' : '#ffffff';
    linkColor = lightBg ? '#0050EF' : '#bfe0ff';
  }

  detailScreen.style.background = bgColor;
  detailScreen.style.color = textColor;
  detailScreen.style.setProperty('--link-c', linkColor);

  let dlBtnBg = 'rgba(255,255,255,0.18)';
  let dlBtnBorder = 'rgba(255,255,255,0.45)';
  if(color && color[0] === '#'){
    let hex = color.slice(1);
    if(hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const cr = parseInt(hex.slice(0,2),16), cg = parseInt(hex.slice(2,4),16), cb = parseInt(hex.slice(4,6),16);
    const darken = (c) => Math.round(c * 0.55);
    dlBtnBg = `rgba(${darken(cr)},${darken(cg)},${darken(cb)},0.55)`;
    dlBtnBorder = `rgba(${cr},${cg},${cb},0.7)`;
  }
  detailScreen.style.setProperty('--dl-bg', dlBtnBg);
  detailScreen.style.setProperty('--dl-border', dlBtnBorder);
  detailInner.innerHTML = `
    ${label ? `<div class="detail-cat">${escapeHtml(label)}</div>` : ''}
    <h1 class="detail-title">${escapeHtml(p.title)}</h1>
    <div class="detail-meta">${dateStr}${p.device ? `<span class="sep">·</span>${escapeHtml(p.device)}` : ''}</div>
    <div class="detail-summary">${linkify(escapeHtml(p.summary))}</div>
    <div class="detail-body">${bodyHtml}</div>
    ${galleryHtml}
  `;
  initCarousel(detailInner, imgs);
  detailScreen.classList.add('open');
  document.body.style.overflow = 'hidden';
  if(pushHash){
    try{ history.pushState({ post: p.id }, '', `#entrada-${p.id}`); }
    catch(err){}
  }
}

function closeDetail(clearHash = true){
  detailScreen.classList.remove('open');
  document.body.style.overflow = '';
  currentPost = null;
  if(clearHash && location.hash){
    try{ history.pushState({}, '', location.pathname + location.search); }
    catch(err){}
  }
}
document.getElementById('back-btn').addEventListener('click', () => closeDetail());
document.getElementById('start-orb').addEventListener('click', () => {
  window.scrollTo({ top:0, behavior:'smooth' });
});

function legacyCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try{ ok = document.execCommand('copy'); }catch(err){ ok = false; }
  document.body.removeChild(ta);
  return ok;
}

document.getElementById('share-btn').addEventListener('click', async () => {
  if(!currentPost) return;
  const url = `${location.origin}${location.pathname}#entrada-${currentPost.id}`;

  if(navigator.share){
    try{
      await navigator.share({ title: currentPost.title, text: currentPost.summary || '', url });
      return;
    }catch(err){ return; }
  }

  if(navigator.clipboard && navigator.clipboard.writeText){
    try{
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado');
      return;
    }catch(err){}
  }

  if(legacyCopy(url)){
    toast('Enlace copiado');
    return;
  }

  prompt('No se pudo copiar automáticamente. Copiá este enlace:', url);
});

function openFromHash(){
  const m = location.hash.match(/^#entrada-(.+)$/);
  if(!m) { closeDetail(false); return; }
  const post = POSTS.find(p => p.id === m[1]);
  if(post) openDetail(post, false);
}
window.addEventListener('hashchange', openFromHash);

const menuBtn = document.getElementById('menu-btn');
const navSheet = document.getElementById('nav-sheet');
const navBackdrop = document.getElementById('nav-backdrop');

document.getElementById('taskbar-links').innerHTML = SITE_LINKS
  .map(l => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join('');
document.getElementById('nav-sheet-links').innerHTML = SITE_LINKS
  .map(l => `<a href="${l.href}" role="menuitem"><span class="dot" style="--c:${l.dot || 'var(--cobalt)'}"></span>${escapeHtml(l.label)}</a>`).join('');

function openMenu(){
  navSheet.classList.add('open');
  navBackdrop.classList.add('open');
  navSheet.setAttribute('aria-hidden', 'false');
  menuBtn.setAttribute('aria-expanded', 'true');
  navSheet.querySelector('a').focus();
}
function closeMenu(){
  navSheet.classList.remove('open');
  navBackdrop.classList.remove('open');
  navSheet.setAttribute('aria-hidden', 'true');
  menuBtn.setAttribute('aria-expanded', 'false');
}
menuBtn.addEventListener('click', () => {
  navSheet.classList.contains('open') ? closeMenu() : openMenu();
});
navBackdrop.addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && navSheet.classList.contains('open')) closeMenu();
});
navSheet.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

document.getElementById('search').addEventListener('input', () => {
  render();
});
document.getElementById('sort-desc').addEventListener('click', () => {
  currentSort = 'date-desc';
  document.getElementById('sort-desc').classList.add('active');
  document.getElementById('sort-desc').setAttribute('aria-pressed','true');
  document.getElementById('sort-asc').classList.remove('active');
  document.getElementById('sort-asc').setAttribute('aria-pressed','false');
  renderWithFade();
});
document.getElementById('sort-asc').addEventListener('click', () => {
  currentSort = 'date-asc';
  document.getElementById('sort-asc').classList.add('active');
  document.getElementById('sort-asc').setAttribute('aria-pressed','true');
  document.getElementById('sort-desc').classList.remove('active');
  document.getElementById('sort-desc').setAttribute('aria-pressed','false');
  renderWithFade();
});

const entryCountEl = document.getElementById('entry-count');
if(entryCountEl) entryCountEl.textContent = POSTS.filter(p => !p.hidden).length;

function renderDeviceButtons(){
  const row = document.getElementById('device-row');
  const devices = [...new Set(POSTS.filter(p => !p.hidden && p.device).map(p => p.device))];
  if(devices.length === 0){ row.style.display = 'none'; return; }
  row.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'dev-btn active';
  allBtn.textContent = 'Todo';
  allBtn.dataset.dev = 'todos';
  row.appendChild(allBtn);
  devices.forEach(dev => {
    const icon = dev.toLowerCase().includes('android') ? '📱' : dev.toLowerCase().includes('pc') ? '💻' : '🎮';
    const btn = document.createElement('button');
    btn.className = 'dev-btn';
    btn.textContent = `${icon} ${dev}`;
    btn.dataset.dev = dev;
    row.appendChild(btn);
  });
  row.querySelectorAll('.dev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      row.querySelectorAll('.dev-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDevice = btn.dataset.dev;
      renderWithFade();
    });
  });
}

const themeBtn = document.getElementById('theme-btn');
function applyTheme(dark){
  document.body.classList.toggle('dark-mode', dark);
  themeBtn.textContent = dark ? '☀️' : '🌙';
  themeBtn.title = dark ? 'Modo claro' : 'Modo oscuro';
  try{ localStorage.setItem('apt-dark', dark ? '1' : '0'); }catch(e){}
  if(currentPost && detailScreen.classList.contains('open')){
    openDetail(currentPost, false);
  }
}
try{
  const saved = localStorage.getItem('apt-dark');
  if(saved !== null) applyTheme(saved === '1');
}catch(e){}
themeBtn.addEventListener('click', () => {
  applyTheme(!document.body.classList.contains('dark-mode'));
});

(function(){
  const firstWithImg = POSTS.filter(p => !p.hidden && p.images && p.images[0])
    .sort((a,b) => new Date(b.date) - new Date(a.date))[0];
  if(!firstWithImg) return;
  const imgSrc = firstWithImg.images[0].src;
  const base = 'https://bash-666.github.io/';
  const full = imgSrc.startsWith('http') ? imgSrc : base + imgSrc;
  document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]')
    .forEach(m => m.content = full);
})();

computeEntryNumbers();
pickFeatured();
renderCatButtons();
renderDeviceButtons();
render();
if(location.hash) openFromHash();

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const clockTimeEl = document.getElementById('clock-time');
const clockDateEl = document.getElementById('clock-date');
let lastMinuteKey = '';
let clockTimer = null;

function tick(){
  const now = new Date();
  const hh = now.toLocaleTimeString('es-MX', { hour:'2-digit', hour12:false, timeZone: tz }).replace(/\D/g, '');
  const mm = now.toLocaleTimeString('es-MX', { minute:'2-digit', timeZone: tz }).replace(/\D/g, '').slice(-2);
  const minuteKey = `${hh}:${mm}`;

  if(minuteKey !== lastMinuteKey){
    lastMinuteKey = minuteKey;
    clockTimeEl.style.opacity = '0';
    setTimeout(() => {
      clockTimeEl.innerHTML = `${hh}<span class="sep">:</span>${mm}`;
      clockTimeEl.style.opacity = '1';
    }, 120);
    clockDateEl.textContent =
      now.toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short', timeZone: tz });
  }
}

function startClock(){
  tick();
  if(!clockTimer) clockTimer = setInterval(tick, 10000);
}
function stopClock(){
  if(clockTimer){ clearInterval(clockTimer); clockTimer = null; }
}
document.addEventListener('visibilitychange', () => {
  if(document.hidden) stopClock();
  else startClock();
});
startClock();