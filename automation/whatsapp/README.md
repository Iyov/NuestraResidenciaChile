# Asistente de WhatsApp (SPEC-002) — lógica local

**Estado: local.** Este código no está conectado a WhatsApp, a YCloud ni a la hoja de Google, y no está desplegado en ninguna parte. Solo se ha ejecutado con pruebas sintéticas.

Requisitos y decisiones: [`specs/002-whatsapp-frontdesk.md`](../../specs/002-whatsapp-frontdesk.md). Textos y su estado de aprobación: [`specs/002-faq-base.md`](../../specs/002-faq-base.md).

## Archivos

- `knowledge.cjs`: lee las filas `FAQ-xx` y `MSG-xx` del anexo de la especificación. Solo las que están en estado `aprobada` se pueden enviar; cambiar un texto o aprobarlo se hace en el anexo, no aquí.
- `classifier.cjs`: reglas de palabras clave. Devuelve un ID de respuesta, un saludo, un cierre o una derivación con motivo. Los temas reservados (salud, disponibilidad, pagos, reclamos, no contactar, persona o sistema) siempre derivan.
- `frontdesk.cjs`: decide qué hacer con cada evento. No tiene código de red ni de hoja; todo efecto pasa por puertos inyectados.
- `ycloud.cjs`: valida la firma de los webhooks de YCloud, traduce sus eventos y envía texto por su API. Escrito desde los ejemplos de su documentación; **no se ha probado contra la cuenta real**.
- `sheet.cjs`: cliente de `automation/apps-script/WhatsAppSheetAdapter.gs`, que es lo único que toca la hoja.
- `store.cjs` y `schema.sql`: eventos ya procesados y estado de cada chat en una base D1 de Cloudflare. Las claves de chat se guardan como hash con clave, así que la base no contiene teléfonos.
- `service.cjs`: une las piezas y aplica el modo sombra.
- `worker.mjs` y `wrangler.toml`: entrada y configuración del Worker de Cloudflare. `worker.mjs` no tiene prueba propia; se comprobó que empaqueta con `wrangler deploy --dry-run`.
- `*.test.cjs`: pruebas con datos ficticios.

## Prueba

Desde la raíz del repositorio (Node.js 22.13 o superior, por `node:sqlite`):

```sh
node --test automation/whatsapp/frontdesk.test.cjs automation/whatsapp/ycloud.test.cjs automation/whatsapp/service.test.cjs
node --test automation/apps-script/WhatsAppSheetAdapter.test.cjs
```

## Dónde corre

Decidido por Francisco el 2026-10-08: un Worker de Cloudflare en plan gratuito, con una base D1 para el estado y una tarea programada cada 15 minutos para los recordatorios. Verificar los límites del plan gratuito al crear la cuenta.

La hoja no se abre desde el Worker. La atiende una aplicación web de Apps Script dentro del proyecto `NRC Auto Lead ID`, que se ejecuta con la cuenta de NRC y ofrece solo tres operaciones: buscar por teléfono (devuelve ID y nombre de contacto), buscar teléfonos por ID y registrar un evento (una fila en la pestaña `WhatsApp` y el último evento en la columna `WhatsApp` del prospecto). Así no hace falta una cuenta de servicio de Google con acceso a toda la hoja.

## Modo sombra

Está activo salvo que `SHADOW_MODE` valga exactamente `off`. En modo sombra ningún mensaje llega a un prospecto: Francisco recibe "Modo sombra · habría respondido: …" con el texto aprobado, además de los avisos normales. Los comandos y las pausas funcionan igual.

## Puesta en marcha (solo el paso 2 está hecho)

Cada paso lo ejecuta Francisco con las cuentas de NRC. Los secretos se escriben en la terminal o en el panel correspondiente, nunca en el repositorio ni en un chat.

1. **Hoja.** Desde `automation/apps-script/`: `clasp push`. En el editor de Apps Script, ejecutar `setupNrcWhatsAppSheet` (crea la pestaña `WhatsApp` y las columnas `Seguimiento` y `WhatsApp` en la pestaña de respuestas). Llenar `Seguimiento` con `activo` o `desistió` en las filas existentes. En Configuración del proyecto → Propiedades de la secuencia de comandos, crear `NRC_WHATSAPP_ADAPTER_TOKEN` con un valor aleatorio de 32 caracteres o más. Implementar → Nueva implementación → Aplicación web, ejecutar como la cuenta de NRC, acceso "Cualquier usuario". Guardar la URL que termina en `/exec`.
2. **Cloudflare (hecho el 2026-10-08).** Cuenta creada con el correo de NRC, equipo conectado con `npx wrangler login`, base D1 `nrc-whatsapp-frontdesk` creada, su `database_id` anotado en `wrangler.toml` y tablas de `schema.sql` aplicadas. En otro equipo basta con `npx wrangler login` desde `automation/whatsapp/`.
3. **Secretos.** `npx wrangler secret put <NOMBRE>` para cada uno: `YCLOUD_API_KEY`, `NRC_BUSINESS_PHONE`, `NRC_OWNER_PHONE`, `SHEET_ADAPTER_URL`, `SHEET_ADAPTER_TOKEN`, `STATE_KEY_SECRET` (aleatorio, 32 caracteres o más) y `YCLOUD_WEBHOOK_SECRET` (se obtiene en el paso 5).
4. **Despliegue.** `npx wrangler deploy`. Queda en modo sombra.
5. **YCloud.** Solo después de que Toto revise a YCloud como proveedor (SPEC-004): desde que el número se conecta, YCloud recibe todos sus chats, también en modo sombra. Con el número ya en WhatsApp Business App y conectado en coexistencia: crear un webhook hacia `https://<worker>/webhook/ycloud` con los eventos `whatsapp.inbound_message.received` y `whatsapp.smb.message.echoes`, y guardar su secreto como `YCLOUD_WEBHOOK_SECRET`.
6. **Salir del modo sombra.** Solo tras revisar los resultados y con SPEC-004 aprobada: cambiar `SHADOW_MODE` a `off` en `wrangler.toml` y volver a desplegar.

## Qué hace

| Evento | Resultado |
|---|---|
| Mensaje de un número con un único ID en la hoja | Saludo con el nombre del formulario y respuesta aprobada, o texto de derivación más aviso a Francisco |
| Mensaje de un número que no está en la hoja | Saludo que pregunta el nombre, la respuesta aprobada si existe y el formulario, una vez. Sin respuesta aprobada: primero el formulario y, si insiste, derivación. Reclamos, peticiones de no ser contactado y la pregunta por persona o sistema se derivan sin formulario. Nunca crea fila ni ID |
| Mensaje de un número con varios ID, o sin teléfono | Deriva sin elegir un ID |
| Mensaje enviado por Francisco desde la app | El chat queda en pausa y la derivación pendiente se cierra |
| `reactivar 22`, `reactivar todos`, `pausar 22`, `estado` desde el número de Francisco | Cambia o informa las pausas, solo por ID |
| Evento repetido | Se ignora |
| Falla al procesar un mensaje | No se reintenta contra el prospecto; Francisco recibe un aviso genérico |
| `sendDueReminders` (tarea programada) | Un recordatorio por derivación con más de 2 horas, entre 9:00 y 21:00 de Santiago |

El servicio solo responde a mensajes entrantes; no tiene ninguna ruta para iniciar una conversación con un prospecto.

## Qué falta para un piloto

1. La puesta en marcha de arriba, que depende de pasar el número a WhatsApp Business App y esperar 7 días.
2. Probar `ycloud.cjs` contra la cuenta real: firma, formato de los dos eventos y envío.
3. Plantilla de aviso para cuando Francisco no le ha escrito al número de NRC en 24 horas. Sin ella, ese aviso falla y solo queda el registro del Worker.
4. Verificar si se puede responder a un contacto que llega sin teléfono.
5. Dos mensajes simultáneos del mismo chat pueden pisar el estado entre sí; con el volumen de NRC es improbable, pero no está resuelto.

## Datos

No poner teléfonos, nombres ni mensajes reales en pruebas, registros o ejemplos. El registro (`log`) recibe solo ID de evento, ID de prospecto y resultado.
