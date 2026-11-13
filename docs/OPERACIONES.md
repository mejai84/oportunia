# OPR-OPS-001 · Manual de despliegue y operación

**Fecha:** 2026-11-13 | **Plataformas:** GitHub Actions, Vercel, Supabase  
**Estado:** procedimiento propuesto; aún no se conoce URL pública verificada.

## 1. Inventario de ambientes

| Ambiente | Servicio | Estado |
|---|---|---|
| Repositorio | GitHub mejai84/oportunia, rama main | Confirmado |
| Integración continua | GitHub Actions | Confirmado, ver ejecución por commit |
| Web | Vercel, compilación registrada para b84339d | Resultado final de publicación no verificado |
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

- [ ] El estado en Vercel es Ready, sin bloqueo de seguridad.
- [ ] La URL pública está identificada y HTTPS funciona.
- [ ] La página muestra claramente "MODO DEMOSTRACIÓN".
- [ ] El simulador muestra 20/50 no elegible con COP 20.000.
- [ ] El simulador muestra 50/50 elegible con COP 50.000, solo en demo.
- [ ] El formulario no acepta datos si FUNNEL_LEADS_ENABLED=false.
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

## 7. Operación posterior

Antes de lanzar: monitoreo, alertas, respaldo, pruebas de restauración, plan de respuesta a incidentes, gestión de accesos, actualización periódica de dependencias y revisión de auditoría.
