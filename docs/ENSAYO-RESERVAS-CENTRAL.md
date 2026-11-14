# Oportunia: ensayos de selección centralizada (sin comercio)

Fecha de implementación: noviembre de 2026.

## Alcance
- `/ensayo-reservas`: cuenta autenticada ensaya 10 números manuales o automáticos, en la edición de catálogo con estado `preview`.
- `/mi-cuenta`: historial de selecciones de prueba ligado al usuario Supabase, no al navegador.
- `/admin/reservas`: panel privado de ocupación/expiración/cancelación y trazabilidad de ensayos por edición.
- `/numeros` y `/admin/numeros`: continúan demostraciones locales independientes, enlazadas explícitamente al nuevo ensayo central; **no** se mezclan sus números.
- **No registra pagos, no factura, no asigna 40 números aleatorios complementarios, no habilita participación ni sorteo.** El modo comercial permanece desactivado.

## Reglas de seguridad y concurrencia
1. Los tres recursos `preview_reservations`, `preview_reserved_numbers` y `preview_reservation_events` tienen RLS. El usuario lee solo sus registros; la administración autorizada puede inspeccionar el global.
2. No existen grants `INSERT`, `UPDATE` ni `DELETE` de las tablas expuestas para clientes. Solo las RPC verificadas `create_preview_reservation` y `cancel_preview_reservation` pueden escribir.
3. El bloqueo `FOR UPDATE` sobre la fila del sorteo serializa **todos** los intentos concurrentes para una misma edición. La PK `(draw_id,number)` impide duplicados aun con carreras accidentales.
4. Una selección de prueba solo puede bloquear 10 números entre 0000 y 9999; validación de cardinalidad, unicidad y rango en servidor; modalidad automática ignora la lista del navegador.
5. Solo un ensayo activo por usuario/edición, máximo cinco creados por usuario en 24 h, cupo de 200 activos por edición.
6. Se liberan los diez números de los ensayos vencidos al registrar una nueva selección para esa edición; lectura de disponibilidad oculta expirados incluso antes de esa limpieza.
7. El usuario puede cancelar solo su propia selección vigente, sin extender vencimientos. Se conserva historial inmutable con números iniciales y responsable, salvo eliminación de la cuenta por privacidad.
8. `list_preview_taken_numbers` muestra solo números ocupados; no filtra nombre, usuario, correo, reservas ajenas ni pagos.
9. No se solicita ni almacena contraseña bancaria, imagen de transferencia ni dinero.
10. Las RPC `SECURITY DEFINER` están concedidas exclusivamente a `authenticated` y verifican `auth.uid()` dentro de la función. Revisar regularmente los avisos del analizador de seguridad de Supabase.

## Pruebas de aceptación
- Cuenta A elige manualmente 0000...0009. Una segunda selección simultánea no puede reutilizar ningún número de esa edición.
- Otra edición puede usar los mismos diez números sin conflictos.
- Una selección automática toma 10 libres y los registra en Supabase.
- El usuario ve su selección desde otro dispositivo al entrar con la misma cuenta.
- Al cancelar se liberan los diez números, sin borrar eventos históricos. Al expirar también se liberan en la siguiente transacción de creación.
- Un usuario ajeno no ve la identidad ni el detalle de la selección; solo números ocupados.
- El total inicial sin ensayos es 10.000 libres y 0 ocupados; ningún dato de la demo local se mezcla.
- No hay vínculo contable con `bank_recon_claims` ni `bank_recon_movements`.

## Pendiente antes de producción real
- Formalizar entidades comerciales, inventario oficial, aprobación legal/reglamento y roles para activar ventas.
- Una asignación transaccional de los otros 40 números condicionada a pagos realmente corroborados.
- Pólizas/validaciones antifraude, cuotas reales con contabilidad de cargos y devoluciones, trazabilidad y contratos.
- Migrar la selección pública y la cuenta a un único origen central después de una revisión formal de permisos y cargas.
- Completar pruebas de estrés concurrente con múltiples usuarios y sesiones autenticadas, más despliegue y validación de interfaz en dispositivo real.
