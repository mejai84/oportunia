# ADR-0001 · Arquitectura tecnológica y separación de ambientes

**Fecha:** 2026-11-13 | **Estado:** aceptada para prototipo, no para producción real.

## Contexto

Se necesita una landing móvil, un flujo de números y financiación demostrativa y un futuro backend transaccional. El proyecto debe mantenerse independiente de cualquier otra empresa o software.

## Decisión

- Frontend: Next.js App Router y React.
- Control de versiones y CI: GitHub y GitHub Actions.
- Hosting de frontend: Vercel.
- Base de datos: Supabase PostgreSQL, proyecto independiente qsclrpmkgcjobtupicyx.
- Estado de simulación: localStorage del navegador, claramente identificado como no confiable.
- Automatización futura: n8n y canales de mensajería autorizados.

## Alternativas

- Aplicación totalmente estática: más simple, pero limitada para backend y validaciones.
- Usar localStorage como producción: descartado por manipulación, falta de concurrencia y ausencia de control de acceso.
- Unificar con otros sistemas: descartado por separación de negocios y riesgos operativos.

## Consecuencias

El backend real requerirá Auth, RLS, funciones transaccionales, auditoría y separación de ambientes. Las claves secretas permanecen en el servidor. El despliegue debe verificar versiones de dependencias y la URL pública. No se autoriza operación real por adoptar esta arquitectura.
