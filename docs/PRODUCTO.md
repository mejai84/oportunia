# OPR-PRD-001 · Documento de requisitos de producto (PRD)

**Producto:** Oportunia | **Versión:** 0.1 | **Fecha:** 2026-11-13  
**Estado:** borrador controlado; no equivale a autorización para comercializar.

## 1. Visión y objetivo

Plataforma web independiente para presentar, administrar y eventualmente comercializar oportunidades numeradas de un sorteo sujeto a la normativa colombiana. La primera entrega es un **embudo demostrativo** y no una operación de juegos de suerte y azar.

**Usuarios previstos:** visitantes de campañas, interesados, compradores registrados, operador de cartera, administrador y auditor. Solo los visitantes y los flujos simulados están implementados.

## 2. Alcance de la fase 1 (prototipo)

- Landing de conversión para campañas digitales y tráfico orgánico.
- Explicación de premio proyectado, precio, número de oportunidades y condiciones.
- Simulador interactivo de abonos y estado de elegibilidad.
- Selección demostrativa de diez números de cuatro cifras.
- Panel de pagos y administración **solo en localStorage**, sin autenticación real.
- Captura UTM y formulario de interesados preparados, pero **desactivados** hasta cumplir privacidad y antiabuso.
- Tabla de interesados en Supabase con RLS sin acceso directo público.

**Fuera de alcance:** recaudo, emisión de comprobantes reales, asignación real compartida, ganador, transmisión de sorteos, campañas publicitarias activas, notificaciones automatizadas y conciliación bancaria.

## 3. Reglas de negocio

| ID | Regla | Estado |
|---|---|---|
| BR-001 | Máximo 200 oportunidades por sorteo | Confirmada para prototipo |
| BR-002 | Valor COP 50.000 por oportunidad | Confirmada para prototipo |
| BR-003 | 50 números únicos de cuatro cifras por oportunidad | Confirmada para prototipo |
| BR-004 | El usuario escoge 10 números de 0000 a 9999 | Confirmada para prototipo |
| BR-005 | Los otros 40 se asignan aleatoriamente según pagos confirmados | Confirmada para prototipo |
| BR-006 | Primer abono mínimo COP 10.000 | Implementada en demo; revisar condiciones comerciales |
| BR-007 | Por cada COP 1.000 confirmado corresponde un número asignado | Confirmada para prototipo |
| BR-008 | Ningún número participa si la oportunidad no está 100 % pagada | **Crítica, obligatoria** |
| BR-009 | Al colocar las 200 oportunidades se permite hasta 7 días calendario para cobrar saldos | Definida para diseño; cierre real sujeto a reglamento |
| BR-010 | Se propone tomar las cuatro últimas cifras del premio mayor de la Lotería de Medellín | Propuesta sujeta a validación y autorización |
| BR-011 | Si vencen 7 días con saldos impagos, el sistema entra en revisión, sin adjudicar ni reasignar automáticamente | Pendiente de decisión y reglamento |

**Ejemplo de pagos aprobados:** COP 20.000 → 10 elegidos + 10 aleatorios (20 asignados; NO participa); COP 35.000 acumulados → 10 + 25 (35 asignados; NO participa); COP 50.000 acumulados → 10 + 40 (50 asignados; elegible sujeto a reglamento).

**Unicidad:** el universo de números es 0000 a 9999. En producción, la unicidad debe garantizarse en PostgreSQL por sorteo con transacciones y restricciones, no con localStorage ni comprobaciones del navegador.

## 4. Embudo de adquisición

**Visitante** → landing → explicación y preguntas → simulador de abonos → demostración de elección → interés/contacto (solo cuando esté habilitado legalmente) → eventual compra autorizada.

Métricas futuras: visitas, procedencia UTM, CTA de selección, finalización de formulario, solicitudes válidas y conversiones. **No hay analítica ni indicadores de conversión reales implementados.** No publicar métricas simuladas como datos operativos.

## 5. Criterios de aceptación de la landing

- AC-001: el precio y el máximo de oportunidades se presentan sin ambigüedad.
- AC-002: la landing distingue el prototipo de una venta real y muestra que no hay sorteo autorizado en operación.
- AC-003: el simulador de 20.000 muestra 20 asignados y NO PARTICIPA.
- AC-004: el simulador de 50.000 muestra 50 asignados y HABILITADA como simulación.
- AC-005: el botón principal lleva a la selección de números.
- AC-006: el diseño funciona en móvil y escritorio.
- AC-007: el formulario desactivado no transmite datos.
- AC-008: la API de interesados desactivada responde 503.
- AC-009: los datos no se exponen a usuarios anónimos desde Supabase.
- AC-010: se conservan UTMs en las solicitudes solo cuando el formulario se habilite.

## 6. Decisiones de negocio abiertas

1. Qué hacer con las oportunidades impagas al séptimo día: sortear solo las pagadas o liberar/reofrecer impagas.
2. Si el resultado de cuatro cifras corresponde a un número no elegible, cuál es el procedimiento previamente autorizado.
3. Duración de reservas, cancelaciones, devoluciones y tratamiento de pagos parciales.
4. Operador legal, alcance territorial, permisos, reglamento, premio final, entrega, impuestos y políticas de protección al consumidor.
5. Proveedor de pagos, mecanismo de validación y tiempos de conciliación.
6. Marca, dominio, responsable de tratamiento de datos y canales de atención.

## 7. Requisitos no funcionales

- Seguridad: principio de mínimo privilegio, autenticación, RLS, auditoría, antifraude y revisión de dependencias.
- Integridad: idempotencia de pagos, transacciones y exclusividad de números.
- Disponibilidad: monitoreo y alertas; objetivos de SLA pendientes de aprobación.
- Privacidad: consentimiento verificable, finalidad, retención y ejercicio de derechos.
- Accesibilidad: navegación por teclado, etiquetas, contraste y mensajes claros.
- Observabilidad: trazas sin datos sensibles, métricas y registro de cambios.
- Recuperación: backups y restauración probada antes de producción.

## 8. Trazabilidad

Las historias y cambios futuros deben referenciar BR-xxx y AC-xxx. Toda modificación que afecte elegibilidad, pagos, asignaciones, reglamento o datos personales requiere revisión de seguridad y documentación.
