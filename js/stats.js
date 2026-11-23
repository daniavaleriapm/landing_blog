// Estadísticas anónimas: cuenta visitas a la landing y al blog (no guarda IP ni datos personales)
(() => {
  try { if (localStorage.getItem('mb-skip')) return; } catch (e) {} // la dueña puede pedir que no se cuenten sus visitas
  const send = body => fetch('/api/v1/public/views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
  send({ page: document.body.dataset.page });
  const feed = document.getElementById('feed'); if (!feed || !window.IntersectionObserver) return;
  const seen = new Set(), queue = []; let t;
  // Cada publicación cuenta una vista cuando el visitante la ve en pantalla
  const io = new IntersectionObserver(es => es.forEach(e => {
    const id = e.target.dataset.id; if (!e.isIntersecting || seen.has(id)) return;
    seen.add(id); queue.push(id); io.unobserve(e.target); clearTimeout(t); t = setTimeout(() => send({ posts: queue.splice(0) }), 1500);
  }), { threshold: .5 });
  const watch = () => feed.querySelectorAll('.post[data-id]').forEach(p => io.observe(p));
  new MutationObserver(watch).observe(feed, { childList: true }); watch();
})();
