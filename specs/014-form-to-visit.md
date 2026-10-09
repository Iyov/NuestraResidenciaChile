# SPEC-014 — Del formulario a la visita

**Estado:** `borrador` (2026-10-09). Nada implementado. Francisco aprobó ese día el flujo y los textos PC-01 a PC-07: es como lo hace hoy a mano. La confirmación de la visita la sigue enviando él (REQ-005). Cubre el tramo de R3 y R8 de [requirements.md](requirements.md) que ninguna otra especificación tomaba: el primer mensaje a quien acaba de llenar el formulario y todo lo que sigue hasta que la visita queda hecha.

## Problema y resultado

El 2026-10-09 entraron los primeros prospectos desde que el ID es automático. El número se asignó solo, pero Francisco hizo a mano todo lo demás: escribirle a cada uno, acordar día y hora según lo que contestó, coordinar con el anfitrión, confirmar y anotar la visita en la hoja. Francisco no está pendiente del teléfono y atiende solo por WhatsApp.

Las otras especificaciones cubren pedazos: SPEC-002 y 008 responden a quien escribe, SPEC-003 coordina con los anfitriones, SPEC-007 recontacta a los antiguos y SPEC-009 anota en la hoja. Ninguna inicia la conversación con un prospecto nuevo ni une los pasos.

Resultado: desde que llega una respuesta del formulario hasta que la visita está realizada y anotada, Francisco solo envía la confirmación de la visita y atiende los casos que se le derivan.

## Flujo

1. **Llega el formulario.** SPEC-001 asigna el ID; el estado queda en `nuevo`.
2. **Primer mensaje (PC-01)** al teléfono del formulario, dentro de los 5 minutos siguientes si es entre 9:00 y 21:00 de Santiago; si no, a las 9:00.
3. **La persona propone día y hora.** El asistente lo interpreta. Si no está claro, pregunta (PC-02). Si cae fuera del horario de visitas o en festivo, ofrece las dos ventanas válidas más cercanas (PC-03). Estado: `visita solicitada`.
4. **Pregunta a los anfitriones** (SPEC-003): Nico y Frank reciben la consulta con botones; el primero que acepta queda asignado.
5. **Confirmación al prospecto (PC-04):** cuando un anfitrión acepta, Francisco recibe el aviso con el ID, el día, la hora y el anfitrión, y le escribe él mismo al prospecto desde la app (Francisco, 2026-10-09: "me aceptan Nico o Frank y yo les escribo directo"). El aviso trae PC-04 ya armado para copiar. Cuando su mensaje sale, el estado pasa a `visita agendada` y se llenan `Agendo Visita`, `Fecha Visita` y `Hora Visita`.
6. **Si ningún anfitrión puede o no responden en el plazo**, el asistente ofrece al prospecto otros horarios (PC-03) y repite el paso 4. Al segundo intento fallido, deriva a Francisco.
7. **Recordatorio (PC-05)** el día anterior a las 18:00; para una visita de lunes, el viernes.
8. **Después de la visita** el anfitrión marca "Visita realizada" o "No vino". Realizada → estado `visita realizada` y, al día siguiente a las 11:00, PC-06. No vino → PC-07, una vez.
9. **Sin respuesta al primer mensaje:** sigue la cadencia de SPEC-007 (RC-04 a los 4 días, RC-05 a los 10).

Cualquier pregunta que la persona haga en el camino se responde con SPEC-002 y SPEC-008 y el flujo continúa.

## Mensajes (aprobados por Francisco el 2026-10-09)

| ID | Cuándo | Texto propuesto | Estado |
|---|---|---|---|
| PC-01 | Primer mensaje tras el formulario | Hola {nombre}, ¿cómo estás? Te escribe Francisco Barrientos, de Nuestra Residencia Chile. Recibí tu solicitud y con gusto te ayudo. ¿Te gustaría agendar una visita para conocer la residencia? Recibimos de lunes a viernes, de 10:00 a 11:30 o de 14:00 a 16:00. ¿Qué día te acomoda? | aprobada (Francisco, 2026-10-09) |
| PC-02 | No queda claro el día o la hora | Para no equivocarme, ¿te refieres al {día} a las {hora}? | aprobada (Francisco, 2026-10-09) |
| PC-03 | El horario pedido no es válido o ningún anfitrión puede | Ese horario no lo tengo disponible. ¿Te acomoda el {opción 1} o el {opción 2}? | aprobada (Francisco, 2026-10-09) |
| PC-04 | Un anfitrión aceptó | ¡Listo, {nombre}! Tu visita queda confirmada para el {día} a las {hora}. Te esperamos en Camino Las Flores 10961, Las Condes. Cualquier cosa, me escribes por aquí. | aprobada (Francisco, 2026-10-09) |
| PC-05 | Día anterior a la visita | Hola {nombre}, te recuerdo tu visita de mañana, {día}, a las {hora}, en Camino Las Flores 10961, Las Condes. ¿Me confirmas que vienes? | aprobada (Francisco, 2026-10-09) |
| PC-06 | Día siguiente a una visita realizada | Hola {nombre}, gracias por visitarnos. ¿Qué les pareció la residencia? Quedo atento a cualquier duda que haya quedado. | aprobada (Francisco, 2026-10-09) |
| PC-07 | La persona no llegó a la visita | Hola {nombre}, te esperábamos hoy y no alcanzamos a vernos. Si quieres, buscamos otro día que te acomode. | aprobada (Francisco, 2026-10-09) |

En PC-05, "mañana" se reemplaza por "el lunes" cuando el recordatorio sale un viernes.

## Requisitos

- **REQ-001:** el primer mensaje sale una sola vez por ID. Un formulario repetido de la misma persona no lo repite.
- **REQ-002:** no sale si `Seguimiento` no es `activo`, si la fila no tiene teléfono válido o si esa persona ya está conversando por WhatsApp.
- **REQ-003:** la interpretación del día y la hora devuelve una fecha y una hora exactas o "no claro"; nunca adivina. Toda fecha pasa por `automation/visits/schedule.cjs` antes de preguntar a un anfitrión.
- **REQ-004:** nunca se confirma una visita al prospecto sin que un anfitrión haya aceptado.
- **REQ-005:** la confirmación la envía Francisco, no el asistente (decisión 7 de `MEMORY.md` y AC-004 de SPEC-003, reafirmadas por él el 2026-10-09). El asistente reconoce la confirmación por el mensaje que Francisco envía en ese chat después de la aceptación del anfitrión; el comando `confirmada N` hace lo mismo. Ese mensaje no detiene los pasos siguientes del flujo (recordatorio y mensajes posteriores a la visita). Si pasan 2 horas sin confirmación, el aviso se repite una vez.
- **REQ-006:** si la persona cambia o cancela, el asistente avisa al anfitrión asignado, libera la visita y vuelve al paso 3.
- **REQ-007:** se deriva a Francisco, sin insistir al prospecto: dos intentos sin anfitrión, una respuesta que no se entiende tras PC-02, y todo tema reservado de SPEC-008.
- **REQ-008:** los mensajes iniciados por NRC (PC-01, PC-05, PC-06, PC-07, y PC-04 cuando pasaron más de 24 horas desde el último mensaje de la persona) salen como plantillas aprobadas por Meta, con costo por mensaje.
- **REQ-009:** cada paso queda como evento en la pestaña `WhatsApp` y mueve el estado según SPEC-009, sin texto de mensajes.
- **REQ-010:** ningún texto menciona a la persona mayor, su edad ni su autovalencia.

## Permiso para escribir

Quien llena el formulario pide que lo contacten para resolver dudas y coordinar una visita; este flujo hace eso y nada más. Falta que el aviso del formulario nombre WhatsApp como canal (SPEC-004) y que Toto lo confirme antes del envío automático.

## Etapa 1 — antes de conectar el número

El activador del formulario ya corre en la hoja. Se le agrega un paso: al asignar el ID, envía a Francisco un correo con el ID, el segmento y un enlace `https://wa.me/...` con PC-01 listo. Francisco lo abre en el teléfono de NRC y envía con un toque. El correo no lleva nombre ni teléfono visibles; el teléfono va dentro del enlace.

Los pasos 3 a 8 siguen a mano en esta etapa. Reduce el primer contacto a un toque, que es donde hoy se pierde más tiempo.

## Etapa 2 — automático

Con el número conectado (SPEC-002), el Worker hace el flujo completo. Necesita:

- Un aviso del activador de la hoja al Worker cuando entra un formulario (solo el ID).
- La lectura de día y hora en texto libre: primero con reglas ("martes a las 10:30", "mañana en la tarde"); lo que las reglas no resuelvan pasa por el modelo de SPEC-008, que devuelve solo fecha y hora.
- Las plantillas de REQ-008 y la de los anfitriones (SPEC-003), más el botón "Visita realizada / No vino".
- Las operaciones de hoja de SPEC-009.

Arranca en modo sombra: Francisco ve lo que el asistente habría enviado.

## Criterios de aceptación

- **AC-001:** un formulario válido recibido a las 15:00 genera PC-01 antes de las 15:05; uno recibido a las 23:00 lo genera a las 9:00.
- **AC-002:** un segundo formulario del mismo prospecto no genera otro PC-01.
- **AC-003:** "el sábado" o "a las 18:00" reciben PC-03 con dos opciones válidas; nunca se pregunta a un anfitrión por un horario inválido.
- **AC-004:** el asistente nunca envía la confirmación. Tras el "sí" de un anfitrión, Francisco recibe un aviso con el día, la hora, el anfitrión y PC-04 armado.
- **AC-005:** dos rechazos o silencios de los anfitriones terminan en una derivación a Francisco, no en un tercer intento.
- **AC-006:** la hoja queda con `Agendo Visita`, `Fecha Visita`, `Hora Visita` y el estado correctos apenas Francisco envía la confirmación, sin que él toque la hoja.
- **AC-007:** el recordatorio sale una vez, el día hábil anterior.
- **AC-008:** una visita marcada como realizada deja `Visita realizada` y el estado al día, y genera PC-06 al día siguiente.
- **AC-009:** un prospecto `desistió` no recibe ningún mensaje de este flujo.
- **AC-010:** en modo sombra nada llega a un prospecto ni a un anfitrión.

## Cómo volver atrás

- **Etapa 1:** propiedad `NRC_FIRST_CONTACT_EMAIL` vacía en el proyecto de la hoja; el activador sigue asignando ID y deja de enviar el correo.
- **Etapa 2:** `FIRST_CONTACT_MODE` distinto de `on` en `wrangler.toml`. Lo ya agendado sigue anotado en la hoja y Francisco lo continúa a mano.
- Un mensaje enviado no se retira: por eso el modo sombra.

## Tareas

1. Hecho el 2026-10-09: Francisco aprobó el flujo y PC-01 a PC-07. La confirmación de la visita la envía él (REQ-005).
2. Etapa 1: paso de correo en el activador, con pruebas sintéticas y un envío de prueba supervisado.
3. Toto: canal WhatsApp en el aviso (SPEC-004).
4. Etapa 2: aviso hoja → Worker, lectura de día y hora, plantillas, botón de visita realizada.
5. Piloto en modo sombra con los primeros prospectos nuevos.

## Decisiones abiertas

- A qué correo llega el aviso de la etapa 1.
