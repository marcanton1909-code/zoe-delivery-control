# Ajuste extracción PDF Zoé real

Este paquete corrige la extracción del PDF real descargado del portal de Zoé Water.

Cambios principales:

- Se agregó un extractor posicional para PDFs Zoé que usan glifos `<0001> Tj` con fuentes `/F11`, `/F12`, `/F13` y mapas `/ToUnicode`.
- Se evita el texto corrupto que aparecía como `Olinc{a`, `boniente`, etc.
- Se parsea la orden desde líneas reales para extraer mejor:
  - folio / pedido
  - empresa
  - nombre/contacto
  - dirección
  - notas/referencias
  - teléfonos dentro de notas
  - productos completos
  - cantidades
  - precios e importes
  - total
- No requiere migración nueva de D1.

## Subir cambios

```bash
cd ~/Desktop
unzip zoe-delivery-control-pdf-zoe-real-fixed.zip
cd zoe-delivery-control
git add .
git commit -m "fix zoe real pdf extraction"
git push origin main
```

## Actualizar API

```bash
cd api
npm install
npm run deploy
```

Después prueba:

Nueva orden → Subir PDF Zoé → Extraer datos
