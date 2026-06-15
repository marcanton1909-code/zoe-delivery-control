# Actualización: Clientes + extracción desde PDF Zoé

Esta versión agrega una base de clientes y un asistente de carga de PDF Zoé.

## Qué incluye

- Nueva sección **Clientes** en la app.
- Nueva tabla `customers`.
- Nueva tabla `customer_orders` para relacionar clientes con órdenes.
- Al guardar una orden, el sistema crea o actualiza el cliente automáticamente.
- En **Nueva orden**, puedes subir el PDF descargado del portal Zoé y presionar **Extraer datos**.
- El sistema intenta leer:
  - Folio / Pedido Zoé
  - Empresa
  - Nombre/contacto
  - Principal/teléfono
  - Correo
  - Dirección
  - Referencias
  - Productos
  - Total
- Antes de guardar, el coordinador puede revisar y corregir los datos.

## Importante

La extracción funciona mejor cuando el PDF tiene texto seleccionable.
Si el PDF es una imagen escaneada, una foto, o viene comprimido sin texto visible, el sistema guardará el PDF pero pedirá corregir los campos manualmente.

## Migración nueva

Aplicar en Cloudflare D1:

```bash
cd api
npx wrangler d1 migrations apply zoe-delivery-db --remote
```

La migración nueva es:

```text
api/migrations/0005_customers_pdf_import.sql
```

## Despliegue

Frontend Pages:

```text
Root directory: app
Build command: npm install --no-audit --no-fund --no-package-lock && npm run build
Build output directory: dist
```

API Worker:

```bash
cd api
npm install
npm run deploy
```
