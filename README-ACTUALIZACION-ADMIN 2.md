# Actualización admin inicial

Esta versión ya incluye acceso inicial con:

- Usuario: marco.cruz@mackavi.com
- Contraseña: Admin1234!

## Qué hace

Al iniciar sesión con esos datos, el Worker:

1. Verifica/crea las tablas necesarias en D1.
2. Crea el usuario si no existe.
3. Si el usuario ya existe, lo repara como admin activo.
4. Actualiza la contraseña.
5. Inicia sesión automáticamente.

No necesitas usar curl para crear el primer usuario.

## Subir actualización

Desde la carpeta raíz del proyecto:

```bash
git add .
git commit -m "admin inicial marco"
git push origin main
```

Luego despliega el API:

```bash
cd api
npm install
npm run deploy
```

En Cloudflare Pages debe estar:

- Root directory: app
- Build command: npm install && npm run build
- Build output directory: dist
- Variable: VITE_API_BASE=https://TU-WORKER.workers.dev

Después abre la app y entra con el usuario indicado.
