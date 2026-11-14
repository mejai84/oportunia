# Corrección de flujos y seguridad de Oportunia — 14 noviembre 2026

## Fuente de verdad
Las rutas públicas `/numeros` y `/ensayo-reservas` muestran **el mismo proceso centralizado**: Supabase Auth + funciones SQL `create_preview_reservation`, `get_preview_occupied_numbers` y `cancel_preview_reservation`. PostgreSQL valida usuario, disponibilidad, vigencia y cupo, bajo bloqueo y PK compuesta `(draw_id, number)`. La ruta `/admin/numeros` utiliza el inventario de `/admin/reservas`.

Los estados de `AppProvider` y `src/lib/domain.ts` permanecen para pruebas de regresión y compatibilidad con ensayos antiguos **solo del navegador**. Se eliminó su presentación como saldo, elegibilidad o números oficiales en la cuenta de clientes. Los registros anteriores **NO SE BORRARON** ni migraron automáticamente: no son transacciones verificadas y no sería válido mezclarlos con cuentas reales. La pantalla de recuperación de reservas locales antiguas es informativa y remite a las reservas centralizadas.

## Contraseñas
Supabase Auth envía el enlace con `redirectTo=/actualizar-contrasena`, y la nueva pantalla valida la sesión, pide dos veces una clave de >=12 caracteres, usa `updateUser`, y cierra la sesión tras guardarla.

**Configuración necesaria en el proyecto Supabase de Oportunia:**
En Authentication → URL Configuration agregar exactamente las URL públicas permitidas, por ejemplo `https://oportunia-chi.vercel.app/actualizar-contrasena` y, solo en desarrollo, la URL `http://localhost:3000/actualizar-contrasena`. Revisar también Site URL y plantilla de email de recuperación. Habilitar la protección contra contraseñas filtradas desde Auth Security si el plan la admite. No activar dominios de RFC.

## Opiniones y resultados
Hasta implementar la validación de compras/participaciones y la consulta de resultados oficiales, el servidor de base de datos prohíbe **nuevas opiniones publicadas** y **resultados con `verified_at`**. La migración `20261114234000_guard_noncommercial_social_proof.sql` aplica una barrera con triggers para impedir cambios por API directa, retira las políticas de INSERT/UPDATE de opiniones sin compra y añade índices de acceso en los módulos centrales. La administración permite inspeccionar registros y ocultar una opinión anterior, pero no publicar ganadores marcados manualmente como verificados.

Para reabrir estas funciones no basta quitar un botón: hace falta backend de evidencia verificable, permiso legal y un nuevo flujo de aprobación con pruebas/RLS. La migración tiene instrucciones de reversión controlada, no ejecutar sin reemplazar primero las garantías.

## Banco y sorteo
No se habilita ninguna pasarela ni pago automático, tampoco se simula verificación de Nequi/Bancolombia/Bre-B/DaviPlata. Las referencias siguen siendo declaraciones del usuario o coincidencias con extractos cargados. En Supabase siguen bloqueados `commercial_eligible=true`, la autenticidad bancaria y las participaciones oficiales. La asignación de 40 números es únicamente una simulación administrativa; no debe hacerse en un flujo comercial sin conciliación bancaria autenticada e integración transaccional con una orden elegible.

## QA
Ejecutar `npm run typecheck`, `npm test`, `npm run build` mediante GitHub Actions antes de fusionar. Comprobar manualmente en un navegador los enlaces de recuperación y los filtros de reservas con una cuenta de prueba. Revisar el resultado de los asesores Supabase Security y Performance. No probar transacciones reales ni permitir que pruebas cambien clientes existentes.
