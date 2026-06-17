# Fix usuarios sin correo + cierre de sesión móvil

Cambios incluidos:

- Login acepta usuario o correo en el mismo campo.
- Los usuarios se pueden crear sin correo.
- Se agrega campo `username` internamente en D1 de forma automática desde el API.
- Si no capturas correo, el API guarda un correo interno tipo `usuario@local.mackavi` solo para compatibilidad con la tabla actual.
- El correo ya no es obligatorio en la pantalla de creación de usuarios.
- Contraseña mínima bajada a 6 caracteres para permitir claves operativas simples.
- En móvil aparece botón **Salir** en la barra inferior.
- El admin existente sigue entrando con `marco.cruz@mackavi.com` o `marco.cruz` + `Admin1234`.

## Subida

```bash
cd ~/Desktop/zoe-delivery-control
unzip -o ~/Downloads/zoe-delivery-control-username-login-mobile-logout.zip
git add .
git commit -m "add username login and mobile logout"
git push origin main
```

## Actualizar API

```bash
cd api
npm install
npm run deploy
```

No requiere migración manual. Al iniciar sesión o usar la herramienta, el API agrega el campo `username` automáticamente si no existe.

## Ejemplos de usuarios

- Usuario: `alfredo.cruz` / Contraseña: `12345678`
- Usuario: `diego.cruz` / Contraseña: `98765432`

El admin puede seguir usando:

- Usuario/correo: `marco.cruz@mackavi.com` o `marco.cruz`
- Contraseña: `Admin1234`
