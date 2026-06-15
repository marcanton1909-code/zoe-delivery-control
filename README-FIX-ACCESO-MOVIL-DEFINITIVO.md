# Fix definitivo para acceso móvil

Este paquete cambia el frontend para que todas las llamadas al API sean del mismo origen:

- Antes: `https://pages.dev` llamaba directo a `https://workers.dev`
- Ahora: `https://pages.dev/api/...` se reescribe internamente al Worker usando `_redirects`

Esto elimina los errores móviles tipo:

- `Load failed`
- `Failed to fetch`
- problemas de CORS
- problemas de cookies entre dominios distintos

## Configuración de Cloudflare Pages

Usar:

- Root directory: `app`
- Build command: `npm install --no-audit --no-fund --no-package-lock && npm run build`
- Build output directory: `dist`

Variables recomendadas:

```env
NODE_VERSION=20
NPM_VERSION=10.8.2
```

Importante: elimina o deja vacía `VITE_API_BASE` en Cloudflare Pages. El frontend ya usa `/api` mismo dominio.

## API Worker

El Worker sigue siendo:

`https://zoe-delivery-api.marco-cruz.workers.dev`

No requiere migración D1 nueva.

## Prueba

Después del deploy, abre:

`https://TU-PAGES.pages.dev/health`

Debe responder algo como:

```json
{"ok":true,"name":"Zoé Delivery Control"}
```

Luego entra desde celular con cualquier usuario creado en la herramienta.
