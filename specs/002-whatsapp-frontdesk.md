# SPEC-002 — Recepción y respuesta por WhatsApp

**Estado:** `local`. Reglas, base de respuestas ([Anexo A](002-faq-base.md)) y proveedor definidos el 2026-10-08; la lógica y el adaptador de YCloud están en `automation/whatsapp/` con pruebas sintéticas. No hay número conectado, servicio desplegado ni mensaje enviado a prospectos.

## Objetivo

Responder consultas entrantes de NRC con rapidez, resolver FAQs aprobadas, mantener el expediente correcto en la hoja y escalar a Francisco cuando se requiera criterio o información no confirmada.

## Alcance acordado

- El asistente puede contestar de inmediato FAQs solo desde una base factual aprobada.
- Francisco es el responsable de todas las comunicaciones comerciales con prospectos. El asistente representa su flujo operativo; ante dudas, deriva a Francisco.
- Las respuestas aprobadas se envían a cualquier número, esté o no en la hoja: son datos públicos (decisión de Francisco, 2026-10-08). Si la persona no existe en la hoja, el asistente le ofrece además el enlace al formulario, una vez. No crea una fila ni un ID por iniciativa propia.
- Si el teléfono identifica un prospecto existente, se conserva su ID y se registra una interacción mínima.
- Los seguimientos salientes históricos a personas verdes son borradores para revisión/envío manual en la primera etapa.
- Los datos rojos bloquean intentos salientes de seguimiento. Una consulta entrante nueva se puede contestar sin reactivar automáticamente el seguimiento.

## Respuestas permitidas y escalamiento

- Responder ubicación, cómo solicitar/agendar visita y hechos institucionales únicamente cuando estén validados en la base de conocimiento.
- No inventar precios, vacantes, servicios, credenciales, promesas de bienestar ni condiciones de ingreso.
- Derivar a Francisco preguntas sobre aptitud/autovalencia, salud, admisión, excepciones comerciales, reclamos, datos inciertos o solicitudes ambiguas.
- El asistente debe dejar de responder el chat cuando Francisco toma control y reactivarse solo por acción explícita de él.
- El asistente escribe como Francisco Barrientos (decisión de Francisco, 2026-10-08; ver Anexo A, Identidad). Si alguien pregunta si habla con una persona o con un sistema automático, no responde y deriva a Francisco.
- El asistente responde a cualquier hora (decisión de Francisco, 2026-10-08); el horario de lunes a viernes 10:00–11:30 y 14:00–16:00 es solo para visitas. El SLA de derivación está pendiente.

## WhatsApp y cumplimiento

- Canal decidido: Cloud API en coexistencia con WhatsApp Business App, a través de YCloud (ver Runtime).
- No automatizar clics/cookies del perfil Chrome DEV ni leer archivos de credenciales.
- Validar opt-in y expectativas de canal antes de mensajes iniciados por el negocio. El formulario actualmente promete que NRC contactará para responder y coordinar visita, pero no especifica WhatsApp ni marketing continuo.
- Meta documenta una ventana de servicio de 24 horas tras el mensaje/llamada del usuario; fuera de ella aplican plantillas aprobadas y reglas de opt-in.
- Al conectar el número, confirmar contra la cuenta real lo que hoy solo consta en documentación: elegibilidad, los 7 días de uso de WhatsApp Business App, costos y formato de los webhooks.

## Actualización de hoja

- Resolver por teléfono normalizado. Si el teléfono coincide con más de un ID, no se elige: se deriva a Francisco y no se escribe en ninguna fila.
- En `Respuestas de formulario 1` el servicio escribe una sola celda por prospecto: la columna `WhatsApp`, con el último evento (decisión de Francisco, 2026-10-08). El historial completo va en la pestaña `WhatsApp`. Detalle en las decisiones de la tercera ronda.
- `Seguimiento` (activo / desistió), `Estado` y `Comentario` son solo de Francisco; el servicio no los escribe.
- No copiar la hoja completa ni transcripciones a ningún servicio externo. Evitar guardar salud/detalles familiares; redactar logs.
- Webhook procesado de manera idempotente; estados de mensaje entrante, enviado, entregado y error no deben duplicar cambios.

## Criterios de aceptación

- **AC-001:** una FAQ conocida se responde con contenido aprobado y sin inventar datos.
- **AC-002:** una pregunta fuera de la base se deriva a Francisco y no recibe respuesta especulativa.
- **AC-003:** prospecto existente mantiene su ID; el mensaje actualiza solo su celda `WhatsApp` y agrega una fila a la pestaña de eventos.
- **AC-004:** contacto nuevo recibe las respuestas aprobadas y, una vez, el formulario; sin fila/ID creados por WhatsApp.
- **AC-005:** rojo nunca origina un mensaje saliente de prospección; una consulta entrante puede recibir respuesta contextual.
- **AC-006:** cuando Francisco toma control, el bot se silencia para ese chat.
- **AC-007:** fuera de ventana, no se envía mensaje libre; se aplica plantilla autorizada o se espera intervención humana.
- **AC-008:** evento webhook repetido no duplica respuesta, nota ni cambio de estado.
- **AC-009:** ningún log, test o resumen expone PII o transcripción completa.

## Runtime: opciones evaluadas y decisión

Revisado el 2026-10-08 contra la documentación de Meta; costos de terceros y disponibilidad en Chile están sin verificar.

| | A. Cloud API en coexistencia | B. Cloud API sin la app | C. Meta Business Agent |
|---|---|---|---|
| Qué es | El número actual sigue en WhatsApp Business App y además se conecta a la API | El número (o uno nuevo) vive solo en la API | Agente de IA de Meta dentro de la app, sin código |
| Francisco sigue usando la app | Sí, con historial sincronizado | No; hay que darle otra bandeja de entrada | Sí |
| Reglas propias (rojo, hoja, formulario a desconocidos, idempotencia) | Sí, en nuestro servicio | Sí, en nuestro servicio | No verificable; no hay evidencia de que consulte la hoja ni respete el rojo |
| Respuestas limitadas al Anexo A | Sí | Sí | No garantizado: el agente redacta por su cuenta |
| Takeover | Lo que Francisco envía desde la app llega como webhook `smb_message_echoes` → el bot se silencia en ese chat | Requiere construir o contratar una bandeja con botón de takeover | Lo define Meta |
| Requisito de alta | Solo mediante un Solution Partner o Tech Provider de Meta (Embedded Signup); app ≥ 2.24.17 | Alta directa en Meta Business; sin intermediario | Según prensa, despliegue global desde junio de 2026 por regiones y dentro de planes de pago; elegibilidad en Chile sin confirmar |
| Se pierde | Grupos no se sincronizan; listas de difusión quedan de solo lectura; mensajes temporales, de una sola vista y ubicación en vivo se desactivan; se desvinculan WhatsApp para Windows y WearOS; hay que abrir la app al menos cada ~14 días | Toda la app en ese número | Control y trazabilidad |

**Decidido: opción A, a través de YCloud** (Francisco, 2026-10-08). Es la única que cumple AC-003 a AC-008 sin quitarle la app a Francisco, y el takeover sale casi gratis: basta con que él escriba en el chat. Su costo es depender de un proveedor que haga el alta; debe entregar los webhooks crudos (incluido `smb_message_echoes`) a nuestro servicio y no imponer su propio bot. La opción C sirve solo como contestador genérico y no puede sostener las reglas de esta especificación.

Dos consecuencias de A para otras especificaciones:

- SPEC-003: la coordinación con Nico y Frank no puede ser por grupo en este número; serían chats individuales.
- Si hoy se usan listas de difusión en el número de NRC, dejarán de poder crearse.

Costo de mensajes en la plataforma (modelo por mensaje, desde 2025-07-01): las respuestas libres dentro de las 24 horas siguientes al último mensaje de la persona no se cobran; se cobran las plantillas de marketing y las de utilidad enviadas fuera de esa ventana. El piloto de este spec solo responde dentro de la ventana.

## Plan técnico

1. **Servicio webhook** pequeño y propio: Worker de Cloudflare bajo cuenta NRC. Apps Script no sirve como receptor: no expone las cabeceras de la firma del webhook y responde con redirección.
2. **Por cada evento entrante:** validar la firma de YCloud → descartar si el ID de mensaje ya fue procesado (AC-008) → si el chat está en takeover, no responder (AC-006) → buscar el teléfono normalizado en la hoja.
3. **Cualquier número:** clasificar el texto contra el Anexo A. Coincidencia clara con una fila `aprobada` → enviar su texto literal (AC-001). Cualquier otro caso → MSG-03 y aviso a Francisco (AC-002). Si el teléfono coincide con más de un ID, no escribir en ninguna fila y avisar a Francisco.
4. **Número desconocido, además:** MSG-02 (formulario) una vez por chat, después de su primera respuesta o en lugar de la derivación si la primera consulta no tiene respuesta aprobada; si insiste, se deriva. Reclamos, peticiones de no ser contactado y la pregunta por persona o sistema se derivan sin formulario. Nunca se crea fila ni ID (AC-004).
5. **Clasificación:** primera versión con reglas de palabras clave, que devuelven un ID del Anexo A o `derivar`; no redactan la respuesta. Si más adelante se usa un modelo de lenguaje, recibirá solo el texto del mensaje y la lista de IDs/consultas, nunca filas de la hoja, nombres ni teléfonos.
6. **Takeover:** un `smb_message_echoes` en un chat lo marca como tomado por Francisco. Se reactiva solo por acción explícita suya (propuesta: comandos en el chat de avisos; ver Decisiones y propuestas del 2026-10-08).
7. **Hoja:** mediante una aplicación web de Apps Script con token compartido, que solo ofrece tres operaciones. Lee `#`, `Teléfono` y `Tu Nombre y Apellido`; escribe una fila por evento en la pestaña `WhatsApp` y el último evento en la columna `WhatsApp` del prospecto.
8. **Rojo:** el servicio no tiene ninguna ruta de envío iniciada por el negocio; solo responde a mensajes entrantes dentro de la ventana (AC-005, AC-007). Fuera de ventana no envía nada y avisa a Francisco.
9. **Registros:** ID de evento, ID de prospecto, ID de FAQ o `derivar`, resultado. Sin texto de mensajes, nombres ni teléfonos (AC-009).

### Amenazas y controles

- Webhook falsificado → validación de firma y rechazo sin procesar.
- Texto del prospecto que intenta dar instrucciones al modelo → el modelo solo puede elegir un ID de una lista cerrada; no puede generar hechos ni activar envíos.
- Respuesta equivocada sobre salud o admisión → esas categorías no existen en la tabla; siempre derivan.
- Duplicados por reintentos de Meta → registro de IDs procesados.
- Fuga de datos → el servicio nunca recibe una fila completa; la aplicación web de la hoja exige un token y solo acepta valores de una lista cerrada; los secretos viven en el gestor de secretos de Cloudflare y en las propiedades del proyecto de Apps Script, nunca en el repositorio.

### Tareas, en orden

1. Hecho el 2026-10-08: Don Humberto aprobó las filas pendientes del Anexo A y cerró D-2. FAQ-12 a FAQ-16 se cotejaron con el sitio y el brochure el 2026-10-09 (ver Anexo A).
2. Pasar el número de NRC de WhatsApp normal a WhatsApp Business App y usarla al menos 7 días (Francisco). No envía datos a YCloud, así que puede hacerse ya.
3. **Antes de conectar el número:** Toto revisa a YCloud como proveedor y resuelve D-1 (SPEC-004). Desde que el número se conecta, YCloud recibe todos sus chats, aunque el asistente esté en modo sombra (orden decidido por Francisco, 2026-10-08).
4. Conectar el número a YCloud en coexistencia (Francisco; requiere iniciar sesión con Facebook y escanear un QR desde la app). La cuenta de YCloud ya existe.
5. Confirmar en la hoja viva los encabezados `#`, `Teléfono` y `Tu Nombre y Apellido`, y ejecutar `setupNrcWhatsAppSheet`, que crea la pestaña `WhatsApp`. Las columnas `Seguimiento` (P) y `WhatsApp` (Q) ya las creó Francisco a mano el 2026-10-08; la función no las duplica.
6. Hecho: reactivación por comandos y avisos por WhatsApp, definidos el 2026-10-08.
7. Hecho en local: clasificador, manejador de eventos, adaptadores de YCloud y de la hoja, almacén de estado y Worker con modo sombra, con pruebas sintéticas. El adaptador de la hoja se subió al proyecto de Apps Script el 2026-10-08 y está inactivo (sin token ni aplicación web publicada). Falta desplegar el Worker y probar contra las cuentas reales.
8. Piloto en modo sombra: el servicio propone la respuesta a Francisco y no envía nada.
9. Con el aviso de privacidad de SPEC-004 aprobado y publicado, salir del modo sombra (el envío ya fue autorizado por Francisco para las filas aprobadas). Es una sola condición para todas las respuestas automáticas: el formulario se ofrece junto con ellas, así que no se activan por separado.

## Decisiones y propuestas del 2026-10-08

**Decidido por Francisco:**

- **Permiso de envío:** el asistente puede enviar por sí mismo respuestas a preguntas introductorias o fáciles, es decir, las filas `aprobada` del Anexo A. Todo lo demás se deriva. No cubre mensajes iniciados por el negocio ni seguimientos, que siguen como borradores.
- **Avisos de derivación:** llegan por WhatsApp al número personal de Francisco.
- **Proveedor:** YCloud en plan gratuito, conectando el número actual en coexistencia (Francisco, 2026-10-08; se prioriza no tener costo fijo). Su documentación publica el evento `whatsapp.smb.message.echoes`, que avisa cuando el negocio envía un mensaje desde la app, y `whatsapp.inbound_message.received` para los entrantes; con eso el takeover es viable. El plan gratuito incluye API y webhooks y no recarga las tarifas de Meta, según su página de precios. Alternativa de pago si YCloud falla: 360dialog (cerca de USD 59 al mes por número, según terceros).
- **Cuenta de YCloud creada el 2026-10-08; número sin conectar.** El número de NRC usa hoy WhatsApp normal: antes de conectar hay que pasarlo a WhatsApp Business App y usarla al menos 7 días. Al conectarlo: no autorizar la importación del historial de chats, dejar apagados la bandeja y el agente de IA propios de YCloud, y crear la cuenta con el correo de NRC. YCloud pasa a recibir todos los chats del número, así que entra en la revisión de proveedores de SPEC-004.
- **Identificación por teléfono:** desde el 2026-03-31 los webhooks pueden traer un identificador de usuario (BSUID) y YCloud advierte no asumir que el teléfono viene siempre. Si un mensaje llega sin teléfono, el servicio lo trata como número desconocido y avisa a Francisco.

**Confirmado por Francisco el 2026-10-08 (segunda ronda):**

- **Aviso de derivación:** "Tienes una respuesta pendiente de Nuestra Residencia · ID 22 · María P. · motivo: disponibilidad". Lleva ID, nombre de pila con inicial del apellido del contacto y motivo; sin teléfono ni texto del mensaje. Un solo recordatorio a las 2 horas si sigue sin respuesta, solo entre 9:00 y 21:00.
- **Motivos:** salud o autovalencia, disponibilidad, precio o pago, reclamo o urgencia, audio o archivo, pregunta fuera de la base, número desconocido, petición de no ser contactado, pregunta si es persona o sistema.
- **Cierre de una derivación:** cuando Francisco le escribe al prospecto desde la app; eso además pausa el asistente en ese chat.
- **Ventana del aviso:** si Francisco no le ha escrito al número de NRC en las últimas 24 horas, el aviso sale como plantilla de utilidad aprobada por Meta, con un costo pequeño. Enviar `estado` una vez al día lo evita.
- **Comandos**, solo desde el número personal de Francisco, en el chat de avisos: `reactivar 22`, `reactivar todos`, `pausar 22` y `estado`. El asistente nunca se reactiva solo.
- **Hoja** (la escritura cambió en la tercera ronda, más abajo): el servicio no escribe en `Respuestas de formulario 1`; de ella solo lee `#`, `Teléfono` y `Tu Nombre y Apellido` (este último solo para el nombre corto del aviso). Escribe en una pestaña nueva `WhatsApp`, una fila por evento: fecha y hora, `#`, tipo (`FAQ-xx`, `derivado: motivo`, `formulario enviado`, `tomado por Francisco`, `pausado`, `reactivado`) y derivación (`pendiente` o `resuelta`). Sin texto de mensajes, nombres ni teléfonos. `Estado` y `Comentario` siguen siendo solo de Francisco. Encabezados tomados de la exportación local del 2026-10-08; confirmar en la hoja viva.
- **Clasificación:** la primera versión usa reglas de palabras clave, sin modelo de lenguaje: no tiene costo y ningún texto sale a un tercero. Si un mensaje toca un tema reservado, coincide con varias respuestas o con ninguna, se deriva.

**Decidido por Francisco el 2026-10-08 (tercera ronda, al revisar las especificaciones):**

- **Respuestas a números desconocidos:** las filas `aprobada` se envían a cualquiera; el formulario pasa a ser el paso siguiente y no un requisito para recibir respuesta.
- **Identidad:** el asistente escribe siempre como Francisco. D-1 sigue abierta solo como revisión de Toto.
- **Nombre:** se pregunta solo cuando no se sabe. Si el número está en la hoja, el saludo usa el primer nombre del formulario (MSG-06); el saludo se envía una vez por chat.
- **Columna `WhatsApp`:** en `Respuestas de formulario 1`, una celda por prospecto con su último evento, por ejemplo `2026-10-09 15:00 · FAQ-08` o `2026-10-09 15:05 · derivado: disponibilidad · pendiente`. Se escribe en todas las filas que comparten el ID. Es la única celda de esa pestaña que el servicio modifica. La pestaña `WhatsApp` se mantiene como historial, porque los eventos de números sin ID no tienen fila donde escribirse (elección de implementación).
- **Columna `Seguimiento`:** reemplaza al color como dato legible: `activo`, `desistió` o `residente` (ya ingresó; Francisco confirmó el 2026-10-08 que lo usa). Solo `activo` permite un envío saliente. Francisco llenó la columna el 2026-10-08; `inspectNrcFollowUpColumn` la revisa desde el editor y devuelve solo conteos y números de fila. La llena Francisco; el servicio no la lee ni la escribe, porque no tiene envíos salientes. Todo flujo saliente futuro debe leerla, y una celda vacía o con otro valor bloquea el envío, igual que `desistió` (así lo modela `automation/consent/`).
- **Orden legal:** Toto revisa a YCloud antes de conectar el número, no después del modo sombra.
- **Precio:** el valor real es 32 UF + IVA; los $1.550.000 incluyen el IVA y son solo referencia (FAQ-08 corregida).

## Implementación local

`automation/whatsapp/` contiene la lógica del asistente, los adaptadores y sus pruebas sintéticas. Lee los textos y estados directamente del Anexo A. **No está conectada a WhatsApp, a YCloud ni a la hoja, ni desplegada.**

- **Alojamiento (confirmado por Francisco, 2026-10-08):** Worker de Cloudflare en plan gratuito, base D1 para el estado y tarea programada para los recordatorios.
- **Hoja:** aplicación web de Apps Script en el proyecto de la hoja (`automation/apps-script/WhatsAppSheetAdapter.gs`), con token compartido y tres operaciones: buscar por teléfono, buscar teléfonos por ID y registrar un evento (una fila en la pestaña `WhatsApp` y el último evento en la columna `WhatsApp` del prospecto). El servicio nunca recibe una fila completa.
- **Modo sombra por defecto:** ningún mensaje llega a un prospecto hasta que se desactive explícitamente.
- **Fallas:** un evento que falla no se reintenta contra el prospecto; Francisco recibe un aviso genérico.

Pasos de puesta en marcha y limitaciones: `automation/whatsapp/README.md`.

## Cómo volver atrás

Escrito antes del despliegue; ningún paso se ha probado contra las cuentas reales. Van del más suave al más drástico.

- **Un chat:** Francisco escribe en ese chat desde la app, o envía `pausar N`. El asistente calla ahí hasta `reactivar N`.
- **Todas las respuestas a prospectos:** volver `SHADOW_MODE` a cualquier valor distinto de `off` en `wrangler.toml` y desplegar de nuevo. El asistente sigue registrando y avisando, pero nada llega a un prospecto.
- **Cortar la entrada:** desactivar o eliminar el webhook en el panel de YCloud. El Worker deja de recibir eventos; WhatsApp Business App sigue funcionando igual para Francisco.
- **Cortar el acceso a la hoja:** en Apps Script, **Implementar → Administrar implementaciones** → archivar la aplicación web, o cambiar el valor de `NRC_WHATSAPP_ADAPTER_TOKEN`. El Worker falla al consultar la hoja y Francisco recibe el aviso genérico de falla.
- **Volver a una versión anterior del Worker:** `npx wrangler rollback`, o eliminar el Worker desde el panel de Cloudflare.
- **Sacar a YCloud:** desconectar la coexistencia desde WhatsApp Business App o desde el panel de YCloud; el número queda solo en la app.
- **Hoja:** la pestaña `WhatsApp` y la columna `WhatsApp` son solo registro; se pueden vaciar o borrar sin afectar los IDs ni el resto de la fila. El asistente no escribe en ninguna otra celda.

## Pendientes antes de piloto

- Hecho: Don Humberto aprobó el 2026-10-08 (informado por Francisco) FAQ-01, 04, 05, 06 y 07 tal cual; fijó la experiencia en "más de 15 años" sin cargos, lugares ni su nombre (FAQ-11); confirmó el precio de 32 UF + IVA; y pidió agregar las frases publicadas del sitio y el brochure, que ahora son FAQ-12 a FAQ-16 (seguridad 24/7, equipo profesional, menús, accesibilidad y 32 habitaciones). Las preguntas sobre la situación de una persona (salud, movilidad, medicamentos, una emergencia) y la disponibilidad se siguen derivando.
- Toto, antes de conectar el número: revisar a YCloud como proveedor que recibe los chats y si hay que informar que parte de las respuestas son automáticas (D-1).
- Toto, antes de salir del modo sombra: aprobar el aviso de privacidad (SPEC-004).
- Francisco: pasar el número a WhatsApp Business App y, tras 7 días y con la revisión de Toto, conectarlo a YCloud. Llenar `Seguimiento` en las filas existentes.
- Técnicos: cargar secretos y desplegar en modo sombra, plantilla de aviso para fuera de la ventana de 24 horas y prueba contra las cuentas reales.
- SPEC-003: decidido el 2026-10-08 que el asistente puede preguntar por sí mismo a Nico o a Frank la disponibilidad para un día y hora; falta conectarlo y, fuera de la ventana de 24 horas, una plantilla aprobada.
