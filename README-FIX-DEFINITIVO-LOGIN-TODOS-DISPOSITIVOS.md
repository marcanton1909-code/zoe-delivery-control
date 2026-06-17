# Fix definitivo de login web y móvil

Este paquete elimina la mezcla que causaba `Load failed` en móviles:

- Sin cookies cross-domain.
- Sin Pages Functions.
- Sin `_redirects`.
- Sin proxy.
- Frontend directo al Worker vía `VITE_API_BASE`.
- Todas las llamadas usan `Authorization: Bearer <token>`.
- El API responde CORS abierto porque la seguridad está en el token.
- El admin queda con contraseña canónica `Admin1234`, pero también acepta `Admin1234!` para reparar compatibilidad.

## Cloudflare Pages

Variables:

```env
NODE_VERSION=20
NPM_VERSION=10.8.2
VITE_API_BASE=https://zoe-delivery-api.marco-cruz.workers.dev
```

Build:

```text
Root directory: app
Build command: npm install --no-audit --no-fund --no-package-lock && npm run build
Build output directory: dist
```

## API

Ejecutar:

```bash
cd api
npm install
npm run deploy
```

## Acceso admin

```text
marco.cruz@mackavi.com
Admin1234
```

No borres usuarios en D1. Este fix conserva los usuarios ya creados.
