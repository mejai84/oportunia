# Diseño de Oportunia con Antigravity

Los principios de Impeccable y UI UX Pro Max se aplicaron al sistema visual Oportunia Signature. El proyecto tiene archivos `PRODUCT.md`, `DESIGN.md` y `design-system/oportunia/MASTER.md` para mantener la dirección.

Para instalar **las dos herramientas completas** en una copia local del repositorio usando Google Antigravity, ejecutar desde la raíz:

```bash
npx impeccable install
npx ui-ux-pro-max-cli init --ai antigravity
```

Reiniciar Antigravity, abrir Oportunia y revisar las herramientas instaladas antes de utilizar comandos. No activar modos live en una web desplegada; trabajar sobre localhost.

Flujo recomendado de revisión:
1. Ejecutar `/impeccable init`, conservar y revisar el contenido de `PRODUCT.md` existente.
2. `/impeccable document`: partir del `DESIGN.md` existente, no reemplazar la identidad sin revisión.
3. `/impeccable critique` por superficie: hero, premios, menú móvil, administración.
4. `/impeccable polish` y `/impeccable adapt` para concluir los cambios.
5. Usar la búsqueda de diseño de UI UX Pro Max para Next.js y accesibilidad, contrastarla contra `MASTER.md`.
6. `npm run typecheck && npm test && npm run build` y QA manual con navegadores.

**Importante:** las herramientas son asistentes de diseño, no dependencias de runtime. No instalarlas en producción ni habilitar ventas por el hecho de terminar el rediseño.
