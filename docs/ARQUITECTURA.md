# Arquitectura de Oportunia

## Etapa actual: demo, sin pagos reales
- Frontend: Next.js App Router 15.5.x en Vercel. El despliegue del commit 80e7140 fue confirmado por la integración Vercel en GitHub; falta aceptación funcional y URL pública.
- Estado de demo: localStorage del navegador, solo para pruebas; NO compartido entre usuarios.
- Backend: Supabase/PostgreSQL con tabla funnel_leads y RLS denegación por defecto; Auth, transacciones de oportunidades y Storage privado pendientes.
- Automatizaciones previstas: n8n + API oficial de WhatsApp Business.
- Dominio: por definir; no se ha comprado ni configurado.

## Reglas comerciales definidas
- 200 oportunidades, COP $50.000 cada una, 50 números de cuatro cifras.
- El comprador elige 10 de los números 0000 a 9999.
- Los 40 restantes se asignan aleatoriamente según los abonos confirmados.
- Mínimo primer abono: $10.000. Cada $1.000 confirmado equivale a un número asignado.
- Ejemplo: $20.000 = 10 elegidos + 10 aleatorios; $35.000 = 10 + 25; $50.000 = 10 + 40.
- SOLO con $50.000 confirmados y 50 números asignados queda habilitada la oportunidad.
- Cuando se colocan las 200 oportunidades, se abre un máximo de 7 días de cobro.
- Si quedan impagos al vencer el plazo, el sistema pasa a revisión. NO adjudica automáticamente ni reasigna números: falta acordar y autorizar la regla correspondiente.
- Referencia prevista: resultado del premio mayor de la Lotería de Medellín en la siguiente fecha oficial posterior al cierre; debe validarse el calendario y el reglamento autorizado.
- NO se ha implementado la elección de ganadores ni la publicación de resultados.

## Pendiente antes de producción
1. Validación legal del modelo, financiación y reglamento en Colombia; operador y autorizaciones correspondientes.
2. Identificación de clientes (Auth) y roles admin/cliente en backend.
3. RLS con políticas de mínimo privilegio. La migración inicial no permite acceso público.
4. Transacciones SQL atómicas para reservar números y aprobar pagos, con unicidad por sorteo, bloqueos y control de cupos.
5. Verificación de webhooks firmados y conciliación real del proveedor de pagos autorizado.
6. Reservas con caducidad y reglas autorizadas de cancelación/reembolso.
7. Bitácora inmutable de pagos, asignaciones y cambios; no confiar en datos del navegador.
8. Fechas oficiales de la Lotería de Medellín verificadas y resolución de impagos al día 7.
9. Integración n8n/WhatsApp con consentimiento y políticas de privacidad.
10. Pruebas concurrentes, backup, monitoreo y despliegue Vercel con dominio y HTTPS.

## Seguridad
- Nunca exponer service_role o secret key en el frontend.
- No tratar el demo localStorage como fuente confiable.
- No conectar un proveedor de cobros hasta que admita la actividad y existan autorizaciones.
- Los administradores no pueden operar pagos reales desde la interfaz demo sin autenticación.
- No almacenar comprobantes sensibles públicamente.
