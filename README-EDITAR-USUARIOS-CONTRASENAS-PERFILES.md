# Ajuste: edición de usuarios desde Configuración

Incluye:

- Menú Configuración visible para perfiles `admin` y `coordinador`.
- Edición de usuarios existentes desde Configuración.
- Permite cambiar:
  - Nombre
  - Usuario
  - Correo opcional
  - Contraseña
  - Perfil / rol
  - Teléfono
  - Estado activo/inactivo
- Si el campo Nueva contraseña queda vacío, no se cambia la contraseña.
- Admin puede editar todos los usuarios.
- Coordinador puede editar usuarios operativos, pero no usuarios admin ni asignar perfil admin.
- Se conserva el login por usuario/correo, el menú móvil horizontal completo y el botón Salir móvil.

## Aplicación

Desde la raíz del repo:

```bash
unzip -o ~/Downloads/zoe-delivery-control-user-edit-settings-patch.zip
git add .
git commit -m "add user editing from settings"
git push origin main
```

Luego actualizar API:

```bash
cd api
npm install
npm run deploy
```

No requiere migración D1.
