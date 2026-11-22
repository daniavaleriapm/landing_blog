const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let data, idx = 0, open = -1;
const desktop = matchMedia('(min-width:900px)'), wide = matchMedia('(min-width:560px)');

// Escritorio: el diseño de Figma (1440 px) se escala al ancho de la ventana
function fit() {
  const st = $('#stage'), cv = $('#canvas');
  if (desktop.matches) {
    const s = st.clientWidth / 1440;
    cv.style.transform = `scale(${s})`; st.style.height = 4401 * s + 'px';
  } else { cv.style.transform = ''; st.style.height = ''; }
}

function render() {
  $('#aboutPhoto').src = data.about.photo; $('#aboutText').textContent = data.about.text;
  $('#langList').innerHTML = data.languages.map(l => l.icon
    ? `<img src="${esc(l.icon)}" alt="${esc(l.name)}">`
    : `<div class="lang-tile"><span>${esc(l.name)}</span></div>`).join('');
  $('#eventList').innerHTML = data.events.map(e =>
    `<article class="ev"><img src="${esc(e.image)}" alt=""><div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></div></article>`).join('');
  $('#track').innerHTML = data.projects.map((p, i) => p.card
    ? `<button class="pcard has-card${i === open ? ' sel' : ''}" data-i="${i}" aria-label="${esc(p.title)}"><img src="${esc(p.card)}" alt="${esc(p.title)}"></button>`
    : `<button class="pcard${i === open ? ' sel' : ''}" data-i="${i}"><b>${esc(p.title)}</b><img src="${esc(p.image)}" alt="">${p.palette ? `<img class="mini" src="${esc(p.palette)}" alt="">` : ''}</button>`).join('');
  move();
}
function move() {
  const vis = wide.matches ? 2 : 1, max = Math.max(0, data.projects.length - vis);
  idx = Math.min(Math.max(idx, 0), max);
  $('#track').style.setProperty('--i', idx);
}
function showPanel(i) {
  open = open === i ? -1 : i;
  const p = $('#detalle'), pr = data.projects[open];
  p.hidden = !pr;
  if (pr) { $('#pTitle').textContent = pr.title; $('#pImg').src = pr.image; $('#pText').textContent = pr.text;
    $('#pPal').src = pr.palette || ''; $('#pPal').hidden = !pr.palette; p.scrollIntoView({behavior:'smooth', block:'center'}); }
  document.querySelectorAll('.pcard').forEach((c, k) => c.classList.toggle('sel', k === open));
}
const maxIdx = () => Math.max(0, data.projects.length - (wide.matches ? 2 : 1));
$('#prev').onclick = () => { idx = idx <= 0 ? maxIdx() : idx - 1; move(); };
$('#next').onclick = () => { idx = idx >= maxIdx() ? 0 : idx + 1; move(); };
$('#track').onclick = e => { const c = e.target.closest('.pcard'); if (c) showPanel(+c.dataset.i); };

// Botón activo según la sección que se está viendo
const links = [...document.querySelectorAll('.nav .btn')];
function spy() {
  let cur = null;
  document.querySelectorAll('.sec:not(.panel)').forEach(s => { if (s.querySelector('.tag').getBoundingClientRect().top < innerHeight * .55) cur = s.id; });
  links.forEach(l => l.classList.toggle('on', l.hash === '#' + cur));
}
addEventListener('scroll', spy, { passive: true });
links.forEach(l => l.addEventListener('click', e => { e.preventDefault();
  const t = $(l.hash); const y = desktop.matches
    ? t.querySelector('.tag').getBoundingClientRect().top + scrollY - 40 : t.getBoundingClientRect().top + scrollY - 12;
  scrollTo({ top: y, behavior: 'smooth' }); }));

addEventListener('resize', () => { fit(); move(); spy(); });
MiBlogStore.load().then(d => { data = d; render(); fit(); });
