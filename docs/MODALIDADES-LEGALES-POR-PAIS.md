# Oportunia — dos modalidades legales por país

## Propósito

Cada edición tiene **un país de comercialización** y una de dos modalidades:
- `permit_required`: requiere y registra autorización o licencia específica. Debe incluir autoridad, operador responsable, referencia y documento HTTPS.
- `no_permit_required`: solo para una jurisdicción donde, tras una revisión legal, **la actividad concreta y sus condiciones** no necesitan permiso específico. No se inventa número de autorización. Debe incluir explicación legal de al menos 100 caracteres y fuente jurídica HTTPS.

**No existe una lista automática de países "sin permiso".** La legislación puede variar por provincia, tipo de sorteo, venta en línea, modalidad de azar y destino de participantes. La ausencia de permiso específico no equivale a ausencia de obligaciones (edad, impuestos, protección del consumidor, datos personales, publicidad, prevención de fraude). En Colombia, las rifas siguen obligatoriamente la vía `permit_required`, de acuerdo con el Decreto 1486 de 2024 y las normas aplicables.

## Configuración desde el propietario

Entrar a `/admin/ventas`. En cada edición, seleccionar código ISO del país y modalidad. Registrar operador u organizador, reglas HTTPS, fechas de validez y confirmación de que el modelo 10 números iniciales + 40 extras, cuotas y venta web son permitidos allí.

La vía con autorización exige documento y resolución; la vía sin autorización exige fundamento jurídico documentado, verificable y correspondiente al país y la actividad exacta. Solo el propietario puede activar o suspender ventas. La base de datos prohíbe cambiar país o régimen después de que existan pedidos.

El sistema registra el país, modalidad, operador/organizador, fuente jurídica o referencia de permiso y reglamento aceptado al crear un pedido.

## Compradores y alcance internacional

Una edición extranjera requiere **revisión previa del país de residencia del comprador**. El cliente solicita la revisión en `/numeros`; el propietario decide en `/admin/ventas` tras comprobar la elegibilidad por medios adecuados y documentar su decisión. La autorización es por país, usuario y 180 días, con auditoría, no una etiqueta editada por el propio cliente. No se considera fiable únicamente la IP.

El sistema actual **solo opera en COP** y registra transferencias hacia cuentas Bancolombia o Nequi configuradas por el propietario. No hay moneda ni métodos de cobro locales de otros países, liquidación de impuestos extranjeros, ni registro automático ante un operador local. Activar una modalidad legal distinta no añade esos servicios. Antes de aceptar clientes de un país extranjero deben confirmarse el marco territorial, la recepción válida de los pagos, el cumplimiento fiscal y la distribución de premios.

No se permite seleccionar `no_permit_required` para `CO` en la base de datos o el panel.

## Controles y pruebas

- Las nuevas tablas de solicitudes y verificaciones tienen RLS, `SELECT` limitado al titular o al propietario y ninguna escritura directa desde el navegador.
- Se retiró `EXECUTE` de la antigua función administrativa `configure_commerce_draw`; solo `configure_commerce_draw_v2` permite elegir el régimen y audita la identidad del propietario.
- Una selección extranjera falla en el servidor si el cliente carece de verificación territorial vigente.
- Un cambio posterior de país o régimen se rechaza cuando la edición ya tiene pedidos, para no modificar retroactivamente reglas o derechos.
- Mantener el bloqueo de números por comprobante pendiente y la acreditación exclusivamente manual de transferencias, sin cambios.

## Fuente colombiana
- [Decreto 1486 de 2024, Presidencia de Colombia](https://www.presidencia.gov.co/Documents/241213-Decreto-1486-del-13-de-diciembre-de-2024.pdf)
- [Gestor Normativo — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma_pdf.php?i=256696)
