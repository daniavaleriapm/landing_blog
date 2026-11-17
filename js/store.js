// Datos de la landing: la API es la fuente; si no responde (p. ej. abierto como archivo) se usa la copia local.
const MiBlogStore = {
  async load(admin) {
    try { return await API.req(admin ? '/landing' : '/public/landing', {}, admin); } catch (e) { if (admin) throw e; }
    return JSON.parse(JSON.stringify(window.MIBLOG_DEFAULT));
  },
  async save(d) { await API.inline(d); await API.req('/landing', { method: 'PUT', body: d }, true); },
  async reset() { const d = JSON.parse(JSON.stringify(window.MIBLOG_DEFAULT)); await API.req('/landing', { method: 'PUT', body: d }, true); return d; }
};
