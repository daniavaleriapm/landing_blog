// Motor de temas: un tema = plantilla + ajustes (colores, fuentes, esquinas). Se aplica con variables de CSS.
const Themes = {
  fonts: ['Orbitron', 'Share Tech Mono', 'Courier Prime', 'Poppins', 'Nunito', 'Lora', 'Playfair Display', 'Space Mono', 'Pacifico', 'Georgia'],
  templates: {
    y2k: { name: 'Y2K rosa', accent: '#d1538f', bg: '#f4a6c8', card: '#ffffff', text: '#7a5a68', border: '#f6c3d9', headingFont: 'Orbitron', bodyFont: 'Share Tech Mono', radius: 22 },
    minimal: { name: 'Minimalista', accent: '#222222', bg: '#fafafa', card: '#ffffff', text: '#333333', border: '#e5e5e5', headingFont: 'Poppins', bodyFont: 'Nunito', radius: 10 },
    oscuro: { name: 'Oscuro', accent: '#7dd3fc', bg: '#0f172a', card: '#1e293b', text: '#e2e8f0', border: '#334155', headingFont: 'Space Mono', bodyFont: 'Nunito', radius: 12 },
    pastel: { name: 'Pastel', accent: '#7c6cf0', bg: '#eef2ff', card: '#ffffff', text: '#46506b', border: '#d6defa', headingFont: 'Pacifico', bodyFont: 'Nunito', radius: 28 }
  },
  resolve(t) { const k = t && this.templates[t.template] ? t.template : 'minimal'; return { template: k, ...this.templates[k], ...((t && t.tokens) || {}) }; },
  apply(theme) {
    const t = this.resolve(theme), r = document.documentElement, f = n => `'${n}', ${n === 'Georgia' ? 'serif' : 'sans-serif'}`;
    r.dataset.template = t.template;
    [['--accent', t.accent], ['--bg', t.bg], ['--card', t.card], ['--text', t.text], ['--border', t.border], ['--hf', f(t.headingFont)], ['--bf', f(t.bodyFont)], ['--r', t.radius + 'px']].forEach(([k, v]) => r.style.setProperty(k, v));
    const fam = [...new Set([t.headingFont, t.bodyFont])].filter(x => x !== 'Georgia').map(x => 'family=' + x.replace(/ /g, '+') + ':wght@400;700').join('&');
    let l = document.getElementById('themeFonts'); if (!l) { l = document.createElement('link'); l.id = 'themeFonts'; l.rel = 'stylesheet'; document.head.appendChild(l); }
    l.href = 'https://fonts.googleapis.com/css2?' + fam + '&display=swap';
    return t;
  }
};
