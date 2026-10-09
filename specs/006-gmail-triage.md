# SPEC-006 — Lectura y clasificación de Gmail

**Estado:** alcance definido por Francisco el 2026-10-09. Código en `automation/gmail/` con pruebas sintéticas, subido ese día al proyecto de Apps Script `NRC Gmail Triage` de la cuenta NRC. **Activo desde el 2026-10-09:** Francisco indicó el correo de aviso, autorizó el proyecto, e instaló el activador (informado por él). Falta el correo de prueba desde otra cuenta.

## Resultado esperado

Francisco no tiene que abrir el buzón de NRC para saber si llegó algo que lo necesita. Recibe un aviso solo cuando llega un correo de una persona o un aviso urgente de una cuenta; el resto no genera nada.

## Decisiones (Francisco, 2026-10-09)

- **Buzón:** solo `nuestraresidenciachile@gmail.com`. Su correo personal queda fuera.
- **Acciones:** leer y avisar. No etiqueta, no marca como leído, no archiva, no borra, no reenvía y no responde ni deja borradores.
- **Dónde corre:** Apps Script en la cuenta NRC, con reglas de remitente y palabras clave. Sin modelo de lenguaje: el contenido no sale de Google.
- **Aviso:** solo cuando haya una consulta o algo urgente. No hay resumen diario.

## Cómo funciona

Cada 15 minutos revisa los correos de la bandeja de entrada de los últimos dos días que no haya visto antes. De cada uno pide a Gmail solo el remitente, el asunto, tres encabezados técnicos y el extracto corto; nunca el cuerpo completo ni los adjuntos.

| Categoría | Cuándo | Avisa |
|---|---|---|
| `consulta` | Lo escribió una persona y no cae en otra categoría | Sí |
| `privacidad` | Una persona pide no ser contactada o algo sobre sus datos | Sí |
| `reclamo` | Una persona reclama o habla de una urgencia | Sí |
| `cuenta` | Correo automático cuyo asunto habla de pago rechazado, suspensión, vencimiento o acción requerida | Sí |
| `rebote` | Un correo enviado desde NRC no se pudo entregar | Sí |
| `formulario` | Acuse de Google Forms (la consulta ya está en la hoja) | No |
| `aviso` | Cualquier otro correo automático o masivo | No |
| `propio` | Enviado desde el mismo buzón | No |

Un correo es automático si trae encabezado de baja de lista, viene marcado como masivo o como respuesta automática, o su remitente es del tipo `noreply`, `notifications` o similar. Ante la duda se trata como escrito por una persona: una oferta comercial escrita a mano llegará como `consulta`.

El aviso es un correo a la dirección que Francisco indique, con una línea por conversación: tipo, día y hora, y el enlace para abrirla. No lleva remitente, asunto ni texto del mensaje; en los avisos de cuenta agrega el dominio del servicio.

## Permisos y privacidad

- Permisos del proyecto: lectura de Gmail, envío de correo propio (el aviso) y manejo de sus activadores. No puede modificar el buzón.
- Proyecto separado del de la hoja (`NRC Auto Lead ID`): no comparte permisos con él ni lo afecta.
- Guarda solo los identificadores de los mensajes ya vistos (hasta 450). El registro de ejecución tiene solo cantidades.
- La primera ejecución anota lo que ya hay en la bandeja sin avisar.
- Si el envío del aviso falla, los correos quedan como no vistos y se reintenta en la siguiente revisión.
- No ve la carpeta de spam ni lo que se archive antes de los 15 minutos.

## Criterios de aceptación

- **AC-001:** un correo nuevo de una persona genera un aviso con enlace, sin remitente, asunto ni texto.
- **AC-002:** boletines, acuses del formulario y correos propios no generan aviso.
- **AC-003:** un correo ya avisado no se vuelve a avisar.
- **AC-004:** el código no pide cuerpos ni adjuntos y no modifica el buzón.
- **AC-005:** sin dirección de aviso válida no se lee nada.

Los cinco están cubiertos por `node --test automation/gmail/GmailTriage.test.cjs`. En el buzón real solo consta la activación informada por Francisco el 2026-10-09.

## Activación y primera prueba

Pasos en [`automation/gmail/README.md`](../automation/gmail/README.md). La primera prueba es en el buzón vivo, supervisada: `previewNrcGmailTriage` muestra cuántos correos caen en cada categoría sin enviar nada; después se instala el activador y se envía un correo de prueba desde otra cuenta.

## Cómo volver atrás

1. Ejecutar `uninstallNrcGmailTriageTrigger` en el proyecto `NRC Gmail Triage`: las revisiones se detienen.
2. Para quitar el acceso: en la cuenta de Google de NRC, **Seguridad → Conexiones con apps de terceros**, eliminar `NRC Gmail Triage`.
3. Opcional: borrar el proyecto en script.google.com.

El buzón no necesita restauración porque el código no lo modifica.

## Pendientes

- Enviar un correo de prueba desde otra cuenta y confirmar que el aviso llega.
- Ajustar las reglas con lo que muestre `previewNrcGmailTriage` y las primeras semanas de avisos.
- Toto: confirmar que las solicitudes sobre datos personales que lleguen a este buzón se atiendan con este aviso como primer paso (SPEC-004).
