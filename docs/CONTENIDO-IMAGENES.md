# OPR-UX-005 · Contenido e imágenes de sorteos

**Fecha:** 2026-11-13 · **Estado:** prototipo local.

## Dos imágenes por sorteo

1. **Promocional/portada** (`hero`): visual de la edición para el encabezado del embudo. Puede incluir regalo, boletos y celebración; no es la fotografía de producto.
2. **Artículo a sortear** (`prize`): imagen dedicada al producto exacto para el carrusel y futuras fichas.

El administrador de demostración selecciona el sorteo y entra en **Contenido e imágenes** para editar título, premio y descripción, cargar o retirar cada imagen por separado. Los textos se guardan en localStorage y los archivos PNG/JPEG/WebP de hasta 6 MB se almacenan en IndexedDB; no se envían a servidores. Las imágenes solo se muestran en el **mismo navegador y dispositivo**. Borrar datos del navegador las elimina. No existe sincronización ni acceso compartido.

La portada usa la imagen `hero` del primer sorteo habilitado. El carrusel usa `prize` del sorteo mostrado. Si no hay archivo, conserva la ilustración CSS existente.

## Implementación real pendiente

**No habilitar la subida pública ni tratar /admin como seguro.** Para producción:

- Supabase Auth con inicio de sesión seguro, rol administrativo verificado en el servidor y RLS de metadatos.
- Bucket Storage para `draw-media` con escritura restringida a administradores; validar tipo, tamaño y dimensiones, nombres aleatorios y límites de cuota.
- Tabla `draws` con campos `title`, `prize`, `description`, `hero_image_path`, `prize_image_path`, `enabled` y auditoría.
- Lectura pública solo de sorteos publicados, URLs optimizadas/CDN y versiones para móviles; no revelar contenido borrador.
- Moderación de contenido, metadatos EXIF y verificaciones de derechos de uso; trazabilidad de cambios y reversión.
- No incluir claves de servicio en el navegador. No permitir que un usuario anónimo reemplace imágenes.

## Pruebas de aceptación

- Dos archivos diferentes para el mismo sorteo y vista previa de cada uno.
- Reemplazar/quitar imagen no afecta la otra.
- Editar textos no cambia IDs, reservas ni pagos.
- Cambiar de sorteo no mezcla imágenes.
- Sin archivo, se muestra el arte original.
- Un archivo de más de 6 MB o un tipo no permitido se rechaza.
- Al abrir desde otro navegador, las imágenes de la demo no aparecen; es una limitación documentada.
- Responsive en móviles, tabletas y PC; revisión manual pendiente.
