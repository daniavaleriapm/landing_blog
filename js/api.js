// Cliente de la API (/api/v1). Las páginas de administración piden la contraseña y guardan el token en la sesión.
const API = {
  base: '/api/v1',
  async req(path, opt = {}, auth = false) {
    const h = { 'Content-Type': 'application/json' };
    if (auth) { await this.gate(); h.Authorization = 'Bearer ' + sessionStorage.getItem('mb-token'); }
    const r = await fetch(this.base + path, { method: opt.method, headers: h, body: opt.body && JSON.stringify(opt.body) });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (r.status === 401 && auth) { sessionStorage.removeItem('mb-token'); return this.req(path, opt, auth); }
    if (!r.ok) throw Object.assign(new Error((j && j.error) || 'No hay servidor disponible (' + r.status + ')'), { status: r.status });
    return j;
  },
  gate() {
    if (sessionStorage.getItem('mb-token')) return Promise.resolve();
    return this._g || (this._g = new Promise(ok => {
      const d = document.createElement('dialog');
      d.style.cssText = 'border:3px solid #d1538f;border-radius:16px;background:#fff';
      d.innerHTML = '<form style="display:grid;gap:10px;font:16px \'Share Tech Mono\',monospace;color:#6b4226"><b>Contraseña de administradora</b><input type="password" autocomplete="current-password" required style="padding:8px;border:2px solid #f0b4cf;border-radius:10px"><small style="color:#e0245e"></small><button style="padding:8px;border-radius:999px;border:2px solid #d1538f;background:#fff;color:#d1538f;cursor:pointer">Entrar</button></form>';
      document.body.append(d); d.addEventListener('cancel', e => e.preventDefault()); d.showModal();
      d.querySelector('form').onsubmit = async e => {
        e.preventDefault();
        try {
          const r = await fetch(this.base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: d.querySelector('input').value }) });
          const j = await r.json().catch(() => ({ error: 'No hay servidor (API) disponible' }));
          if (!r.ok) throw new Error(j.error);
          sessionStorage.setItem('mb-token', j.token); d.remove(); this._g = null; ok();
        } catch (err) { d.querySelector('small').textContent = err.message; }
      };
    }));
  },
  async upload(dataUrl) {
    const u = (await this.req('/uploads', { method: 'POST', body: { data: dataUrl } }, true)).url;
    if (u === dataUrl) this.noBlob = true; // sin Vercel Blob la imagen se guarda incrustada
    return u;
  },
  async inline(o) { // sube las imágenes nuevas (data:) y pone su URL en el mismo objeto
    if (this.noBlob) return;
    for (const k in o) { const v = o[k]; if (typeof v === 'string' && v.startsWith('data:image/')) o[k] = await this.upload(v); else if (v && typeof v === 'object') await this.inline(v); }
  }
};
