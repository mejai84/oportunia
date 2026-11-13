# OPR-UX-003 · Multisorteos, reservas de 24 h, aceptación y acceso

**Fecha:** 2026-11-13  
**Estado:** experiencia de demostración implementada; autenticación WhatsApp y operación real pendientes.

## 1. Sorteos múltiples

El administrador de demo puede crear sorteos adicionales, inicialmente ocultos, y habilitarlos o deshabilitarlos. El carrusel público presenta solo los habilitados; con uno se muestra una sola tarjeta destacada, con varios hay controles anterior/siguiente e indicadores. Cada sorteo tiene un identificador propio y separa números, oportunidades y avance.

**Demo:** cada sorteo comparte las mismas reglas de 200 oportunidades, 50 números, COP 50.000. **Producción:** se deberá parametrizar premio, valor, cupo, fechas y reglamento por sorteo, tras verificar autorizaciones.

Deshabilitar un sorteo lo oculta de la portada y bloquea nuevas reservas, **sin borrar compras, abonos ni derechos adquiridos**. No debe usarse como cancelación silenciosa de un sorteo activo.

## 2. Reserva inicial: 24 horas

Al crear una oportunidad se guarda `createdAt`, `reservationExpiresAt`, `drawId`, `termsAcceptedAt` y `termsVersion`.

- Si transcurren 24 h sin **ningún abono aprobado**, la reserva vence y sus números se liberan. En la demo, los reportes todavía pendientes se marcan rechazados y requieren conciliación manual si hubiese dinero real (que no debe existir en la demo).
- Una reserva vencida no se cuenta como colocada en el porcentaje ni ocupa números.
- El comprador conserva un registro histórico de los diez números, distinguiendo disponibles de ocupados.
- Puede recuperar los disponibles y completar diez números distintos; al confirmar empieza una nueva reserva de 24 h y acepta las reglas otra vez.
- El número se verifica de nuevo al renovar. En producción debe verificarse con bloqueo transaccional y restricciones únicas por sorteo.
- Un abono parcial **ya aprobado** no se caduca ni se libera automáticamente en la demo. Falta decisión expresa sobre vencimiento de cuotas, conservación de saldos, devoluciones y procedimiento de conciliación.

**Nota:** la expiración del prototipo ocurre al abrir la app o mediante revisión periódica del navegador. En producción se requiere proceso programado en servidor, marca temporal UTC y transacción atómica. Nunca depender del navegador para liberar números.

## 3. Aceptación explícita

Antes de reservar o renovar, la casilla de aceptación es obligatoria. Se informa expresamente:

> Si no se confirma el pago del 100 % de la oportunidad, ninguno de los números asignados participa en el sorteo.

La demo registra hora y versión de reglas en localStorage. En producción guardar `user_id`, `draw_id`, `terms_version`, `accepted_at`, documento aceptado y metadatos auditables apropiados; no confiar en un booleano del navegador.

La ruta `/reglas` muestra reglas **provisionales**, no sustituye un reglamento aprobado ni una autorización legal.

## 4. Acceso por celular y WhatsApp

**No implementado como autenticación real.** La ruta `/acceso` muestra el recorrido previsto y aclara que no envía mensajes.

Flujo propuesto:
1. Cliente escribe celular normalizado con prefijo país.
2. Servidor aplica rate limiting, protección antiabuso y controles de privacidad.
3. Se genera código aleatorio seguro, de un solo uso y vencimiento corto (p. ej., 5 minutos); se guarda únicamente su hash.
4. Se envía mediante proveedor de WhatsApp Business y plantilla aprobada, cuando corresponda.
5. Cliente introduce el código. Servidor limita intentos, verifica y consume el código.
6. Se crea sesión segura (cookies HttpOnly/Secure/SameSite); se asocia al usuario verificado.
7. El comprador solo puede consultar sus propias oportunidades, números y pagos; el administrador tiene autorización por rol separado.

**Nunca enviar contraseña permanente por WhatsApp.** No poner códigos en logs, no exponer claves de proveedores, no implementar OTP en localStorage. Requiere proveedor y configuración real, política de privacidad y consentimiento para mensajes no transaccionales.

## 5. Diseño visual

Interfaz clara de inspiración minimalista: blanco y gris cálido, azul suave, tipografía grande, espacios amplios, tarjetas de premios, movimientos sutiles y efecto de desplazamiento progresivo donde el navegador lo soporte. Respeta `prefers-reduced-motion` y elimina fondo fijo en móviles.

## 6. Estado real del prototipo

| Elemento | Estado |
|---|---|
| Crear/activar/desactivar sorteos en panel de prueba | Implementado localmente |
| Carrusel de sorteos activos | Implementado |
| Separar números por sorteo | Implementado en demo |
| Caducar reserva inicial tras 24 h | Implementado en demo local |
| Recuperar números disponibles y reemplazar ocupados | Implementado en demo local |
| Aceptación obligatoria de reglas | Implementado en demo local |
| Diseño claro y efectos discretos | Implementado |
| Envío real de OTP por WhatsApp | **Pendiente** |
| Sesión real y permisos de administrador | **Pendiente** |
| Base de datos transaccional, vencimiento servidor y pagos reales | **Pendiente** |
| Caducidad de cuotas ya abonadas y política de reembolsos | **Decisión pendiente** |
| Permisos/reglamento y lanzamiento comercial | **Pendiente** |

## 7. Criterios de QA

- Dos sorteos activos muestran controles de carrusel; uno activo muestra solo su tarjeta; ninguno activo muestra mensaje de espera.
- El mismo número puede existir en sorteos distintos pero nunca repetirse dentro del mismo sorteo activo.
- Al deshabilitar un sorteo, no desaparecen las órdenes ni los abonos ya registrados.
- Una reserva sin abono aprobado vence al cumplirse 24 h, libera números y rechaza aprobaciones tardías.
- Recuperación muestra anteriores disponibles y ocupados, y permite completar diez sin duplicados.
- No se permite reservar ni renovar sin aceptar reglas.
- Sin 100 % pagado se muestra NO PARTICIPA; no se habilitan sorteos reales.
- La pantalla de acceso no debe simular que envió un WhatsApp.
