# SPEC-003 — Coordinación y confirmación de visitas

**Estado:** reglas funcionales acordadas; validación de horarios y estados de la visita en `local` (`automation/visits/`, 2026-10-08) con pruebas sintéticas; decisiones de duración, festivos, plazo y envío interno tomadas por Francisco ese día; integración con WhatsApp no implementada.

## Reglas no negociables

- Zona horaria: `America/Santiago`.
- Visitas solo lunes a viernes, en ventanas 10:00–11:30 o 14:00–16:00.
- Nunca sábado, domingo ni festivo chileno. La disponibilidad de Nico/Frank no autoriza una excepción.
- Festivos: calendario público de Google "Festivos en Chile" (Francisco, 2026-10-08). Ante calendario de festivos no verificable, no confirmar.
- Bloquea lo que Google lista como festivo oficial ("Día festivo"). Las fechas que marca como "Celebración" (Jueves Santo, Domingo de Pascua, Corpus Christi, 31 de diciembre) son días hábiles (Francisco, 2026-10-08, tercera ronda; corrige la lectura anterior).
- Se reserva una hora por visita; las ventanas limitan la hora de inicio: 11:30 y 16:00 son inicios válidos (Francisco, 2026-10-08).

## Flujo

1. Francisco recibe del prospecto una preferencia de fecha/hora y activa una solicitud de disponibilidad.
2. Validar día, hora y festivo **antes** de contactar a los anfitriones. Si es inválido, ofrecer opciones válidas; no pedir excepción.
3. Consultar a Nico y Frank por WhatsApp, en chats individuales (el número en coexistencia no sincroniza grupos; ver SPEC-002). La solicitud se asocia a un ID de visita y al prospecto existente; la pregunta lleva dos botones, "Sí puedo" y "No puedo", cuyo identificador oculto contiene el ID de visita.
4. El primer “sí” válido dentro del horario permitido queda como anfitrión asignado. Si las respuestas tienen orden ambiguo, dejar pendiente para Francisco; nunca asignar dos anfitriones.
5. Si ambos dicen que no o no responden dentro del plazo, no confirmar; pedir a Francisco que proponga otra fecha.
6. Francisco envía confirmación final al prospecto con fecha/hora, dirección pública de NRC (Camino Las Flores 10961, Las Condes) y disponibilidad para resolver dudas.
7. Registrar estado de visita y anfitrión por prospecto; no almacenar la conversación completa. Dónde se escribe está pendiente (ver Pendientes).

## Estados propuestos

`pendiente de disponibilidad` → `anfitrión asignado` → `confirmada por Francisco` → `realizada`, `cancelada` o `reagendar`.

## Criterios de aceptación

- **AC-001:** no se crea ni envía solicitud a Nico/Frank para fin de semana, festivo o fuera de las dos ventanas.
- **AC-002:** una confirmación “sí” asigna exactamente un anfitrión; la primera respuesta aceptable gana.
- **AC-003:** respuestas simultáneas/ambiguas dejan la solicitud pendiente para Francisco.
- **AC-004:** no se informa al prospecto de una visita antes de que un anfitrión acepte y Francisco confirme.
- **AC-005:** la confirmación contiene la fecha, hora y dirección correctas y se vincula al ID existente.
- **AC-006:** horarios fuera de rango reciben alternativa válida; no hay override por respuesta del anfitrión.
- **AC-007:** no se asigna ni comunica visita a un prospecto rojo salvo que haya iniciado una nueva solicitud; ello no reactiva automáticamente el seguimiento promocional.

## Implementación local

`automation/visits/` contiene solo lógica, sin red ni hoja: **no envía mensajes, no consulta a Nico ni a Frank y no escribe en la hoja.**

- `schedule.cjs`: valida fecha y hora de Santiago contra las dos ventanas, fines de semana y festivos, y propone las siguientes ventanas válidas. No tiene ningún parámetro de excepción.
- `visit.cjs`: estados de la visita y botones de la pregunta. El primer "sí" asigna; un segundo "sí" sin orden claro deja la visita sin anfitrión hasta que Francisco elija; dos "no" o el vencimiento del plazo la pasan a `reagendar`. Los datos de la confirmación solo existen después de que Francisco confirma.
- Prueba: `node --test automation/visits/visits.test.cjs`.

- `holidays.cjs` y `holidays-cl.json`: festivos leídos del calendario público de Google "Festivos en Chile". `node automation/visits/holidays.cjs` lo descarga de nuevo y reescribe la lista.

Decidido por Francisco el 2026-10-08:

- **Duración:** una visita dura cerca de 30 minutos y se reserva una hora completa. Nico y Frank manejan su horario: solo se les pregunta si pueden y responden sí o no.
- **Festivos:** fuente, el calendario de Google. Bloquean solo las entradas "Día festivo"; las "Celebración" no (tercera ronda). Lista guardada el 2026-10-08 para 2026–2031; un año sin lista no se confirma. Los días que Google no publica se agregan a mano en `extra` de `holidays-cl.json`, que se conserva al actualizar.
- **Plazo de espera:** a veces responden rápido y a veces tardan muchas horas. Francisco aceptó en la tercera ronda las 24 horas que aplica el código.
- **Envío interno:** el asistente puede preguntarle por sí mismo a Nico o a Frank por la disponibilidad para un día y hora, y esperar la respuesta. Nada más por ahora.

Cómo quedó aplicado:

- **Ventanas:** limitan la hora de inicio, así que 11:30 y 16:00 son inicios válidos aunque la hora reservada termine después (confirmado por Francisco, 2026-10-08).
- **Plazo:** 24 horas por defecto, o antes si llega la hora pedida sin anfitrión; en ambos casos la solicitud vuelve a Francisco como `reagendar`.
- **Pregunta al anfitrión (texto de Francisco, 2026-10-08):** "Hola Nico, cómo estás?, buenas tardes!, tienes disponibilidad para una visita el martes 13 de octubre a las 10:30?". Lleva el nombre del anfitrión y el saludo según la hora de Santiago en que se envía (días 5:00–11:59, tardes 12:00–19:59, noches el resto, igual que MSG-01). El texto no lleva datos del prospecto ni ID de visita.
- **Botones (Francisco, 2026-10-08, tercera ronda):** la pregunta se envía con "Sí puedo" y "No puedo". El identificador de cada botón no se muestra y lleva el ID de visita, así que la respuesta dice a qué pregunta corresponde aunque el anfitrión tenga varias abiertas.
- **Respuesta escrita:** si el anfitrión escribe en vez de pulsar, solo cuenta un sí o un no simple ("sí", "sí puedo", "sí tengo", "no", "no puedo", "no tengo") y solo si tiene una única pregunta abierta. Cualquier otra cosa no se interpreta y queda para Francisco.
- **Empate:** dos "sí" con la misma marca de tiempo son ambiguos; el margen es configurable y hoy vale 0.
- Solo cuenta la primera respuesta de cada anfitrión; un cambio de opinión posterior no está modelado.
- Las visitas no se comparan entre sí: dos solicitudes a la misma hora no se bloquean.

## Pendientes

- Días puente, cierres excepcionales y feriados que Google no publique (por ejemplo, elecciones o feriados decretados a última hora): no se detectan solos; hay que agregarlos a mano en `extra`.
- Conectar el envío y la recepción con WhatsApp (depende de SPEC-002).
- Plantilla aprobada por Meta para la pregunta, con los dos botones. Será el caso normal y no la excepción: Nico y Frank casi nunca le escriben al número de NRC, así que la pregunta casi siempre sale fuera de la ventana de 24 horas y tiene costo de plantilla de utilidad (aceptado por Francisco, 2026-10-08). Confirmar con YCloud que los botones de una plantilla admiten un identificador propio por envío.
- Dónde se registra la visita por prospecto y quién lo escribe. La hoja ya tiene las columnas `Agendo Visita`, `Fecha Visita` y `Hora Visita`, que hoy llena Francisco; el asistente de WhatsApp solo escribe la columna `WhatsApp`.
- [SPEC-009](009-whatsapp-lead-registry.md) (borrador) propone resolver el punto anterior: el asistente llenaría `Agendo Visita`, `Fecha Visita` y `Hora Visita` al confirmar Francisco, y `Visita realizada` con un botón nuevo para el anfitrión después de la visita. Ese botón no está modelado en `visit.cjs`.
- [SPEC-014](014-form-to-visit.md) (borrador) une este flujo con el primer mensaje al prospecto y el registro en la hoja. Francisco decidió el 2026-10-09 que la confirmación al prospecto la envíe el asistente a su nombre apenas un anfitrión acepte, y que a él solo le llegue el aviso de la visita generada. Eso reemplaza los pasos 1 y 6 del flujo de arriba y AC-004; `visit.cjs` todavía modela la confirmación de Francisco.
- Leer `Seguimiento` (SPEC-002) para AC-007 cuando la solicitud de visita se conecte a la hoja.
