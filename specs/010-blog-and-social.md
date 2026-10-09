# SPEC-010 — Blog y réplica en redes sociales

**Estado:** `borrador` (2026-10-09). Nada implementado. Cubre R6 y parte de R1 de [requirements.md](requirements.md). Desarrolla la sección "SEO, blog y redes" de [SPEC-005](005-acquisition-content-and-reporting.md).

## Problema y resultado

El sitio tiene 41 entradas, 40 publicadas entre julio y agosto y ninguna desde el 31 de agosto. Francisco no tiene tiempo para escribir ni para llevar cada entrada a Facebook e Instagram. No consta qué cuentas existen, quién las administra ni cuánto se ha gastado en promocionarlas.

Resultado: un ritmo fijo de publicaciones en el blog, cada una replicada en Facebook e Instagram, con una sola aprobación de Francisco por pieza.

## Flujo

1. **Calendario mensual.** El asistente propone los temas del mes a partir de las búsquedas de Search Console, las preguntas que llegan por WhatsApp, las actividades de la residencia y las fotos disponibles. Francisco lo aprueba de una vez.
2. **Paquete por tema.** Para cada tema el asistente prepara un paquete: artículo, imagen destacada, publicación de Facebook, publicación de Instagram (imagen y texto) y los enlaces con etiqueta de campaña. Cada afirmación lleva su fuente.
3. **Aprobación.** Francisco aprueba o corrige el paquete completo. Es la única intervención humana y cubre el artículo y sus versiones.
4. **Publicación.** Aprobado el paquete, se publica el artículo en WordPress y, con su dirección ya pública, se publican las versiones de Facebook e Instagram. Todo en la fecha del calendario.
5. **Registro.** Queda el paquete, quién lo aprobó, cuándo y las direcciones publicadas.

**Ritmo (propuesta):** un artículo por semana, con una publicación de Facebook y una de Instagram por artículo.

## Requisitos

- **REQ-001:** nada se publica sin el paquete aprobado; aprobado, no requiere más pasos manuales.
- **REQ-002:** la versión de cada red se escribe para esa red: texto corto, llamada a visitar o escribir por WhatsApp y enlace al artículo. En Instagram el enlace va en la biografía o en la historia; el texto lo indica.
- **REQ-003:** todo enlace publicado lleva etiqueta de campaña generada con `automation/acquisition/tracking.cjs`.
- **REQ-004:** contenido para personas mayores autovalentes y sus familias. Sin afirmaciones médicas no verificadas, sin promesas de salud, sin precios ni disponibilidad que no estén aprobados.
- **REQ-005:** una foto con una persona identificable solo se usa con su autorización registrada. Sin registro, no se usa.
- **REQ-006:** sin testimonios inventados ni reseñas atribuidas.
- **REQ-007:** no más páginas por comuna ni variantes de un mismo artículo (hallazgo S-10 de la línea base).
- **REQ-008:** títulos de hasta 60 caracteres, descripción de hasta 160, un solo título principal, sin emoji ni "Artículo N" en el título o la dirección, texto alternativo en cada imagen.
- **REQ-009:** el paquete pasa por `automation/acquisition/content.cjs` antes de publicarse.
- **REQ-010:** una falla en una red no deja el artículo a medias: se publica lo que se pueda y Francisco recibe qué faltó.

## Plan técnico

- **WordPress:** API REST del sitio (`/wp-json/wp/v2/posts` y `/media`) con una contraseña de aplicación de un usuario editor creado para esto. La contraseña se guarda fuera del repositorio.
- **Facebook e Instagram:** API Graph de Meta sobre la página de Facebook y la cuenta profesional de Instagram vinculada a ella (permisos de publicación en página y en Instagram). Requiere una aplicación de Meta a nombre de NRC y un token de página de larga duración.
- **Plan B si la API de Meta no está disponible para la cuenta:** el paquete aprobado se programa desde Meta Business Suite. Es un paso manual por pieza; se usa solo mientras se resuelve el acceso.
- **Dónde corre:** un guion local, `automation/content/publish.cjs`, que recibe un paquete aprobado y publica. Lo ejecuta el asistente de código cuando Francisco aprueba. Programarlo sin sesión abierta es una mejora posterior.
- **Paquetes:** `content/AAAA-MM/<slug>/` con el artículo en Markdown, los textos de redes, las fuentes y el registro de aprobación. Sin datos de prospectos ni residentes.
- **TikTok:** existe una cuenta con actividad en los informes de julio. Queda fuera de la réplica automática; los reels se suben a mano.

## Inventario previo

Antes de construir nada, Francisco confirma por cada red (Facebook, Instagram, TikTok): dirección de la cuenta, tipo de cuenta, quién es administrador, si Instagram está vinculado a la página de Facebook y si hubo publicidad pagada y cuánto.

## Criterios de aceptación

- **AC-001:** un paquete aprobado termina publicado en el blog, en Facebook y en Instagram sin otra intervención.
- **AC-002:** un paquete sin aprobación registrada no se publica en ningún destino.
- **AC-003:** cada publicación en redes enlaza al artículo con su etiqueta de campaña, y esa visita aparece en Analytics con ese origen.
- **AC-004:** ninguna pieza publicada contiene una afirmación sin fuente, un testimonio sin respaldo ni una foto sin autorización.
- **AC-005:** el registro permite decir, para cualquier pieza, quién la aprobó, cuándo y dónde quedó publicada.
- **AC-006:** se cumple el ritmo del calendario durante un mes completo.
- **AC-007:** volver a ejecutar la publicación de un paquete ya publicado no lo duplica.

## Cómo volver atrás

- Un artículo: pasarlo a borrador o eliminarlo en WordPress.
- Una publicación en redes: eliminarla desde la página o desde Business Suite.
- Cortar el acceso: revocar la contraseña de aplicación en el usuario de WordPress y el token en la configuración de la aplicación de Meta.

## Tareas

1. Inventario de cuentas.
2. Contraseña de aplicación en WordPress y prueba de lectura.
3. Aplicación de Meta, token y prueba con una publicación no listada o programada.
4. Calendario de noviembre y primeros dos paquetes.
5. `publish.cjs` con pruebas sintéticas y una primera publicación real supervisada.
6. Revisar las entradas ya publicadas que afirman efectos en la salud (pendiente de SPEC-005).

## Decisiones abiertas

- Ritmo: uno por semana o uno cada dos.
- Si Don Humberto quiere aprobar el calendario mensual.
- Si se promocionan publicaciones en Meta con parte del tope de $80.000, hoy destinado completo a Google Ads.
