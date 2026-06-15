# Ajuste de extracción PDF Zoé

Se actualizó el extractor de PDFs porque las órdenes reales descargadas del portal Zoé no exponen texto como `(texto) Tj`, sino como texto codificado en hexadecimal dentro de streams comprimidos `/FlateDecode`, usando fuentes `Identity-H` y mapas `/ToUnicode`.

## Qué se corrigió

- Descompresión de streams PDF `/FlateDecode`.
- Lectura de mapas `/ToUnicode`.
- Decodificación de texto tipo `<0001> Tj`.
- Extracción de folio `RP - Pedido #...` y `CC - Pedido #...`.
- Extracción de empresa, nombre, dirección, notas/referencias, teléfono y productos.
- Parseo de productos genéricos, no solo los que empiezan con `Paquete(s)`.
- Mejor mensaje cuando el PDF no sea texto seleccionable y requiera captura manual.

## Archivo probado

Orden real Zoé: `Orden de envío del pedido #459218.pdf`.

El PDF contiene texto seleccionable, pero venía comprimido y codificado, por eso el extractor anterior no lo detectaba.

## Después de subir

1. Desplegar API:

```bash
cd api
npm install
npm run deploy
```

2. No requiere migración D1 nueva.

3. Redeploy de Pages solo si quieres subir todo el repo completo, pero el cambio principal está en `api/src/index.ts`.
