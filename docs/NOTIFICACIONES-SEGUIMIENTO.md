# Oportunia · Notificaciones internas y agenda de seguimiento

Fecha: 2026-11-13.

## Estado y origen de datos
- Las notificaciones de /notificaciones y Mi cuenta provienen de `customer_notifications` en Supabase; nacen automáticamente de eventos ya registrados en `bank_recon_claim_events`: referencia recibida, coincidencia con extracto importado o rechazo.
- Estos avisos **no son confirmaciones de pago oficiales** y **no se envían** por WhatsApp, correo electrónico o SMS. No se agregan claves bancarias ni proveedores externos.
- Cada cliente solo puede consultar sus avisos mediante su identidad `auth.uid()`; puede marcar como leídos únicamente los suyos. No se permite insertar, borrar o editar el texto del mensaje desde el cliente.
- La agenda /admin/seguimiento usa `crm_followups` y `crm_followup_events`, privados para administradores, con responsable creador, fecha objetivo, prioridad, categoría, estado y auditoría de cambios.
- Un reporte pendiente no constituye una deuda ni forma parte de una cartera contable. **No hay recordatorios programados**: la agenda se consulta cuando la abre un administrador.

## Aceptación de seguridad
1. Sin sesión: la bandeja pide ingresar, no revela mensajes.
2. Cliente autenticado: lee solo sus avisos. No puede insertar avisos ni leer/crear/cerrar tareas administrativas.
3. Admin autorizado: puede crear tareas para usuarios existentes y cambiar estado solo de pendiente a completada o cancelada desde la interfaz. Cada cambio tiene evento con fecha y actor.
4. El trigger de avisos solo responde a eventos de reportes vinculados a un usuario; se conserva una notificación por evento y no se duplica en relecturas.
5. Sin movimientos ni clientes, la plataforma muestra cero y no genera cobros ni mensajes falsos.
6. Los avisos no incluyen extractos completos, cuentas bancarias, teléfonos ni datos sensibles.
7. Las referencias bancarias siguen necesitando conciliación con extracto y los sorteos continúan en modo demostración.

## Siguiente fase pendiente
- Reservas y números centrales transaccionales con expiración/unicidad por sorteo.
- Vinculación verificada entre oportunidad, comprador, pago y número.
- Autorización legal/reglamento para ventas y sorteos.
- Roles administrativos finos, auditoría de operaciones reales y exportaciones.
- Proveedor de entrega email/WhatsApp y gestión de consentimiento antes de activar mensajería saliente.
