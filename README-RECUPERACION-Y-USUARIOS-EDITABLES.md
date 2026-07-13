# Recuperación segura + edición de usuarios

Este paquete es una versión completa del proyecto con:

- Login estable con token para web y móvil.
- Usuarios con username o correo.
- Menú móvil con scroll horizontal y botón Salir.
- Edición de usuarios desde Configuración para admin/coordinador.
- Cambio de contraseña y perfil.
- Edición de órdenes.
- Autollenado MTY/OUT.
- Flujo de órdenes con fecha anterior corregido.

## Aplicación segura

No reemplaces `api/wrangler.toml` si ya tiene tu `database_id` real.

Usa rsync así desde tu Mac:

```bash
cd ~/Desktop
rm -rf zoe_clean_release
unzip ~/Downloads/zoe-delivery-control-recovery-user-edit-full.zip -d zoe_clean_release
cd ~/Desktop/zoe-delivery-control
rsync -av --exclude 'api/wrangler.toml' --exclude '.git' --exclude 'node_modules' ~/Desktop/zoe_clean_release/zoe-delivery-control/ ./
git add .
git commit -m "restore project and add editable users"
git push origin main
```

## Deploy API

```bash
cd ~/Desktop/zoe-delivery-control/api
npm install
npm run deploy
```

Si `api/wrangler.toml` no existe, recupera tu `database_id` con:

```bash
npx wrangler d1 list
```

Y crea el `wrangler.toml` con tu configuración real.
