# Actualización formato recibo MTY/OUT Zoé

Esta versión adapta la herramienta al nuevo recibo de entrega descargado del portal de Zoé Water, como el archivo `Recibo de entrega - Mario Martinez - MTY_OUT_00002.pdf`.

## Cambios incluidos

- La prueba de entrega HTML ahora replica el formato nuevo:
  - Logo Zoé.
  - Datos del emisor `AGUA, VIDA Y NUTRICION`.
  - Dirección de envío.
  - Folio tipo `MTY/OUT/00002`.
  - Orden interna tipo `S01054`.
  - Fecha de envío.
  - Transportista `Mackavi`.
  - Tabla `PRODUCTO / ORDENADO / ENTREGADO`.
  - Área de firma y fecha.
- El extractor PDF.js del navegador detecta el nuevo formato y llena:
  - Folio/recibo.
  - Orden interna.
  - Fecha de envío.
  - Destinatario.
  - Dirección de envío.
  - Teléfono.
  - Producto.
  - Cantidad ordenada.
  - Cantidad entregada.
- Se actualizó la pantalla de nueva orden para usar el lenguaje del nuevo formato.

## Despliegue

No requiere migración nueva D1.

1. Subir cambios a GitHub.
2. Esperar redeploy de Cloudflare Pages.
3. Redeploy del API solo si cambiaste archivos dentro de `/api`.

