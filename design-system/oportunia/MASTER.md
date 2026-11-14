# Oportunia / Master design system — 2026-11-14

**Producto:** marketplace informativo de oportunidades y premios con panel de gestión.  
**Stack detectado:** Next.js 15 + React 19 + CSS tradicional + Supabase.  
**Patrón:** landing editorial de portada amplia y catálogo desplazable; panel operativo compacto.  
**Tratamiento:** refined editorial commerce, visual hierarchy, restrained depth.  
**Fuentes existentes:** Outfit para títulos y DM Sans para cuerpo. No incorporar una tercera familia.

## Tokens
| Uso | Token | Valor |
|---|---|---|
| Principal oscuro | `--op-forest` | `#073b2b` |
| Secundario oscuro | `--op-forest-strong` | `#052e23` |
| Acciones / enlaces | `--op-emerald` | `#086747` |
| Acento | `--op-gold` | `#bb8a35` |
| Fondo | `--op-ivory` | `#faf9f4` |
| Superficie | `--op-paper` | `#fff` |
| Texto | `--op-ink` | `#193c30` |
| Texto secundario | `--op-subtle` | `#557267` |
| Borde | `--op-stroke` | `#dde6dc` |

## Escala y densidad
Separaciones base 8/12/16/24/32/48/72 px. Radios 12/18/26 px, usar pocas sombras. Encabezados grandes con interlineado 1.05 a 1.15 y letra ajustada; párrafos entre 15 y 16 px. Solo la información secundaria no crítica puede usar 12–13 px. Textos de navegación nunca debajo de 13 px.

## Comportamientos
- Navegación accesible y objetivo táctil >=44 px.
- Carrusel estable con parada por foco/hover/interacción y preferencia de movimiento reducido.
- Fotografías sin salto brusco, `4/5` para tarjetas; `contain` en productos ilustrados, `cover` en fotos de catálogo.
- Estado de botón disabled, hover, active y focus visibles.
- Breakpoints de inspección: 320, 375, 680, 900, 1024 y 1440 px.
- Las tarjetas no deben prometer participación o pago activo cuando el backend no lo confirme.

## Variantes de pantalla
**Portada:** espaciado amplio, fotografía protagonista, grilla ligera, pocos CTA.  
**Catálogo:** uniformidad fotográfica, sin falsos conteos ni urgencia.  
**Cuenta y formularios:** fondos blancos, labels visibles, mensaje de validación junto a la acción.  
**Administración:** jerarquía por módulos; mantener el fondo oscuro existente para gráficos porque la lectura ya fue diseñada a ese contraste. No reinterpretar el estado de verificación bancaria como confirmación.

## Anti-patrones
Nada de comentarios simulados, porcentajes de venta inventados, brillos neón, emojis como pictogramas decorativos, texto de estado ambiguo, controles pequeños, tarjetas dentro de tarjetas o CSS que oculte contenido legal.

## Herramientas de referencia
- [Impeccable](https://github.com/pbakaus/impeccable): `init`, `document`, `critique`, `polish`, `adapt`, `audit`.
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): consulta de reglas UX y Next.js, tokens y patrón master + overrides.

Las guías informan la implementación; el sistema ejecutable sigue siendo el CSS del proyecto. La instalación completa de los CLI de terceros requiere hacerlo en una terminal con acceso a npm.
