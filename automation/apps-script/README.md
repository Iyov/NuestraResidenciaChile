# Asignación automática de ID NRC

`AssignLeadId.gs` asigna un ID al recibir un envío de Google Forms en la hoja `Respuestas de formulario 1`. El script escribe exclusivamente en la columna `#`.

## Reglas

- El ID es un entero positivo: la siguiente persona nueva recibe el mayor ID de la columna `#` más uno. Si la columna tiene un valor que no es entero, el script se detiene.
- Las filas en blanco se ignoran; el activador procesa la fila real del envío, no filas vacías o espaciadoras.
- Un reintento del mismo activador no vuelve a asignar ID ni sobrescribe uno existente.
- Para conservar el ID de un prospecto que vuelve a enviar el formulario, se compara el nombre normalizado del adulto mayor y el teléfono normalizado. Si hay coincidencias con IDs distintos, el script se detiene para revisión manual.
- No modifica color, estado comercial, comentarios ni otros datos del prospecto.
- La concurrencia se serializa con `LockService`. El código no registra nombres, teléfonos ni valores de celdas.

## Estado en Google

Desde el 2026-10-08 el código está en el proyecto `NRC Auto Lead ID`, vinculado a la hoja real bajo la cuenta NRC, con el activador instalado y verificado (un envío de prueba recibió el ID 22). `.clasp.json` es local y no se versiona; para subir cambios, ejecutar `clasp push` desde esta carpeta con `clasp` autenticado en la cuenta NRC.

## Instalación en Google

Pasos para reinstalar o instalar en otra hoja. La instalación requiere acceso de edición a la hoja y debe hacerla quien administre la cuenta NRC:

1. En una **copia de prueba** de la hoja de respuestas, abre **Extensiones → Apps Script**.
2. Copia `AssignLeadId.gs` al proyecto de Apps Script vinculado a esa hoja.
3. Comprueba que la pestaña se llame `Respuestas de formulario 1` y que los encabezados `#`, `Marca temporal`, `Teléfono` y `Nombre del Adulto Mayor` sigan presentes.
4. Desde una cuenta Google controlada por NRC, ejecuta `installNrcLeadIdTrigger()` una vez y concede los permisos solicitados. El activador queda asociado a la cuenta que lo instala.
5. Prueba en la copia: nuevo prospecto → próximo ID; envío repetido de la misma persona → conserva ID; fila vacía → no asigna ID; dos prospectos distintos → IDs consecutivos; datos ambiguos con IDs previos distintos → queda sin modificar para revisión.
6. Solo tras validar la copia, instala el activador en la hoja real. Verifica su estado en **Apps Script → Activadores** y revisa **Ejecuciones** ante errores. El fallo no escribe el ID; no incluye datos personales en el mensaje de error.

Como alternativa, `clasp` puede vincular este código al archivo existente desde esta carpeta:

```sh
clasp create --title "NRC Auto Lead ID" --parentId "<ID_DE_LA_HOJA>"
clasp push
```

Comparte la hoja con la cuenta autenticada por `clasp` con permiso de editor antes de crear el proyecto. **No añadas `--type sheets`**: ese argumento crea una hoja nueva, no vincula el script a la hoja de respuestas existente. Mantén `.clasp.json` local y verifica cuidadosamente el `parentId` antes de hacer `push`.

No se deben pegar credenciales, tokens, cookies del navegador ni datos de prospectos en este proyecto, en prompts o en registros. No se requiere MCP ni un modelo de IA para asignar IDs.

## Verificación local

Desde la raíz del proyecto:

```sh
node --test automation/apps-script/AssignLeadId.test.cjs
```

Las pruebas usan datos sintéticos y no acceden a Google.

## Acceso del asistente de WhatsApp a la hoja (subido, inactivo)

`WhatsAppSheetAdapter.gs` es una aplicación web para el asistente de SPEC-002. **Se subió al proyecto de Google el 2026-10-08 con `clasp push`, pero no está activo**: solo funciona después de ejecutar `setupNrcWhatsAppSheet` (hecho el 2026-10-08: la pestaña `WhatsApp` existe), crear el token (hecho ese mismo día: la propiedad `NRC_WHATSAPP_ADAPTER_TOKEN` existe) y publicar la aplicación web a mano. Ese último paso no está hecho.

- Ofrece tres operaciones y exige un token compartido: buscar por teléfono (devuelve `#` y nombre de contacto de las filas que ya tienen ID), buscar teléfonos por `#` y registrar un evento: una fila en la pestaña `WhatsApp` y el último evento en la columna `WhatsApp` de las filas de ese `#`.
- En `Respuestas de formulario 1` solo escribe esa celda y nunca devuelve una fila completa.
- `setupNrcWhatsAppSheet` crea la pestaña `WhatsApp` y agrega, después de la última columna de la pestaña de respuestas, los encabezados `Seguimiento` y `WhatsApp` si faltan. `Seguimiento` (`activo` / `desistió`) la llena Francisco; el adaptador no la lee ni la escribe.
- Los valores que escribe se validan contra una lista cerrada de tipos; no acepta texto libre.
- Pasos de publicación: `automation/whatsapp/README.md`.

```sh
node --test automation/apps-script/WhatsAppSheetAdapter.test.cjs
```

## Recontacto y primer contacto (activo desde el 2026-10-11)

`Reactivation.gs` (SPEC-007 y SPEC-014, etapa 1) prepara borradores de WhatsApp en la pestaña `Recontacto`. No envía nada: Francisco abre cada enlace, envía y marca `Enviado`.

- `buildNrcReactivationDrafts`: se ejecuta desde el editor. Crea la pestaña si falta y agrega una fila por prospecto `activo` al que le toca un mensaje. Devuelve y registra solo cantidades y números de fila.
- El activador del formulario agrega una fila con el primer mensaje cuando asigna un ID nuevo, solo si la pestaña ya existe.
- Con `Seguimiento` vacío, un prospecto cuenta como activo si su formulario tiene 3 días o menos o si ya tiene el primer mensaje (PC-01) en la pestaña; si no, espera a que Francisco llene la celda. Antes del 2026-10-29, al abrir la hoja se borraba el borrador PC-01 de todo formulario nuevo.
- `onOpen`: activador simple que actualiza la pestaña al abrir la hoja, solo si la pestaña ya existe.
- `onEdit`: activador simple, limitado a la pestaña `Recontacto`. Al marcar `Enviado` anota la fecha y agrega `Recontactado dd/mm.` al final de `Estado` del prospecto. Al elegir un `Resultado` marca `Respondió` y agrega su nota; con `desistió` cambia además `Seguimiento` e `Ingresó?` (si estaba vacío o en `No Aún`). No escribe ninguna otra celda de la pestaña de respuestas (subido el 2026-10-11).

- `recordNrcReply_(hoja, id, resultado, detalle, fecha)`: anota una respuesta que Francisco informó en vez de elegir `Resultado` él mismo. Marca `Respondió` en la última fila del prospecto, escribe el resultado y agrega la misma nota con fecha en `Estado`, más un detalle breve sin datos personales. El resultado puede ir vacío cuando la respuesta no calza con ninguna opción (subido el 2026-10-13).

### Uso (Francisco)

1. **Preparar mensajes:** no hay que hacer nada. Cada vez que se abre la hoja, la pestaña `Recontacto` se actualiza sola (activador simple `onOpen`). Si hiciera falta forzarlo: **Extensiones → Apps Script**, abrir `Reactivation.gs`, elegir `buildNrcReactivationDrafts` y pulsar **Ejecutar**.
2. **Enviar:** en la pestaña `Recontacto`, abrir el enlace de la fila. Se abre WhatsApp con el texto escrito; revisar y enviar. Sirve el teléfono de NRC o WhatsApp Web con la sesión del número de NRC; desde otro número, el mensaje saldría de ese número.
3. **Marcar `Enviado`** en la fila. La fecha se anota sola.
4. **Cuando la persona contesta,** elegir `Resultado`: `quiere visita`, `sigue pensando` o `desistió`. La hoja marca `Respondió` y agrega una nota con fecha al final de `Estado`; con `desistió` cambia además `Seguimiento` e `Ingresó?`.
5. A los 4 días del primer envío y a los 10 aparecen solos el segundo y el tercer mensaje de quienes no tengan `Respondió`.

Esto no depende de conectar el número a YCloud ni de los 7 días en WhatsApp Business App: quien envía es Francisco, con el WhatsApp de siempre.

Cantidades que devuelve la función: `queued` (mensajes preparados en esta ejecución), `alreadyQueued` (borradores que siguen sin enviar), `waiting` (enviados, dentro del plazo de espera), `finished` (ya recibieron los tres), `replied` (marcados `Respondió`), `notActive` (fuera por `Seguimiento`), `noPhone`, `upcomingVisit`, `removed` (borradores retirados), `refreshed` (borradores reescritos porque el prospecto cambió de segmento) y `reviewRows` (filas con un valor que el código no interpreta).

No pide permisos nuevos. Se subió con `clasp push` el 2026-10-09 junto con el cambio del activador de ID. Francisco ejecutó `buildNrcReactivationDrafts` desde el editor el 2026-10-11: la pestaña existe y el activador agrega el borrador de cada ID nuevo.

Prueba: `node --test automation/apps-script/Reactivation.test.cjs`.

Vuelta atrás: borrar la pestaña `Recontacto` detiene los borradores del activador; para quitar el código, borrar `Reactivation.gs` y volver a subir.
