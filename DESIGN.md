# Oportunia Signature — sistema de diseño

La referencia de estilo del proyecto es `design-system/oportunia/MASTER.md`. Esta guía responde a Impeccable `document`; las decisiones se inspiran en Impeccable `distill/typeset/adapt/polish` y en los criterios de accesibilidad y consistencia de UI UX Pro Max.

## Personalidad
Editorial, aspiracional y sobria. Más vitrina de premios de alta calidad que interfaz de juego. El color oro es acento, no texto principal ni botón crítico. No usar gradientes azul-violeta, brillos neón, testimonio falso, contador ficticio o seis tarjetas anidadas.

## Paleta
- Bosque: `#073b2b` — botones principales, cabecera de vitrina y métricas informativas.
- Bosque intenso: `#052e23` — contrastes y fondo oscuro.
- Esmeralda: `#086747` — enlaces, progreso de ejemplo y énfasis.
- Marfil: `#faf9f4` — fondo de página.
- Blanco: `#ffffff` — superficies.
- Oro champán: `#bb8a35` — acentos, marcador de identidad.
- Tinta: `#193c30`; texto secundario `#557267`; borde `#dde6dc`.

Fuente de verdad técnica: `src/app/oportunia-signature.css`, importada al final en `src/app/layout.tsx`.

## Componentes
- Header: trébol y marca, menú reducido y un CTA de cuenta contrastado.
- Hero: gran tipografía Outfit y una única vitrina oscura con fotografía real o recurso de catálogo. Ninguna cifra de venta artificial.
- Tarjetas de premio: fotografía 4:5, título, descripción, enlace, misma altura visual y `object-fit` coherente.
- Beneficios: cuatro contenidos con iconos SVG y alineación óptica uniforme.
- Proceso: cuatro pasos con jerarquía clara y enlaces descriptivos.
- Opiniones: solo registros publicados en la base de datos, sin reseñas de relleno.
- Panel: tarjetas de módulos y dashboard con prioridades claras; permisos verificados en Supabase.

## Reglas de UX
Los objetivos táctiles miden al menos 44 px, focus-visible debe estar presente, texto informativo con contraste razonable, estados de carga/error visibles y movimiento reducible con `prefers-reduced-motion`. El carrusel permite pausarse con ratón, foco y gesto y respeta esa preferencia. Formatos largos se envuelven sin corte.

## Alcance del cambio
El rediseño es una capa visual incremental para no desestabilizar las funcionalidades. Revisar y retirar CSS heredado en una entrega separada después de QA visual comparativa; no eliminar estilos históricos a ciegas.
