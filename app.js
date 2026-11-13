(function(){
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DESCARGA = /mediafire\.com|drive\.google\.com|mega\.nz|mega\.co\.nz|dropbox\.com|1drv\.ms|onedrive\.live\.com|\.apk|\.zip|\.7z|\.rar|\.exe/i;

  function enlazar(t){
    return t.replace(/((https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"])/gi, (url) => {
      const href = url.startsWith('http') ? url : 'https://' + url;
      if (DESCARGA.test(href)) return `<a class="descargar" href="${href}" target="_blank" rel="noopener noreferrer">Descargar ↓</a>`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }
  function fechaLarga(iso){
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' });
  }
  function fechaRelativa(iso){
    const d = new Date(iso + 'T00:00:00'); const hoy = new Date(); hoy.setHours(0,0,0,0);
    const dias = Math.round((hoy - d) / 86400000);
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'ayer';
    if (dias > 1 && dias <= 6) return `hace ${dias} días`;
    return iso;
  }
  function esNueva(iso){
    const d = new Date(iso + 'T00:00:00'); const hoy = new Date(); hoy.setHours(0,0,0,0);
    return Math.round((hoy - d) / 86400000) <= 7;
  }
  const categoria = (id) => CATEGORIAS.find(c => c.id === id);
  const colorDe = (e) => (categoria(e.categoria) || {}).color || '#6f8597';

  function aviso(msg){
    const el = $('aviso'); el.textContent = msg; el.classList.add('visible');
    clearTimeout(aviso._t); aviso._t = setTimeout(() => el.classList.remove('visible'), 2400);
  }

  /* Numeración cronológica */
  const visibles = ENTRADAS.filter(e => !e.oculta);
  visibles.slice().sort((a,b) => new Date(a.fecha) - new Date(b.fecha))
    .forEach((e, i) => e.numero = String(i + 1).padStart(4, '0'));

  let catActiva = 'todas', dispActiva = 'todos';

  /* ----- Barra lateral ----- */
  const menu = $('menu'), fondo = $('menu-fondo'), btnMenu = $('btn-menu');
  function abrirMenu(){
    menu.classList.add('abierto'); fondo.hidden = false;
    menu.setAttribute('aria-hidden','false'); btnMenu.setAttribute('aria-expanded','true');
    $('btn-cerrar-menu').focus();
  }
  function cerrarMenu(){
    menu.classList.remove('abierto'); fondo.hidden = true;
    menu.setAttribute('aria-hidden','true'); btnMenu.setAttribute('aria-expanded','false');
  }
  btnMenu.addEventListener('click', abrirMenu);
  $('btn-cerrar-menu').addEventListener('click', cerrarMenu);
  fondo.addEventListener('click', cerrarMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });

  function renderMenu(){
    $('menu-enlaces').innerHTML = ENLACES.map(l => {
      const interno = l.href.startsWith('#entrada-');
      const id = interno ? l.href.slice('#entrada-'.length) : '';
      return interno
        ? `<a href="${esc(l.href)}" data-id="${esc(id)}">${esc(l.texto)} <span aria-hidden="true">→</span></a>`
        : `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.texto)} <span aria-hidden="true">↗</span></a>`;
    }).join('');
  }

  /* ----- Tema ----- */
  const btnTema = $('btn-tema');
  function aplicarTema(oscuro){
    document.body.classList.toggle('oscuro', oscuro);
    btnTema.setAttribute('aria-checked', oscuro ? 'true' : 'false');
    try { localStorage.setItem('apt-oscuro', oscuro ? '1' : '0'); } catch(e){}
  }
  btnTema.addEventListener('click', () => aplicarTema(!document.body.classList.contains('oscuro')));

  /* ----- Filtros ----- */
  function renderTabs(){
    const tabs = [{ id:'todas', nombre:'Todas', color:'#7f96a8', n: visibles.length }]
      .concat(CATEGORIAS.map(c => ({ id:c.id, nombre:c.nombre, color:c.color,
        n: visibles.filter(e => e.categoria === c.id).length })));
    $('tabs').innerHTML = tabs.map(t => `
      <button type="button" class="tab" role="tab" data-cat="${t.id}"
              aria-selected="${catActiva === t.id}" style="--c:${t.color}">
        ${t.id !== 'todas' ? '<span class="punto" aria-hidden="true"></span>' : ''}
        ${esc(t.nombre)} <span class="n">${t.n}</span>
      </button>`).join('');
  }
  function renderDispositivos(){
    const devs = [...new Set(visibles.map(e => e.dispositivo).filter(Boolean))];
    $('dispositivo').innerHTML = `<option value="todos">Todos los equipos</option>` +
      devs.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
  }

  function filtradas(){
    const q = $('buscar').value.trim().toLowerCase();
    const orden = $('orden').value;
    const items = visibles.filter(e =>
      (catActiva === 'todas' || e.categoria === catActiva) &&
      (dispActiva === 'todos' || e.dispositivo === dispActiva) &&
      (!q || [e.titulo, e.resumen, e.dispositivo, ...e.cuerpo].join(' ').toLowerCase().includes(q))
    );
    items.sort((a,b) => orden === 'reciente' ? new Date(b.fecha) - new Date(a.fecha) : new Date(a.fecha) - new Date(b.fecha));
    return items;
  }

  function tarjetaHtml(e, idx = 0){
    const cat = categoria(e.categoria);
    return `
      <a class="tarjeta" href="#entrada-${esc(e.id)}" data-id="${esc(e.id)}" style="--c:${colorDe(e)};--i:${idx}">
        <div class="tarjeta-barra"><span>${esc(cat ? cat.nombre : 'General')}</span><span class="num">Nº ${e.numero}</span></div>
        ${e.imagenes[0] ? `<div class="tarjeta-img"><img src="${esc(e.imagenes[0].src)}" alt="${esc(e.titulo)}" loading="lazy"></div>` : ''}
        <div class="tarjeta-cuerpo">
          <h3>${esc(e.titulo)}</h3>
          <p>${esc(e.resumen)}</p>
          <span class="meta">
            <span>${fechaRelativa(e.fecha)}</span>
            ${e.dispositivo ? `<span>· ${esc(e.dispositivo)}</span>` : ''}
            ${esNueva(e.fecha) ? '<span class="nuevo">NUEVA</span>' : ''}
          </span>
        </div>
      </a>`;
  }
  function heroHtml(e){
    const cat = categoria(e.categoria);
    const img = e.imagenes[0] ? `<div class="hero-img"><img src="${esc(e.imagenes[0].src)}" alt="${esc(e.titulo)}" loading="lazy"></div>` : '';
    return `
      <a class="hero" href="#entrada-${esc(e.id)}" data-id="${esc(e.id)}">
        <div class="hero-barra"><span>Última entrada</span><span>Nº ${e.numero}</span></div>
        ${img}
        <div class="hero-txt" style="--c:${colorDe(e)}">
          <span class="meta" style="margin:0 0 8px">${esc(cat ? cat.nombre : 'General')} · ${fechaLarga(e.fecha)}</span>
          <h2>${esc(e.titulo)}</h2>
          <p>${esc(e.resumen)}</p>
        </div>
      </a>`;
  }
  const POR_PAGINA = 12;
  let pagina = 1, claveFiltros = '';
  function renderLista(){
    const items = filtradas();
    const hayFiltro = catActiva !== 'todas' || dispActiva !== 'todos' || $('buscar').value.trim();
    $('limpiar').hidden = !hayFiltro;
    const usarHero = $('orden').value === 'reciente' && !hayFiltro && items.length > 0;
    const resto = usarHero ? items.slice(1) : items;

    /* Cualquier cambio de filtro o de orden regresa a la página 1 */
    const clave = [catActiva, dispActiva, $('buscar').value.trim(), $('orden').value].join('|');
    if (clave !== claveFiltros) { pagina = 1; claveFiltros = clave; }
    const total = Math.max(1, Math.ceil(resto.length / POR_PAGINA));
    if (pagina > total) pagina = total;

    $('destacada').innerHTML = (usarHero && pagina === 1) ? heroHtml(items[0]) : '';
    const inicio = (pagina - 1) * POR_PAGINA;
    $('rejilla').innerHTML = resto.slice(inicio, inicio + POR_PAGINA).map((e, i) => tarjetaHtml(e, i)).join('');
    $('vacio').hidden = items.length > 0;
    renderPaginador(total);
    renderTabs();
  }
  function renderPaginador(total){
    const nav = $('paginador');
    nav.hidden = total <= 1;
    nav.innerHTML = `
      <button type="button" data-pag="${pagina - 1}" ${pagina <= 1 ? 'disabled' : ''}>← Anterior</button>
      <span>Página ${pagina} de ${total}</span>
      <button type="button" data-pag="${pagina + 1}" ${pagina >= total ? 'disabled' : ''}>Siguiente →</button>`;
  }
  $('paginador').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-pag]');
    if (!b || b.disabled) return;
    pagina = Number(b.dataset.pag);
    renderLista();
    $('vista-lista').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ----- Entrada ----- */
  function renderEntrada(e){
    const cat = categoria(e.categoria);
    const cuerpo = e.cuerpo.map(par => {
      const t = par.trim();
      if (t.startsWith('!')) return `<div class="nota">${enlazar(esc(t.slice(1).trim()))}</div>`;
      return `<p>${enlazar(esc(t))}</p>`;
    }).join('');
    const galeria = e.imagenes.length ? `
      <div class="galeria">${e.imagenes.map(im => `
        <figure>
          <img src="${esc(im.src)}" alt="${esc(im.pie || e.titulo)}" loading="lazy" style="width:100%;border-radius:2px">
          ${im.pie ? `<figcaption>${esc(im.pie)}</figcaption>` : ''}
        </figure>`).join('')}
      </div>` : '';

    const ordenadas = visibles.slice().sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    const i = ordenadas.findIndex(x => x.id === e.id);
    const mas = i > 0 ? ordenadas[i-1] : null;
    const menos = (i !== -1 && i < ordenadas.length - 1) ? ordenadas[i+1] : null;
    const nav = i !== -1 ? `
      <nav class="paginacion" aria-label="Entradas">
        ${menos ? `<button type="button" data-id="${esc(menos.id)}" aria-label="Entrada anterior: ${esc(menos.titulo)}">← Anterior</button>` : '<span></span>'}
        ${mas ? `<button type="button" data-id="${esc(mas.id)}" aria-label="Entrada siguiente: ${esc(mas.titulo)}">Siguiente →</button>` : '<span></span>'}
      </nav>` : '';
    const rel = e.categoria ? ordenadas.filter(x => x.id !== e.id && x.categoria === e.categoria).slice(0,4) : [];
    const relHtml = rel.length ? `
      <section class="relacionadas">
        <h2>Más de ${esc(cat.nombre)}</h2>
        ${rel.map(r => `<button type="button" data-id="${esc(r.id)}"><span>${esc(r.titulo)}</span><span style="font-size:.75rem;color:var(--tenue)">${fechaRelativa(r.fecha)}</span></button>`).join('')}
      </section>` : '';

    $('vista-entrada').innerHTML = `
      <div class="ventana">
        <div class="ventana-barra">
          <button type="button" class="volver" data-inicio>← Volver</button>
          <span class="titulo-v">${esc(e.titulo)}</span>
          <button type="button" class="compartir-btn" id="btn-compartir" aria-label="Compartir esta entrada" title="Compartir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>
          </button>
        </div>
        <div class="ventana-cuerpo" style="--c:${colorDe(e)}">
          <div class="tarjeta-barra"><span>${esc(cat ? cat.nombre : 'General')}${e.numero ? ' · Nº ' + e.numero : ''}</span></div>
          <h1>${esc(e.titulo)}</h1>
          <p class="meta">${fechaLarga(e.fecha)}${e.dispositivo ? ' · ' + esc(e.dispositivo) : ''}</p>
          ${e.resumen ? `<p class="resumen-art">${esc(e.resumen)}</p>` : ''}
          <div class="cuerpo" style="margin-top:18px">${cuerpo}</div>
          ${galeria}
          <div class="pie-v">
            ${nav}
            ${relHtml}
          </div>
        </div>
      </div>`;
  }

  /* ----- Navegación interna (no depende del #, funciona en cualquier visor) ----- */
  function abrirEntrada(id, guardar = true){
    const e = ENTRADAS.find(x => x.id === id);
    if (!e) return;
    cerrarMenu();
    renderEntrada(e);
    $('vista-lista').hidden = true;
    $('vista-entrada').hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.title = e.titulo + ' · A.P.T vlog';
    if (guardar) { try { history.pushState({ id }, '', '#entrada-' + id); } catch(err){} }
  }
  function volverListado(guardar = true){
    cerrarMenu();
    $('vista-entrada').hidden = true;
    $('vista-lista').hidden = false;
    document.title = 'A.P.T vlog';
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (guardar) { try { history.pushState({}, '', location.pathname + location.search); } catch(err){} }
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-id], [data-inicio], #btn-compartir');
    if (!el) return;
    if (el.id === 'btn-compartir') {
      ev.preventDefault();
      const e = ENTRADAS.find(x => x.id === currentId());
      const enlace = location.href.split('#')[0] + '#entrada-' + (currentId() || '');
      if (navigator.share && e) {
        navigator.share({ title: e.titulo, url: enlace }).catch(() => {});
      } else {
        navigator.clipboard.writeText(enlace)
          .then(() => aviso('Enlace copiado'))
          .catch(() => aviso('No se pudo copiar el enlace.'));
      }
      return;
    }
    if (el.hasAttribute('data-inicio')) { ev.preventDefault(); volverListado(); return; }
    ev.preventDefault();
    abrirEntrada(el.dataset.id);
  });

  function currentId(){
    const m = (location.hash || '').match(/^#entrada-(.+)$/);
    return m ? m[1] : null;
  }
  function desdeUrl(){
    const id = currentId();
    if (id && ENTRADAS.some(x => x.id === id)) abrirEntrada(id, false);
    else volverListado(false);
  }
  window.addEventListener('popstate', desdeUrl);
  window.addEventListener('hashchange', desdeUrl);

  /* ----- Eventos de filtros ----- */
  $('tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('.tab'); if (!b) return;
    catActiva = b.dataset.cat; renderLista();
  });
  $('dispositivo').addEventListener('change', e => { dispActiva = e.target.value; renderLista(); });
  $('orden').addEventListener('change', renderLista);
  $('buscar').addEventListener('input', renderLista);
  $('limpiar').addEventListener('click', () => {
    catActiva = 'todas'; dispActiva = 'todos'; $('buscar').value = '';
    $('dispositivo').value = 'todos'; renderLista();
  });

  /* ----- Inicio ----- */
  renderMenu();
  renderDispositivos();
  try { const g = localStorage.getItem('apt-oscuro'); aplicarTema(g === '1'); } catch(e){ aplicarTema(false); }
  renderLista();
  desdeUrl();
})();
