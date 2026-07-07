# Fix: órdenes con fecha anterior no aparecen en almacén/repartidor

Este ajuste corrige la lógica que filtraba las entregas del repartidor solo por la fecha actual.

## Problema

Las órdenes capturadas hoy pero con fecha programada anterior quedaban fuera de la vista de Repartidor, por lo que no podían marcarse como entregadas.

También se ajustó Almacén para mostrar todas las órdenes activas no finalizadas sin limitar por fecha.

## Cambios

- Repartidor ahora muestra órdenes pendientes con estatus:
  - `en_ruta`
  - `cargada`
  - `programada`
- Ya no filtra solo por fecha de hoy.
- Almacén muestra órdenes activas no finalizadas:
  - `pendiente_validacion`
  - `programada`
  - `carga_incompleta`
  - `cargada`
  - `en_ruta`
- Almacén permite validar carga y enviar a ruta cuando aplique.
- No requiere migración D1.

## Subida

```bash
cd ~/Desktop
unzip -o zoe-delivery-control-order-date-flow-fix.zip
cd zoe-delivery-control
git add .
git commit -m "fix older order delivery flow"
git push origin main
```

Este cambio es frontend. No requiere desplegar API, aunque puedes hacerlo para mantener sincronizado.
