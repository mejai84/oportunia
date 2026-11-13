# OPR-SEC-001 · Seguridad, privacidad y riesgos

**Fecha:** 2026-11-13 | **Estado:** línea base de preproducción.  
**Clasificación:** documento técnico; no contiene secretos.

## 1. Modelo de amenazas

**Activos:** números únicos, saldo de pagos, elegibilidad, datos de contacto, historial de operaciones, credenciales de administrador, API de Supabase y reputación del operador.

**Amenazas prioritarias:** manipulación de pagos desde el navegador, asignación duplicada concurrente, acceso indebido a datos personales, suplantación de administradores, spam del formulario, filtración de claves, dependencias vulnerables, alteración de resultados y falta de trazabilidad.

## 2. Controles implementados y límites

| Control | Estado | Evidencia |
|---|---|---|
| RLS en public.funnel_leads | Implementado | Proyecto Supabase qsclrpmkgcjobtupicyx |
| Denegación de lectura/escritura directa para anon y authenticated | Implementado | GRANT/REVOKE y RLS |
| API de interesados desactivada por defecto | Implementado | FUNNEL_LEADS_ENABLED=false |
| Clave secreta únicamente en servidor | Implementado en código; no configurado en despliegue | /api/leads |
| Validación de entrada y consentimiento | Implementado en código; sin captura activa | src/lib/funnel.ts |
| Protección CAPTCHA y limitación de frecuencia | **Pendiente** | Bloquea habilitar formulario |
| Política de privacidad y responsable de tratamiento | **Pendiente** | Bloquea habilitar formulario |
| Identidad de compradores y administradores | **Pendiente** | Demo localStorage no es autenticación |
| Pago y asignación atómicos en BD | **Pendiente** | Bloquea ventas reales |
| Verificación de webhooks de pagos | **Pendiente** | Bloquea cobros |
| Registro auditable e inmutable de sorteos | **Pendiente** | Bloquea operación |
| Dependencias actualizadas y auditoría CI | Corrección propuesta, requiere validación CI y Vercel | INC-2026-11-13-001 |

## 3. Matriz de riesgos

| ID | Riesgo | Severidad inicial | Tratamiento |
|---|---|---|---|
| R-01 | Framework vulnerable con posibilidad de ejecución remota | Crítica | Actualizar Next.js y verificar despliegue limpio |
| R-02 | Falsificación de pago y participación indebida | Crítica | Backend autenticado, conciliación e idempotencia |
| R-03 | Duplicidad de números en concurrencia | Alta | Índice UNIQUE por sorteo, transacciones y locks |
| R-04 | Exposición de contactos | Alta | RLS, backend protegido, minimización, retención |
| R-05 | Bots saturan formulario público | Alta | CAPTCHA, rate limiting, controles de abuso |
| R-06 | Administración sin control de acceso | Crítica si se usara con datos reales | Mantener exclusivamente demo; implantar roles |
| R-07 | Sorteo sin autorización y reglas incompletas | Crítica de cumplimiento | Bloqueo de comercialización |
| R-08 | Instalaciones no reproducibles sin lockfile | Media | Generar package-lock.json y adoptar npm ci |

Las severidades son evaluación preliminar de ingeniería, no un dictamen regulatorio ni auditoría de penetración.

## 4. Datos personales

Los datos previstos para solicitudes de interés son nombre, celular, correo opcional, consentimientos, UTMs y fecha. Antes de habilitar captación: definir responsable, finalidad, base legal, información al titular, canal de ejercicio de derechos, retención, borrado, control de acceso y contrato con proveedores cuando aplique. Separar consentimiento de contacto solicitado del consentimiento de marketing.

**No publicar datos reales en GitHub, logs de CI, capturas de pantalla, issues ni tickets.**

## 5. Secretos y ambientes

- Variables públicas: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
- Variables de servidor: SUPABASE_URL y SUPABASE_SECRET_KEY. Nunca prefijar secretos con NEXT_PUBLIC.
- No registrar valores de secretos ni tokens en logs.
- Rotar credenciales ante exposición o evidencia de compromiso.
- Mantener entorno demo separado de datos reales.

## 6. Puerta de seguridad

La aplicación se puede mostrar **como demostración** tras validar despliegue y dependencias. No se habilita registro real, pagos, sorteo ni panel administrativo operativo sin cierre documentado de R-02 a R-07, autorización y pruebas.
