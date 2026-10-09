# SPEC-011 — Posicionamiento y mantención del sitio

**Estado:** `borrador` (2026-10-09). Nada implementado. Cubre R2 y parte de R1 de [requirements.md](requirements.md). Parte de los hallazgos S-1 a S-10 y de la lectura de Search Console de la [línea base](005-baseline-2026-10.md).

## Problema y resultado

Quien busca el nombre de la residencia la encuentra primero. Quien no la conoce casi no la ve: "residencia adulto mayor autovalente" sale en la posición 12, "residencia adulto mayor lo barnechea" en la 15, "hogar de ancianos las condes" en la 28 y "residencias adultos mayores" en la 54. De 149 clics en tres meses, 58 son de marca. El sitio tarda 11,9 segundos en cargar en celular, donde entra el 70 % de las visitas. Y Francisco no tiene tiempo para cargar información nueva.

Resultado: el sitio aparece en la primera página para las búsquedas de quien no conoce la residencia, mide sus consultas, y se actualiza sin que Francisco tenga que entrar al WordPress.

## Acceso

El contrato (cláusula cuarta) le da a Francisco acceso de administrador. Para trabajar:

- Un usuario propio para la automatización, con contraseña de aplicación, guardada fuera del repositorio.
- Respaldo completo con el plugin de migración ya instalado antes de cada lote de cambios.
- No hay sitio de pruebas: cada lote se aplica en vivo, supervisado, con su respaldo y su lista de cambios.

## Paquetes de trabajo

| # | Paquete | Qué incluye | Hallazgos |
|---|---|---|---|
| P1 | Medición | Clics en WhatsApp, teléfono y correo como eventos clave; `contact_link_click` importado a Google Ads; verificación de que cada evento se cuenta una vez | S-1 |
| P2 | Indexación | `noindex` en `/gracias/`, etiquetas y categorías; revisar las 29 páginas que Google no indexa | S-2, S-4 |
| P3 | Páginas | Títulos de hasta 60 caracteres, descripciones de hasta 160, las 6 descripciones que faltan, un solo título principal por página, texto alternativo en las 28 imágenes | S-5, S-6, S-9 |
| P4 | Direcciones | Quitar emoji y "Artículo N" de 10 entradas, con redirección permanente desde la dirección antigua | S-7 |
| P5 | Presencia local | Datos estructurados de negocio local (dirección, teléfono, horario de visitas); Perfil de Negocio de Google reclamado, verificado y completo, con fotos y enlace al sitio | S-8 |
| P6 | Velocidad | Imágenes en formato y tamaño adecuados, carga diferida, caché; reservar espacio para evitar saltos de diseño | Site Kit |
| P7 | Páginas de intención | Mejorar las páginas existentes que responden a las búsquedas objetivo; no crear variantes por comuna | S-10 |
| P8 | Actualizaciones | Francisco envía un texto o una foto; el asistente lo deja como borrador en el sitio; Francisco aprueba y se publica | — |

El formulario sigue siendo el Google Form incrustado, porque SPEC-001 depende de él. Su envío no se puede medir desde el sitio; por eso P1 mide el clic de contacto.

## Búsquedas objetivo y metas

Son metas de trabajo, no promesas: la posición depende también de la competencia.

| Búsqueda | Posición al 2026-10-06 | Meta a 3 meses |
|---|---|---|
| residencia adulto mayor autovalente | 12 | primeras 10 |
| residencia adulto mayor lo barnechea | 15 | primeras 10 |
| residencia adultos mayores las condes | sin dato | primeras 10 |
| hogar de ancianos las condes | 28 | primeras 20 |
| residencias adultos mayores | 54 | primeras 30 |

Otras metas: clics que no son de marca, de 91 en tres meses a 180; carga principal en celular bajo 4 segundos y después bajo 2,5; salto de diseño bajo 0,1.

## Requisitos

- **REQ-001:** ningún cambio en vivo sin respaldo previo y sin que Francisco haya aprobado el lote.
- **REQ-002:** toda dirección que cambia deja una redirección permanente; ningún enlace interno queda roto.
- **REQ-003:** los hechos que se agreguen (horarios, servicios, equipo, precios) salen de la base aprobada; no se publica nada nuevo sobre salud o disponibilidad.
- **REQ-004:** una actualización pedida por Francisco queda como borrador en menos de un día y no se publica sola.
- **REQ-005:** cada mes se registran las posiciones de las búsquedas objetivo, los clics que no son de marca y la velocidad, y pasan al informe (SPEC-012).
- **REQ-006:** no se instalan plugins nuevos sin revisar su efecto en velocidad y en cookies (SPEC-004).

## Criterios de aceptación

- **AC-001:** Analytics cuenta como evento clave cada clic en WhatsApp, teléfono y correo, y Google Ads los recibe como conversión.
- **AC-002:** `/gracias/`, etiquetas y categorías dejan de estar indexadas.
- **AC-003:** ninguna página del mapa del sitio tiene título de más de 60 caracteres, descripción ausente o de más de 160, más de un título principal o una imagen de contenido sin texto alternativo.
- **AC-004:** las 10 direcciones antiguas redirigen a las nuevas.
- **AC-005:** la prueba de resultados enriquecidos de Google reconoce el negocio local, y el Perfil de Negocio está verificado.
- **AC-006:** la carga principal en celular baja de 4 segundos y el salto de diseño de 0,1, medidos con PageSpeed.
- **AC-007:** una actualización pedida por Francisco se publica con una sola aprobación suya.
- **AC-008:** el registro mensual existe para tres meses seguidos.

## Cómo volver atrás

- Restaurar el respaldo tomado antes del lote.
- Un cambio puntual: el historial de revisiones de WordPress para textos; la lista de redirecciones del plugin de SEO para direcciones.
- Cortar el acceso: revocar la contraseña de aplicación.

## Tareas, en orden

1. Usuario y contraseña de aplicación; prueba de lectura.
2. P1 medición: sin esto no se sabe qué funciona.
3. P2 indexación y P5 presencia local.
4. P3 páginas y P4 direcciones, en un solo lote con su respaldo.
5. P6 velocidad.
6. P7 páginas de intención, junto con el calendario de SPEC-010.
7. P8 queda disponible desde la tarea 1.

## Decisiones abiertas

- Quién administra hoy el Perfil de Negocio de Google, si existe.
- Si se reemplaza el Google Form por un formulario propio que escriba en la misma hoja. Propuesta: no por ahora.
- Banner de cookies: depende de Toto (SPEC-004).
