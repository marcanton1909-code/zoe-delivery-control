# Fix autollenado formato MTY/OUT

Este ajuste corrige el flujo de `Nueva orden → Subir PDF → Extraer datos` para que los datos extraídos del recibo Zoé nuevo se apliquen automáticamente a los campos del formulario.

Incluye:

- Mejor parseo del formato `MTY/OUT/00002`.
- Autollenado de folio, orden, fecha de envío, destinatario, teléfono, dirección y producto.
- La fecha programada se llena automáticamente con la fecha de envío cuando viene en el PDF.
- Los renglones de producto llenan la tabla PRODUCTO / ORDENADO / ENTREGADO.
- No requiere migración D1.
- No requiere redeploy del API salvo que quieras mantener el paquete sincronizado.
