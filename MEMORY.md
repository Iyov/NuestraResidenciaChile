# Memoria de proyecto — Nuestra Residencia Chile

**Actualizada:** 2026-10-08. Esta memoria guarda decisiones reutilizables para futuras sesiones; los datos de prospectos/residentes no pertenecen aquí.

## Propósito y objetivo comercial

- Apoyar `https://nuestraresidenciachile.cl/` y reducir el trabajo manual de captación, seguimiento, atención, informes y marketing.
- Objetivo indicado por NRC: llegar a **dos ingresos de residentes al mes**. Es un objetivo de negocio, no una promesa de resultados de publicidad.
- Trabajo del usuario: generar y gestionar las comunicaciones con prospectos y atribuir el origen de cada ingreso.
- El sitio WordPress es externo a este repositorio. `Backup/` no es el código WordPress activo.

## Roles acordados

| Rol | Responsabilidad acordada |
|---|---|
| Don Humberto | Dueño y sponsor de NRC; aprueba decisiones comerciales, hechos institucionales y presupuesto que requiera acuerdo del contratante. |
| Francisco | Responsable de comunicaciones y seguimiento de prospectos; consulta disponibilidad a los anfitriones y confirma la visita al prospecto. |
| Nicolás y Frank | Anfitriones que ejecutan las visitas que Francisco les asigna. No gestionan prospectos directamente en el flujo diseñado. |
| Toto / Cristian Soto | Abogado y colaborador del proyecto; debe revisar el aviso y la política de privacidad antes de publicarlos. |

## Sistemas y fuentes

- El formulario público de Google enlazado desde `/contact/` inserta cada envío en una hoja de respuestas de Google. La copia local del 2026-10-08 (`data/Nuestra Residencia Chile (Respuestas) 2026-10-08.xlsx`, excluida de Git) sirve para entender su estructura, no es la fuente viva.
- El formulario público explica que un especialista de NRC contactará para resolver dudas y coordinar una visita. Los campos visibles incluyen datos de contacto, nombre del adulto mayor, autovalencia y origen del contacto.
- La exportación contiene encabezados de seguimiento y atribución publicitaria además de datos de contacto. No reproducir filas, nombres, teléfonos, emails, comentarios, IPs ni identificadores de publicidad en documentación o prompts.
- El formulario no muestra un campo específico de preferencia/permiso WhatsApp ni un aviso de privacidad propio de NRC. Los consentimientos de medición/personalización publicitaria no equivalen automáticamente a permiso WhatsApp.
- La hoja de respuestas tiene la pestaña `Respuestas de formulario 1` en la exportación revisada. Confirmar nombre y encabezados de la hoja viva antes de instalar scripts.

## Decisiones funcionales confirmadas

1. **Fuente de verdad inicial:** mantener la hoja de respuestas de Google como registro operativo; no migrar a CRM antes de entender el flujo.
2. **ID:** entero secuencial por prospecto/adulto mayor, conservando IDs existentes 1–21; el siguiente prospecto nuevo recibe 22. Una fila realmente vacía no es un prospecto ni consume ID.
3. **Color de seguimiento:** verde significa que la persona no ha desistido; rojo significa que desistió y no se deben iniciar más intentos. No confundir este estado con la etapa comercial; un ingreso firmado puede seguir en verde sin requerir seguimiento.
4. **Ingreso directo por WhatsApp sin fila previa:** compartir el enlace del formulario; no crear automáticamente otro lead/ID.
5. **Comunicaciones:** Francisco es responsable de la comunicación con prospectos. El asistente puede contestar de inmediato FAQs con hechos aprobados y derivar a Francisco lo que no pueda resolver con certeza. La prospección saliente a registros existentes se mantiene como borrador para revisión/envío manual en la primera etapa.
6. **Visitas:** solo lunes a viernes entre 10:00–11:30 y 14:00–16:00, hora `America/Santiago`; nunca sábados, domingos ni festivos. No hay excepciones por disponibilidad del anfitrión.
7. **Confirmación de anfitrión:** Francisco consulta por WhatsApp a Nico y Frank; el primero que confirme disponibilidad recibe la asignación. Si ambos confirman prácticamente al mismo tiempo y no se puede establecer el orden, resolver con Francisco. Francisco envía la confirmación final al prospecto, con fecha, hora y dirección de la residencia.
8. **Seguridad:** no usar automatización de clics/cookies de Chrome como integración. Las credenciales nunca se copian a repositorios, prompts o logs.

## Contrato y atribución

El archivo de referencia es `Contrato/CTTO [NR FB].pdf`; revisar el contrato original antes de modificar términos comerciales. En resumen:

- Honorario fijo mensual indicado: $300.000 líquidos.
- Presupuesto publicitario aproximado: USD 80 mensuales para Meta u otra plataforma acordada por las partes. Francisco expresó intención de reasignarlo a Google Ads; confirmar el acuerdo requerido con Don Humberto antes de gastar.
- Comisión: 50% de la cuota de ingreso; el contrato la estima en aproximadamente $500.000 líquidos a la fecha de firma, no como monto fijo. Se devenga al firmar el ingreso y recibir la residencia el pago.
- El contrato cubre marketing, sitio/SEO/contenido, atención inicial de prospectos e informes, además de obligaciones de confidencialidad y entrega de activos.
- Registrar canal y evidencia de atribución de forma que se pueda revisar el origen comercial; no presentar una comisión como devengada antes del evento contractual indicado.

## Implementación existente

- `automation/apps-script/AssignLeadId.gs` contiene un activador instalable para asignar el ID en la columna `#`. Usa bloqueo, ignora filas vacías, no sobreescribe IDs, reutiliza un ID si coincide el nombre normalizado del adulto mayor y el teléfono normalizado, y se detiene ante IDs coincidentes en conflicto.
- Esa heurística de coincidencia es conservadora y solo compara teléfono + nombre del adulto mayor; contactos alternativos/números cambiados pueden requerir reconciliación manual.
- El código, la guía y pruebas sintéticas están en el repositorio. El 2026-10-08 se subió el código con `clasp` al proyecto `NRC Auto Lead ID`, vinculado a la hoja viva y creado con la cuenta NRC (`nuestraresidenciachile@gmail.com`). Francisco ejecutó `installNrcLeadIdTrigger` ese día sin errores (pestaña y encabezados vivos validados por el instalador). Un envío de prueba con datos ficticios recibió el ID 22: **el flujo está activo en la hoja viva**. No se ha conectado WhatsApp.
- Prueba local: `node --test automation/apps-script/AssignLeadId.test.cjs`.
- Francisco decidió no usar copia de prueba: se despliega directo en la hoja viva y se valida con el primer envío real.
- Un intento anterior de acceso con `clasp` (otra cuenta) no obtuvo permiso para crear un proyecto vinculado a la hoja viva. En ese intento no se hizo `push` ni se instaló un trigger. La opción `clasp create --type sheets` creó una hoja auxiliar vacía por defecto; no contiene datos ni código NRC y debe eliminarse o reutilizarse conscientemente, no confundirse con la hoja de respuestas.

## Requisitos de privacidad y atención

- La solicitud del formulario permite responder a la consulta en el contexto que se explicó, pero el canal WhatsApp y los seguimientos posteriores deben quedar claros en el aviso/formulario antes de automatizarlos.
- Meta exige opt-in para mensajes de negocio; una conversación entrante abre una ventana de servicio de 24 horas. Fuera de ella aplican plantillas aprobadas y las reglas de opt-in. El color verde no demuestra por sí solo un permiso.
- La Ley chilena 21.719 tiene vigencia diferida al 2026-12-01. Revisar con abogado la política, la base de tratamiento y el texto exacto; no presentar una propuesta de aviso como asesoría legal.
- Tratar nombre del adulto mayor y autovalencia como datos de alta sensibilidad; revisar si deben recogerse en el primer contacto y limitar quién/qué sistema los recibe.
- No enviar la hoja completa a un modelo. Limitar las herramientas a búsqueda/actualización de prospecto por ID y estados permitidos; no guardar transcripciones completas; redactar logs.

## Pendientes para continuar (al 2026-10-08)

**SPEC-001 — ID automático (activo):**

- Decidir si se borra la fila de prueba "Juan Perez" (ID 22) de la hoja viva: si se borra, el siguiente prospecto recibe 22; si se conserva, recibe 23.
- En Google solo se probó el caso de prospecto nuevo. Ante un envío sin `#`, revisar **Ejecuciones** en el proyecto `NRC Auto Lead ID`.
- `clasp` quedó autenticado en este equipo con la cuenta NRC; `.clasp.json` es local. Para subir cambios: `clasp push` desde `automation/apps-script/`.
- La hoja auxiliar vacía creada por un `clasp create --type sheets` anterior (otra cuenta) sigue sin eliminar.

**SPEC-004 — aviso de privacidad del formulario (borrador, no publicado):**

- El texto propuesto está en `specs/004-form-privacy-and-consent.md`. El formulario vivo no se ha modificado.
- Toto debe aprobar el texto y resolver: si Hotel Melado Humberto Piemonte SpA es quien opera la residencia y trata los datos; si la ley obliga a nombrar al representante legal; si la autovalencia es dato sensible que requiere consentimiento de la persona mayor; y si las dos casillas de autorización son adecuadas.
- Definir el plazo de conservación (sugerencia de trabajo: 12 meses) y confirmar que `contacto@nuestraresidenciachile.cl` es un buzón atendido.
- Redactar y publicar la Política de Privacidad en el sitio; el aviso la enlaza y hoy no existe.
- Contrastar la frase sobre proveedores con el uso real de Google Ads/Meta antes de publicar.
- No exponer datos personales de don Humberto en el aviso; solo los de la sociedad que la ley exija.
- Tras la aprobación: aplicar descripción y dos casillas en el Google Form (agrega columnas a la hoja; el script de IDs no se ve afectado) y registrar la versión del aviso.

**SPEC-002 — atención por WhatsApp (borradores; nada desplegado):**

- `specs/002-faq-base.md` propone 11 respuestas y 3 mensajes fijos. Francisco definió el 2026-10-08: habitación individual 32 UF + IVA mensuales (cerca de $1.550.000 a esa fecha), visitas de lunes a viernes 10:00–11:30 y 14:00–16:00, correo `nuestraresidenciachile@gmail.com` y tono cálido, humano y respetuoso con tuteo. También decidió que el asistente escribe como Francisco Barrientos y no se presenta como asistente virtual; si alguien pregunta si habla con una persona o un sistema automático, deriva a Francisco. La comunicación virtual no tiene horario: el asistente responde a cualquier hora y solo las visitas tienen horario. Quedan abiertas D-1 y D-2: revisión legal de esa identidad con Toto y frase de experiencia (Don Humberto).
- **Precio que se comunica:** siempre el de la habitación individual. La habitación doble comunicada nunca se ha contratado y es poco probable que se pida; su valor de referencia es $2.500.000 mensuales por ambas habitaciones (valor promocional). No ofrecerlo por iniciativa propia; si alguien pregunta por la doble, el asistente deriva a Francisco.
- Por decisión de Francisco no se modifican el brochure 2026 (muestra $1.500.000 para la individual) ni la página `/contact/` del sitio; el asistente usa los valores que él definió.
- Runtime decidido por Francisco el 2026-10-08: Cloud API en coexistencia con WhatsApp Business App, a través de YCloud en plan gratuito (se prioriza no tener costo fijo). Cuenta no creada y número no conectado todavía. Se descartaron las conexiones no oficiales que emulan WhatsApp Web (habituales en flujos de n8n) por riesgo de bloqueo del número.
- En coexistencia los grupos no se sincronizan y las listas de difusión quedan de solo lectura: la coordinación con Nico y Frank (SPEC-003) sería por chats individuales.
- Francisco autorizó el 2026-10-08 que el asistente envíe por sí mismo respuestas a preguntas introductorias o fáciles (filas aprobadas de la base); seguimientos y mensajes iniciados por el negocio siguen como borradores. Los avisos de derivación le llegan por WhatsApp a su número personal.
- Confirmado por Francisco el 2026-10-08: aviso con ID, nombre corto del contacto y motivo, con un recordatorio a las 2 horas entre 9:00 y 21:00; comandos `reactivar N`, `reactivar todos`, `pausar N` y `estado` desde su número personal; el asistente escribe solo en una pestaña nueva `WhatsApp` y no toca la de respuestas; textos MSG-02, MSG-03 y FAQ-10 aprobados.
- La primera versión clasifica con reglas de palabras clave, sin modelo de lenguaje: sin costo y sin enviar texto a terceros.
- `automation/whatsapp/` tiene la lógica del asistente con pruebas sintéticas (`node --test automation/whatsapp/frontdesk.test.cjs`). Incluye un adaptador de YCloud escrito desde su documentación y sin probar contra la cuenta real. Es solo local: faltan el adaptador de la hoja, el almacén persistente y el alojamiento.
- Francisco creó la cuenta de YCloud el 2026-10-08; el registro le exigió validar el número de NRC por WhatsApp. Fue solo un código de verificación: el número no quedó conectado.
- El número de NRC usa hoy WhatsApp normal, no WhatsApp Business App. La coexistencia exige Business App, así que antes hay que pasar el número a esa aplicación y usarla con normalidad al menos 7 días (requisito citado por proveedores; confirmar al conectar).
- Francisco aprobó el 2026-10-08 el texto MSG-05 ("Mucho gusto. Cuéntame, ¿en qué te puedo ayudar?"). Siguen pendientes las respuestas descriptivas que dependen de Don Humberto.

## Decisiones abiertas / bloqueos

- Aprobar por Toto la política/aviso de privacidad y el lenguaje del formulario sobre respuesta, WhatsApp, seguimientos, terceros/proveedores, conservación y derechos.
- Confirmar el responsable legal de los datos, datos de contacto de privacidad y períodos de retención.
- Don Humberto debe validar las respuestas descriptivas y la frase de trayectoria de `specs/002-faq-base.md`. El asistente no puede inferir elegibilidad ni inventar esos datos.
- Pasar el número de NRC a WhatsApp Business App, esperar 7 días de uso y conectarlo a YCloud. No asumir que Chrome DEV es un runtime.
- Confirmar si el asistente puede enviar por sí mismo solicitudes internas de disponibilidad a Nico y Frank, o solo preparar mensajes para Francisco. La confirmación final al prospecto queda a cargo de Francisco según lo acordado.
- Definir cómo resolver aceptaciones simultáneas, tiempo de espera a los anfitriones, duración de visita y fuente autoritativa del calendario de festivos chilenos.
- Acordar cadencia/formato de informes y línea base de métricas.
- Auditar la cuenta actual de Google Ads, confirmar distribución de los USD 80 y consentimientos antes de habilitar conversiones avanzadas/importaciones.
- Obtener acceso al WordPress activo o su fuente fiable/staging antes de cambiar el sitio. Validar local pages, disponibilidad, datos del equipo, testimonios e imágenes antes de SEO/social.
- Gmail fue parte de la visión inicial, pero sus etiquetas, alcance, nivel de acceso y reglas de respuesta no están definidos; mantenerlo en descubrimiento.

## Referencias operativas

- [Ley 21.719 — BCN](https://www.bcn.cl/leychile/navegar?idNorma=1209272)
- [WhatsApp: opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/)
- [WhatsApp: ventana de servicio y plantillas](https://developers.facebook.com/docs/whatsapp/conversation-types/)
- [Google Apps Script: activadores instalables](https://developers.google.com/apps-script/guides/triggers/installable)
- [Google Search: guía SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google Ads: Data Manager para enhanced conversions for leads](https://support.google.com/google-ads/answer/15707550?hl=en)
