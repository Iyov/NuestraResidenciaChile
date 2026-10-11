# SPEC-009 — Prospectos y estado en la hoja desde WhatsApp

**Estado:** etapa 1 activa desde el 2026-10-11 (estados escritos desde la pestaña `Recontacto`; ver la sección del mismo nombre). El alta de prospectos y la escritura desde WhatsApp siguen en `borrador`. Cubre R8 de [requirements.md](requirements.md). Reemplaza dos reglas de [SPEC-002](002-whatsapp-frontdesk.md): que un número nuevo no crea fila ni ID, y que `Estado` y `Seguimiento` los escribe solo Francisco.

## Problema y resultado

La hoja tiene 21 prospectos, todos entrados por el formulario. Quien consulta por WhatsApp y no llena el formulario no existe en la hoja: no se cuenta, no se le hace seguimiento y no deja evidencia de primer contacto, que es lo que respalda la comisión (contrato, cláusula tercera C). El avance de cada prospecto lo anota Francisco a mano.

Resultado: toda consulta nueva por WhatsApp crea su prospecto con ID, y el estado de cada prospecto se mueve con lo que pasa en la conversación.

## Alta de prospectos

- **REQ-001:** un número que no está en la hoja y hace una consulta sobre la residencia recibe una fila nueva en `Respuestas de formulario 1` y el siguiente ID.
- **REQ-002:** cuenta como consulta todo mensaje que el clasificador resuelve como una fila del Anexo A o deriva por disponibilidad, precio, salud o autovalencia, o visita.
- **REQ-003:** no crean prospecto: reclamos, mensajes de residentes o sus familias, peticiones de no ser contactado, ofertas comerciales, mensajes que no son texto y saludos sin consulta. En esos casos Francisco recibe el aviso y puede crear el prospecto con el comando `registrar`.
- **REQ-004:** la fila nueva lleva marca temporal, teléfono, nombre de contacto si la persona lo dio (si no, vacío), origen `WhatsApp`, `Seguimiento` = `activo` y `Estado` = `nuevo`. Los datos de la persona mayor quedan vacíos.
- **REQ-005:** el ID lo asigna la misma función y el mismo bloqueo que usa SPEC-001, para que un envío de formulario y un alta por WhatsApp simultáneos no reciban el mismo número.
- **REQ-006:** el asistente sigue ofreciendo el formulario una vez (MSG-02) para completar los datos. Si la persona lo llena desde el mismo teléfono, la fila del formulario reutiliza el ID. Esto cambia REQ-005 de SPEC-001: cuando la fila previa no tiene nombre de persona mayor y su origen es `WhatsApp`, basta la coincidencia de teléfono.
- **REQ-007:** un mismo teléfono nunca genera dos ID.

**Riesgo a comprobar antes de activar:** la pestaña es la de respuestas de Google Forms. Hay que verificar, con datos ficticios, que una fila agregada por el script no se pisa ni se desordena con el siguiente envío del formulario. Si falla, las altas van a una pestaña `Prospectos WhatsApp` que comparte la secuencia de ID.

## Estados

Lista y reglas aprobadas por Francisco el 2026-10-09. El asistente escribe en `Estado` solo valores de esta lista, y solo con el evento que los respalda:

| Estado | Evento que lo produce | Quién |
|---|---|---|
| `nuevo` | Alta por WhatsApp o envío de formulario | Asistente |
| `en conversación` | La persona escribió y recibió respuesta | Asistente |
| `recontactado` | Se envió un toque de SPEC-007 | Asistente |
| `visita solicitada` | La persona pidió visita o propuso día | Asistente |
| `visita agendada` | Francisco confirmó la visita (SPEC-003) | Asistente; llena además `Agendo Visita`, `Fecha Visita` y `Hora Visita` |
| `visita realizada` | El anfitrión lo confirma con un botón, o Francisco envía `visitó N` | Asistente; llena `Visita realizada` |
| `sin respuesta` | Tres toques de SPEC-007 sin respuesta | Asistente |
| `desistió` | La persona pide no ser contactada o dice con claridad que ya no le interesa | Asistente; pone además `Seguimiento` = `desistió` |
| `ingresó` | Contrato de ingreso firmado | Solo Francisco |

Reglas:

- **REQ-008:** el estado solo avanza. El asistente no vuelve atrás un estado ni reemplaza un valor que no esté en la lista: si Francisco escribió otra cosa, la celda es suya.
- **REQ-009:** `desistió` exige una frase explícita. Un "lo voy a pensar" o un silencio no lo son; ante la duda, se deriva.
- **REQ-010:** `Ingresó?`, `Comisión`, `Fecha Pago` y `Seguimiento` = `residente` no los toca el asistente.
- **REQ-011:** el asistente no escribe texto libre: ni `Comentario`, ni resúmenes de la conversación, ni datos de salud.
- **REQ-012:** cada cambio de estado deja una fila en la pestaña `WhatsApp` con fecha, `#`, estado anterior y nuevo.
- **REQ-013:** el retiro de RS-06 (SPEC-008) queda registrado aquí. Con esto se resuelve el pendiente de SPEC-004 sobre dónde se guardan los retiros.

Comandos nuevos, solo desde el número personal de Francisco: `registrar` (crea el prospecto del último aviso), `visitó N`, `estado N <valor>` (fija cualquier valor de la lista, también hacia atrás) y `descartar N` (`Seguimiento` = `descartado`; el ID no se reutiliza).

## Etapa 1 — estados desde la pestaña `Recontacto`

Francisco pidió el 2026-10-11 no actualizar los estados a mano. Mientras el número no esté conectado, nadie puede leer las respuestas de WhatsApp, así que el estado se mueve con lo que él marca en `Recontacto` (`automation/apps-script/Reactivation.gs`, subido ese día):

| Lo que marca Francisco | `Estado` | `Seguimiento` |
|---|---|---|
| `Enviado` en un mensaje RC | `recontactado` | sin cambio |
| `Resultado` = `quiere visita` | `visita solicitada` | sin cambio |
| `Resultado` = `sigue pensando` | `en conversación` | sin cambio |
| `Resultado` = `desistió` | `desistió` | `desistió` |

- Se escribe en todas las filas que comparten el ID.
- Valen REQ-008 y REQ-010: el estado no retrocede, un valor escrito a mano fuera de la lista no se reemplaza, e `Ingresó?`, `Comisión` y `Comentario` no se tocan. `Seguimiento` = `residente` tampoco se cambia.
- Un `desistió` sobre un valor a mano o sobre `ingresó` deja `Estado` como está, pero igual pone `Seguimiento` en `desistió`, que es lo que bloquea los envíos.
- No se ha visto qué valores tiene hoy `Estado` en la hoja viva.
- Quedan fuera de esta etapa `visita agendada`, `visita realizada` y `sin respuesta`, y el registro de cada cambio en la pestaña `WhatsApp` (REQ-012).

## Adaptador de la hoja

`WhatsAppSheetAdapter.gs` suma cuatro operaciones tipadas a las tres actuales:

- `crearProspecto(teléfono, nombre)` → devuelve el ID.
- `cambiarEstado(#, estado)` → rechaza valores fuera de la lista y retrocesos.
- `registrarVisita(#, fecha, hora)` y `marcarVisitaRealizada(#)`.
- `leerSeguimiento(#)` → devuelve solo el valor, para SPEC-007.

Ninguna devuelve una fila completa ni acepta un nombre de columna como parámetro. Las columnas se buscan por encabezado.

## Criterios de aceptación

- **AC-001:** con ID 1–21, la primera consulta de un número nuevo crea una fila con ID 22 y `Estado` = `nuevo`.
- **AC-002:** un segundo mensaje del mismo número no crea otra fila.
- **AC-003:** un alta por WhatsApp y un envío de formulario simultáneos reciben ID distintos y consecutivos.
- **AC-004:** el formulario llenado después desde el mismo teléfono conserva el ID.
- **AC-005:** un reclamo, una oferta comercial o un audio no crean prospecto.
- **AC-006:** cada estado de la tabla se escribe solo con su evento, y ningún otro mensaje lo cambia.
- **AC-007:** un valor escrito a mano fuera de la lista no se sobrescribe.
- **AC-008:** `desistió` deja también `Seguimiento` = `desistió` y bloquea SPEC-007.
- **AC-009:** el asistente nunca escribe `Ingresó?`, `Comisión`, `Fecha Pago` ni `Comentario`.
- **AC-010:** evento repetido no duplica filas ni cambios.
- **AC-011:** registros y pruebas sin teléfonos, nombres ni texto de mensajes.

## Cómo volver atrás

- Propiedad `NRC_WHATSAPP_WRITE_MODE` del proyecto de Apps Script: `eventos` deja al adaptador como en SPEC-002 (solo columna y pestaña `WhatsApp`); `completo` activa altas y estados.
- Una fila creada por error: `descartar N`, o borrarla a mano si es la última.
- Un estado mal puesto: `estado N <valor>` o el historial de versiones de la hoja. La pestaña `WhatsApp` conserva el valor anterior de cada cambio.

## Tareas

1. Lista aprobada por Francisco el 2026-10-09. Falta revisar en la hoja viva qué valores tiene hoy `Estado`: los que no estén en la lista quedan como están (REQ-008).
2. Prueba con datos ficticios del riesgo de la pestaña de Forms.
3. Asignador de ID compartido entre `AssignLeadId.gs` y el adaptador, con el cambio de coincidencia por teléfono y sus pruebas.
4. Las cuatro operaciones del adaptador y los comandos nuevos, con pruebas sintéticas.
5. Botón "Visita realizada" para los anfitriones (SPEC-003).
6. Activar con `NRC_WHATSAPP_WRITE_MODE` = `completo`, supervisado, con un número ficticio.

## Decisiones abiertas

- Si un saludo sin consulta debe crear prospecto tras el segundo mensaje.
