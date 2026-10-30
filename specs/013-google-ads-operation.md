# SPEC-013 — Operación de Google Ads

**Estado:** campaña "Autovalentes zona oriente - Búsqueda" activa desde el 2026-10-09 y con conversión medida desde el 2026-10-13. La rutina semanal partió el 2026-10-17, adelantada del 19. Cubre R5 y parte de R1 de [requirements.md](requirements.md). Esta especificación es la fuente única de la configuración de la campaña; cada cambio queda en [013-ads-log.md](013-ads-log.md).

## Para qué sirve la campaña

La meta de la residencia es **2 ingresos al mes**. La campaña no produce ingresos por sí sola: trae familias que buscan una residencia para una persona autovalente en la zona oriente. El ingreso se gana después, en el seguimiento ([SPEC-014](014-form-to-visit.md) y [SPEC-007](007-prospect-reactivation.md)).

| Paso | Dónde se mide | Dato al 2026-10-13 |
|---|---|---|
| Ven el anuncio y entran al sitio | Google Ads: apariciones y clics | 113 apariciones, 15 clics en cinco días |
| Recorren el sitio | Analytics: sesiones por anuncio con interacción | 8 de cada 10 |
| Llegan a la página de contacto | Google Ads: conversión "Contacto" | Mide desde el 2026-10-13 |
| Consultan | Hoja: prospectos nuevos | 3 en octubre |
| Visitan | Hoja: `Visita realizada` | 3 de 3 |
| Ingresan | Hoja: `Ingresó?` | 0 en octubre |

El histórico de la hoja dice que de cada 10 consultas, 7 terminan en visita, y que de 17 visitas salió 1 ingreso. Por eso la campaña se optimiza para **más consultas de personas autovalentes**, no para más clics, y todo lo que la campaña trae pasa al seguimiento el mismo día.

## Configuración vigente

| | Valor |
|---|---|
| Tipo | Búsqueda, sin socios de búsqueda ni Red de Display |
| Presupuesto | $2.750 al día hasta el 31 de octubre; $2.200 al día desde el 1 de noviembre |
| Puja | Maximizar clics, con límite de $300 por clic (desde el 2026-10-29; antes $400) |
| Zona | Personas que están en Las Condes, Vitacura, Lo Barnechea, La Reina, Providencia y Ñuñoa |
| Dispositivos | Celulares y tablets; computadores con ajuste de -80 % desde el 2026-10-29 (se puja el 20 % de lo normal) |
| Idioma | Español |
| Destino | `https://nuestraresidenciachile.cl/visita/`, página propia de la campaña (fuente en `automation/wordpress/landing-visita.html`) |
| Opciones de IA de Google | IA Max, personalización de texto y expansión de la URL final desactivadas |

**Palabras clave (17 activas, en concordancia de frase salvo [residencia adulto mayor], exacta desde el 2026-10-29):**

- Autovalentes: "residencia adulto mayor autovalente", "residencia adultos mayores autovalentes", "senior living santiago".
- Las Condes: "residencia adultos mayores las condes", "residencia adulto mayor las condes", "residencia senior las condes", "residencia tercera edad las condes", "hogar adulto mayor las condes".
- Otras comunas: "residencia adulto mayor" + vitacura, lo barnechea, la reina, providencia y ñuñoa.
- Generales, limitadas por la zona: "residencia para adultos mayores", [residencia adulto mayor] (exacta; la de frase quedó detenida el 2026-10-29 por su costo por conversión), "residencias adultos mayores", "residencia tercera edad".

**Negativas (59 desde el 2026-10-29; el detalle de las agregadas después del 13 está en el registro):**

- Cuidados que la residencia no ofrece: "casa de reposo", cuidado, cuidados, enfermería, postrado.
- Precio y empleo: baratas, gratis, gratuito, gratuitos, gratuitas, pensión, trabajo, empleo.
- Hogares de beneficencia y servicios públicos: conapran, "hogar san jose", "hogar de cristo", "las rosas", "san vicente de paul", "san gerardo", "casa de acogida", fundacion, fundación, municipal.
- Otros servicios: jardin, jardín, "centro de dia", "centro de día".
- Comunas fuera de la zona: macul, "la florida", quilicura, maipu, maipú, "puente alto", "la cisterna", "san miguel".
- Otras residencias y búsquedas de dirección: acalis, aurum, "villa soleares", "senior suites", "el atardecer", "otoño dorado", direccion, dirección.

Las búsquedas por el nombre de otras residencias se excluyen a medida que aparecen en los términos de búsqueda (Francisco, 2026-10-17): en la primera semana con límite de puja, cerca de un cuarto de los clics fueron de esas búsquedas y ninguno trajo un prospecto.

**Anuncio (responsivo, 12 títulos y 4 descripciones):**

- Títulos: Agendar Visita y Cotizar · Nuestra Residencia · Contacto · Residencia En Las Condes · Adultos Mayores Autovalentes · Residencia de Adulto Mayor · Calidad de Vida Senior · Visita Sin Compromiso · Jardines y Áreas Verdes · Más de 15 Años de Experiencia · Habitación Individual · Agenda Tu Visita.
- Descripciones: las tres originales y "Habitación individual, jardines y tres comidas diarias. Agenda tu visita sin compromiso."
- Vínculos a sitio: "Agenda tu visita" (`/contact/`, con el horario de visitas; se mantiene ahí porque un vínculo debe llevar a una página distinta de la del anuncio) y "Conoce la residencia" (`/about-us/`).

Cada texto sale de un hecho aprobado: [002-faq-base.md](002-faq-base.md) (horario de visitas, experiencia, habitación individual) y [008-facts.md](008-facts.md) (H-02, H-07 y H-14).

## Medición

- **Conversión "Clic en WhatsApp o formulario":** principal. La página `/visita/` la envía cuando alguien pulsa el botón de WhatsApp o abre el formulario; cuenta una vez por clic de anuncio y no usa conversiones avanzadas. Es la señal más cercana a una consulta que el sitio puede dar.
- **Conversión "Contacto (nuestraresidenciachile.cl/)":** cuenta la llegada a una página que comienza con `/contact`. Desde que el anuncio lleva a `/visita/` solo la activan quienes entran por el vínculo "Agenda tu visita" o navegan hasta ahí.
- **Lo que no se puede medir:** el envío del formulario, porque es un Google Form incrustado (hallazgo S-1 del [anexo de SPEC-005](005-baseline-2026-10.md)).
- **Consultas reales:** se cuentan en la hoja. La comparación semanal es clics → conversiones → prospectos nuevos con origen "Sitio Web" o "WhatsApp".

## Rutina semanal

Cada lunes, sobre los 7 días anteriores:

| Paso | Qué se mira | Acción |
|---|---|---|
| 1 | Costo neto del mes en Facturación | Ajustar el presupuesto diario para cerrar el mes en el monto definido |
| 2 | Términos de búsqueda | Agregar como negativas los que no son de autovalentes o no son de residencias privadas |
| 3 | Clics, costo por clic y conversiones por palabra | Pausar la palabra con 30 clics o más y sin conversiones; subir o bajar el límite de puja si la campaña no gasta o paga de más |
| 4 | Estado de las palabras ("volumen bajo", "en revisión") | Reemplazar las que no reciben apariciones |
| 5 | Títulos y descripciones | Cambiar el de peor rendimiento, solo con hechos aprobados |
| 6 | Prospectos nuevos de la semana en la hoja | Comparar con clics y conversiones |

El resultado es una nota en [013-ads-log.md](013-ads-log.md): gasto, clics, conversiones, prospectos y cambios hechos.

## Requisitos

- **REQ-001:** el presupuesto mensual lo define Francisco. El asistente ajusta presupuesto diario, pujas, palabras, negativas y textos dentro de ese monto y registra cada cambio.
- **REQ-002:** crear otra campaña, cambiar la zona, activar otra red o pasar a otra plataforma lo decide Francisco.
- **REQ-003:** cuando Google pide confirmar identidad, la confirma Francisco.
- **REQ-004:** los textos usan solo hechos aprobados. Sin afirmaciones de salud, sin precios y sin disponibilidad.
- **REQ-005:** la campaña apunta a personas autovalentes en la zona oriente.
- **REQ-006:** no se envían datos personales a Google Ads. Las conversiones avanzadas y la importación de datos de la hoja siguen apagadas hasta que Toto las apruebe (SPEC-004).
- **REQ-007:** las opciones automáticas de Google (IA Max, personalización de texto, expansión de la URL final, socios de búsqueda, Display) siguen desactivadas.
- **REQ-008:** no se agrega recurso de llamada: la atención es por WhatsApp y formulario.
- **REQ-009:** cada cambio queda con fecha y motivo en `specs/013-ads-log.md`.

## Criterios de aceptación

- **AC-001:** Google Ads muestra conversiones de la acción "Clic en WhatsApp o formulario".
- **AC-002:** hay una nota por cada semana con la campaña activa.
- **AC-003:** el costo neto de cada mes cierra en el monto definido por Francisco.
- **AC-004:** a las cuatro semanas, ningún término de búsqueda con más de 5 clics corresponde a cuidados, empleo, beneficencia o precios bajos.
- **AC-005:** cada prospecto nuevo de la semana recibe su primer mensaje el mismo día (SPEC-014).

## Cómo volver atrás

- Pausar la campaña desde Google Ads detiene el gasto de inmediato.
- El historial de cambios de la cuenta permite deshacer un cambio puntual.
- El registro de cambios dice qué se tocó y cuándo.

## Calendario

| Fecha | Qué |
|---|---|
| 2026-10-17 | Primera revisión semanal, adelantada del 19: hecha (ver el registro) |
| 2026-10-19 | Revisión adicional pedida por Francisco: hecha (ver el registro); 4 negativas más |
| 2026-10-25 | Vence el crédito publicitario que muestra la cuenta; el 2026-10-29 el resumen de facturación ya no muestra crédito |
| 2026-10-26 | Segunda revisión semanal: hecha el 2026-10-29 (ver el registro); 12 negativas más |
| 2026-11-01 | Bajar el presupuesto a $2.200 al día: lo hace una regla automática creada el 2026-10-29 |
| 2026-11-02 | Revisión semanal; comprobar que la regla dejó el presupuesto en $2.200 |
| 2026-11-09 | Cuatro semanas: decidir con datos si se mantiene "Maximizar clics" o se pasa a puja por conversiones |

## Decisiones abiertas

- Si parte del presupuesto va a Meta, que es lo que nombra el contrato.
