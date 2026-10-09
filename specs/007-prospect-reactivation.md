# SPEC-007 — Recontacto por WhatsApp a prospectos activos

**Estado:** etapa 1 subida al proyecto de la hoja viva el 2026-10-09 (`automation/apps-script/Reactivation.gs`); falta la primera ejecución de `buildNrcReactivationDrafts`, así que la pestaña `Recontacto` todavía no existe. Nada enviado; la etapa 2 no está implementada. Cubre R3 de [requirements.md](requirements.md). Francisco aprobó los textos y la cadencia ese día.

## Problema y resultado

Hay prospectos en verde (`Seguimiento` = `activo`) que consultaron y no han ingresado: 8 en la línea base del 2026-10-09. Nadie les ha vuelto a escribir de forma ordenada. Desde julio hay un solo ingreso y la meta es de 2 al mes.

Resultado: cada prospecto activo recibe una invitación concreta a visitar la residencia, o a volver, y su respuesta queda registrada. Se mide en visitas agendadas.

## Alcance

- **Entra:** filas con `Seguimiento` = `activo`.
- **No entra:** `desistió`, `residente`, celda vacía u otro valor; filas sin teléfono; prospectos con una visita futura ya agendada; prospectos con una conversación abierta en las últimas 48 horas.
- El objetivo de cada mensaje es una visita, no una venta. No se ofrecen descuentos ni se habla de disponibilidad, salud o condiciones de ingreso.

## Segmentos

| Segmento | Condición en la hoja | Mensaje inicial |
|---|---|---|
| A — no agendó | `Agendo Visita` vacío o No | RC-01 |
| B — agendó y no vino | `Agendo Visita` = Sí y `Visita realizada` distinto de Sí | RC-02 |
| C — ya visitó | `Visita realizada` = Sí | RC-03 |

## Mensajes (aprobados por Francisco el 2026-10-09)

`{nombre}` es el primer nombre de `Tu Nombre y Apellido`; si no parece un nombre, se omite. Ningún texto nombra a la persona mayor.

| ID | Cuándo | Texto propuesto | Estado |
|---|---|---|---|
| RC-01 | Primer toque, segmento A | Hola {nombre}, ¿cómo estás? Te escribe Francisco Barrientos, de Nuestra Residencia Chile. Hace un tiempo nos dejaste tus datos para conocer la residencia y me gustaría invitarte a visitarla. Recibimos visitas de lunes a viernes, de 10:00 a 11:30 o de 14:00 a 16:00. ¿Te acomoda algún día de esta semana o de la próxima? | aprobada (Francisco, 2026-10-09) |
| RC-02 | Primer toque, segmento B | Hola {nombre}, ¿cómo estás? Te escribe Francisco Barrientos, de Nuestra Residencia Chile. Quedó pendiente la visita que habíamos conversado y me gustaría retomarla. Recibimos visitas de lunes a viernes, de 10:00 a 11:30 o de 14:00 a 16:00. ¿Qué día te acomoda? | aprobada (Francisco, 2026-10-09) |
| RC-03 | Primer toque, segmento C | Hola {nombre}, ¿cómo estás? Te escribe Francisco Barrientos, de Nuestra Residencia Chile. Quería saber cómo han seguido pensando la decisión después de la visita y si quedó alguna duda que pueda resolver. Si quieren volver a recorrer la residencia con calma, coordinamos el día que les acomode. | aprobada (Francisco, 2026-10-09) |
| RC-04 | Segundo toque, sin respuesta | Hola {nombre}, te escribo de nuevo por si no viste mi mensaje. Sigo disponible para coordinar una visita o resolver cualquier duda. | aprobada (Francisco, 2026-10-09) |
| RC-05 | Tercer y último toque | Hola {nombre}, no quiero molestarte: este es mi último mensaje. Si más adelante quieres conocer la residencia, escríbeme a este número y lo coordinamos. Y si prefieres que no te contacte más, dímelo con confianza. | aprobada (Francisco, 2026-10-09) |

## Cadencia

- Máximo 3 toques por prospecto: día 0, día 4 y día 10, en días corridos.
- Envíos cualquier día de la semana, también sábado y domingo, pero solo entre 10:00 y 19:00 de `America/Santiago` (Francisco, 2026-10-09: pueden llegar en fin de semana, siempre en horario prudente y nunca de madrugada). Un toque que cae fuera de ese horario espera a las 10:00 siguientes. El horario de visitas que mencionan los textos no cambia: lunes a viernes.
- Cualquier respuesta detiene la secuencia. Pide visita → SPEC-003. Pregunta → SPEC-002 y SPEC-008. Pide no ser contactado → `Seguimiento` = `desistió` (SPEC-009).
- Tres toques sin respuesta → `Estado` = `sin respuesta` y no se vuelve a escribir. Un nuevo ciclo solo lo abre Francisco.

## Etapa 1 — envío de un toque (no requiere despliegue)

Código en `automation/apps-script/Reactivation.gs`, con pruebas sintéticas (`node --test automation/apps-script/Reactivation.test.cjs`). **Subido al proyecto de la hoja viva el 2026-10-09 con `clasp push`; falta que Francisco ejecute `buildNrcReactivationDrafts`, y hasta entonces no hay pestaña `Recontacto` y el activador no agrega borradores.**

`buildNrcReactivationDrafts`, ejecutada desde el editor:

1. Lee `#`, `Tu Nombre y Apellido`, `Teléfono`, `Seguimiento`, `Agendo Visita`, `Fecha Visita`, `Visita realizada` y `Marca temporal`.
2. Crea la pestaña `Recontacto` si no existe y agrega una fila por cada prospecto al que le toca un mensaje: `#`, segmento, número de toque, mensaje, texto listo, enlace `https://wa.me/<teléfono>?text=<texto>`, casilla `Enviado`, `Fecha de envío` y casilla `Respondió`. No borra las filas enviadas: son el historial del que sale el toque siguiente.
3. Francisco abre la pestaña en el teléfono de NRC, toca el enlace, revisa, envía y marca `Enviado`. La fecha se anota sola al marcar.
4. Si la persona contesta, Francisco marca `Respondió` y no se le prepara nada más.
5. La función se vuelve a ejecutar cuando se quiera: agrega el segundo mensaje a los 4 días del primero y el tercero a los 10, y nunca un cuarto.

Cómo quedó aplicado:

- Los textos están copiados en el código; la prueba falla si difieren de la tabla aprobada de arriba.
- Varias filas con el mismo ID dan un solo borrador; si una de ellas no está `activo`, el ID queda fuera.
- Un valor de `Agendo Visita` o `Visita realizada` que no sea Sí, No o vacío no se interpreta: la función devuelve el número de fila para revisarlo y no prepara mensaje.
- Un prospecto con `Fecha Visita` de hoy o futura, sin visita realizada, queda fuera.
- Si un prospecto deja de estar `activo`, su borrador sin enviar se retira de la pestaña.
- Una fila marcada `Enviado` sin fecha detiene la secuencia de ese prospecto hasta que se corrija.
- El horario de 10:00 a 19:00 y la regla de las 48 horas de conversación abierta no se controlan en esta etapa: el envío lo hace Francisco.
- Para abrir un ciclo nuevo a un prospecto se borran sus filas de `Recontacto`.

Los datos no salen de la hoja ni pasan por un modelo. El registro de ejecución lleva solo cantidades y números de fila.

## Etapa 2 — envío automático

Con el número conectado (SPEC-002), el Worker envía la secuencia:

- Fuera de la ventana de 24 horas cada toque es una plantilla aprobada por Meta, de categoría marketing y con costo por mensaje. Hay que crear una plantilla por texto y verificar la tarifa vigente.
- Antes de cada envío consulta la hoja: `Seguimiento`, visita agendada y último evento. Si algo cambió, no envía.
- Antes de cada envío llama a `mayContact` de `automation/consent/` con finalidad `solicitud`.
- Un tope diario de envíos (propuesta: 10) evita un envío masivo por error.
- Arranca en modo sombra: Francisco recibe "habría enviado RC-01 al ID 12" y nada sale.

**Coexistencia:** lo que Francisco envía desde la app llega al servicio como eco y hoy pausa el chat. Un eco cuyo texto coincide con un RC-xx se registra como `recontacto` y no pausa el asistente; cualquier otro texto sigue siendo una toma de control.

## Permiso para escribir

- Los prospectos actuales pidieron por el formulario que un especialista los contactara para resolver dudas y coordinar una visita. El recontacto de esta especificación se limita a eso.
- La etapa 1 es Francisco escribiendo él mismo, como ya lo hace.
- La etapa 2 exige que Toto confirme que esa solicitud basta para la plantilla de Meta y para la Ley 21.719, o que diga qué falta. `automation/consent/` hoy trata las filas anteriores al aviso como sin permiso: se cambia solo si Toto lo aprueba.
- Rojo, `desistió` y celda vacía bloquean siempre.

## Criterios de aceptación

- **AC-001:** todo prospecto `activo` que entra en el alcance aparece una vez en `Recontacto` con el segmento y el texto correctos.
- **AC-002:** ningún prospecto `desistió`, `residente`, sin valor o sin teléfono aparece ni recibe un mensaje.
- **AC-003:** nadie recibe más de 3 toques por ciclo ni dos toques con menos de 4 días entre ellos.
- **AC-004:** una respuesta del prospecto detiene la secuencia antes del siguiente toque.
- **AC-005:** ningún envío sale fuera de 10:00–19:00 de Santiago, cualquiera sea el día.
- **AC-006:** "no me escribas más" deja `Seguimiento` = `desistió` y ningún envío posterior.
- **AC-007:** cada toque queda en la pestaña `WhatsApp` como `recontacto RC-0x`, sin texto ni teléfono.
- **AC-008:** los textos enviados son los `aprobada` de esta tabla, sin cambios.
- **AC-009:** el informe mensual puede contar recontactados, respuestas y visitas agendadas a partir de esos registros.

## Cómo volver atrás

- **Etapa 1:** borrar la pestaña `Recontacto`. No hay envíos automáticos que detener.
- **Etapa 2:** `OUTREACH_MODE` distinto de `on` en `wrangler.toml` y desplegar; la secuencia se detiene y lo ya enviado queda registrado. Pausar o eliminar las plantillas en YCloud.
- Un mensaje enviado no se puede retirar: por eso el modo sombra y el tope diario.

## Tareas

1. Hecho el 2026-10-09: Francisco aprobó RC-01 a RC-05 y la cadencia, con envíos también en fin de semana.
2. Hecho en local el 2026-10-09: `buildNrcReactivationDrafts` con pruebas sintéticas. Subido con `clasp push` ese día. Falta la primera ejecución supervisada.
3. Primer ciclo manual con los prospectos activos; medir respuestas y visitas.
4. Toto: base para el envío automático.
5. Plantillas en YCloud, ruta de envío en el Worker con modo sombra, lectura de `Seguimiento` por el adaptador.
6. Salir del modo sombra con el aviso de SPEC-004 publicado.

## Decisiones abiertas

- Si los prospectos `desistió` de hace más de 6 meses merecen un único mensaje de reapertura. Propuesta: no.
