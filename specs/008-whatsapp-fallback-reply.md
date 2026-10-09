# SPEC-008 — Respuesta de respaldo en WhatsApp

**Estado:** `borrador` (2026-10-09). Nada implementado. Cubre R7 de [requirements.md](requirements.md): "si yo no respondo, tú respondes". Extiende [SPEC-002](002-whatsapp-frontdesk.md) y reemplaza su regla de que una consulta derivada espera a Francisco sin límite.

## Problema y resultado

SPEC-002 responde 16 preguntas con texto aprobado y deriva todo lo demás. Si Francisco no contesta la derivación, el prospecto se queda con "te respondo a la brevedad" y un recordatorio a Francisco a las 2 horas. Para una familia que compara residencias, eso es perder la consulta.

Resultado: ningún mensaje entrante queda sin una respuesta útil. Francisco tiene la primera opción; vencido el plazo, responde el asistente.

## Niveles de respuesta

| Nivel | Cuándo | Qué responde |
|---|---|---|
| 1 | La consulta coincide con una fila aprobada del Anexo A | El texto aprobado, de inmediato (SPEC-002, sin cambios) |
| 2 | Consulta derivada, tema no reservado, y Francisco no respondió en el plazo | Respuesta redactada solo con hechos aprobados |
| 3 | Consulta derivada, tema reservado, y Francisco no respondió en el plazo | Texto fijo por motivo, que da un paso siguiente real |

**Plazo:** 30 minutos (Francisco, 2026-10-09: no estará pendiente del teléfono). El plazo corre entre 8:00 y 22:00 de Santiago; fuera de ese horario el asistente responde de inmediato (aceptado por Francisco, 2026-10-09). Configurable con `FALLBACK_MINUTES`.

Si Francisco escribe en el chat antes del plazo, el asistente calla, igual que hoy. Si el asistente ya respondió, Francisco puede tomar el chat cuando quiera.

## Nivel 2 — respuesta redactada

- Un modelo de lenguaje redacta la respuesta. Recibe el texto de la consulta, los últimos mensajes de ese chat y la base de hechos aprobados. No recibe teléfono, nombre, ID ni nada de la hoja.
- **Base de hechos:** el Anexo A más un archivo nuevo, `specs/008-facts.md`, con hechos numerados (`H-01`…) tomados del sitio y el brochure 2026, cada uno con fuente, dueño y aprobación. Solo cuentan los aprobados.
- El modelo devuelve el texto y los IDs de los hechos que usó. El servicio comprueba, sin modelo:
  - que cada ID citado existe y está aprobado;
  - que todo número, precio, horario o dirección del texto aparece en un hecho citado;
  - que el texto no supera 500 caracteres ni toca un tema reservado.
- Si la comprobación falla o el modelo no encuentra hechos, se usa el nivel 3 con motivo `fuera de la base`.
- Proveedor propuesto: Claude Haiku por la API de Anthropic, con la clave en los secretos de Cloudflare. Es un tercero nuevo que recibe texto de conversaciones: entra en la revisión de Toto (SPEC-004).

## Nivel 3 — textos por motivo (aprobados por Francisco el 2026-10-09)

| ID | Motivo | Texto propuesto | Estado |
|---|---|---|---|
| RS-01 | Disponibilidad | La disponibilidad va cambiando, así que prefiero confirmártela con el equipo antes de decirte algo que no sea exacto. Mientras tanto, ¿te gustaría agendar una visita? Recibimos de lunes a viernes, de 10:00 a 11:30 o de 14:00 a 16:00. | aprobada (Francisco, 2026-10-09) |
| RS-02 | Salud o autovalencia | Cada persona es distinta, y eso prefiero conversarlo con calma y conociendo bien el caso. Lo mejor es que nos visiten y lo veamos juntos. ¿Qué día les acomoda? | aprobada (Francisco, 2026-10-09) |
| RS-03 | Precio, pago o condiciones | La habitación individual tiene un valor mensual de 32 UF + IVA, que hoy equivale a cerca de $1.570.000 mensuales con el IVA incluido. El detalle de pagos y condiciones te lo explico personalmente; si quieres, lo vemos en una visita. | aprobada (Francisco, 2026-10-09) |
| RS-04 | Fuera de la base | Quiero darte la información correcta, así que lo confirmo y te escribo. Si prefieres, también lo podemos ver en una visita a la residencia. | aprobada (Francisco, 2026-10-09) |
| RS-05 | Audio, imagen o archivo | Disculpa, por este medio no puedo revisar audios ni archivos en este momento. ¿Me lo puedes escribir? | aprobada (Francisco, 2026-10-09) |
| RS-06 | Petición de no ser contactado | Entendido, no te volveré a escribir. Si más adelante necesitas algo, este número sigue disponible. | aprobada (Francisco, 2026-10-09) |
| RS-07 | Pregunta si habla con una persona o un sistema | Te escribe Francisco Barrientos, asesor de Nuestra Residencia Chile. | aprobada (Francisco, 2026-10-09) |
| RS-08 | Reclamo o urgencia | Lamento lo ocurrido. Ya avisé al equipo para que te contacten a la brevedad. | aprobada (Francisco, 2026-10-09) |

- RS-03: Francisco pidió el 2026-10-09 incluir el equivalente en pesos, como número cerrado y fácil de entender. Es el mismo de FAQ-08 ($1.570.000 al 2026-10-09; cálculo en las notas del Anexo A) y se recalcula cada mes junto con ella.
- RS-07: Francisco decidió el 2026-10-09 que diga solo que escribe Francisco Barrientos y que no mencione un asistente. Es un mensaje automático que contesta a quien pregunta si habla con una persona: la revisión de Toto (D-1) sigue abierta sobre este punto. No ofrece llamada: Francisco atiende solo por WhatsApp y no quiere llamar a nadie. Cambia la regla de SPEC-002 de no responder a esa pregunta.
- RS-06 además registra el retiro (SPEC-009).
- RS-08 no cierra nada: el aviso a Francisco se repite y, si pasan 2 horas, se avisa a Frank (Francisco, 2026-10-09). Su número se guarda como secreto, fuera del repositorio. El aviso a Frank dice solo que hay un reclamo o urgencia pendiente en el WhatsApp de NRC; fuera de la ventana de 24 horas sale como plantilla.

## Derivaciones

- Toda respuesta de nivel 2 o 3 mantiene la derivación abierta para Francisco, con el aviso "respondí yo: RS-01" o "respondí yo: redactada".
- Una persona que propone día y hora pasa a SPEC-003: el asistente valida el horario y pregunta a los anfitriones.
- Segundo contacto para reclamos y urgencias: Frank.

## Criterios de aceptación

- **AC-001:** una consulta derivada sin respuesta de Francisco recibe una respuesta de nivel 2 o 3 al vencer el plazo, una sola vez.
- **AC-002:** si Francisco escribe antes del plazo, el asistente no envía nada.
- **AC-003:** una respuesta de nivel 2 no contiene ningún número, precio, horario o afirmación que no esté en un hecho aprobado citado.
- **AC-004:** salud, autovalencia, disponibilidad, excepciones comerciales y reclamos nunca reciben una respuesta redactada; solo su texto fijo.
- **AC-005:** el modelo no recibe teléfonos, nombres de la hoja, IDs ni filas.
- **AC-006:** la pregunta por persona o sistema recibe solo RS-07, nunca una respuesta redactada.
- **AC-007:** cada respuesta de respaldo queda registrada como evento (`respaldo RS-0x` o `respaldo redactada`) sin el texto del mensaje.
- **AC-008:** una falla del modelo o de la comprobación cae al nivel 3; el prospecto nunca queda sin respuesta ni recibe un error.
- **AC-009:** en modo sombra, la respuesta de respaldo llega solo a Francisco.

## Cómo volver atrás

- `FALLBACK_MODE` = `off`: el servicio vuelve al comportamiento de SPEC-002.
- `FALLBACK_MODE` = `fixed`: solo nivel 3, sin modelo.
- Retirar la clave del modelo de los secretos de Cloudflare corta todo envío de texto al proveedor.

## Tareas

1. Hecho el 2026-10-09: Francisco aprobó RS-01 a RS-08 con cambios en RS-03 y RS-07, fijó el plazo en 30 minutos y nombró a Frank como segundo contacto.
2. [`008-facts.md`](008-facts.md) redactado el 2026-10-09 con 14 hechos del brochure y el sitio, aprobados por Francisco ese día.
3. Temporizador de respaldo en el Worker y nivel 3, con pruebas sintéticas. No necesita modelo.
4. Toto: D-1 y el proveedor del modelo.
5. Nivel 2: llamada al modelo, comprobación de hechos y pruebas con consultas ficticias, incluidas las que intentan sacar un precio o un diagnóstico.
6. Piloto en modo sombra: Francisco revisa durante dos semanas lo que el asistente habría respondido.

## Decisiones abiertas

- D-1: revisión de Toto de RS-07 y de la identidad del asistente.
- Si el nivel 2 se activa desde el inicio o solo después de dos semanas de nivel 3.
