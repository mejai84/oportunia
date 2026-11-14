# Oportunia: seguimiento de ensayos centralizados y 40 números complementarios

Fecha de implementación: noviembre de 2026.

## Alcance no comercial

- Las selecciones centralizadas de prueba conservan **10 números iniciales**.
- Un administrador autorizado puede ejecutar **4 hitos de simulación** que asignan 10 números libres cada uno (máximo 40 complementarios y 50 en total por ensayo).
- Los hitos no representan cuotas pagadas, un pago recibido, ventas, derechos de participación, ni autorización del sorteo. **Ningún pago dispara un hito**.
- El cliente puede asociar hasta cuatro referencias bancarias que él mismo haya reportado previamente a una selección vigente para conservar un rastro documental. Solo se permite asociar referencias propias, no rechazadas y no utilizadas en otra selección. No se modifica su estado ni se concede beneficio alguno.
- El usuario ve los hitos en `/ensayo-reservas`; el administrador los consulta y simula en `/admin/reservas`. Se conserva el menú de administración del último `main`.
- En la pantalla de administración, los totales globales se calculan mediante una RPC de agregación, nunca sumando una consulta paginada. En el cliente, el conjunto de números ocupados se obtiene como un JSON completo para evitar recortes del máximo de filas de PostgREST.

## Seguridad y consistencia

- Escritura de números: únicamente RPC `simulate_preview_extra_milestone` con comprobación de autorización en `public.oportunia_admins`; las tablas no conceden `INSERT/UPDATE/DELETE` al navegador.
- Cada RPC serializa la edición con `FOR UPDATE` de la fila de `draw_catalog`. La llave primaria `(draw_id,number)` sigue evitando duplicaciones.
- El hito comprueba que existen exactamente 10 números iniciales y que los extras previos forman bloques enteros de 10, limitados a 40. La auditoría es solo de inserción y los eventos mantienen su numeración original.
- La cancelación y el vencimiento liberan las 50 posiciones sin borrar el historial de eventos; la identidad se elimina con la cuenta si procede.
- Las tablas de seguimiento tienen políticas RLS: solo propietario o administrador puede consultar; las asociaciones las crea la RPC `link_preview_claim_for_tracking`, comprobando `auth.uid()`.
- No hay capturas de comprobantes, claves bancarias, operaciones de Nequi o Bancolombia, ni verificación automática.

## Aceptación

1. Ejecutar cuatro hitos devuelve exactamente 40 nuevos números. Un quinto intento es rechazado.
2. Una segunda selección en el mismo sorteo no puede usar números ya ocupados.
3. La lista global refleja 50 ocupados tras los hitos y libera todos al cancelar.
4. La caducidad libera también los números extra.
5. Un cliente sin rol administrador no puede simular ni consultar métricas agregadas internas.
6. El cliente solo vincula referencias propias; no puede hacerlo con reportes de otro usuario, rechazados o con una selección ajena.
7. La integración no marca pagos como verificados ni asigna participaciones oficiales.
8. Validar compilación, tests, RLS y las pantallas en dispositivos reales al quedar desplegadas.

## Pendientes de producción real

La operación de sorteos comerciales requiere inventario oficial, reglas aprobadas, reservas del flujo público, conciliación con movimientos de origen autorizado, pagos transaccionales, evaluación antifraude, control de devoluciones, autorizaciones y cierre reglamentario. Este módulo no los sustituye.
