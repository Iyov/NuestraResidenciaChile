# SPEC-002 — Recepción y respuesta por WhatsApp

**Estado:** `local`. Reglas, base de respuestas ([Anexo A](002-faq-base.md)) y proveedor definidos el 2026-10-08; la lógica y el adaptador de YCloud están en `automation/whatsapp/` con pruebas sintéticas. No hay número conectado, servicio desplegado ni mensaje enviado a prospectos.

## Objetivo

Responder consultas entrantes de NRC con rapidez, resolver FAQs aprobadas, mantener el expediente correcto en la hoja y escalar a Francisco cuando se requiera criterio o información no confirmada.

## Alcance acordado

- El asistente puede contestar de inmediato FAQs solo desde una base factual aprobada.
- Francisco es el responsable de todas las comunicaciones comerciales con prospectos. El asistente representa su flujo operativo; ante dudas, deriva a Francisco.
- Si una persona escribe directamente por WhatsApp y no existe en la hoja, el asistente comparte el enlace al formulario. No crea una fila ni un ID por iniciativa propia.
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

- Preferir WhatsApp Business Platform/Cloud API o solución aprobada; evaluar Meta Business Agent si la cuenta resulta elegible.
- No automatizar clics/cookies del perfil Chrome DEV ni leer archivos de credenciales.
- Validar opt-in y expectativas de canal antes de mensajes iniciados por el negocio. El formulario actualmente promete que NRC contactará para responder y coordinar visita, pero no especifica WhatsApp ni marketing continuo.
- Meta documenta una ventana de servicio de 24 horas tras el mensaje/llamada del usuario; fuera de ella aplican plantillas aprobadas y reglas de opt-in.
- Verificar el número empresarial actual, elegibilidad, coexistencia con WhatsApp Business App, permisos, costos, webhooks y proveedor antes de decidir runtime.

## Actualización de hoja

- Resolver por teléfono normalizado más nombre del adulto mayor y presentar conflictos para revisión; nunca actualizar una fila solo porque el modelo “cree” que coincide.
- Escribir únicamente campos aprobados: ID, etapa, estado de seguimiento, fecha/hora del último contacto, próxima acción y resumen mínimo. Las columnas exactas y un eventual tab de eventos están pendientes de revisar en la hoja viva.
- No copiar la hoja completa ni transcripciones al modelo. Evitar guardar salud/detalles familiares; redactar logs.
- Webhook procesado de manera idempotente; estados de mensaje entrante, enviado, entregado y error no deben duplicar cambios.

## Criterios de aceptación

- **AC-001:** una FAQ conocida se responde con contenido aprobado y sin inventar datos.
- **AC-002:** una pregunta fuera de la base se deriva a Francisco y no recibe respuesta especulativa.
- **AC-003:** prospecto existente mantiene su ID; el mensaje actualiza solo los campos autorizados.
- **AC-004:** contacto nuevo recibe el formulario, sin fila/ID creados por WhatsApp.
- **AC-005:** rojo nunca origina un mensaje saliente de prospección; una consulta entrante puede recibir respuesta contextual.
- **AC-006:** cuando Francisco toma control, el bot se silencia para ese chat.
- **AC-007:** fuera de ventana, no se envía mensaje libre; se aplica plantilla autorizada o se espera intervención humana.
- **AC-008:** evento webhook repetido no duplica respuesta, nota ni cambio de estado.
- **AC-009:** ningún log, test o resumen expone PII o transcripción completa.

## Runtime: opciones y recomendación

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

**Recomendación: opción A.** Es la única que cumple AC-003 a AC-008 sin quitarle la app a Francisco, y el takeover sale casi gratis: basta con que él escriba en el chat. Su costo es depender de un proveedor que haga el alta; debe entregar los webhooks crudos (incluido `smb_message_echoes`) a nuestro servicio y no imponer su propio bot. La opción C sirve solo como contestador genérico y no puede sostener las reglas de esta especificación.

Dos consecuencias de A para otras especificaciones:

- SPEC-003: la coordinación con Nico y Frank no puede ser por grupo en este número; serían chats individuales.
- Si hoy se usan listas de difusión en el número de NRC, dejarán de poder crearse.

Costo de mensajes en la plataforma (modelo por mensaje, desde 2025-07-01): las respuestas libres dentro de las 24 horas siguientes al último mensaje de la persona no se cobran; se cobran las plantillas de marketing y las de utilidad enviadas fuera de esa ventana. El piloto de este spec solo responde dentro de la ventana.

## Plan técnico propuesto (sujeto a aprobar la opción A)

1. **Servicio webhook** pequeño y propio (función serverless bajo cuenta NRC). Apps Script no sirve como receptor: no expone las cabeceras para validar la firma `X-Hub-Signature-256` y responde con redirección.
2. **Por cada evento entrante:** validar firma → descartar si el ID de mensaje ya fue procesado (AC-008) → si el chat está en takeover, no responder (AC-006) → buscar el teléfono normalizado en la hoja.
3. **Número desconocido:** enviar MSG-02 (formulario); no crear fila ni ID (AC-004).
4. **Número conocido:** clasificar el texto contra el Anexo A. Coincidencia clara con una fila `aprobada` → enviar su texto literal (AC-001). Cualquier otro caso → MSG-03 y aviso a Francisco (AC-002). Si el teléfono coincide con más de una fila, no escribir en la hoja y avisar a Francisco.
5. **Clasificación:** primera versión con reglas de palabras clave, que devuelven un ID del Anexo A o `derivar`; no redactan la respuesta. Si más adelante se usa un modelo de lenguaje, recibirá solo el texto del mensaje y la lista de IDs/consultas, nunca filas de la hoja, nombres ni teléfonos.
6. **Takeover:** un `smb_message_echoes` en un chat lo marca como tomado por Francisco. Se reactiva solo por acción explícita suya (propuesta: comandos en el chat de avisos; ver Decisiones y propuestas del 2026-10-08).
7. **Escritura en la hoja:** propuesta: solo en una pestaña `WhatsApp` de eventos, mediante una cuenta de servicio con acceso solo a esa hoja; lectura de `#` y `Teléfono` en la pestaña de respuestas.
8. **Rojo:** el servicio no tiene ninguna ruta de envío iniciada por el negocio; solo responde a mensajes entrantes dentro de la ventana (AC-005, AC-007). Fuera de ventana no envía nada y avisa a Francisco.
9. **Registros:** ID de evento, ID de prospecto, ID de FAQ o `derivar`, resultado. Sin texto de mensajes, nombres ni teléfonos (AC-009).

### Amenazas y controles

- Webhook falsificado → validación de firma y rechazo sin procesar.
- Texto del prospecto que intenta dar instrucciones al modelo → el modelo solo puede elegir un ID de una lista cerrada; no puede generar hechos ni activar envíos.
- Respuesta equivocada sobre salud o admisión → esas categorías no existen en la tabla; siempre derivan.
- Duplicados por reintentos de Meta → registro de IDs procesados.
- Fuga de datos → el modelo no ve la hoja; la cuenta de servicio no ve otras hojas; los secretos viven en el gestor de secretos del proveedor, nunca en el repositorio.

### Tareas, en orden

1. Aprobar el Anexo A y sus decisiones abiertas D-1 y D-2 (Don Humberto, Francisco).
2. Pasar el número de NRC de WhatsApp normal a WhatsApp Business App y usarla al menos 7 días; después, conectarlo a YCloud en coexistencia cuando el servicio esté listo para el modo sombra (Francisco; requiere iniciar sesión con Facebook y escanear un QR desde la app). La cuenta de YCloud ya existe.
3. Confirmar en la hoja viva los encabezados `#`, `Teléfono` y `Tu Nombre y Apellido`, y crear la pestaña `WhatsApp`.
4. Hecho: reactivación por comandos y avisos por WhatsApp, definidos el 2026-10-08.
5. Hecho en local: clasificador, manejador de eventos y adaptador de YCloud con pruebas sintéticas. Falta probar el adaptador contra la cuenta real, escribir el adaptador de la hoja y el almacén de estado, y elegir alojamiento.
6. Piloto en modo sombra: el servicio propone la respuesta a Francisco y no envía nada.
7. Con SPEC-004 aprobada, activar las respuestas automáticas (el envío ya fue autorizado por Francisco para las filas aprobadas).

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
- **Hoja:** el servicio no escribe en `Respuestas de formulario 1`; de ella solo lee `#`, `Teléfono` y `Tu Nombre y Apellido` (este último solo para el nombre corto del aviso). Escribe en una pestaña nueva `WhatsApp`, una fila por evento: fecha y hora, `#`, tipo (`FAQ-xx`, `derivado: motivo`, `formulario enviado`, `tomado por Francisco`, `pausado`, `reactivado`) y derivación (`pendiente` o `resuelta`). Sin texto de mensajes, nombres ni teléfonos. `Estado` y `Comentario` siguen siendo solo de Francisco. Encabezados tomados de la exportación local del 2026-10-08; confirmar en la hoja viva.
- **Clasificación:** la primera versión usa reglas de palabras clave, sin modelo de lenguaje: no tiene costo y ningún texto sale a un tercero. Si un mensaje toca un tema reservado, coincide con varias respuestas o con ninguna, se deriva.

## Implementación local

`automation/whatsapp/` contiene la lógica del asistente y sus pruebas sintéticas (`node --test automation/whatsapp/frontdesk.test.cjs`). Lee los textos y estados directamente del Anexo A. **No está conectada a WhatsApp, a YCloud ni a la hoja**: faltan los adaptadores y el alojamiento. Ver `automation/whatsapp/README.md`.

## Pendientes antes de piloto

- Don Humberto: validar las respuestas descriptivas y la frase de trayectoria del Anexo A (FAQ-01, 04, 05, 06, 07 y 11).
- Toto: aprobar el aviso de privacidad (SPEC-004), revisar a YCloud como proveedor que recibe los chats y si hay que informar que parte de las respuestas son automáticas. Sin esa aprobación no se envía el formulario a números desconocidos.
- Francisco: pasar el número a WhatsApp Business App y, tras 7 días, conectarlo a YCloud.
- Técnicos: adaptador de la hoja, almacén de estado, alojamiento, plantilla de aviso para fuera de la ventana de 24 horas y prueba contra la cuenta real.
- SPEC-003: acordar si el asistente envía solicitudes internas de disponibilidad a Nico y Frank o solo las prepara para Francisco.
