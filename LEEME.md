# MiBlog — CMS y APIs

**Local:** `npm start` → http://localhost:3000 · CMS: `/admin.html` (apartados Blog y Landing) · contraseña local: `admin`. Los datos se guardan en `.data/`.

**Vercel (desde GitHub):** importa el repositorio y en *Storage* conecta **Upstash Redis** y **Blob**. En *Environment Variables* agrega `ADMIN_PASSWORD` (tu contraseña) y `AUTH_SECRET` (texto largo aleatorio).

**API `/api/v1`**
- Pública: `GET /public/landing` · `GET /public/posts` · `POST|DELETE /public/posts/{id}/hearts`
- CMS (con token): `POST /auth/login` · `GET|PUT /landing` · `GET|POST /posts` · `PUT|DELETE /posts/{id}` · `POST /uploads`

**Corazones:** un corazón por visitante (huella anónima de IP + navegador), sin cuentas.
