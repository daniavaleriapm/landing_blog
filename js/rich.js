// Texto con formato de las publicaciones: solo se permiten etiquetas y estilos seguros
const Rich = {
  tags: 'B STRONG I EM U S SPAN A UL OL LI BR DIV P H3'.split(' '),
  props: ['color', 'background-color', 'font-size', 'text-align', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line'],
  clean(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    const walk = n => {
      for (const c of [...n.childNodes]) {
        if (c.nodeType === 3) continue;
        if (c.nodeType !== 1) { c.remove(); continue; }
        walk(c);
        if (!this.tags.includes(c.tagName)) { /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|MATH|NOSCRIPT|TEMPLATE|TEXTAREA|SELECT)$/.test(c.tagName) ? c.remove() : c.replaceWith(...c.childNodes); continue; }
        for (const a of [...c.attributes]) {
          if (a.name === 'style') {
            const ok = a.value.split(';').map(s => s.trim()).filter(s => { const [k, ...v] = s.split(':'), val = v.join(':').trim(); return this.props.includes(k.trim().toLowerCase()) && /^[#\w\s().,%-]+$/.test(val) && !/url|expression/i.test(val); });
            ok.length ? c.setAttribute('style', ok.join(';')) : c.removeAttribute('style');
          } else if (!(a.name === 'href' && c.tagName === 'A' && /^(https?:|mailto:)/i.test(a.value.trim()))) c.removeAttribute(a.name);
        }
        if (c.tagName === 'A') { c.target = '_blank'; c.rel = 'noopener noreferrer'; }
      }
    };
    walk(t.content); return t.innerHTML;
  },
  // Las publicaciones viejas son texto simple; las nuevas traen formato
  render(s) { s = String(s ?? ''); return /^\s*</.test(s) ? Rich.clean(s) : s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])).replace(/\n/g, '<br>'); }
};
