# Fix acceso móvil por PIN

Esta versión agrega un acceso de recuperación móvil en login.

Usuario admin: marco.cruz@mackavi.com
Contraseña normal: Admin1234
PIN móvil de emergencia: 4321

El botón "Entrar con PIN móvil" llama `/api/auth/mobile-admin`, repara el admin principal y devuelve token Bearer sin depender de cookies.

Después de subir:

```bash
cd api
npm install
npm run deploy
```

Y redeploy de Cloudflare Pages.
