# Fix menú móvil horizontal

Este parche corrige la navegación inferior en móvil.

Cambios:
- Quita el límite que solo mostraba los primeros 4 módulos.
- Muestra todos los módulos disponibles según rol.
- Agrega desplazamiento horizontal en el menú inferior.
- Mantiene visible el botón Salir.
- Aumenta el espacio inferior del contenido para que el menú no tape pantallas.

Para aplicar:

```bash
cd ~/Desktop/zoe-delivery-control
unzip -o ~/Downloads/zoe-delivery-control-mobile-horizontal-nav-fix.zip
git add app/src/App.tsx app/src/styles.css README-FIX-MENU-MOVIL-HORIZONTAL.md
git commit -m "fix mobile horizontal navigation"
git push origin main
```

No requiere migración D1 ni redeploy del API. Solo redeploy de Cloudflare Pages.
