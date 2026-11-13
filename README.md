# Oportunia — plataforma digital | Ingeniería de software

Proyecto independiente de software en fase **prototipo / preproducción**. El producto contiene un embudo de captación y una demostración de oportunidades, financiación y administración. No se venden oportunidades ni se procesan pagos reales.

**Documentación de ingeniería:** [docs/README.md](docs/README.md) — índice, requisitos, arquitectura, decisiones técnicas, seguridad, despliegue, incidencias y control de cambios.

## Ejecutar localmente

1. Instalar Node.js 22.
2. Ejecutar npm install.
3. Ejecutar npm run dev.
4. Abrir http://localhost:3000.

No se necesitan variables de entorno para la demo. Para preparar Supabase, copiar .env.example a .env.local y completar las variables públicas de un proyecto independiente.

## Pantallas incluidas

- / y /embudo — página de embudo comercial con CTA, simulador de abonos, preguntas frecuentes y formulario de interés desactivado por defecto.
- /numeros — el cliente escoge 10 números manualmente o solicita 10 automáticos disponibles; los 40 adicionales se asignan con abonos aprobados. **Pago completo está preseleccionado**, las cuotas son opcionales (demo local).
- /pagos — reportes de abonos simulados.
- /mi-cuenta — números reservados/asignados, saldo, **porcentajes reales de la demo local** de ocupación separados entre reservas y pagos completos, y novedades por hitos (no cifras globales).
- /recuperar — renovar una reserva inicial vencida, recuperar números anteriores libres y sustituir los ocupados.
- /reglas — reglas provisionales, aceptación obligatoria antes de reservar.
- /acceso — vista informativa del futuro acceso por celular y código temporal de WhatsApp (sin envíos).
- /admin — crear, habilitar, pausar y seleccionar sorteos de demostración; cada uno tiene números independientes. La pestaña **Contenido e imágenes** permite editar nombre/premio/descripción y subir por separado imagen de portada e imagen del artículo (solo en el navegador de prueba).
- /admin — dashboard, aprobación/rechazo de pagos, cartera y control de cierre.

## Flujo de prueba

1. Crear una oportunidad: escoger 10 números manualmente o seleccionar asignación automática de los primeros 10. **Pago completo viene seleccionado por defecto**.
2. Si deseas probar abonos, cambia expresamente a tres cuotas y reporta el primer abono de $20.000. Si mantienes pago completo, reporta $50.000.
3. En /admin → Pagos, aprobarlo.
4. En /mi-cuenta se ven 10 elegidos + 10 aleatorios, pero no participa.
5. Repetir con $15.000: 10 + 25, aún no participa.
6. Repetir con $15.000: 10 + 40, habilitada al completar $50.000.

La reserva inicial sin abono aprobado vence en 24 horas; el cliente puede recuperar números aún disponibles. Los sorteos múltiples, las reservas y las aceptaciones son solo datos de este navegador. La asignación automática reserva diez números únicos de la demo y los muestra en Mi cuenta. El progreso de ocupación inicia en 0 % y separa reservas/abonos de pagos completos; solo refleja las oportunidades creadas en el mismo navegador, sin inventar un 35 % inicial. NO es un indicador global de ventas. Los avisos por hitos se muestran en la pantalla, no se envían por WhatsApp ni correo. Los números se mantienen únicos en el navegador de demo. Los datos se guardan en localStorage: no son compartidos, seguros ni persistentes entre dispositivos. El panel administrativo no tiene autenticación. NO usar para cobrar, vender o sortear.

## Preparación Supabase

El esquema SQL inicial de oportunidades está en supabase/migrations/20261113000100_initial_oportunia.sql.
Ese esquema de oportunidades no se ha aplicado a ninguna base de datos. Incluye RLS habilitado sin políticas de acceso: denegación por defecto.

**El proyecto Supabase Oportunia qsclrpmkgcjobtupicyx sí tiene creada la tabla public.funnel_leads**, mediante la migración 20261113185320_funnel_leads_initial. La tabla tiene RLS y no permite acceso directo a visitantes. El formulario está apagado por defecto y requiere un secreto de servidor, política de privacidad y medidas anti-abuso antes de activarse. Ver docs/EMBUDO.md. Antes de conectar datos reales hay que implementar Auth, roles, políticas RLS, asignaciones atómicas y auditoría.

## Despliegue Vercel

**URL pública verificada (demo): https://oportunia-chi.vercel.app/**. El proyecto se despliega desde `main` en Vercel. Un dominio propio podrá conectarse posteriormente. Se recibió un registro de compilación Vercel del 2026-11-13 para el commit b84339d. La compilación terminó, pero Vercel detectó Next.js 15.5.6 vulnerable. **El nuevo commit 80e7140 fue marcado por la integración Vercel como 'Deployment has completed'; la página de bienvenida ya fue observada en la URL pública, pero faltan pruebas funcionales de los demás flujos. Ver docs/PRUEBAS/QA-2026-11-13-001.md.** La corrección de dependencias está registrada en docs/INCIDENTES/INC-2026-11-13-001.md. La tabla de captación del embudo existe en Supabase, pero el sitio no tiene configuradas las credenciales de servidor.

## Pruebas

- npm run typecheck
- npm test
- npm run build

## Estado legal y funcional

**Solo prototipo.** El esquema de financiación, la asignación progresiva, la fecha del sorteo condicionada a ventas y el plazo de siete días requieren validación del reglamento y de las autorizaciones aplicables en Colombia. Si vencen los siete días con saldos impagos, el sistema entra en revisión, no adjudica ni decide automáticamente sobre esos números.

Consultar docs/README.md para toda la documentación controlada del proyecto.


## Identidad visual y catálogo público (2026-11-13)
La web de marketing adopta el trébol verde, el dorado y fondos claros. El catálogo de ediciones se lee desde `public.draw_catalog` en el proyecto Supabase Oportunia por `GET /api/catalog`, con políticas RLS de lectura de sorteos publicados. El editor protegido está en `/admin/catalogo`: requiere un usuario Supabase Auth registrado en `public.oportunia_admins`. El bucket público `draw-media` admite imágenes JPG/PNG/WebP con escritura solo administrativa.

**La plataforma transaccional sigue pendiente:** las reservas, abonos, selección de números y seguimiento de compras todavía usan estado local del navegador y no son operaciones reales. No aceptar dinero ni adjudicar premios antes de implementar transacciones, auditoría, controles antifraude, privacidad y autorizaciones aplicables. No anunciar porcentajes de ventas no verificados.
