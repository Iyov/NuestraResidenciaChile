# SPEC-002 — Recepción y respuesta por WhatsApp

**Estado:** especificación funcional en curso; no hay integración ni agente desplegado.

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
- La política de atención fuera de horario para FAQs, el SLA de derivación y la frase de presentación/transparencia del asistente están pendientes.

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

## Pendientes antes de piloto

- Aprobar FAQs, fuentes y dueño de cada hecho variable (precios, disponibilidad, horarios, servicios).
- Acordar autorización para que el asistente envíe respuestas FAQ por sí mismo; el permiso actual para preparar borradores de seguimiento no debe ampliarse por inferencia.
- Acordar si envía solicitudes internas de disponibilidad a Nico/Frank o solo las prepara para Francisco.
- Configurar el canal oficial, interfaz de takeover, ventana horaria de atención y permisos de la hoja.
- Validar formulario/aviso con Toto antes de automatizar recontacto comercial.
