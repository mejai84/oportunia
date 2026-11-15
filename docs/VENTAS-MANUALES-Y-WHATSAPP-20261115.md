# Oportunia — ventas con revisión bancaria manual

## Apertura real de una edición

En `/admin/ventas`, el propietario selecciona el país y la modalidad legal de cada edición: **autorización requerida** (autoridad, operador, resolución y documento) o **sin permiso específico** (sustento legal y fuente oficial verificable para el país concreto). Siempre se requiere reglamento, vigencia y que la mecánica 10+40 y los planes de cuotas estén permitidos. Colombia exige la vía de autorización para rifas. Consulta `docs/MODALIDADES-LEGALES-POR-PAIS.md`. También publica al menos una cuenta receptora (Bancolombia o Nequi, con número exacto y titular). Solo después activa la edición desde el interruptor **Habilitar nuevas ventas**. Esto se puede desactivar para cerrar nuevas reservas sin perder créditos o comprobantes abiertos.

Un dato declarado por el propietario no sustituye una comprobación jurídica independiente. La reglamentación colombiana exige operador autorizado, comercialización registrada en tiempo real y observancia del modelo aprobado. La conexión automática al sistema del operador **no está implementada**; no afirmar dicha integración ni emitir un comprobante oficial del operador sin su registro real. No cargar cuentas bancarias en archivos del repositorio ni claves bancarias en Supabase.

## Flujo de cliente
1. Se registra/inicia sesión, consulta edición y reglamento y elige 10 números libres o 10 automáticos en `/numeros`. PostgreSQL hace el bloqueo transaccional; dos clientes no pueden obtener el mismo número en la misma edición.
2. Se crea `reserved`, con vencimiento a las 24 horas y **10 números apartados**. No es pago acreditado.
3. Para pagar, consulta **solo cuentas receptoras publicadas** por el propietario, transfiere desde Bancolombia, Nequi, Bre-B o DaviPlata, y adjunta un archivo privado PDF/JPG/PNG/WebP (5 MB máximo) con referencia de la transacción.
4. La recepción del comprobante cambia el estado a `proof_pending`, registra `review_due_at = now()+72 h` y mantiene los diez números **bloqueados incluso después de esas 72 horas** hasta decisión humana. Un comprobante **NO** marca el abono como recibido. Sin comprobante, una reserva de 24 horas se libera al vencer.
5. Tesorería consulta la cuenta destinataria directamente, verifica crédito real, cantidad, fecha, referencia bancaria única, y registra evidencia y responsable desde `/admin/revision-pagos`.
6. Al **aprobar**, una única transacción SQL registra crédito, total recibido y asignación proporcional de números: 20 mil → 20 números, 25 mil → 25 números, 35 mil → 35 números, 50 mil → 50 números. Los primeros diez son los elegidos o automáticos; adicionales aleatorios, sin duplicados por edición. Los abonos parciales no habilitan el sorteo.
7. Al **rechazar**, queda motivo, auditoría y notificación visible en historial. Sin abonos previos, la reserva conserva números seis horas para corregir; con abonos previos los números se preservan hasta resolver los siguientes pagos.

## Bancos
- Destino: cuenta de ahorros Bancolombia y/o Nequi configuradas en panel por propietario. No hay pasarela de pagos.
- Origen admitido: Bancolombia, Nequi, Bre-B, DaviPlata u otros canales de transferencia; el banco destino debe coincidir con la cuenta donde se confirmó el crédito.
- No hay integración API bancaria. La verificación es humana; la identidad del responsable, fecha, monto y referencia bancaria quedan auditados. Un mismo movimiento bancario solo puede acreditarse una vez.
- No pedir contraseñas, códigos OTP ni acceso a aplicaciones bancarias de los clientes.

## WhatsApp por edición

Inspiración: algunos operadores privados captan público por web, invitan a grupos y un asesor valida disponibilidad antes del pago. Para Oportunia se recomienda una separación clara: un canal informativo voluntario para interesados, y **un grupo privado para titulares con pago total confirmado**.

- Crear manualmente el grupo de la edición al abrir la comercialización o al confirmar la primera compra; configurarlo con **aprobación de solicitudes**, reglas contra spam, 1–3 administradores, enlace rotado ante filtraciones.
- Guardar el nombre y enlace desde `/admin/ventas`. Esta plataforma no crea grupos automáticamente ni incorpora a los contactos por fuerza. En la cuenta se ofrece ingreso **solo tras confirmar los 50.000 COP** y aceptar el aviso de visibilidad del nombre y número de WhatsApp entre integrantes.
- Si se revoca consentimiento, Oportunia deja de mostrar el enlace; la salida del grupo debe hacerse en WhatsApp. El enlace puede reenviarse, por eso conviene aprobar manualmente cada solicitud contra el listado de pagados.
- Mensajes propuestos:
  - *Pago recibido*: «Tu abono fue confirmado manualmente. Tu pedido [código] tiene ahora [cantidad] números. Consulta tu cuenta para verlos».
  - *Comprobante recibido*: «Recibimos el comprobante [referencia]. Tus números están protegidos mientras tesorería verifica el ingreso. No es confirmación del pago».
  - *Bienvenida al grupo*: «Bienvenido/a al grupo de la edición. Consulta números y fechas oficiales en Oportunia; evita publicar comprobantes, claves o datos personales aquí».

No hay integración de envío automático de WhatsApp, SMS o correo transaccional en este cambio.

## Seguridad y límites
- Auth Supabase con RLS y permisos de propietario/tesorería; recibos en bucket privado.
- Máximo 200 oportunidades en una edición; precio actual 50.000 COP por oportunidad.
- Máximo tres pedidos creados por cuenta cada 24 horas, seis comprobantes por cuenta cada 24 horas, ocho por pedido y un solo comprobante pendiente por pedido.
- El bloqueo de comprobantes pendientes requiere una cola de tesorería atendida. Atrasarse más de 72 horas exige revisión prioritaria; nunca usar un cron para vender números con pago posiblemente recibido.
- El flujo comercial no modifica ni acredita los reportes bancarios históricos, las reservas gratuitas de ensayo, las opiniones o los resultados de sorteo anteriores.

## Verificaciones externas necesarias
1. Confirmar con el operador autorizado que el reglamento, el modelo 10+40, las cuotas y la distribución web cumplen exactamente la autorización y la normativa; registrar en el sistema del operador lo requerido para cada venta/participación.
2. Activar la URL de recuperación de contraseña en Supabase Auth: `https://oportunia-chi.vercel.app/actualizar-contrasena` (Authentication → URL Configuration).
3. Habilitar Auth Leaked Password Protection desde el panel de Supabase cuando esté disponible.
4. Realizar una prueba integral con cuentas propias, no clientes, antes de iniciar anuncios, verificando vencimiento, bloqueo por comprobante, rechazo y aprobaciones; no simular abonos falsos en una cuenta real.
