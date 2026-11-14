# Oportunia · Control de pagos auténticos y motor de notificaciones internas

## Estado de esta etapa

La **verificación bancaria auténtica NO está disponible**. Actualmente los clientes pueden reportar referencias, tesorería puede cargar extractos y cotejarlos, y un cliente puede asociar una referencia propia a su selección **de ensayo**. El control de esta fase documenta cada relación y notifica al cliente, sin afirmar que exista dinero confirmado.

## Modelo de datos

- `payment_control_cases` conserva la relación única entre la referencia declarada (`bank_recon_claims`), la selección de ensayo (`preview_reservations`) y el propio cliente.
- `payment_control_case_events` mantiene los cambios de estado; la creación y actualización vienen de triggers de Supabase, no de modificaciones directas del navegador.
- `authenticity` solo admite `not_verified`, `bank_provider_event_id` solo NULL y `commercial_eligible` solo FALSE. Ni el cliente ni tesorería pueden promover un reporte a pago verificado.
- `payment_notification_workflows` almacena tres reglas internas: referencia vinculada, coincidencia con extracto aportado, referencia rechazada. El propietario puede activar o desactivar cada una desde `/admin/automatizaciones`; cada modificación queda auditada.
- `payment_notification_runs` registra una sola ejecución por regla y evento, incluso si se procesa de nuevo; `external_sent` está obligado a FALSE.
- `payment_notification_inbox` deja el aviso privado en `/mi-cuenta`, permitiendo al cliente marcarlo como leído. No utiliza SMS, correo o WhatsApp.

## Accesos

- **Cliente:** solo sus casos, eventos asociados y avisos privados.
- **Tesorería:** puede leer el control de pagos y realizar las operaciones de conciliación de archivos ya existentes, pero no habilitar resultados comerciales ni controlar las reglas.
- **Auditor:** lectura de casos, eventos y estado de control.
- **Propietario:** todos los módulos más activar/desactivar las automatizaciones y consultar su auditoría.
- **Otros roles y visitantes:** no pueden leer casos ajenos, alterar registros, forzar números ni activar flujos.

## Controles de aceptación

1. Crear un ensayo y reportar una referencia propia. Vincularla crea un caso y un aviso interno.
2. Cotejar una referencia con archivo cambia a `file_matched`, deja evento y aviso; sigue `not_verified`.
3. Rechazar la referencia genera un evento y, si la regla está activa, un aviso privado.
4. Desactivar una regla evita la creación de avisos para nuevos eventos sin borrar ejecuciones históricas.
5. Intentar escribir `authenticity='verified'`, `commercial_eligible=true` o un identificador bancario en un caso es rechazado por PostgreSQL.
6. El navegador no tiene permiso de `INSERT`, `UPDATE` ni `DELETE` para las tablas de control, eventos, reglas o ejecuciones. Solo admite `UPDATE(read_at)` sobre sus propios avisos.
7. El motor no libera reservas ni activa las 40 selecciones adicionales; siguen siendo ensayos no comerciales.
8. **No probar con datos reales ni activar pagos comerciales** hasta tener credenciales de una fuente bancaria autorizada y autorización de sorteo.

## Para convertir esto en control de pagos auténticos

Se necesita una **fuente bancaria acreditable**, por ejemplo API bancaria empresarial, proveedor de información financiera autorizado con movimientos de cuenta de destino, o notificaciones firmadas verificables por el banco. El adaptador futuro debe validar en backend autenticidad de firma y origen, evitar repetición de eventos, exigir identificación del beneficiario/cuenta/importe/referencia, registrar evidencia y trazabilidad, contemplar reversiones, hacer conciliación idempotente, y tener procedimientos antifraude y disputas. Un QR o captura de comprobante **no** prueba la recepción de fondos.

Nunca almacenar usuario/contraseña de banca en código, navegador ni tablas de Supabase. La infraestructura y las credenciales del proveedor deben ser configuradas únicamente en secretos de servidor con controles de acceso. Mientras no exista contrato/conexión autorizada, todas las afirmaciones de pagos verificados y participaciones reales seguirán desactivadas.

## Notificaciones externas posteriores

Para correo y WhatsApp, integrar proveedores oficiales con consentimiento y plantillas aprobadas, cola con reintentos, límites de envío, supresión, y auditoría de entregas reales. Un registro de bandeja interna **no** es un mensaje entregado por WhatsApp, SMS o correo.

## Dependencias de publicación

Vercel debe desplegar exitosamente el último commit y debe validarse la interfaz móvil y la seguridad mediante varias sesiones. Si permanece `build-rate-limit`, el sistema de base de datos puede estar actualizado sin que las pantallas estén visibles en producción.
