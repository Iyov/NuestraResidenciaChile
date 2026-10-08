# Asistente de WhatsApp (SPEC-002) — lógica local

**Estado: local.** Este código no está conectado a WhatsApp, a YCloud ni a la hoja de Google, y no está desplegado en ninguna parte. Solo se ha ejecutado con pruebas sintéticas.

Requisitos y decisiones: [`specs/002-whatsapp-frontdesk.md`](../../specs/002-whatsapp-frontdesk.md). Textos y su estado de aprobación: [`specs/002-faq-base.md`](../../specs/002-faq-base.md).

## Archivos

- `knowledge.cjs`: lee las filas `FAQ-xx` y `MSG-xx` del anexo de la especificación. Solo las que están en estado `aprobada` se pueden enviar; cambiar un texto o aprobarlo se hace en el anexo, no aquí.
- `classifier.cjs`: reglas de palabras clave. Devuelve un ID de respuesta, un saludo, un cierre o una derivación con motivo. Los temas reservados (salud, disponibilidad, pagos, reclamos, no contactar, persona o sistema) siempre derivan.
- `frontdesk.cjs`: decide qué hacer con cada evento. No tiene código de red ni de hoja; todo efecto pasa por puertos inyectados.
- `ycloud.cjs`: valida la firma de los webhooks de YCloud, traduce sus eventos a los de `frontdesk.cjs` y envía texto por su API. Escrito a partir de los ejemplos de su documentación; **no se ha probado contra la cuenta real**.
- `frontdesk.test.cjs`, `ycloud.test.cjs`: pruebas con datos ficticios.

## Prueba

Desde la raíz del repositorio:

```sh
node --test automation/whatsapp/frontdesk.test.cjs automation/whatsapp/ycloud.test.cjs
```

## Qué hace

| Evento | Resultado |
|---|---|
| Mensaje de un número con un único ID en la hoja | Respuesta aprobada, o texto de derivación más aviso a Francisco |
| Mensaje de un número que no está en la hoja | Saludo y formulario, una vez; si insiste, aviso a Francisco. Nunca crea fila ni ID |
| Mensaje de un número con varios ID, o sin teléfono | Deriva sin elegir un ID |
| Mensaje enviado por Francisco desde la app | El chat queda en pausa y la derivación pendiente se cierra |
| `reactivar 22`, `reactivar todos`, `pausar 22`, `estado` desde el número de Francisco | Cambia o informa las pausas, solo por ID |
| Evento repetido | Se ignora |
| `sendDueReminders` (tarea programada) | Un recordatorio por derivación con más de 2 horas, entre 9:00 y 21:00 de Santiago |

El servicio solo responde a mensajes entrantes; no tiene ninguna ruta para iniciar una conversación con un prospecto.

## Qué falta para un piloto

1. Probar `ycloud.cjs` contra la cuenta real: firma, formato de los dos eventos y envío. Pendientes conocidos: los avisos a Francisco fuera de la ventana de 24 horas necesitan una plantilla, que no está implementada; y no está verificado que se pueda responder a un contacto que llega sin teléfono.
2. Adaptador de la hoja: leer `#`, `Teléfono` y `Tu Nombre y Apellido` de `Respuestas de formulario 1` y agregar filas a la pestaña `WhatsApp`.
3. Almacén persistente para eventos procesados y estado de cada chat, con escritura atómica; el de las pruebas vive en memoria.
4. Alojamiento, secretos y tarea programada para los recordatorios.
5. Modo sombra antes de enviar nada a prospectos.

## Datos

No poner teléfonos, nombres ni mensajes reales en pruebas, registros o ejemplos. El registro (`log`) recibe solo ID de evento, ID de prospecto y resultado.
