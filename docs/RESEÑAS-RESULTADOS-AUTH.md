# Reseñas, resultados y cuenta propietaria (2026-11-13)
Proyecto: `qsclrpmkgcjobtupicyx`. Migraciones aplicadas: `draw_reviews_results_verified_owner` y `customer_review_updates`.

## Reglas
- Una opinión por `(draw_id,user_id)`; 1 a 5 estrellas, alias público y texto. Solo `status=published` se muestra públicamente. La persona puede revisar su opinión y esta vuelve a pendiente. El administrador publica u oculta.
- La portada muestra hasta seis reseñas aleatorias **sin repetir usuario** dentro del conjunto mostrado. No hay opiniones precargadas ni testimonios ficticios.
- Los resultados requieren fecha, número ganador, nombre público con consentimiento y fuente de verificación. Solo se publican filas con `verified_at`. No hay resultados ni ganadores inventados.
- El sorteo iPhone 18 es ilustrativo y aparece como próximo, nunca como realizado.

## Cuenta de administrador
Correo autorizado: `jajl840316@gmail.com`. La migración no crea un usuario ni establece contraseña. Al registrarse mediante `/acceso`, completar la verificación del correo y obtener `email_confirmed_at`, un trigger concede pertenencia a `oportunia_admins` exclusivamente a ese correo. Luego ingresar a `/admin/catalogo` o `/admin/opiniones`. Configurar **Auth URL Configuration** para el dominio real de Vercel y verificar el correo de confirmación. Si el proveedor de correo no está configurado, el alta no puede completarse hasta configurarlo.

## Correo o teléfono
- Correo/contraseña: interfaz de alta, acceso y recuperación conectada a Supabase Auth.
- Celular: aún no disponible; requiere proveedor SMS, OTP, verificación y medidas antiabuso. No aceptar números de teléfono como si estuvieran verificados.
- La calificación está asociada a una cuenta autenticada, pero **no prueba que la persona haya comprado**. Cuando se conecten compras reales, agregar la validación de participación antes de permitir reseñas.

## Seguridad
RLS controla escrituras y lectura de resultados. El trigger administrativo utiliza correo confirmado en `auth.users`, no metadatos editables por clientes. La función está revocada a los roles web. Los datos personales del ganador deben contar con autorización de publicación. No se habilitan compras ni premios reales en este módulo.
