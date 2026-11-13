# OPR-COM-001 · Avance de colocación y comunicaciones al cliente

**Fecha:** 2026-11-13 | **Estado:** demo de mensajes en pantalla; notificaciones externas en diseño.

## 1. Objetivo

Mostrar al comprador el progreso de la colocación de oportunidades mediante **porcentajes**, sin revelar cantidades absolutas, y mantenerlo informado de manera clara, verificable y no engañosa. La finalidad es ofrecer visibilidad sobre el proceso, no prometer una fecha de sorteo.

## 2. Regla del indicador

**Porcentaje de colocación = (oportunidades válidamente colocadas / cupo autorizado) × 100.**

En el prototipo: cupo = 200; numerador = oportunidades creadas en el **mismo navegador** y guardadas en localStorage. No hay compras reales. Un ejemplo de prueba crea un avance de 0,5 % por oportunidad.

En producción: numerador y denominador deben venir de un agregado validado en Supabase, con definición formal de estados válidos. No contar órdenes caducadas o anuladas como colocadas, salvo que el reglamento aprobado indique otro tratamiento. El indicador no mide pagos completados ni participantes habilitados.

**Privacidad:** el cliente ve el porcentaje (p. ej., 75 %), sin cantidades absolutas, identidades de compradores, inventario total, pagos ajenos ni datos privados.

## 3. Mensajes en pantalla

| Hito | Mensaje | Acción |
|---|---|---|
| 25 % | Primer avance importante | Mostrar actualización en Mi cuenta |
| 50 % | Mitad del recorrido | Mostrar actualización en Mi cuenta |
| 75 % | Entramos en la recta final | Mostrar actualización en Mi cuenta |
| 90 % | Cerca de completar la colocación | Aclarar que aún no hay fecha confirmada |
| 100 % | Colocación completada | Explicar que siguen cobranza, validación y condiciones del reglamento |

Se muestran hasta tres hitos recientes en el portal. Los hitos anteriores siguen siendo calculables desde el estado. **No se envían mensajes reales ni se registran notificaciones como entregadas.**

En el 100 % se diferencia: (a) cobranza de hasta siete días, (b) revisión por saldos vencidos, (c) oportunidades totalmente pagadas. Ninguna fase equivale automáticamente a sorteo confirmado.

## 4. Diseño futuro de notificaciones

Para operación autorizada se propone un servicio de eventos transaccionales:

1. Una transacción válida en PostgreSQL cambia el agregado global de colocación.
2. Un proceso servidor detecta el cruce del hito, sin confiar en el navegador.
3. Se inserta un evento único `draw_id + milestone + channel` en una bandeja de salida (outbox).
4. Un trabajador o n8n consume el evento de forma idempotente.
5. Se seleccionan exclusivamente destinatarios con consentimiento vigente y canal permitido.
6. Se envía plantilla aprobada por WhatsApp Business, correo o notificación interna.
7. Se registra intento, resultado, proveedor, fecha, exclusión y baja, sin exponer información sensible.
8. Se contemplan reintentos controlados, límites de frecuencia, cancelación y desuscripción.

**No implementar el envío desde un efecto de React, un botón del navegador o una tabla sin control de acceso.**

## 5. Otras comunicaciones propuestas

- Confirmación de oportunidad creada (no equivale a participación).
- Confirmación de abono aprobado y números asignados.
- Aviso de saldo pendiente; números no habilitados hasta el pago completo.
- Al completarse la colocación, informar el plazo de cobranza y su vencimiento cuando corresponda.
- Anuncio de fecha oficial **solo** cuando esté validada y autorizada.
- Notificación de resultado y procedimiento aplicable, únicamente según reglamento.

Los recordatorios de pago deben ser proporcionales, respetar preferencias y no generar presión engañosa. Se requiere aprobación del texto y de la base legal de contacto antes de habilitar canales.

## 6. Criterios de aceptación

- El cliente puede optar por diez números manuales o automáticos, sin duplicados.
- El portal muestra porcentaje, no cantidades de ventas ni datos de terceros.
- La barra está etiquetada como demostración mientras use localStorage.
- Los hitos aparecen al alcanzarse; no se marcan como enviados.
- 100 % de colocación no equivale a elegibilidad ni a fecha confirmada.
- El sistema futuro deduplica envíos, respeta consentimiento y permite auditoría.
