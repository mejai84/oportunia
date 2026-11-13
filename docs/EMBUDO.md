# Embudo de captación — Oportunia

## Alcance implementado

- Página comercial móvil en / y /embudo, pensada para campañas de Facebook, Instagram y TikTok.
- Presentación transparente del premio proyectado y del precio de $50.000 por oportunidad.
- CTA a /numeros, donde la demo permite escoger 10 números de cuatro cifras.
- Simulador de abonos: 10 elegidos + hasta 40 aleatorios, habilitación solo al confirmar $50.000.
- Preguntas frecuentes, condiciones visibles y CTA móvil.
- Formulario de solicitud de información, desactivado por defecto.
- Atribución UTM: source, medium, campaign, content y term.
- Endpoint POST /api/leads con validación en servidor y escritura en Supabase solo con clave secreta de servidor.
- Tabla public.funnel_leads creada en el proyecto qsclrpmkgcjobtupicyx (migración 20261113185320_funnel_leads_initial).

## Flujo

Anuncio con UTMs → /embudo → conocer la propuesta → simular abonos → elegir números en /numeros → /pagos y /mi-cuenta (solo demo).

El formulario es opcional: no es una compra ni crea reservas. Nunca se habilitan números por registrarse como interesado.

## Seguridad

- La tabla tiene RLS activada y ningún permiso de lectura/escritura para anon o authenticated.
- El backend usa SUPABASE_SECRET_KEY solo en el servidor. Nunca colocarla en variables NEXT_PUBLIC.
- FUNNEL_LEADS_ENABLED=false por defecto. En esta condición, el formulario no acepta datos y el endpoint responde 503.
- Antes de activarlo: identificar al responsable del tratamiento de datos, publicar política de privacidad definitiva, establecer conservación y borrado, verificar autorizaciones aplicables y agregar CAPTCHA, rate limiting y mecanismos contra abuso.
- No colocar claves en GitHub ni compartirlas en mensajes.
- El prototipo no procesa pagos ni realiza sorteos reales.

## Despliegue pendiente

1. Verificar el despliegue Vercel independiente, la URL publicada y el estado de seguridad tras actualizar Next.js.
2. Configurar SUPABASE_URL y SUPABASE_SECRET_KEY como variables de servidor en Vercel.
3. Mantener FUNNEL_LEADS_ENABLED=false hasta cumplir requisitos legales y de seguridad.
4. Probar en entorno de ensayo y auditar permisos y flujo de contacto antes de habilitar captación.
5. Definir dominio y políticas definitivas.

## Estado del despliegue al 2026-11-13

El log inicial de Vercel para commit b84339d advirtió una versión vulnerable de Next.js. Tras la corrección, la integración de Vercel en GitHub confirmó despliegue completado del commit 80e7140; falta verificar URL pública y comportamiento de pantallas. La corrección de dependencias y el registro de incidencia se documentan en docs/INCIDENTES/INC-2026-11-13-001.md.

## Nota sobre migraciones

La migración inicial del sistema de oportunidades, 20261113000100_initial_oportunia.sql, todavía no se ha aplicado. No aplicar manualmente la migración de funnel_leads una segunda vez; ya figura en el historial remoto. Si se configura un entorno nuevo, ejecutar las migraciones con el flujo oficial y revisar el historial.
