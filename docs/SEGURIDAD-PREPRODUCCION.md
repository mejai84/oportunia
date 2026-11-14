# Oportunia · Candados antes de producción

Fecha: 2026-11-13, Colombia.

## Cambios implementados

1. Deshabilitar el disparador `auth.users.oportunia_owner_verified_email` y eliminar su función. El sistema **conserva** el UUID ya registrado en `public.oportunia_admins` (la migración falla si no existe exactamente un propietario), pero **nunca vuelve a crear propietarios por una dirección de correo confirmada**. La revocación/cambio de propietario queda como operación administrativa explícita fuera del navegador.
2. Columna `bank_recon_movements.source_verification`: solo admite `operator_uploaded_unverified`. Todo archivo importado, incluso si se compara exitosamente con una referencia, sigue sin acreditación oficial de origen bancario.
3. Columna `bank_recon_claims.payment_verification`: solo admite `not_verified`. Ni un reporte pendiente ni uno cotejado contra archivo puede afirmar pago verificado. La futura integración bancaria autorizada requerirá una migración revisada que permita una prueba autenticada.
4. RPC `get_operational_readiness`, de solo lectura con `audit.read`, devuelve los conteos y controles reales y mantiene en falso las funciones de ventas/sorteos. Se prohíbe su ejecución anónima. La pantalla `/admin/seguridad` permite ver el estado sin cambiar datos ni habilitar ventas.
5. La conciliación visible aclara junto al nombre del archivo que su origen **no está autenticado por el banco**.

## Pruebas de seguridad

- Propietario preexistente conserva el acceso; no quedan disparadores de concesión automática de propiedad en `auth.users`.
- RLS y RPC impiden que usuarios sin `audit.read` vean diagnósticos.
- La base de datos rechaza valores `source_verification='verified'` y `payment_verification='verified'`.
- El flujo de conciliación sigue operando contra archivos únicamente; se conservan las reservas de ensayo y el historial.
- No crear datos ficticios persistentes: ensayos mediante transacciones `BEGIN ... ROLLBACK`.

## Bloqueadores que este cambio no elimina

- **Protección contra contraseñas filtradas:** aparece como advertencia de Supabase Auth. Hay que comprobar/habilitar su ajuste desde [panel de Supabase](https://supabase.com/dashboard/project/qsclrpmkgcjobtupicyx); no se puede considerar activada solo por agregar una casilla a Oportunia.
- **SECURITY DEFINER ejecutable por autenticados:** los avisos sobre funciones RPC públicas con verificaciones de usuario/permisos siguen pendientes de auditoría individual. No equivale automáticamente a acceso no autorizado. No se debe revocar funciones que actualmente utiliza el frontend sin refactor y pruebas de todo el flujo.
- **Conexión bancaria:** no existe un canal de movimientos autenticados por Bancolombia/Nequi ni una integración con proveedor autorizado. Ningún operador puede declarar desde la interfaz que recibió dinero oficialmente.
- **Venta real, requisitos legales y sorteo:** todavía deshabilitados. Se necesita un modelo comercial, autorización/reglamento y conciliación con movimientos autenticados antes de activar participaciones reales.
- **Vercel:** desplegar el último commit aprobado en `main` una vez se resuelva el bloqueo de `build-rate-limit`, y probar sesión y acceso desde celular.

No se usan claves, contraseñas ni tokens bancarios en el código, la base de datos o el navegador.
