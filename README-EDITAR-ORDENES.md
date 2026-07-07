# Ajuste: edición de órdenes capturadas

Este paquete agrega la opción de editar órdenes ya capturadas para corrección de datos antes de la entrega.

## Cambios incluidos

- Nuevo botón **Editar datos** en el detalle de la orden.
- Nueva pantalla `#/orders/:id/edit`.
- Permite corregir:
  - Folio / recibo Zoé.
  - Fecha de envío.
  - Fecha programada.
  - Empresa / cliente.
  - Destinatario / contacto.
  - Teléfono.
  - Correo.
  - Dirección de entrega.
  - Notas / referencia.
  - Ruta.
  - Repartidor.
  - Unidad.
  - Nota de pago.
  - Observaciones internas.
  - Productos del recibo.
  - Cantidad ordenada.
  - Cantidad entregada.

## Reglas

- Solo admin y coordinador pueden editar.
- Las órdenes finalizadas no se editan directamente.
- Si la orden ya está entregada, parcial, no entregada, rechazada o cancelada, primero debe reabrirse desde el detalle.
- Si se cambia el folio, el sistema valida que no exista otro igual.
- Al guardar, también se actualiza la relación con clientes.

## Despliegue

No requiere migración nueva D1.

Después de subir el repo:

```bash
cd api
npm install
npm run deploy
```

Cloudflare Pages se redeploya desde GitHub.
