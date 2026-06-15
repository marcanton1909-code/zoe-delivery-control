# Ajuste: nombre de quien recibe opcional + colores legibles

Cambios incluidos:

- El campo `Nombre de quien recibe` ya no es obligatorio para guardar una entrega completa o parcial.
- La firma sigue siendo obligatoria para entrega completa/parcial.
- Se ajustó el placeholder en la prueba de entrega a `Nombre de quien recibe (opcional)`.
- Se ajustó la paleta de inputs/select/date para que los textos, calendarios y controles sean visibles.
- Se hicieron visibles las barras/flechas de desplazamiento en tablas y contenedores.
- Se reforzó contraste de botones primarios, secundarios, ghost y danger.

## Subir cambios

```bash
cd ~/Desktop
unzip zoe-delivery-control-receiver-optional-colors.zip
cd zoe-delivery-control
git add .
git commit -m "fix receiver optional and color contrast"
git push origin main
```

## Actualizar API

Este cambio incluye backend, así que despliega el Worker:

```bash
cd api
npm install
npm run deploy
```

## Frontend

Cloudflare Pages debe redeployar desde GitHub.

Configuración recomendada:

```text
Root directory: app
Build command: npm install --no-audit --no-fund --no-package-lock && npm run build
Build output directory: dist
```
