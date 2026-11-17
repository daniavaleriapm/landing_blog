// Servidor local (sin Vercel CLI): npm start -> http://localhost:3000
process.env.ADMIN_PASSWORD ||= 'admin';
const http = require('http'), fs = require('fs'), path = require('path'), api = require('./api/[...path].js');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    let raw = ''; req.on('data', c => raw += c).on('end', () => {
      try { req.body = raw ? JSON.parse(raw) : undefined; } catch { req.body = undefined; }
      req.query = { path: u.pathname.slice(5).split('/').filter(Boolean) }; api(req, res);
    }); return;
  }
  const f = path.join(__dirname, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname));
  if (u.pathname.includes('/.') || !f.startsWith(__dirname) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('No encontrado'); }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
}).listen(3000, () => console.log('http://localhost:3000  (contraseña local: ' + process.env.ADMIN_PASSWORD + ')'));
