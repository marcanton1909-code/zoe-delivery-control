# Fix extracción PDF Zoé con PDF.js en navegador

Este paquete cambia la extracción de datos de órdenes Zoé para que se haga primero en el navegador usando PDF.js.

Motivo: los PDFs reales descargados del portal Zoé tienen texto seleccionable, pero usan fuentes internas y codificación que el extractor manual del Worker puede decodificar mal. PDF.js sí interpreta correctamente esas fuentes.

## Qué cambia

- Nuevo archivo: `app/src/utils/zoePdfClient.ts`.
- La pantalla `Nueva orden` intenta extraer primero con PDF.js en el navegador.
- Si el navegador no puede leer el PDF, hace fallback al endpoint del API.
- El PDF original se sube al guardar la orden, igual que antes.
- No requiere migración D1.
- Normalmente solo requiere redeploy de Cloudflare Pages.

## Campos que intenta extraer

- Folio/Pedido Zoé
- Empresa
- Nombre/contacto
- Dirección de entrega
- Referencias/notas
- Teléfono dentro de notas
- Productos del pedido
- Cantidad
- Precio unitario
- Importe
- Total

## Deploy recomendado

```bash
cd ~/Desktop
unzip zoe-delivery-control-pdfjs-client-extractor.zip
cd zoe-delivery-control
git add .
git commit -m "fix zoe pdf extraction with pdfjs"
git push origin main
```

Cloudflare Pages:

```text
Root directory: app
Build command: npm install --no-audit --no-fund --no-package-lock && npm run build
Build output directory: dist
```

No necesitas aplicar migraciones.
