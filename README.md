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
- /numeros — selección de 10 números entre 0000 y 9999 (buscador y cuadrícula paginada).
- /pagos — reportes de abonos simulados.
- /mi-cuenta — números reservados/asignados y saldo.
- /admin — dashboard, aprobación/rechazo de pagos, cartera y control de cierre.

## Flujo de prueba

1. Crear una oportunidad y elegir exactamente 10 números disponibles.
2. Reportar un primer abono de $20.000.
3. En /admin → Pagos, aprobarlo.
4. En /mi-cuenta se ven 10 elegidos + 10 aleatorios, pero no participa.
5. Repetir con $15.000: 10 + 25, aún no participa.
6. Repetir con $15.000: 10 + 40, habilitada al completar $50.000.

Los números se mantienen únicos en el navegador de demo. Los datos se guardan en localStorage: no son compartidos, seguros ni persistentes entre dispositivos. El panel administrativo no tiene autenticación. NO usar para cobrar, vender o sortear.

## Preparación Supabase

El esquema SQL inicial de oportunidades está en supabase/migrations/20261113000100_initial_oportunia.sql.
Ese esquema de oportunidades no se ha aplicado a ninguna base de datos. Incluye RLS habilitado sin políticas de acceso: denegación por defecto.

**El proyecto Supabase Oportunia qsclrpmkgcjobtupicyx sí tiene creada la tabla public.funnel_leads**, mediante la migración 20261113185320_funnel_leads_initial. La tabla tiene RLS y no permite acceso directo a visitantes. El formulario está apagado por defecto y requiere un secreto de servidor, política de privacidad y medidas anti-abuso antes de activarse. Ver docs/EMBUDO.md. Antes de conectar datos reales hay que implementar Auth, roles, políticas RLS, asignaciones atómicas y auditoría.

## Despliegue Vercel

Una vez revisado el código, importar mejai84/oportunia en Vercel como proyecto Next.js y desplegar desde main. El dominio se conectará posteriormente. Se recibió un registro de compilación Vercel del 2026-11-13 para el commit b84339d. La compilación terminó, pero Vercel detectó Next.js 15.5.6 vulnerable. **El nuevo commit 80e7140 fue marcado por la integración Vercel como 'Deployment has completed'; falta probar la URL pública y las pantallas.** La corrección de dependencias está registrada en docs/INCIDENTES/INC-2026-11-13-001.md. La tabla de captación del embudo existe en Supabase, pero el sitio no tiene configuradas las credenciales de servidor.

## Pruebas

- npm run typecheck
- npm test
- npm run build

## Estado legal y funcional

**Solo prototipo.** El esquema de financiación, la asignación progresiva, la fecha del sorteo condicionada a ventas y el plazo de siete días requieren validación del reglamento y de las autorizaciones aplicables en Colombia. Si vencen los siete días con saldos impagos, el sistema entra en revisión, no adjudica ni decide automáticamente sobre esos números.

Consultar docs/README.md para toda la documentación controlada del proyecto.
