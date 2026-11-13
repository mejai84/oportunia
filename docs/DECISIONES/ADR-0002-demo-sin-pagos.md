# ADR-0002 · Mantener el producto como demostración hasta autorización

**Fecha:** 2026-11-13 | **Estado:** aceptada para la fase actual.

## Contexto

La mecánica de 200 oportunidades, 50 números, financiación y resultado asociado a lotería requiere reglamento, autorizaciones y controles técnicos. El usuario desea primero construir el embudo comercial.

## Decisión

- El embudo presenta el premio como proyectado y señala MODO DEMOSTRACIÓN.
- El formulario de interesados queda desactivado por defecto.
- Los pagos, asignaciones, administración y cuentas son simulaciones en el navegador.
- No se cobra, no se asignan números reales, no se anuncia una fecha confirmada ni se elige ganador.
- Las reglas de incumplimiento tras siete días se mantienen en revisión hasta decidirlas y autorizarlas.

## Consecuencias

Permite probar experiencia y mensajes sin poner en operación un sorteo. No se puede interpretar el éxito de las pruebas de software como permiso para comercializar. La habilitación de cualquier flujo real requiere aprobación técnica, legal y de seguridad documentada.
