// CMS de MiBlog: apartado Blog (publicaciones) y apartado Landing, ambos conectados a la API
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => { const x = new Date(d); return [x.getDate(), x.getMonth() + 1].map(n => String(n).padStart(2, '0')).join('/') + '/' + String(x.getFullYear()).slice(2); };
const say = t => { $('#status').textContent = t; };
const note = (m, t = 'AVISO') => { $('#dt').textContent = t; $('#dm').textContent = m; $('#dlg').showModal(); };
const resize = (file, max, jpg) => new Promise(ok => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => {
  const k = Math.min(1, max / im.width), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k;
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL(!jpg && file.type === 'image/png' ? 'image/png' : 'image/jpeg', .85)); }; im.src = r.result; }; r.readAsDataURL(file); });

// ---- Navegación: Blog | Landing ----
const G = { blog: ['new', 'pub', 'draft', 'look'], landing: ['about', 'languages', 'events', 'projects'], stats: ['stats'] };
function show(g, v) {
  v = v || G[g][0];
  $$('#main button').forEach(b => b.classList.toggle('on', b.dataset.g === g));
  $$('.sub').forEach(s => { s.hidden = s.dataset.sub !== g; });
  $$('.sub button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $$('.view').forEach(s => s.classList.toggle('show', s.id === 'v-' + v));
  history.replaceState(null, '', '#' + g + '/' + v);
  if (g === 'stats') loadStats();
}
$$('#main button').forEach(b => b.onclick = () => show(b.dataset.g));
$$('.sub button').forEach(b => b.onclick = () => show(b.closest('.sub').dataset.sub, b.dataset.v));
$('#out').onclick = () => { sessionStorage.removeItem('mb-token'); location.reload(); };

// ---- BLOG ----
const ed = $('#text'); let rg;
const getText = () => ed.textContent.trim() ? Rich.clean(ed.innerHTML).trim() : '';
document.addEventListener('selectionchange', () => { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) rg = s.getRangeAt(0); });
function format(c, v) { ed.focus(); if (rg) { const s = getSelection(); s.removeAllRanges(); s.addRange(rg); } document.execCommand('styleWithCSS', false, true); document.execCommand(c, false, v); }
$$('.tb button').forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => {
  if (b.dataset.c !== 'link') return format(b.dataset.c);
  const u = prompt('Dirección del enlace (empieza con https://)'); if (u && /^(https?:|mailto:)/i.test(u.trim())) format('createLink', u.trim()); }; });
$('#fcolor').oninput = e => { $('#ca').style.color = e.target.value; format('foreColor', e.target.value); };
$('#fback').oninput = e => { $('#cb').style.color = e.target.value; format('hiliteColor', e.target.value); };
$('#fsize').onchange = e => { if (e.target.value) format('fontSize', e.target.value); e.target.value = ''; };
ed.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
let img = '', edit = null, posts = [];
const FLD = { Título: 'title', Descripción: 'text', Imagen: 'drop' };
const missing = (p, full) => [!p.title && 'Título', full && !p.text && 'Descripción', full && !p.image && 'Imagen'].filter(Boolean);
const flag = m => { $$('.bad').forEach(e => e.classList.remove('bad')); m.forEach(n => $('#' + FLD[n]).classList.add('bad')); };
function clear() { edit = null; img = ''; $('#title').value = ''; $('#text').innerHTML = ''; $('#prev').hidden = true; $('#fname').textContent = 'Ninguna imagen seleccionada'; $('#ft').textContent = 'Nueva publicación'; $('#cancel').hidden = true; flag([]); }
function load(p) { show('blog', 'new'); edit = p.id; img = p.image || ''; $('#title').value = p.title; $('#text').innerHTML = Rich.render(p.text); $('#prev').src = img; $('#prev').hidden = !img; $('#fname').textContent = img ? 'Imagen actual' : 'Ninguna imagen seleccionada'; $('#ft').textContent = 'Editando publicación'; $('#cancel').hidden = false; }
function drawPosts() {
  for (const [st, box] of [['published', '#v-pub'], ['draft', '#v-draft']]) {
    const ps = posts.filter(p => p.status === st).sort((a, b) => b.date.localeCompare(a.date));
    $(box).innerHTML = ps.length ? ps.map(p => `<article class="item">${p.image ? `<img class="thumb" src="${esc(p.image)}" alt="">` : ''}<div class="info"><h3>${esc(p.title)}</h3><small>${fmt(p.date)} · ${st === 'published' ? '♥ ' + (p.hearts || 0) : 'borrador'}</small></div><div class="row"><button data-edit="${p.id}">Editar</button>${st === 'draft' ? `<button class="primary" data-pub="${p.id}">Publicar</button>` : ''}<button data-del="${p.id}">Borrar</button></div></article>`).join('') : '<p class="empty">No hay nada aquí todavía.</p>';
  }
  $('#cp').textContent = posts.filter(p => p.status === 'published').length; $('#cd').textContent = posts.filter(p => p.status === 'draft').length;
}
const refresh = async () => { posts = await API.req('/posts' + bq(), {}, true); drawPosts(); };
async function submit(status) {
  const p = { title: $('#title').value.trim(), text: getText(), image: img }, m = missing(p, status === 'published');
  flag(m); if (m.length) return note('Falta completar: ' + m.join(', ') + '.');
  try {
    if (p.image.startsWith('data:')) p.image = await API.upload(p.image);
    await API.req((edit ? '/posts/' + edit : '/posts') + bq(), { method: edit ? 'PUT' : 'POST', body: { ...p, status } }, true);
    clear(); await refresh(); show('blog', status === 'published' ? 'pub' : 'draft'); note(status === 'published' ? 'Tu publicación ya está en el blog.' : 'Borrador guardado.', 'LISTO');
  } catch (e) { note(e.message); }
}
document.addEventListener('click', async e => {
  const a = e.target.closest('[data-edit],[data-pub],[data-del]'); if (!a) return;
  const id = a.dataset.edit || a.dataset.pub || a.dataset.del, p = posts.find(x => x.id === id); if (!p) return;
  if (a.dataset.edit) return load(p);
  try {
    if (a.dataset.del) { if (!confirm('¿Borrar esta publicación?')) return; await API.req('/posts/' + id + bq(), { method: 'DELETE' }, true); return refresh(); }
    const m = missing(p, true); if (m.length) { load(p); flag(m); return note('Para publicar falta: ' + m.join(', ') + '.'); }
    await API.req('/posts/' + id + bq(), { method: 'PUT', body: { ...p, status: 'published' } }, true); await refresh(); show('blog', 'pub'); note('Tu publicación ya está en el blog.', 'LISTO');
  } catch (err) { note(err.message); }
});
$('#file').onchange = async e => { const f = e.target.files[0]; if (!f) return; img = await resize(f, 900, true); $('#prev').src = img; $('#prev').hidden = false; $('#fname').textContent = f.name; $('#drop').classList.remove('bad'); };
['title', 'text'].forEach(i => $('#' + i).oninput = e => e.target.classList.remove('bad'));
$('#draft').onclick = () => submit('draft'); $('#pub').onclick = () => submit('published'); $('#cancel').onclick = clear;

// ---- LANDING (se guarda sola en la API) ----
const SCHEMA = {
  languages: { one: 'lenguaje', f: [['name', 'Nombre'], ['icon', 'Icono (opcional, PNG)', 'img', 320]], blank: { name: '', icon: '' } },
  events: { one: 'evento', f: [['title', 'Título'], ['text', 'Descripción', 'area'], ['image', 'Imagen', 'img', 900]], blank: { title: '', text: '', image: '' } },
  projects: { one: 'proyecto', f: [['title', 'Título'], ['text', 'Descripción', 'area'], ['image', 'Captura del proyecto', 'img', 1000], ['palette', 'Paleta de colores (opcional)', 'img', 700], ['card', 'Tarjeta del carrusel (opcional, si no, se arma sola)', 'img', 900]], blank: { title: '', text: '', image: '', palette: '', card: '' } }
};
let data, timer;
function save() { say('Guardando…'); clearTimeout(timer); timer = setTimeout(async () => { try { await MiBlogStore.save(data); say('Guardado ✔'); } catch (e) { say('No se pudo guardar: ' + e.message); } }, 700); }
function drawLanding() {
  $('#aboutText').value = data.about.text; $('#aboutPhoto').src = data.about.photo;
  for (const [key, sc] of Object.entries(SCHEMA)) {
    const box = $('#' + key); box.innerHTML = '';
    data[key].forEach((item, i) => {
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = '<div class="bar"><button data-a="up">↑</button><button data-a="down">↓</button><button data-a="del">Eliminar</button></div>';
      sc.f.forEach(([k, label, type, max]) => {
        const l = document.createElement('label'); l.textContent = label;
        if (type === 'img') {
          const row = document.createElement('div'); row.className = 'row';
          const im = document.createElement('img'); im.className = 'thumb'; im.alt = ''; if (item[k]) im.src = item[k]; else im.hidden = true;
          const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
          inp.onchange = async () => { if (!inp.files[0]) return; const u = await resize(inp.files[0], max); item[k] = u; im.src = u; im.hidden = false; save(); };
          row.append(im, inp); l.append(row);
        } else {
          const inp = document.createElement(type === 'area' ? 'textarea' : 'input'); if (type === 'area') inp.rows = 3; else inp.type = 'text';
          inp.value = item[k]; inp.oninput = () => { item[k] = inp.value; save(); }; l.append(inp);
        }
        card.append(l);
      });
      card.querySelector('.bar').onclick = e => { const a = e.target.dataset.a; if (!a) return; const arr = data[key];
        if (a === 'del' && confirm('¿Eliminar este ' + sc.one + '?')) arr.splice(i, 1);
        else if (a === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        else if (a === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
        else return; save(); drawLanding(); };
      box.append(card);
    });
  }
}
$$('[data-add]').forEach(b => b.onclick = () => { const k = b.dataset.add; data[k].push({ ...SCHEMA[k].blank }); save(); drawLanding(); });
$('#aboutText').oninput = e => { data.about.text = e.target.value; save(); };
$('#aboutFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; const u = await resize(f, 700); data.about.photo = u; $('#aboutPhoto').src = u; save(); };

// ---- VARIOS BLOGS Y APARIENCIA ----
let blogs = [], blog = 'valeria';
const bq = () => '?blog=' + encodeURIComponent(blog), cur = () => blogs.find(b => b.slug === blog) || blogs[0];
const fill = (sel, items) => { sel.innerHTML = items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(''); };
const TK = ['accent', 'bg', 'card', 'text', 'border'];
fill($('#lkTpl'), Object.entries(Themes.templates).map(([k, t]) => [k, t.name])); fill($('#nbTpl'), Object.entries(Themes.templates).map(([k, t]) => [k, t.name]));
fill($('#lkhf'), Themes.fonts.map(f => [f, f])); fill($('#lkbf'), Themes.fonts.map(f => [f, f]));
function setLook(t) { TK.forEach(k => { $('#lk' + k).value = t[k]; }); $('#lkhf').value = t.headingFont; $('#lkbf').value = t.bodyFont; $('#lkr').value = t.radius; }
const lookTheme = () => ({ template: $('#lkTpl').value, tokens: { ...Object.fromEntries(TK.map(k => [k, $('#lk' + k).value])), headingFont: $('#lkhf').value, bodyFont: $('#lkbf').value, radius: +$('#lkr').value } });
const preview = () => { const w = $('#lkPrev').contentWindow; if (w) w.postMessage({ type: 'theme', theme: lookTheme() }, location.origin); };
function drawBlogs() { fill($('#blogSel'), blogs.map(b => [b.slug, b.title])); $('#blogSel').value = blog; }
function drawLook() {
  const b = cur(); if (!b) return;
  const t = Themes.resolve(b.theme); $('#lkTitle').value = b.title; $('#lkTpl').value = t.template; setLook(t);
  $('#lkOpen').href = '/b/' + b.slug; $('#lkDel').hidden = b.slug === 'valeria'; $('#lkPrev').src = '/b/' + b.slug + '?preview=1';
}
async function saveBlog(theme) {
  try { const r = await API.req('/blogs/' + blog, { method: 'PUT', body: { title: $('#lkTitle').value, theme } }, true); Object.assign(cur(), r); drawBlogs(); drawLook(); note('Apariencia guardada.', 'LISTO'); }
  catch (e) { note(e.message); }
}
$('#lkTpl').onchange = () => { setLook(Themes.templates[$('#lkTpl').value]); preview(); };
$$('#v-look input[type=color], #v-look select:not(#lkTpl), #lkr').forEach(el => el.addEventListener('input', preview));
$('#lkSave').onclick = () => saveBlog(lookTheme());
$('#lkReset').onclick = () => saveBlog({ template: $('#lkTpl').value, tokens: {} });
$('#lkDel').onclick = async () => { if (!confirm('¿Eliminar este blog y todas sus publicaciones?')) return; try { await API.req('/blogs/' + blog, { method: 'DELETE' }, true); blogs = blogs.filter(b => b.slug !== blog); blog = 'valeria'; drawBlogs(); clear(); await refresh(); drawLook(); } catch (e) { note(e.message); } };
$('#blogSel').onchange = async e => { blog = e.target.value; clear(); drawLook(); try { await refresh(); } catch (err) { note(err.message); } };
$('#newBlog').onclick = () => { $('#nbTitle').value = $('#nbSlug').value = ''; $('#nbErr').textContent = ''; $('#nbd').showModal(); };
$('#nbTitle').oninput = e => { $('#nbSlug').value = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30); };
$('#nbOk').onclick = async e => {
  e.preventDefault();
  try {
    const nb = await API.req('/blogs', { method: 'POST', body: { title: $('#nbTitle').value, slug: $('#nbSlug').value, template: $('#nbTpl').value } }, true);
    blogs.push(nb); blog = nb.slug; $('#nbd').close(); drawBlogs(); clear(); await refresh(); drawLook(); show('blog', 'look');
  } catch (err) { $('#nbErr').textContent = err.message; }
};

// ---- ESTADÍSTICAS ----
async function loadStats() {
  try {
    const s = await API.req('/stats' + bq(), {}, true), last = s.days[s.days.length - 1], max = Math.max(1, ...s.days.map(d => Math.max(d.blog, d.landing)));
    const kpi = [['Vistas del blog', s.total.blog], ['Vistas de la landing', s.total.landing], ['Visitantes del blog hoy', last.visitors], ['Vistas del blog (14 días)', s.days.reduce((a, d) => a + d.blog, 0)], ['Corazones', s.posts.reduce((a, p) => a + p.hearts, 0)]];
    $('#kpis').innerHTML = kpi.map(([l, v]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('');
    $('#chart').innerHTML = s.days.map(d => `<div class="col" title="${d.date}: blog ${d.blog}, landing ${d.landing}"><div class="pair"><i class="b1" style="height:${d.blog / max * 100}%"></i><i class="b2" style="height:${d.landing / max * 100}%"></i></div><small>${d.date.slice(8)}/${d.date.slice(5, 7)}</small></div>`).join('');
    $('#topposts').innerHTML = s.posts.length ? '<table><tr><th>Publicación</th><th>Vistas</th><th>♥</th></tr>' + s.posts.map(p => `<tr><td>${esc(p.title)}</td><td>${p.views}</td><td>${p.hearts}</td></tr>`).join('') + '</table>' : '<p class="empty">Aún no hay publicaciones.</p>';
  } catch (e) { say('No se pudieron cargar las estadísticas: ' + e.message); }
}
try { $('#skip').checked = !!localStorage.getItem('mb-skip'); } catch (e) {}
$('#skip').onchange = e => { try { e.target.checked ? localStorage.setItem('mb-skip', '1') : localStorage.removeItem('mb-skip'); } catch (err) {} };

// ---- Arranque ----
const [g0, v0] = location.hash.slice(1).split('/'); show(G[g0] ? g0 : 'blog', G[g0] && G[g0].includes(v0) ? v0 : undefined);
Promise.all([API.req('/blogs', {}, true).then(l => { blogs = l; drawBlogs(); drawLook(); }), refresh(), MiBlogStore.load(true).then(d => { data = d; drawLanding(); })]).then(() => say('Conectado ✔ Los cambios se guardan en el servidor.')).catch(e => say('No se pudo cargar: ' + e.message));
