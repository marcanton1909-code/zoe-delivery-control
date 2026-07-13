# Configuración recomendada de Cloudflare Pages

Usar estos valores:

- Root directory: `app`
- Build command: `npm install --no-audit --no-fund --no-package-lock && npm run build`
- Build output directory: `dist`

Variables de entorno:

- `NODE_VERSION=20`
- `NPM_VERSION=10.8.2`
- `VITE_API_BASE=https://zoe-delivery-api.marco-cruz.workers.dev`

Este paquete NO incluye `package-lock.json` para evitar que Cloudflare Pages use `npm clean-install`/`npm ci` y se atore con el error `Exit handler never called`.
