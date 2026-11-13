# Preparación comercial, preguntas frecuentes y seguridad (2026-11-13)
## Qué se revisó
- Se ampliaron las preguntas frecuentes para explicar selección, asignación, abonos, reservas, resultados, premios, opiniones y acceso.
- Se ajustó el lenguaje de la portada y las secciones informativas para presentar la marca de forma profesional sin confundir prototipo transaccional con una venta real.
- Se corrigió el aviso del panel: sí está protegido por Supabase Auth y una comprobación de membresía administrativa, pero las operaciones de números y pagos siguen siendo locales.
- Se conserva la advertencia de que la selección local no es una reserva central y los reportes no confirman dinero.
- No se habilitan compras, pagos, reservas centrales, notificaciones ni sorteos reales por modificar los textos.

## Cuenta del propietario
El correo del propietario está contemplado en el trigger `authorize_oportunia_owner_after_email_verification`. No se ha creado una cuenta de Auth ni se ha establecido ninguna contraseña mediante este cambio. El usuario solicitó evitar confirmación de correo; no se debe saltar el control de propiedad usando solamente un correo escrito en un formulario. Si se desea una cuenta confirmada administrativamente, debe crearse desde la interfaz protegida de Supabase Auth por un operador autorizado, verificando por otro canal que el solicitante controla el correo. No registrar contraseñas en GitHub, SQL, logs o documentos.

## Bloqueadores de venta real
1. Inventario y reservas centrales atómicas por sorteo, con expiración en servidor.
2. Pasarela o conciliación de pagos verificada por servidor; nunca dar por confirmado un reporte escrito por un usuario.
3. Reglas definitivas de cancelación, abonos, vencimientos y devoluciones.
4. Autorizaciones legales para sorteos/promociones y reglamento publicado.
5. Trazabilidad, auditoría, identidad, protección de datos, atención y comunicaciones.
6. Pruebas integrales y de concurrencia antes de habilitar compra o mostrar porcentajes de ventas reales.
