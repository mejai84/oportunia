# Sistema de documentación de ingeniería — Oportunia

**Producto:** Oportunia · plataforma digital independiente  
**Identificador del proyecto:** OPR  
**Estado:** prototipo / preproducción  
**Fecha de línea base:** 2026-11-13  
**Versión documental:** 0.1  
**Repositorio:** https://github.com/mejai84/oportunia  
**Base de datos:** Supabase, proyecto qsclrpmkgcjobtupicyx  
**Entorno web:** Vercel; URL de producción y publicación final pendientes de verificación.

## Política documental

Esta documentación se mantiene **junto al código fuente**, se versiona con Git, se revisa mediante pull requests y se actualiza cuando cambian requisitos, interfaces, esquemas de datos, controles de seguridad o procesos operativos.

Cada decisión técnica importante se registra mediante un ADR. Las incidencias tienen identificador, severidad, evidencia, causa, corrección, verificación y estado. No se declara un despliegue exitoso sin comprobar su URL y las pruebas de aceptación. Las fechas son de registro, no implican que se haya desplegado una versión.

No se deben documentar secretos, claves privadas, contraseñas, datos personales de clientes ni comprobantes reales en GitHub.

## Índice documental

| Documento | Código | Objetivo |
|---|---|---|
| [Requisitos y producto](PRODUCTO.md) | OPR-PRD-001 | Visión, alcance, reglas, criterios de aceptación y decisiones pendientes |
| [Arquitectura](ARQUITECTURA.md) | OPR-ARC-001 | Estado de componentes y requisitos técnicos |
| [Embudo](EMBUDO.md) | OPR-FUN-001 | Recorrido de visitantes, atribución, captura y limitaciones |
| [Seguridad y privacidad](SEGURIDAD.md) | OPR-SEC-001 | Amenazas, controles, riesgo residual y bloqueos de producción |
| [Despliegue y operación](OPERACIONES.md) | OPR-OPS-001 | Vercel, Supabase, variables, pruebas y rollback |
| [Registro de decisiones](DECISIONES/README.md) | OPR-ADR | Decisiones técnicas y de negocio |
| [Incidente de seguridad Next.js](INCIDENTES/INC-2026-11-13-001.md) | OPR-INC-001 | Análisis del log de Vercel y remediación |
| [Registro de cambios](../CHANGELOG.md) | OPR-CHG | Historial funcional y técnico |
| [Plantilla de PR](../.github/pull_request_template.md) | OPR-QA | Evidencias mínimas por cambio |

## Ciclo de desarrollo (SDLC)

1. **Descubrimiento:** requisitos y criterios de aceptación, diferenciando decisiones confirmadas de pendientes.
2. **Diseño:** arquitectura, amenazas, modelo de datos, UX y ADR cuando aplique.
3. **Implementación:** rama de trabajo, cambios pequeños, sin secretos en el repositorio.
4. **Calidad:** pruebas unitarias, TypeScript, build y auditoría de dependencias.
5. **Revisión:** pull request, evidencia, riesgos y plan de reversión.
6. **Entrega:** integración a main solo con verificaciones satisfactorias; despliegue en entorno identificado.
7. **Operación:** pruebas postdespliegue, seguimiento de incidencias y documentación actualizada.

## Clasificación de estados

- **Implementado y probado:** código integrado y verificado por CI.
- **Implementado sin validar en producción:** código disponible, falta comprobar despliegue y uso real.
- **En diseño:** reglas definidas, aún sin implementación segura.
- **Bloqueado:** falta autorización, infraestructura, seguridad o decisión del negocio.

## Puertas de calidad para producción

No habilitar ventas, pagos, sorteos, asignación real de números ni captación masiva sin: autorización/reglamento, identidad y roles, RLS, operaciones transaccionales, pasarela aprobada, privacidad, antiabuso, auditoría, backups, monitoreo, pruebas concurrentes y aceptación documentada.

## Gobierno y responsabilidades

Los roles a asignar formalmente son: responsable de producto, líder técnico, responsable de seguridad/privacidad, responsable de calidad y responsable de operaciones. **No se han asignado nombres ni aprobaciones.** Una sola persona podrá asumir varios roles si se documenta.

## Pendientes transversales

- Añadir y versionar package-lock.json con instalación reproducible; hoy el repositorio no lo incluye.
- Definir ambiente de pruebas y URL de Vercel, sin afirmar disponibilidad antes de verificar.
- Habilitar controles de ramas y revisiones según permisos del repositorio.
- Completar matriz de pruebas E2E y control de vulnerabilidades de dependencias.
- Definir política de conservación, derechos de titulares y gestión de incidentes de datos.
