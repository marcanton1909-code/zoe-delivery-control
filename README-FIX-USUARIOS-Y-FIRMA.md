# Ajuste: usuarios duplicados y firma de entrega

Esta versión corrige el error técnico al intentar crear un usuario con un correo ya registrado.

Antes se mostraba:

```text
D1_ERROR: UNIQUE constraint failed: users.email
```

Ahora se muestra un mensaje claro:

```text
Ya existe un usuario registrado con el correo ...
```

También se conserva la lógica de firma desde dispositivo en la vista de repartidor:

- Repartidor → Mis entregas
- Abrir orden
- Capturar resultado
- Firmar dentro del formato de prueba de entrega
- Guardar entrega firmada

No se requiere migración D1.
Solo hay que desplegar API y Pages si se cambió frontend.
