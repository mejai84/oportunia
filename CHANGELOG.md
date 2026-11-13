# Registro de cambios — Oportunia

Formato inspirado en Keep a Changelog. Las fechas indican registro de cambios de código; no implican publicación web verificada.

## [Sin publicar] — 2026-11-13

### Seguridad
- Propuesta de actualización de Next.js 15.5.6 a 15.5.29 y React 19.1.1 a 19.1.5.
- Auditoría de vulnerabilidades altas/críticas en CI.
- Override de PostCSS 8.5.23 para corregir vulnerabilidades de dependencia transitiva de Next.js 15.5.x.
- Registro de incidente OPR-INC-001 por bloqueo de seguridad en Vercel.

### Correcciones
- Sustitución de dos valores CSS de align-items:start por flex-start.

### Documentación
- Línea base profesional SDLC: PRD, arquitectura, seguridad, operaciones, ADR, incidencias y criterios de aceptación.
- Registro explícito de lo implementado, lo simulado y lo pendiente.
- Plantilla de revisión de cambios.

## [0.1.0] — 2026-11-13

### Añadido
- Prototipo Next.js con landing, selección de números, abonos, mi cuenta y administración de prueba.
- Embudo / y /embudo con simulador y FAQ.
- Tabla funnel_leads en Supabase, RLS sin acceso directo público.
- Endpoint de interesados y formulario desactivados por defecto.
- Pruebas de reglas y validación de solicitudes.

### Limitaciones conocidas
- Datos del flujo de compra en localStorage, sin autenticación ni concurrencia real.
- Sin pagos reales, sorteo autorizado, dominio verificado ni evidencia de publicación final.
