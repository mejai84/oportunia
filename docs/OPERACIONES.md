# OPR-OPS-001 · Manual de despliegue y operación

**Fecha:** 2026-11-13 | **Plataformas:** GitHub Actions, Vercel, Supabase  
**Estado:** despliegue confirmado; URL pública y contenido de landing observados; smoke tests funcionales restantes pendientes.

## 1. Inventario de ambientes

| Ambiente | Servicio | Estado |
|---|---|---|
| Repositorio | GitHub mejai84/oportunia, rama main | Confirmado |
| Integración continua | GitHub Actions | Confirmado, ver ejecución por commit |
| Web | https://oportunia-chi.vercel.app/ | Página de bienvenida observada en navegador; resto de smoke tests pendiente |
| Datos de interesados | Supabase qsclrpmkgcjobtupicyx | Tabla funnel_leads creada y RLS activo |
| Transacciones reales | No disponible | Bloqueado |

## 2. Variables de entorno

| Variable | Uso | Estado esperado |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL pública del proyecto | Opcional para demo |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clave pública | Opcional para demo |
| SUPABASE_URL | URL Supabase del backend | Necesaria solo si se habilita API de interesados |
| SUPABASE_SECRET_KEY | Clave secreta de servidor | Necesaria solo si se habilita API de interesados |
| FUNNEL_LEADS_ENABLED | Interruptor del formulario | **false** hasta autorización y controles antiabuso |

Nunca incluir secretos en Git, archivos públicos o NEXT_PUBLIC. El código actual **no requiere credenciales para presentar la landing**.

## 3. Procedimiento de despliegue

1. Verificar la rama main y el commit exacto a desplegar.
2. Ejecutar npm install, npm run typecheck, npm test y npm run build en entorno limpio.
3. Ejecutar npm audit --omit=dev --audit-level=high; no promover cambios con vulnerabilidades altas/críticas sin excepción formal.
4. Revisar CI y verificar que el proveedor no bloquee la versión de Next.js. El proyecto fuerza PostCSS 8.5.23 por un hallazgo transitivo de seguridad: no eliminar el override sin comprobar npm audit y build.
5. Desplegar en Vercel desde main, con variables del entorno correspondiente.
6. Revisar estado final del despliegue y obtener URL exacta desde Vercel.
7. Validar HTTPS, /, /embudo, /numeros, /pagos, /mi-cuenta y /admin como **demo**.
8. Verificar que /api/leads devuelva 503 mientras el formulario esté deshabilitado.
9. Probar visualización móvil, navegación, consola, errores 404 y rendimiento básico.
10. Registrar URL, commit, fecha, resultado y responsable en el registro de entrega.

**No inferir éxito de publicación solo por el mensaje "Build Completed".**

## 4. Checklist de aceptación posdespliegue

- [x] El despliegue del commit 80e7140 figura Ready en Vercel. La integración del commit documental posterior también indica éxito. No se inspeccionaron todos los logs del último despliegue.
- [x] La URL pública https://oportunia-chi.vercel.app/ carga en navegador mediante HTTPS.
- [x] La página muestra claramente "MODO DEMOSTRACIÓN".
- [ ] El simulador muestra 20/50 no elegible con COP 20.000.
- [ ] El simulador muestra 50/50 elegible con COP 50.000, solo en demo.
- [ ] El formulario aparece deshabilitado visualmente; **pendiente** probar que la API rechace solicitudes (503).
- [ ] No hay errores graves de consola ni fallos de navegación.
- [ ] El despliegue coincide con el commit validado.
- [ ] Se ha registrado evidencia de prueba y responsable.

## 5. Rollback

1. Si un despliegue falla o aparece un incidente, deshabilitar cualquier formulario de captura y mantener pagos reales apagados.
2. Identificar el último despliegue **verificado como seguro**.
3. Restaurar únicamente ese despliegue desde Vercel; **no** volver a una versión de Next.js vulnerable.
4. Verificar endpoints, accesos y variables, y registrar la incidencia.
5. Si hubo exposición de secretos, activar protocolo de rotación y análisis de impacto.

No se dispone todavía de una versión productiva verificada a la cual regresar.

## 6. Evidencia del 2026-11-13

- Vercel región iad1, 2 CPU y 8 GB.
- Commit de entrada: b84339d.
- Next.js detectado: 15.5.6.
- Compilación finalizada y funciones generadas.
- Advertencia de seguridad: "Vulnerable version of Next.js detected, please update immediately".
- Advertencia CSS: autoprefixer recomienda flex-start en lugar de start.
- Advertencias secundarias: npm cache-dir e install-scripts.
- Estado de publicación final: **no verificado**, porque el log termina al iniciar despliegue y advertir del bloqueo.

Referencia: [INC-2026-11-13-001](INCIDENTES/INC-2026-11-13-001.md).

## 6.1. Evidencia de despliegue corregido (2026-11-13)

- Commit: 80e714052347f9a4c2d8f6711a484ce764d59dbe (main).
- Estado de GitHub Actions: success.
- Estado de integración Vercel en GitHub: success, descripción **Deployment has completed**.
- Consola del despliegue: https://vercel.com/jaimes-projects-705b34e5/oportunia/iwuWH1ytjgr1tad4zKP3HcFBbVGZ
- URL pública: https://oportunia-chi.vercel.app/ (landing observada en navegador el 2026-11-13).
- Informe de verificación parcial: [OPR-QA-001](PRUEBAS/QA-2026-11-13-001.md).
- Pruebas de aceptación de flujos internos: **pendientes**. No se declara listo para operación comercial.

## 6.2. Entrega de selección automática y progreso porcentual (2026-11-13)

- Commit integrado en main: `64471594907bbfa0542a554b1d778ebeffe91889`.
- GitHub Actions: auditoría, TypeScript, pruebas y build **aprobados** (run `43491098661`).
- Integración de Vercel: **Deployment has completed** para el mismo commit.
- URL del entorno: https://oportunia-chi.vercel.app/.
- Se introducen elección manual/automática, barra porcentual y mensajes por hitos. **Pendiente:** probar los clics y la experiencia en la URL pública; ver [OPR-QA-002](PRUEBAS/QA-2026-11-13-002.md).
- Los datos siguen siendo solo del navegador y no se enviaron notificaciones externas.

## 7. Operación posterior

Antes de lanzar: monitoreo, alertas, respaldo, pruebas de restauración, plan de respuesta a incidentes, gestión de accesos, actualización periódica de dependencias y revisión de auditoría.
