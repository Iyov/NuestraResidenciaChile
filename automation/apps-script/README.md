# Asignación automática de ID NRC

`AssignLeadId.gs` asigna un ID al recibir un envío de Google Forms en la hoja `Respuestas de formulario 1`. El script escribe exclusivamente en la columna `#`.

## Reglas

- El ID es un entero positivo: con los IDs actuales 1–21, la siguiente persona nueva recibe el 22.
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

## Acceso del asistente de WhatsApp a la hoja (no subido)

`WhatsAppSheetAdapter.gs` es una aplicación web para el asistente de SPEC-002. **Todavía no está en el proyecto de Google**: como esta carpeta está vinculada al proyecto vivo, el próximo `clasp push` lo subirá. Subirlo no lo activa; solo funciona después de crear el token y publicar la aplicación web a mano.

- Ofrece tres operaciones y exige un token compartido: buscar por teléfono (devuelve `#` y nombre de contacto de las filas que ya tienen ID), buscar teléfonos por `#` y registrar un evento: una fila en la pestaña `WhatsApp` y el último evento en la columna `WhatsApp` de las filas de ese `#`.
- En `Respuestas de formulario 1` solo escribe esa celda y nunca devuelve una fila completa.
- `setupNrcWhatsAppSheet` crea la pestaña `WhatsApp` y agrega, después de la última columna de la pestaña de respuestas, los encabezados `Seguimiento` y `WhatsApp` si faltan. `Seguimiento` (`activo` / `desistió`) la llena Francisco; el adaptador no la lee ni la escribe.
- Los valores que escribe se validan contra una lista cerrada de tipos; no acepta texto libre.
- Pasos de publicación: `automation/whatsapp/README.md`.

```sh
node --test automation/apps-script/WhatsAppSheetAdapter.test.cjs
```
