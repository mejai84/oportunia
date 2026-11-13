# OPR-UX-004 · Pago completo, avance verificable y experiencia adaptable

**Fecha:** 2026-11-13 · **Estado:** implementado en demo local, validación visual manual pendiente.

## Decisión comercial

- La opción **Pago completo** aparece seleccionada por defecto en la pantalla de números.
- Dos y tres cuotas continúan disponibles, pero requieren elección expresa del usuario.
- El simulador abre con el valor completo de COP 50.000 para mostrar la elegibilidad solo tras pago total.
- La pantalla de reporte de pago sugiere el saldo completo o la cuota correspondiente a la oportunidad; el administrador sigue aprobando reportes simulados.

## Política de transparencia de avance

- El porcentaje parte de **0 %**, nunca de 35 % ficticio ni de un umbral comercial artificial.
- El avance se calcula por sorteo a partir de oportunidades vigentes, no de todas las órdenes históricas.
- Se separa el porcentaje de **reservas y abonos parciales** del porcentaje de **oportunidades pagadas al 100 %**.
- Las oportunidades vencidas sin abono aprobado no cuentan como ocupadas.
- La portada y Mi cuenta muestran **porcentajes**, no inventario ni conteos globales de compradores.
- En ausencia de ocupación se prioriza un mensaje de invitación: «¡Sé de los primeros en elegir tus números!».
- Los porcentajes actuales son **solo de datos locales del navegador** y no se deben comunicar como ventas reales. La fuente global verificada requiere base de datos, autenticación, servidor y conciliación.

**Fórmulas:** `ocupacion = (reservas vigentes + abonos parciales + pagos completos) / 200 × 100`; `pagadas = oportunidades pagadas al 100 % / 200 × 100`; `separadas = ocupacion - pagadas`. Una reserva caducada no se cuenta.

## Adaptabilidad

Se añade CSS responsive después de la hoja de diseño claro con objetivos de experiencia para:

- **Móviles:** 320, 360, 375, 390, 430, 560 px. Menú compacto, 5 columnas para números, controles táctiles de al menos 44 px, columnas apiladas, barra inferior con área segura.
- **Tabletas:** 768, 820, 1024 px. Distribución sin desbordamientos, formulario a una columna cuando sea necesario, cuadrícula de números con áreas táctiles.
- **Escritorio:** 1280, 1440, 1920 px. Diseño de dos columnas, navegación completa, tarjetas y carrusel.
- Preferencias: `prefers-reduced-motion`, navegación por teclado y foco visible.

**Limitación:** los estilos se implementaron, pero no hay evidencia de capturas de pantalla ni pruebas manuales en dispositivos reales. Ver OPR-QA-004.

## Pruebas de aceptación

1. Al abrir `/numeros`, «Pago completo» está marcado y las cuotas no.
2. Si se eligen cuotas, el valor de prueba sugerido se ajusta al plan.
3. Con cero órdenes, el avance público es 0 %, no 35 %.
4. Reservas vigentes incrementan solo «separadas»; pago completo mueve esa parte a «pagadas».
5. Una reserva vencida deja de contar; no puede hacer parecer que hay ventas.
6. Los porcentajes de cada sorteo son independientes.
7. Portada y Mi cuenta no muestran conteos globales de oportunidades vendidas.
8. Menú, carrusel, cuadrícula, formulario, tablas y pie de página se comprueban en los anchos indicados.
9. No se habilitan pagos reales, OTP ni sorteos por este cambio.
