# Parche: editar usuarios + logout móvil

Aplicar desde la raíz del proyecto `zoe-delivery-control`, no desde `api`.

Incluye:
- Configuración visible para admin y coordinador.
- Edición de usuarios existentes.
- Cambio de contraseña desde Configuración.
- Cambio de rol/perfil desde Configuración.
- Correo opcional y usuario obligatorio.
- Coordinador puede editar usuarios operativos, pero no admins.
- Admin puede editar todos.
- Mantiene login por usuario/correo.
- Mantiene botón Salir móvil y navegación móvil.

Comandos:

```bash
cd ~/Desktop/zoe-delivery-control
unzip -o ~/Downloads/zoe-delivery-control-user-edit-settings-patch-v2.zip
git add .
git commit -m "add user editing settings v2"
git push origin main
```

Si tu carpeta del proyecto está en iCloud, usa esa ruta en lugar de Desktop.

Para desplegar API, primero confirma que existe package.json:

```bash
cd ~/Desktop/zoe-delivery-control/api
ls -la package.json wrangler.toml
npm install
npm run deploy
```

Si `package.json` no aparece, estás en la carpeta incorrecta.
