// API de MiBlog (/api/v1/...). Público = solo lectura + corazones. CMS = requiere sesión de la dueña.
const crypto = require('crypto');
const { db, fail, send, token, authed, passwordOk, cleanLanding, cleanPost } = require('../lib/server');
const defaults = require('../data/posts.json');
const newest = (a, b) => (a.date < b.date ? 1 : -1);

module.exports = async (req, res) => {
  try {
    const [v, a, b, c, d] = [].concat(req.query.path || []), m = req.method, body = req.body;
    if (v !== 'v1') throw fail(404, 'Ruta no encontrada');
    const posts = () => db.get('posts', []);

    // ---------- API pública (lo que ven los visitantes) ----------
    if (a === 'public') {
      if (b === 'landing' && m === 'GET') return send(res, 200, await db.get('landing', defaults));
      if (b === 'posts' && !c && m === 'GET')
        return send(res, 200, (await posts()).filter(p => p.status === 'published').sort(newest)
          .map(({ id, title, text, image, date, hearts }) => ({ id, title, text, image, date, hearts })));
      if (b === 'posts' && c && d === 'hearts' && (m === 'POST' || m === 'DELETE')) {
        const all = await posts(), p = all.find(x => x.id === c && x.status === 'published');
        if (!p) throw fail(404, 'Publicación no encontrada');
        // Un corazón por visitante (huella anónima de IP + navegador): no se puede inflar repitiendo la petición
        const vid = crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.socket.remoteAddress) + (req.headers['user-agent'] || '') + (process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || '')).digest('hex').slice(0, 16);
        const likes = (await db.get('likes_' + c, [])).filter(x => x !== vid); if (m === 'POST') likes.push(vid);
        await db.set('likes_' + c, likes); p.hearts = likes.length; await db.set('posts', all);
        return send(res, 200, { hearts: p.hearts });
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
    if (a === 'landing' && m === 'GET') return send(res, 200, await db.get('landing', defaults));
    if (a === 'landing' && m === 'PUT') { const l = cleanLanding(body); await db.set('landing', l); return send(res, 200, l); }

    if (a === 'posts') {
      const all = await posts(), i = all.findIndex(x => x.id === b);
      if (!b && m === 'GET') return send(res, 200, all.sort(newest));
      if (!b && m === 'POST') { const p = { id: crypto.randomUUID(), ...cleanPost(body, null) }; all.push(p); await db.set('posts', all); return send(res, 201, p); }
      if (b && i < 0) throw fail(404, 'Publicación no encontrada');
      if (b && m === 'PUT') { all[i] = { id: b, ...cleanPost(body, all[i]) }; await db.set('posts', all); return send(res, 200, all[i]); }
      if (b && m === 'DELETE') { all.splice(i, 1); await db.set('posts', all); return send(res, 200, { deleted: b }); }
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
