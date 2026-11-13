# Oportunia: CRM y control de números

Fecha: 2026-11-13.

## Origen de datos

CRM en /admin/clientes: cuentas registradas en Supabase y reportes bancarios declarados, NO recaudo confirmado. Las notas internas se guardan en una tabla privada de administración con autor y fecha. En Mi cuenta, cada usuario puede editar su nombre, celular y consentimiento comercial; no se envía mensajería.

Control de números en /admin/numeros: monitoreo exclusivo de las órdenes de DEMO de este navegador. No es un registro central de reservas reales ni garantiza disponibilidad entre dispositivos. Se muestran páginas de cien números, filtros, búsqueda, reservas vencidas, pagos parciales de prueba, habilitación simulada y anomalías.

## Seguridad

Las cuentas CRM tienen RLS, lectura propia o de administrador, actualización propia únicamente en las columnas de contacto. Las notas solo pueden ser leídas y creadas por administradores, con autor inmutable. Trigger en Auth crea el perfil sin confiar en metadatos editables. Las referencias de pago siguen siendo declarativas hasta su cotejo con extractos importados.

## Pendiente para producción transaccional

- Tabla única de reservas y números por sorteo, bloqueo de concurrencia y vencimientos en servidor.
- Identidad y oportunidad persistente, pago registrado y conciliar contra movimientos de origen autorizado.
- Permisos de tesorería, auditoría, reglamentos y autorizaciones antes de la venta.
- Integrar comunicaciones solo con consentimiento válido y proveedor habilitado.

## Pruebas funcionales requeridas

Dos clientes no deben poder leer o modificar los datos del otro. Un cliente no puede ver notas internas. El administrador sí puede consultar el directorio y agregar notas. La página de números inicia con 10000 disponibles si no hay datos locales y no confunde simulación con cifras reales. Las tarjetas de dashboard identifican su origen claramente.
