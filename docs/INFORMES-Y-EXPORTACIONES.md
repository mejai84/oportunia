# Oportunia · Informes administrativos y exportación CSV

Implementación: 2026-11-13 (hora Colombia). Ruta de interfaz: \`/admin/informes\`.

## Propósito

- Ver **datos persistidos en Supabase**, no valores que un navegador guarda localmente.
- Resumen por fecha: cuentas nuevas, referencias declaradas, coincidencias contra extractos cargados, movimientos importados, ensayos de reserva, tareas y cambios auditados.
- Gráfico de conteos diarios de reportes, movimientos importados y reservas de ensayo.
- Historial paginado y exportación de eventos al CSV, con fechas Colombia.
- Registrar en PostgreSQL cada **solicitud de exportación** (quién, qué tipo, qué período y cuántas filas), sin afirmar que el archivo se haya guardado en el dispositivo.

## Seguridad y restricciones

- Solo propietario y auditor de solo lectura: \`staff_has_permission('audit.read')\`; también revisado en \`AdminAccessGate\`.
- Las RPC \`get_admin_reporting_summary\`, \`get_admin_reporting_activity\` y \`register_admin_report_export\` se ejecutan desde sesión autenticada y deniegan usuarios sin ese permiso.
- La tabla \`admin_report_export_requests\` tiene RLS, solo lectura para propietario y auditor. Los clientes y otros operadores no ven ni modifican solicitudes de descarga.
- Intervalos máximos de **366 días**, inclusive. Los límites de fecha se interpretan según \`America/Bogota\`.
- El historial se consulta paginado (máximo 200 eventos por llamada). El CSV recompone todas las páginas de hasta 20.000 eventos y verifica el total y duplicados; ante cambio de registros, interrumpe en vez de entregar un resultado parcial. Por encima de 20.000 hay que reducir el intervalo.
- No se incluyen números completos de cuenta, datos de contacto, referencias bancarias ni secretos en el CSV. IDs de responsables y registros se muestran parcialmente.
- Los campos de CSV se entrecomillan y se bloquean prefijos peligrosos para fórmulas.
- No se cambia el estado de ningún reporte, movimiento o reserva desde Informes.

## Interpretación de montos

**Los importes reportados por clientes no son dinero cobrado.** Una coincidencia de importe, cuenta y referencia con un archivo cargado tampoco es confirmación de transferencia por una API autorizada. Ninguno de esos valores constituye recaudo certificado.

Los estados son los **estados actuales** de registros creados/importados en el período filtrado, no una reconstrucción histórica de los estados que tenían al finalizar cada día. Los números complementarios corresponden solamente a simulaciones.

## Pruebas previstas

1. Propietario ve el panel y exporta cifras reales; auditor también.
2. Tesorería, soporte, gestión de sorteos, otros usuarios y visitantes no pueden ejecutar RPC de informes.
3. Período vacío da cifras cero, no montos inventados; fecha fuera de rango se rechaza.
4. El historial CSV incluye el total de registros o se cancela; no se recorta silenciosamente.
5. Solicitar exportación deja auditoría append-only, sin permisos de modificación directa.
6. La interfaz funciona en pantallas móviles y mantiene el menú admin.
7. El deploy en Vercel debe estar en estado **Ready** antes de declarar el módulo publicado.

## Pendientes del sistema completo

Este módulo no habilita pagos reales, ventas, participaciones ni sorteos comerciales. Aún se requieren conexiones bancarias autorizadas, modelo transaccional de ventas, autorizaciones regulatorias y pruebas de extremo a extremo entre dispositivos.
