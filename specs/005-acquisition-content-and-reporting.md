# SPEC-005 — Captación, Ads, SEO, contenido e informes

**Estado:** tope de gasto en Google Ads fijado en $80.000 al mes (Francisco, 2026-10-09). [Línea base y auditoría](005-baseline-2026-10.md) hechas el 2026-10-09 con los informes entregados, el sitio público y una lectura de Google Ads, Analytics y Search Console en la sesión de Francisco. Embudo, tope de gasto, atribución, control de publicación e informe `local` en `automation/acquisition/` con pruebas sintéticas; nada conectado a la hoja, a Google Ads ni al sitio.

## Resultado esperado

Mejorar consultas, visitas e ingresos medibles hasta avanzar hacia el objetivo de dos ingresos/mes, sin prometer que publicidad o SEO por sí solos producirán ese resultado.

## Embudo e informe

Medir como mínimo: visita web → consulta/formulario/WhatsApp → contacto y seguimiento → visita propuesta/asignada/confirmada/realizada → ingreso firmado → pago recibido. Reportar cantidades y tasas, tiempo de respuesta, origen/campaña, gasto, costo por consulta/visita/ingreso cuando los datos lo permitan y próximos pasos. Separar métricas agregadas de la lista operativa identificable.

La comisión contractual es el 50% de la cuota de ingreso (aprox. $500.000 líquidos al firmarse el contrato, reajustable) y solo se devenga tras contrato firmado y pago recibido. El informe debe distinguir ingresos firmados de comisiones efectivamente devengadas.

### Cómo se calcula (2026-10-09)

- El embudo de un mes sigue a las consultas recibidas ese mes hasta hoy: una visita o un ingreso posterior cuenta para el mes en que la familia escribió. Aparte se informa lo ocurrido durante el mes (ingresos firmados y pagados).
- Los meses se cuentan en hora de Chile.
- Una etapa sin columna en la hoja se informa como "sin dato", nunca como cero. `Visita realizada` existe en la hoja viva desde el 2026-10-09; falta `Fecha Pago`. El código las busca por encabezado y empieza a usar cada una cuando existe.
- La comisión devengada es la de ingresos firmados con pago registrado. Los firmados sin pago se informan aparte.
- El gasto del mes es el "Costo neto" que muestra Facturación > Resumen en Google Ads para ese mes: lo que Google cobró, no lo presupuestado ni lo cargado (Francisco, 2026-10-09). Gasto en otro medio se informa aparte, con su comprobante.
- Los costos por consulta, visita e ingreso reparten todo el gasto entre todas las consultas, porque la hoja no dice cuál vino de un anuncio.
- El informe sale como borrador en Markdown para que Francisco lo revise; se detiene si recibe un nombre de campo personal, un teléfono, un correo, un RUT o una fila de la hoja.

## Atribución (AC-001)

El formulario es un Google Form incrustado, así que el sitio no puede leer lo que se envía ni pasarle la campaña (hallazgo S-1 del anexo). Camino para esta etapa:

1. Todo enlace que publiquemos (redes, brochure, anuncios) lleva etiquetas de campaña cortas, sin datos de personas.
2. El origen de una consulta se clasifica con lo que haya: clic de anuncio, etiqueta de campaña o, si no hay nada más, lo declarado en el formulario.
3. La pregunta de campaña rellenada por el sitio se agrega junto con el cambio de formulario de SPEC-004, en una sola modificación.
4. Los identificadores de clic de Google (`GCLID` y similares) no se guardan en la hoja mientras Toto no apruebe la base y el consentimiento; se registra solo el canal.

## Google Ads

- Toda campaña nueva se crea con un máximo de $80.000 al mes, con un evento de contacto medido, palabras para autovalentes y palabras negativas.

### Campaña activa desde el 2026-10-09

"Autovalentes zona oriente - Búsqueda", aprobada por Francisco. El asistente la armó en la sesión de Chrome de Francisco y él hizo la confirmación de identidad y el clic de publicar. Verificada después de publicar: habilitada, $2.600 al día, seis comunas y diez negativas.

| | Valor |
|---|---|
| Objetivo y tipo | Tráfico del sitio web, campaña de Búsqueda, sin socios de búsqueda ni Red de Display |
| Presupuesto | $2.600 al día (Google lo limita a unos $79.000 al mes) |
| Puja | Maximizar clics |
| Zona | Personas que están en Las Condes, Vitacura, Lo Barnechea, La Reina, Providencia y Ñuñoa |
| Idioma | Español |
| Palabras (concordancia de frase) | "residencia adulto mayor autovalente", "residencia adultos mayores autovalentes", "residencia adultos mayores las condes", "residencia adulto mayor las condes", "residencia senior las condes", "residencia tercera edad las condes", "senior living santiago" |
| Negativas | "casa de reposo" (frase) y cuidado, cuidados, enfermería, postrado, baratas, gratis, trabajo, empleo, pensión (amplia) |
| Opciones de IA de Google | IA Max, personalización de texto y expansión de la URL final desactivadas |
| Conversión | Pendiente: importar `contact_link_click` desde Analytics cuando aparezca disponible |
- Presupuesto: aprox. USD 80/mes, contemplado en contrato para Meta u otro medio acordado. Don Humberto confirmó destinarlo a Google Ads, según informó Francisco el 2026-10-08. Francisco fijó el tope de gasto de AC-003 en **$80.000 al mes** el 2026-10-09, en pesos porque así cobra la cuenta.
- Establecer límite de gasto, geografía/búsquedas de alta intención y medición del formulario/visita/ingreso antes de optimizar pujas.
- Mantener leads iniciales como señal separada de visitas e ingresos. No enviar PII sin términos, base/consentimiento y configuración compatibles.
- Google actualmente documenta Data Manager para conectar conversiones de leads; verificar interfaz/políticas de la cuenta durante implementación.

## SEO, blog y redes

- Revisar indexación, duplicación, enlaces, UX móvil, Search Console, Analytics y presencia local.
- Crear contenido original, actualizado y útil para personas mayores autovalentes y sus familias. Evitar páginas de comunas casi idénticas, producción masiva de contenido SEO, claims médicos no verificados y testimonios/fotos sin autorización.
- Todo artículo, publicación social, imagen y claim comercial pasa por revisión/aprobación humana antes de publicar. Adaptar cada blog a formatos/contexto de Facebook e Instagram, no republicar automáticamente texto idéntico.
- Verificar permisos de Meta, tipo de cuenta y disponibilidad de API/Business Suite antes de automatizar publicación.

## Criterios de aceptación

- **AC-001:** una consulta se atribuye a un origen/UTM sin registrar datos personales en analytics.
- **AC-002:** el funnel diferencia solicitud, visita y conversión contractual/pagada.
- **AC-003:** el gasto no supera el tope aprobado; los cambios de presupuesto/campaña requieren confirmación humana.
- **AC-004:** ningún texto, claim, testimonio o página se publica sin fuente/aprobación verificable.
- **AC-005:** informes para dirección priorizan agregados y siguientes acciones; PII solo en la hoja restringida cuando es operacionalmente necesario.

## Implementación local

`automation/acquisition/` (prueba: `node --test automation/acquisition/acquisition.test.cjs`):

| Archivo | Qué resuelve | Criterio |
|---|---|---|
| `funnel.cjs` | Reduce una fila de la hoja a los campos del embudo y calcula el mes | AC-002 |
| `tracking.cjs` | Enlaces con etiqueta de campaña, origen de una consulta y eventos sin datos personales | AC-001 |
| `budget.cjs` | Gasto contra el tope y confirmación humana de cada cambio | AC-003 |
| `content.cjs` | Fuentes, permisos y aprobación antes de publicar | AC-004 |
| `report.cjs`, `pii.cjs` | Informe mensual con cantidades y rechazo de datos identificables | AC-005 |

Ninguno lee la hoja, llama a Google ni publica.

## Pendientes

- Revisar la campaña a la semana: términos de búsqueda reales, costo por clic y gasto contra el tope.
- Importar `contact_link_click` a Google Ads como conversión.
- Agregar a la hoja la columna `Fecha Pago`.
- Informe de septiembre con el formato nuevo. Los informes de julio y agosto nombran prospectos; no reenviarlos.
- Cadencia y destinatarios del informe de Don Humberto.
- Acceso al WordPress para los hallazgos S-1 a S-9 del anexo.
- Revisar las entradas publicadas que afirman efectos en la salud.
- Disponibilidad/capacidad actual, precios, condiciones y equipo realmente ofrecido.
- Validar páginas locales existentes, testimonios, permisos de imagen y cuentas sociales.
