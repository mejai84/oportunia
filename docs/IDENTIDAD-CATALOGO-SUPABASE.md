# OPR-BRAND-002 · Identidad, contenido y conexión Supabase
**Fecha:** 2026-11-13 · **Estado:** catálogo público conectado, plataforma de compras NO habilitada.

## Fuente de identidad
El usuario seleccionó una lámina con trébol de cuatro hojas verde, órbita dorada, estrella y tipografía verde. La imagen íntegra se conserva en la biblioteca en `/Oportunia/Identidad/propuesta-visual-aprobada-2026-11-13.png`; la web implementa un logotipo vectorial inspirado en ella. La lámina es un collage de aplicaciones de marca, no un archivo vectorial único.

Paleta: verde oscuro #07572F, verde principal #0A7A3D, verde brillante #22C55E, lima #A3E635, dorado #FBBF24 y blanco #FFFFFF.

## Arquitectura
- `GET /api/catalog` consulta el catálogo de lectura pública con la clave **publishable**, sin privilegios de servicio, y solo registros `enabled=true`.
- `public.draw_catalog` almacena nombre, premio, descripción, visibilidad, estado `preview/coming_soon/closed`, orden y URLs independientes `hero_image_url` y `prize_image_url`.
- `public.oportunia_admins` almacena membresías de Auth; no existe un administrador precargado. Solo un administrador de la base de datos puede asignar el primer usuario.
- `/admin/catalogo` requiere inicio de sesión y pertenencia a `oportunia_admins`; los permisos RLS de escritura se validan en PostgreSQL, no en el cliente.
- Bucket `draw-media`: imágenes de lectura pública; escrituras solo a usuarios con membresía. Máximo 6 MB, JPG/PNG/WebP. No cargar documentos personales en este bucket.
- El primer sorteo es un **catálogo informativo en preparación**; no se inventan porcentajes, fechas ni existencias del premio.

## Activación del administrador
1. Crear un usuario en Supabase Auth, con correo verificado y contraseña segura.
2. En el editor SQL de Supabase, autorizar **solo el UUID del usuario elegido**: `insert into public.oportunia_admins(user_id) values ('UUID_DEL_USUARIO');`.
3. Ingresar a `/admin/catalogo`, editar sorteos, subir portada e imagen del premio, y publicar.
4. Nunca compartir la secret/service_role key ni configurarla en variables `NEXT_PUBLIC_`.

## Limitaciones explícitas
La web de marketing deja de repetir la palabra demo, pero la experiencia de reserva y pagos sigue siendo local y no acepta pagos reales. El catálogo en Supabase NO convierte las órdenes locales en reservas globales; tampoco envía claves por WhatsApp. El registro de leads permanece desactivado hasta implementar privacidad y protección antiabuso. No activar pagos ni sorteo real sin requisitos legales, transacciones atómicas, autenticación de clientes, contabilidad y auditoría.

## QA
- Comprobar que visitantes anónimos solo leen sorteos habilitados.
- Comprobar que un usuario no administrador no puede escribir en catálogo ni subir a Storage.
- Comprobar las dos imágenes por sorteo y el carrusel con varios registros.
- Comprobar versión móvil y que los porcentajes no se inventan.
- Compilar TypeScript, ejecutar pruebas y validar build de Next.js.
