# Acceso inicial

Usuario admin fijo:

- Correo: marco.cruz@mackavi.com
- Contraseña: Admin1234!

Esta versión guarda el token de sesión en localStorage y también permite cookies.

## Actualizar

```bash
cd ~/Desktop/zoe-delivery-control
git add .
git commit -m "fix admin login token"
git push origin main

cd api
npm install
npm run deploy
```

En Cloudflare Pages confirma:

- Root directory: app
- Build command: npm install && npm run build
- Build output directory: dist
- Variable: VITE_API_BASE=https://TU-WORKER.workers.dev

Después de cambiar la variable, redeploy de Pages.
