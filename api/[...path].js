// API de MiBlog (/api/v1/...). Público = solo lectura + corazones. CMS = requiere sesión de la dueña.
const crypto = require('crypto');
const { db, fail, send, token, authed, passwordOk, cleanLanding, cleanPost, cleanTheme } = require('../lib/server');
const defaults = require('../data/posts.json');
const newest = (a, b) => (a.date < b.date ? 1 : -1);

module.exports = async (req, res) => {
  try {
    // En Vercel la ruta puede llegar como texto ("v1/auth/login") y en local como lista: aceptamos ambas
    const urlPath = new URL(req.url, 'http://x').pathname.replace(/^\/api\//, '');
    const raw = urlPath.startsWith('v1') ? urlPath : [].concat((req.query && req.query.path) || []).join('/');
    const [v, a, b, c, d] = raw.split('/').filter(Boolean), m = req.method, body = req.body;
    if (v !== 'v1') throw fail(404, 'Ruta no encontrada');
    // Varios blogs: cada uno tiene dirección (slug), título, tema y sus propias publicaciones. El blog original conserva su clave.
    const blogOf = s => { s = String(s || 'valeria').toLowerCase(); if (!/^[a-z0-9-]{2,30}$/.test(s)) throw fail(400, 'Dirección de blog no válida'); return s; };
    const pkey = s => (s === 'valeria' ? 'posts' : 'posts_' + s);
    const blog = blogOf(new URL(req.url, 'http://x').searchParams.get('blog'));
    const posts = s => db.get(pkey(s), []);
    const blogs = async () => (await db.get('blogs', null)) || [{ slug: 'valeria', title: 'Blog de Valeria', theme: { template: 'y2k', tokens: {} } }];
    const pub = ({ id, title, text, image, date, hearts }) => ({ id, title, text, image, date, hearts });

    // ---------- API pública (lo que ven los visitantes) ----------
    if (a === 'public') {
      // Diagnóstico: solo dice si cada pieza está configurada (nunca muestra valores secretos)
      if (b === 'health') return send(res, 200, { api: true, database: !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL), admin_password: !!process.env.ADMIN_PASSWORD, auth_secret: !!process.env.AUTH_SECRET, blob: !!process.env.BLOB_READ_WRITE_TOKEN });
      if (b === 'landing' && m === 'GET') return send(res, 200, await db.get('landing', defaults));
      if (b === 'blogs' && c && m === 'GET') {
        const s = blogOf(c), info = (await blogs()).find(x => x.slug === s);
        if (!info) throw fail(404, 'Blog no encontrado');
        return send(res, 200, { slug: s, title: info.title, theme: info.theme, posts: (await posts(s)).filter(p => p.status === 'published').sort(newest).map(pub) });
      }
      if (b === 'posts' && !c && m === 'GET')
        return send(res, 200, (await posts(blog)).filter(p => p.status === 'published').sort(newest)
          .map(({ id, title, text, image, date, hearts }) => ({ id, title, text, image, date, hearts })));
      if (b === 'posts' && c && d === 'hearts' && (m === 'POST' || m === 'DELETE')) {
        const all = await posts(blog), p = all.find(x => x.id === c && x.status === 'published');
        if (!p) throw fail(404, 'Publicación no encontrada');
        // Un corazón por visitante (huella anónima de IP + navegador): no se puede inflar repitiendo la petición
        const vid = crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.socket.remoteAddress) + (req.headers['user-agent'] || '') + (process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || '')).digest('hex').slice(0, 16);
        const likes = (await db.get('likes_' + c, [])).filter(x => x !== vid); if (m === 'POST') likes.push(vid);
        await db.set('likes_' + c, likes); p.hearts = likes.length; await db.set(pkey(blog), all);
        return send(res, 200, { hearts: p.hearts });
      }
      // Estadísticas anónimas: solo cuenta; la huella cambia cada día y nunca se guarda la IP
      if (b === 'views' && m === 'POST') {
        const page = body && body.page, ids = [].concat((body && body.posts) || []).filter(x => typeof x === 'string' && x.length < 60).slice(0, 50);
        if ((!page && !ids.length) || (page && !['blog', 'landing'].includes(page))) throw fail(400, 'Datos no válidos');
        const day = new Date().toISOString().slice(0, 10);
        const vid = crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.socket.remoteAddress) + (req.headers['user-agent'] || '') + (process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || '') + day).digest('hex').slice(0, 12);
        const [dd, t] = await Promise.all([db.get('views_' + day, { views: {}, uniq: {} }), db.get('views_total', { views: {}, posts: {} })]);
        if (page) { dd.views[page] = (dd.views[page] || 0) + 1; t.views[page] = (t.views[page] || 0) + 1; const u = dd.uniq[page] = dd.uniq[page] || []; if (!u.includes(vid) && u.length < 5000) u.push(vid); }
        ids.forEach(id => { t.posts[id] = (t.posts[id] || 0) + 1; });
        await Promise.all([db.set('views_' + day, dd), db.set('views_total', t)]);
        return send(res, 200, { ok: true });
      }
      throw fail(404, 'Ruta no encontrada');
    }

    // ---------- Sesión ----------
    if (a === 'auth' && b === 'login' && m === 'POST') {
      if (!passwordOk(body && body.password)) { await new Promise(r => setTimeout(r, 700)); throw fail(401, 'Contraseña incorrecta'); }
      return send(res, 200, { token: token() });
    }

    // ---------- API del CMS (solo la dueña) ----------
    if (!authed(req)) throw fail(401, 'No autorizado');
    if (a === 'stats' && m === 'GET') {
      const days = [...Array(14)].map((_, i) => new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10));
      const [rows, t, all] = await Promise.all([Promise.all(days.map(x => db.get('views_' + x, { views: {}, uniq: {} }))), db.get('views_total', { views: {}, posts: {} }), posts(blog)]);
      return send(res, 200, {
        days: days.map((date, i) => ({ date, blog: rows[i].views.blog || 0, landing: rows[i].views.landing || 0, visitors: (rows[i].uniq.blog || []).length })),
        total: { blog: t.views.blog || 0, landing: t.views.landing || 0 },
        posts: all.filter(p => p.status === 'published').map(p => ({ id: p.id, title: p.title, views: t.posts[p.id] || 0, hearts: p.hearts || 0 })).sort((x, y) => y.views - x.views)
      });
    }
    if (a === 'landing' && m === 'GET') return send(res, 200, await db.get('landing', defaults));
    if (a === 'landing' && m === 'PUT') { const l = cleanLanding(body); await db.set('landing', l); return send(res, 200, l); }

    if (a === 'blogs') {
      const list = await blogs(), i = list.findIndex(x => x.slug === b), name = String((body && body.title) || '').trim().slice(0, 60);
      if (!b && m === 'GET') return send(res, 200, list);
      if (!b && m === 'POST') {
        if (!name || !body.slug) throw fail(400, 'Falta el nombre o la dirección del blog');
        const slug = blogOf(body.slug); if (list.some(x => x.slug === slug)) throw fail(409, 'Esa dirección ya existe');
        const nb = { slug, title: name, theme: cleanTheme({ template: body.template || 'minimal' }), created: new Date().toISOString() };
        list.push(nb); await db.set('blogs', list); return send(res, 201, nb);
      }
      if (b && i < 0) throw fail(404, 'Blog no encontrado');
      if (b && m === 'PUT') { if (name) list[i].title = name; if (body.theme) list[i].theme = cleanTheme(body.theme); await db.set('blogs', list); return send(res, 200, list[i]); }
      if (b && m === 'DELETE') { if (b === 'valeria') throw fail(400, 'El blog principal no se puede eliminar'); list.splice(i, 1); await db.set('blogs', list); await db.set(pkey(b), []); return send(res, 200, { deleted: b }); }
    }

    if (a === 'posts') {
      const all = await posts(blog), i = all.findIndex(x => x.id === b);
      if (!b && m === 'GET') return send(res, 200, all.sort(newest));
      if (!b && m === 'POST') { const p = { id: crypto.randomUUID(), ...cleanPost(body, null) }; all.push(p); await db.set(pkey(blog), all); return send(res, 201, p); }
      if (b && i < 0) throw fail(404, 'Publicación no encontrada');
      if (b && m === 'PUT') { all[i] = { id: b, ...cleanPost(body, all[i]) }; await db.set(pkey(blog), all); return send(res, 200, all[i]); }
      if (b && m === 'DELETE') { all.splice(i, 1); await db.set(pkey(blog), all); return send(res, 200, { deleted: b }); }
    }

    if (a === 'uploads' && m === 'POST') {
      const s = (body && body.data) || '', k = /^data:image\/(jpeg|png|webp|gif);base64,/.exec(s);
      if (!k || s.length > 4e6) throw fail(400, 'Imagen no válida (jpeg, png, webp o gif, máx. ~3 MB)');
      if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 200, { url: s }); // sin Blob, la imagen queda incrustada
      const { put } = await import('@vercel/blob');
      const r = await put('miblog/' + crypto.randomUUID() + '.' + k[1], Buffer.from(s.slice(k[0].length), 'base64'),
        { access: 'public', contentType: 'image/' + k[1], addRandomSuffix: false });
      return send(res, 200, { url: r.url });
    }
    throw fail(404, 'Ruta no encontrada');
  } catch (e) {
    if (!e.code) console.error(e);
    send(res, e.code || 500, { error: e.code ? e.message : 'Error del servidor' });
  }
};
