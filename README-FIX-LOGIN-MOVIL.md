# Fix login móvil Marco

Este paquete ajusta el login para que el usuario administrador `marco.cruz@mackavi.com` pueda entrar desde celular sin depender del signo `!`.

Contraseñas aceptadas para recuperación/admin principal:

- `Admin1234`
- `Admin1234!`

Cuando se inicia sesión con cualquiera de esas dos, el API:

1. Verifica/crea tablas si hace falta.
2. Crea o repara el usuario `marco.cruz@mackavi.com`.
3. Lo deja como `admin` activo.
4. Actualiza el hash de contraseña a `Admin1234`.
5. Genera token de sesión.

## Subir cambios

```bash
cd ~/Desktop
unzip zoe-delivery-control-login-mobile-fix.zip
cd zoe-delivery-control
git add .
git commit -m "fix mobile admin login"
git push origin main
```

## Actualizar API

```bash
cd api
npm install
npm run deploy
```

Después prueba en el celular:

- Usuario: `marco.cruz@mackavi.com`
- Contraseña: `Admin1234`

Si el navegador conserva sesión vieja, abrir en incógnito o borrar datos del sitio.
