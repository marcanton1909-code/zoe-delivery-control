# Zoé Delivery Control

Sistema interno para digitalizar entregas de órdenes Zoé Water sin depender de API del portal de Zoé.

## Stack

- Frontend PWA: React + Vite
- API: Cloudflare Worker TypeScript
- Base de datos: Cloudflare D1
- Archivos: Cloudflare R2
- Evidencia PDF: pdf-lib
- Correos: Resend, opcional
- Login: interno con sesiones en D1

## Estructura

```txt
zoe-delivery-control/
├── app/   # PWA React para Cloudflare Pages
└── api/   # Cloudflare Worker + D1 + R2
```

## Funcionalidad incluida

- Login interno.
- Setup del primer administrador.
- Roles: admin, coordinador, almacén y repartidor.
- Creación de usuarios.
- Creación de rutas.
- Carga de órdenes con PDF original Zoé.
- Asignación de ruta, unidad y repartidor.
- Validación de almacén.
- Vista móvil para repartidor.
- Captura de firma en pantalla.
- Foto de evidencia.
- GPS opcional.
- Generación de PDF de evidencia.
- Envío opcional de correo por Resend.
- Dashboard operativo.
- Reporte mensual CSV.
- Bitácora vehicular con checklist antes de salida a reparto.
- Captura manual de kilometraje.
- Selección de nivel de gasolina: tanque lleno, 3/4, medio tanque, 1/4 o reserva.
- Revisión de llantas y llanta de refacción.
- Carga de fotos de kilometraje, gasolina, llantas y refacción desde celular.

## Variables API

En `api/wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGIN = "http://localhost:5173"
MAIL_FROM = "Zoé Delivery Control <entregas@tudominio.com>"
MAIL_COORDINACION = "coordinacion@tudominio.com"
APP_NAME = "Zoé Delivery Control"
```

Secrets:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
```

`RESEND_API_KEY` puede dejarse vacío si no quieres activar correo todavía.

## Variables Frontend

En Cloudflare Pages o `.env.local` dentro de `app/`:

```env
VITE_API_BASE=https://tu-worker.workers.dev
```

## Desarrollo local

Terminal 1:

```bash
cd api
npm install
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply zoe-delivery-db --local
npm run dev
```

Terminal 2:

```bash
cd app
npm install
cp .env.example .env.local
npm run dev
```

Abrir:

```txt
http://localhost:5173
```

## Setup inicial

Desde la pantalla de login, usar “Crear primer administrador”.

O por terminal:

```bash
curl -X POST http://localhost:8787/api/setup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@empresa.com","password":"Admin12345"}'
```

Después iniciar sesión normalmente.

## Despliegue recomendado

1. Crear D1.
2. Crear R2.
3. Configurar `api/wrangler.toml`.
4. Aplicar migraciones remotas.
5. Cargar secrets.
6. Deploy Worker API.
7. Deploy frontend en Cloudflare Pages.
8. Actualizar `ALLOWED_ORIGIN` en API con el URL final de Pages.
9. Probar login, orden, firma y reporte.


## Módulo agregado: Bitácora vehicular

La versión actual incluye una pantalla nueva:

```txt
#/vehicle-checklist
```

Desde esta pantalla se puede registrar el checklist del vehículo que sale a reparto:

- Fecha de revisión.
- Unidad / vehículo.
- Ruta opcional.
- Repartidor opcional.
- Nombre de quien revisa.
- Kilometraje manual.
- Nivel de gasolina:
  - Tanque lleno.
  - 3/4 de tanque.
  - Medio tanque.
  - 1/4 de tanque.
  - Reserva.
- Revisión de llantas.
- Revisión de llanta de refacción.
- Foto de kilometraje.
- Foto del nivel de gasolina.
- Foto del estado de las llantas.
- Foto de la llanta de refacción.
- Observaciones.

Las fotos se guardan en R2 bajo la carpeta:

```txt
vehicle-checklists/YYYY/MM/
```

La información estructurada se guarda en D1 en la tabla:

```txt
vehicle_checklists
```

También se agregó reporte CSV mensual para bitácoras:

```txt
/api/reports/vehicle-checklists?month=YYYY-MM
```

## Migraciones

Si ya habías desplegado la primera versión, aplica la nueva migración antes de usar la bitácora vehicular:

```bash
cd api
npx wrangler d1 migrations apply zoe-delivery-db --remote
```

Para local:

```bash
cd api
npx wrangler d1 migrations apply zoe-delivery-db --local
```

## Módulo agregado: Inventarios

Esta versión incluye una sección nueva **Inventarios** para usuarios `admin`, `coordinador` y `almacen`.

Funcionalidad incluida:

- Alta manual de productos.
- Edición de productos existentes.
- Campos: SKU/código interno, producto, categoría, unidad de medida, presentación, stock mínimo, inventario inicial, observaciones y estatus activo/inactivo.
- Carga de inventario por producto ya registrado.
- Tipos de carga:
  - Conteo físico / fijar existencia actual.
  - Entrada / sumar al inventario.
  - Salida / restar del inventario.
  - Ajuste / fijar existencia actual.
- Historial de movimientos de inventario.
- Reporte CSV de inventario.

### Migración nueva

Después de subir esta versión, aplica la nueva migración:

```bash
cd api
npx wrangler d1 migrations apply zoe-delivery-db --remote
```

Para local:

```bash
cd api
npx wrangler d1 migrations apply zoe-delivery-db --local
```

La migración agregada es:

```bash
api/migrations/0003_inventory.sql
```

Tablas nuevas:

```text
inventory_products
inventory_movements
```
