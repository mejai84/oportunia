# Registro de cambios — Oportunia

Formato inspirado en Keep a Changelog. Las fechas indican registro de cambios de código; no implican publicación web verificada.

## [Cambios funcionales en desarrollo] — 2026-11-13

### Añadido
- Elección opcional: diez números manuales o diez automáticos únicos al crear una oportunidad de prueba.
- Barra de porcentaje de colocación en Mi cuenta, sin mostrar cantidad de oportunidades colocadas.
- Mensajes de seguimiento por hitos de 25 %, 50 %, 75 %, 90 % y 100 %, solo en interfaz local.
- Pruebas de asignación automática, elegibilidad y progreso; documentación OPR-COM-001.

### Limitaciones
- No se envían WhatsApp, correo ni notificaciones push; el avance no refleja ventas globales reales.

## [Código validado por CI; despliegue Vercel completado; aceptación funcional pendiente] — 2026-11-13

### Seguridad
- Propuesta de actualización de Next.js 15.5.6 a 15.5.29 y React 19.1.1 a 19.1.5.
- Auditoría de vulnerabilidades altas/críticas en CI.
- Override de PostCSS 8.5.23 para corregir vulnerabilidades de dependencia transitiva de Next.js 15.5.x.
- Registro de incidente OPR-INC-001 por bloqueo de seguridad en Vercel.

### Correcciones
- Sustitución de dos valores CSS de align-items:start por flex-start.

### Entrega
- Integración de Vercel en GitHub confirmó despliegue completado del commit 80e7140.
- URL pública https://oportunia-chi.vercel.app/ observada; landing y avisos de demostración presentes. Pruebas funcionales restantes pendientes.

### Documentación
- Línea base profesional SDLC: PRD, arquitectura, seguridad, operaciones, ADR, incidencias y criterios de aceptación.
- Registro explícito de lo implementado, lo simulado y lo pendiente.
- Plantilla de revisión de cambios.
- Informe de QA parcial OPR-QA-001, con evidencias observadas y pruebas pendientes.

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
