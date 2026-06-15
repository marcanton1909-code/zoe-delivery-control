# Ajuste extractor PDF Zoé - streams y texto comprimido

Este ajuste corrige la extracción de texto de PDFs generados por el portal de Zoé Water.

El problema era que algunos PDFs de Zoé incluyen objetos sin stream antes del primer `stream`, y el extractor anterior buscaba `obj ... stream ... endstream` de forma demasiado amplia. Eso podía mezclar objetos y provocar que el sistema concluyera que el PDF no tenía texto.

Cambios:

- Lectura de streams por objeto PDF aislado.
- Soporte para streams comprimidos con `/FlateDecode`.
- Decodificación de mapas `/ToUnicode`.
- Extracción de folio, cliente, dirección, notas, productos y total del PDF real de Zoé.

No requiere nueva migración D1.

## Deploy

```bash
cd api
npm install
npm run deploy
```

Luego prueba nuevamente:

Nueva orden → Subir PDF Zoé → Extraer datos.
