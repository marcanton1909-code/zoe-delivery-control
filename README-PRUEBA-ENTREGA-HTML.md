# Actualización: prueba de entrega Zoé reconstruida en HTML

Esta versión agrega una plantilla HTML tipo orden Zoé para capturar y consultar la prueba de entrega desde celular.

## Cambios incluidos

- Nueva plantilla `ZoeProofDocument` con formato similar al documento de Zoé.
- Nueva pantalla `#/orders/:id/proof` para ver/imprimir/guardar PDF desde navegador.
- La vista del repartidor ahora captura la firma dentro del formato reconstruido.
- Nueva captura de productos por renglón al crear una orden.
- Nuevos campos de orden: empresa, correo, referencias, nota de pago, total y productos.
- El enlace a archivos R2 ahora incluye token de sesión para que firmas/fotos puedan verse en la prueba HTML.
- Mensaje amigable cuando se intenta duplicar un folio Zoé.

## Migración requerida en D1

Después de subir el API, aplica la migración nueva:

```bash
cd api
npx wrangler d1 migrations apply zoe-delivery-db --remote
```

La migración nueva es:

```bash
api/migrations/0004_order_proof_template.sql
```

## Deploy recomendado

Frontend Pages:

```text
Root directory: app
Build command: npm install --no-audit --no-fund --no-package-lock && npm run build
Build output directory: dist
```

Variables Pages:

```env
NODE_VERSION=20
NPM_VERSION=10.8.2
VITE_API_BASE=https://zoe-delivery-api.marco-cruz.workers.dev
```

API Worker:

```bash
cd api
npm install
npm run deploy
npx wrangler d1 migrations apply zoe-delivery-db --remote
```
