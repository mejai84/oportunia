# Oportunia · Seguridad por roles y auditoría

Esta etapa conserva la cuenta propietaria preexistente en `public.oportunia_admins`. No migra ni modifica su contraseña y **no crea administradores automáticamente**. Los colaboradores son cuentas normales de Supabase Auth a las que el propietario les asigna un rol específico desde `/admin/equipo`.

## Rol y permisos

| Rol | Permisos |
|---|---|
| Propietario | Todos los módulos y administración de roles |
| Tesorería | Conciliación y reportes de banco, importación, conciliación y rechazo |
| Atención y soporte | Directorio CRM, notas y agenda de seguimientos |
| Gestión de sorteos | Catálogo, opiniones/resultados y reservas de ensayo |
| Auditoría | Solo lectura de registros y controles de números de la demo |

Los permisos efectivos son comprobados en **PostgreSQL** con `public.staff_has_permission`. El frontend también oculta los módulos no autorizados por conveniencia, pero esto no reemplaza las políticas RLS ni las comprobaciones en las funciones bancarias y de simulación.

## Reglas críticas

1. Solo el propietario, validado contra `oportunia_admins`, puede ejecutar `set_oportunia_staff_role`. Se prohíbe asignar o modificar el rol propietario en esta pantalla.
2. La tabla `oportunia_staff_roles` es de solo lectura para usuarios autorizados; no concede INSERT, UPDATE ni DELETE a los navegadores.
3. Cualquier asignación, modificación o revocación crea un evento append-only con actor, destino, rol anterior, rol nuevo y fecha.
4. La plataforma registra cambios en catálogo, moderación y resultados en `oportunia_admin_action_audit` sin copiar contraseñas, referencias de banco, comentarios o datos privados.
5. Las tablas de conciliación, CRM, agenda, contenido y ensayos reciben políticas adicionales delimitadas por permiso, manteniendo los accesos existentes del propietario y de los clientes a sus propios datos.
6. Las RPC de importación, rechazo y conciliación exigen `bank.write`. La generación de números adicionales de ensayo exige `preview.write`, y la estadística global de ensayos `preview.read`.
7. La revocación corta el acceso en nuevas operaciones de Supabase aunque el usuario siga logueado. El menú se actualiza al recargar página.
8. No se utiliza `user_metadata` ni se expone una clave secreta de Supabase al navegador.
9. El rol de auditoría no puede crear, actualizar ni borrar información. Los eventos son informativos; no certifican ingresos bancarios ni ventas reales.

## Pruebas de aceptación

- Propietario existente conserva control y acceso al dashboard.
- Nuevo usuario normal inicia sin acceso administrativo.
- Propietario asigna soporte y comprueba que ve CRM y seguimiento pero no conciliación.
- Tesorería accede a conciliación, pero no modifica catálogo ni cambia roles.
- Gestor de sorteos crea hitos de demostración, pero no importa movimientos bancarios.
- Auditoría ve el historial sin acciones de escritura ni acceso al dashboard propietario.
- El propietario revoca el rol y el usuario pierde permisos de forma inmediata en la siguiente consulta.
- Cada cambio de contenido/moderación y roles deja evento de auditoría.
- Se validan pruebas con sesiones auténticas desde móvil antes de dar la publicación por aceptada.

## Pendientes

Vercel debe publicar el commit aprobado de `main`. Las operaciones reales requieren verificación bancaria oficial, centralización comercial, cumplimiento normativo de sorteos y revisión de seguridad previa a habilitar pagos.
