# Inicio rápido - Zoé Delivery Control

Esta versión incluye setup simplificado.

## 1. API

```bash
cd api
npm install
npx wrangler login
npx wrangler d1 create zoe-delivery-db
npx wrangler r2 bucket create zoe-delivery-files
npx wrangler secret put JWT_SECRET
npm run deploy
```

Si R2 ya lo creaste desde el dashboard, no repitas el comando de R2.

Edita `api/wrangler.toml` y pega el `database_id` real antes del deploy.

## 2. Frontend

En Cloudflare Pages:

- Root directory: `app`
- Build command: `npm install && npm run build`
- Build output directory: `dist`
- Variable: `VITE_API_BASE=https://TU-WORKER.workers.dev`

## 3. Primer usuario

Abre la URL de Pages. En login presiona:

`Crear / reparar administrador`

Captura nombre, correo y contraseña. Al guardar, entra directo.

Si la base de datos no tiene tablas, esta versión las crea automáticamente durante ese setup.
