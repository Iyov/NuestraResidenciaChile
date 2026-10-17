# Memoria de proyecto — Nuestra Residencia Chile

**Actualizada:** 2026-10-09. Esta memoria guarda decisiones reutilizables para futuras sesiones; los datos de prospectos/residentes no pertenecen aquí.

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
| Nicolás y Frank | Anfitriones que ejecutan las visitas que Francisco les asigna. No gestionan prospectos directamente en el flujo diseñado. Nicolás Gabler es nieto de Don Humberto y también administra la residencia; Frank es la mano derecha y vive en ella. |
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
3. **Color de seguimiento:** verde significa que la persona no ha desistido; rojo significa que desistió y no se deben iniciar más intentos. No confundir este estado con la etapa comercial; un ingreso firmado puede seguir en verde sin requerir seguimiento. Desde el 2026-10-08 el dato legible es la columna `Seguimiento` (`activo` / `desistió`), que llena Francisco; el color queda como ayuda visual. Una celda vacía bloquea cualquier envío saliente. Francisco creó la columna en la hoja viva el 2026-10-08; desde el 2026-10-09 está en la columna Q.
4. **Ingreso directo por WhatsApp sin fila previa:** recibe las respuestas aprobadas como cualquiera (son datos públicos) y, una vez, el enlace del formulario como paso siguiente; no crear automáticamente otro lead/ID.
5. **Comunicaciones:** Francisco es responsable de la comunicación con prospectos. El asistente puede contestar de inmediato FAQs con hechos aprobados y derivar a Francisco lo que no pueda resolver con certeza. La prospección saliente a registros existentes se mantiene como borrador para revisión/envío manual en la primera etapa.
6. **Visitas:** solo lunes a viernes entre 10:00–11:30 y 14:00–16:00, hora `America/Santiago`; nunca sábados, domingos ni festivos. No hay excepciones por disponibilidad del anfitrión.
7. **Confirmación de anfitrión:** Francisco consulta por WhatsApp a Nico y Frank; el primero que confirme disponibilidad recibe la asignación. Si ambos confirman prácticamente al mismo tiempo y no se puede establecer el orden, resolver con Francisco. Francisco envía la confirmación final al prospecto, con fecha, hora y dirección de la residencia. **Reemplazado el 2026-10-09** por SPEC-014: la confirmación la envía el asistente a nombre de Francisco y le avisa.
8. **Seguridad:** no usar automatización de clics/cookies de Chrome como integración. Las credenciales nunca se copian a repositorios, prompts o logs.
9. **Pruebas y vuelta atrás (Francisco, 2026-10-09):** la primera prueba real puede hacerse en el sistema vivo si es supervisada, usa datos ficticios y la especificación tiene escrita su sección "Cómo volver atrás" (ya la tienen SPEC-001 y SPEC-002).
10. **Agentes, Skills y MCP:** siguen previstos para el trabajo interno, pero no hay nada instalado. La atención a prospectos es un servicio propio (Worker + Apps Script), no un agente. Detalle en "Modelo de agentes" de `specs/constitution.md`.

11. **Los requerimientos iniciales mandan (Francisco, 2026-10-09):** deben cumplirse los ocho requerimientos de `specs/requirements.md` tal como los pidió, no lo que ya había. Eso reemplaza la decisión 4 (WhatsApp ahora crea prospecto e ID) y la parte de la 5 que dejaba el recontacto solo como borrador manual y las derivaciones sin respuesta. El diseño está en SPEC-007 a SPEC-013, todas en `borrador`: sus textos, plazos y listas de estados son propuestas hasta que Francisco las apruebe, y nada de eso está implementado.
12. **Carpetas solo locales (Francisco, 2026-10-12):** `PluginsWP/` (paquetes de plugins de WordPress), `Documentos/` (documentos de la empresa), `ValidaciónGoogle/` (verificación de anunciante) e `InformesNRC/` (informes mensuales y capturas de métricas; algunas hojas tienen datos de prospectos o residentes) existen solo en el disco de Francisco y no se versionan. Lo que se excluye de Git no se explica en `README.md`, `AGENTS.md` ni en las specs; se anota solo aquí.

12. **Presupuesto de publicidad (Francisco, 2026-10-13):** el presupuesto mensual lo define Francisco y el asistente puede ajustar Google Ads dentro de ese monto sin preguntar cada vez. Reemplaza lo que digan SPEC-005 y SPEC-013 sobre pedir confirmación por cada cambio. Lo cobrado por Google incluye IVA.
13. **Informe para Don Humberto (Francisco, 2026-10-13):** se entrega como DOCX en su carpeta de Drive `InformesNRC`. Es un informe ejecutivo con el mismo formato, tono y estilo que los de agosto y del 22 de septiembre, y **sí lleva nombres y detalle de cada prospecto**, porque Don Humberto evalúa el trabajo con él; reemplaza la regla de solo cantidades de SPEC-012 (REQ-001, AC-002 y AC-008) para este informe. Sin notas técnicas, de fuentes ni de privacidad. Sin cifras de gasto ni del crédito: resultados comparados, en visitas, contactos y prospectos. No le pide aprobaciones de publicidad; Nicolás no figura como destinatario, Francisco lo copia en el correo. Lleva todos los detalles de la hoja sin resumir ni suavizar, incluida la situación de salud que la familia informó. Para redactarlo se leen de la hoja las columnas de nombre, contacto, edad y comentario; fuera del informe, esos datos siguen sin ir a registros, commits ni documentación.
14. **`clasp push` y navegador (Francisco, 2026-10-13):** todo `clasp push` está autorizado sin preguntar. Chrome DEV es el navegador oficial del proyecto; ahí se ejecutan las funciones desde el editor de Apps Script.

## Contrato y atribución

El archivo de referencia es `Contrato/CTTO [NR FB].pdf`; revisar el contrato original antes de modificar términos comerciales. En resumen:

- Honorario fijo mensual indicado: $300.000 líquidos.
- Presupuesto publicitario aproximado: USD 80 mensuales para Meta u otra plataforma acordada por las partes. Don Humberto confirmó destinarlo a Google Ads, según informó Francisco el 2026-10-08; no consta en el repositorio un respaldo escrito de ese acuerdo.
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

## Pendientes para continuar (al 2026-10-09)

**SPEC-001 — ID automático (activo):**

- Francisco borró el 2026-10-08 la fila de prueba (ID 22) de la hoja viva: el siguiente prospecto real recibe el 22.
- El 2026-10-09 entraron los primeros prospectos reales desde la instalación: los ID 22 y 23 se asignaron solos (confirmado por Francisco; dos ejecuciones completadas, 10:37 y 10:44). Francisco informó tres prospectos nuevos ese día y que en dos tuvo que hacer el proceso a mano. El tercero llegó por WhatsApp y a esa fecha no había llenado el formulario: no tiene fila ni ID, que es el caso que cubre SPEC-009.
- En Google solo se probó el caso de prospecto nuevo. Ante un envío sin `#`, revisar **Ejecuciones** en el proyecto `NRC Auto Lead ID`.
- `clasp` quedó autenticado en este equipo con la cuenta NRC; `.clasp.json` es local. Para subir cambios: `clasp push` desde `automation/apps-script/`.
- La hoja auxiliar vacía creada por un `clasp create --type sheets` anterior (otra cuenta) sigue sin eliminar.

**SPEC-004 — aviso de privacidad del formulario (borrador, no publicado):**

- El texto propuesto está en `specs/004-form-privacy-and-consent.md`. El formulario vivo no se ha modificado.
- Toto debe aprobar el texto y resolver: si Hotel Melado Humberto Piemonte SpA es quien opera la residencia y trata los datos; si la ley obliga a nombrar al representante legal; si la autovalencia es dato sensible que requiere consentimiento de la persona mayor; y si las dos casillas de autorización son adecuadas.
- Definir el plazo de conservación (sugerencia de trabajo: 12 meses). El correo del proyecto, también para solicitudes de derechos, es `nuestraresidenciachile@gmail.com` (Francisco, 2026-10-08); la página `/contact/` del sitio muestra otro y no se modifica.
- La Política de Privacidad tiene borrador en `specs/004-privacy-policy-draft.md` (2026-10-08), con corchetes y notas por verificar; no está publicada en el sitio y el aviso la enlaza.
- `automation/consent/` modela el registro de permisos y la pregunta previa a todo envío saliente (`node --test automation/consent/consent.test.cjs`). Es solo lógica local: ningún flujo la usa, no lee la hoja y la lista de versiones del aviso está vacía hasta que se publique uno.
- Elecciones de implementación: las filas anteriores al aviso no cuentan como permiso y quedan en gestión manual; una fila en rojo o un retiro bloquean todo envío saliente; responder a un mensaje entrante siempre se permite y no reactiva nada.
- Sin resolver: dónde se guardan los retiros (el asistente de WhatsApp deriva los "no me contacten" a Francisco sin dejar registro).
- Sitio auditado el 2026-10-09 (código público de 22 páginas): Google Analytics 4 y etiqueta de Google Ads instalados con Site Kit, contenedor de Tag Manager sin etiquetas, sin píxel de Meta y sin banner de cookies; en Chile las cookies quedan permitidas sin preguntar. Toto debe decir si hace falta un banner. Los identificadores están en las notas de `specs/004-privacy-policy-draft.md`.
- Copia local de la hoja revisada el 2026-10-09 (solo encabezados y conteos): las columnas de atribución publicitaria existen pero están vacías. La edad de la persona mayor la pregunta Francisco al conversar; decidió el 2026-10-09 agregarla al formulario, y el aviso y la política ya la mencionan.
- Proveedores: por preferencia de Francisco (2026-10-08) el aviso y la política hablan de "terceros" sin nombrarlos; Toto debe indicar si la ley exige nombrarlos. Contrastar la frase sobre proveedores con el uso real de Google Ads/Meta antes de publicar.
- No exponer datos personales de don Humberto en el aviso; solo los de la sociedad que la ley exija.
- Tras la aprobación: aplicar descripción y dos casillas en el Google Form (agrega columnas a la hoja; el script de IDs no se ve afectado) y registrar la versión del aviso.

**SPEC-002 — atención por WhatsApp (borradores; nada desplegado):**

- `specs/002-faq-base.md` tiene 16 respuestas, todas aprobadas, y 5 mensajes fijos (MSG-01, 02, 03, 05 y 06). Francisco definió el 2026-10-08: habitación individual 32 UF + IVA mensuales (el valor real; cerca de $1.570.000 con IVA incluido desde el 2026-10-09, solo como referencia), visitas de lunes a viernes 10:00–11:30 y 14:00–16:00, correo `nuestraresidenciachile@gmail.com` y tono cálido, humano y respetuoso con tuteo. También decidió, y reafirmó al revisar las specs, que el asistente escribe siempre como Francisco Barrientos y no se presenta como asistente virtual; si alguien pregunta si habla con una persona o un sistema automático, deriva a Francisco. La comunicación virtual no tiene horario: el asistente responde a cualquier hora y solo las visitas tienen horario. Queda abierta D-1: revisión legal de esa identidad con Toto.
- **Precio que se comunica:** siempre el de la habitación individual. La habitación doble comunicada nunca se ha contratado y es poco probable que se pida; su valor de referencia es $2.500.000 mensuales por ambas habitaciones (valor promocional). No ofrecerlo por iniciativa propia; si alguien pregunta por la doble, el asistente deriva a Francisco.
- Por decisión de Francisco no se modifican el brochure 2026 (muestra $1.500.000 para la individual) ni la página `/contact/` del sitio; el asistente usa los valores que él definió.
- Runtime decidido por Francisco el 2026-10-08: Cloud API en coexistencia con WhatsApp Business App, a través de YCloud en plan gratuito (se prioriza no tener costo fijo). Cuenta de YCloud creada; falta pasar el número a WhatsApp Business App y conectarlo. Se descartaron las conexiones no oficiales que emulan WhatsApp Web (habituales en flujos de n8n) por riesgo de bloqueo del número.
- En coexistencia los grupos no se sincronizan y las listas de difusión quedan de solo lectura: la coordinación con Nico y Frank (SPEC-003) sería por chats individuales.
- Francisco autorizó el 2026-10-08 que el asistente envíe por sí mismo respuestas a preguntas introductorias o fáciles (filas aprobadas de la base); seguimientos y mensajes iniciados por el negocio siguen como borradores. Los avisos de derivación le llegan por WhatsApp a su número personal.
- Confirmado por Francisco el 2026-10-08: aviso con ID, nombre corto del contacto y motivo, con un recordatorio a las 2 horas entre 9:00 y 21:00; comandos `reactivar N`, `reactivar todos`, `pausar N` y `estado` desde su número personal; el asistente registra cada evento en una pestaña nueva `WhatsApp`; textos MSG-02, MSG-03 y FAQ-10 aprobados.
- La primera versión clasifica con reglas de palabras clave, sin modelo de lenguaje: sin costo y sin enviar texto a terceros.
- `automation/whatsapp/` tiene la lógica del asistente con pruebas sintéticas (`node --test automation/whatsapp/frontdesk.test.cjs`). Incluye adaptador de YCloud (escrito desde su documentación, sin probar contra la cuenta real), cliente de la hoja, almacén de estado y Worker de Cloudflare con modo sombra activo por defecto. Nada está desplegado; los pasos están en `automation/whatsapp/README.md`.
- El 2026-10-08 se creó la cuenta de Cloudflare con el correo de NRC, se conectó este equipo con `wrangler login` y se creó la base D1 `nrc-whatsapp-frontdesk` con sus dos tablas, vacía. El Worker no está desplegado y no hay secretos cargados.
- El repositorio de GitHub se pasó a privado el 2026-10-08 (estaba público).
- Alojamiento confirmado por Francisco el 2026-10-08: Worker de Cloudflare en plan gratuito con base D1. La hoja se atiende con una aplicación web de Apps Script (`automation/apps-script/WhatsAppSheetAdapter.gs`) que expone solo tres operaciones; ese archivo se subió al proyecto vivo con `clasp push` el 2026-10-08, pero está inactivo: Francisco ejecutó `setupNrcWhatsAppSheet` ese día y la pestaña `WhatsApp` existe, y creó la propiedad `NRC_WHATSAPP_ADAPTER_TOKEN`, pero la aplicación web no está publicada. El mismo valor falta cargarlo en Cloudflare como secreto `SHEET_ADAPTER_TOKEN` al desplegar el Worker; Francisco lo guarda fuera del repositorio.
- El número de NRC está en un celular aparte, exclusivo de NRC; el número personal de Francisco está en otro equipo.
- Francisco creó la cuenta de YCloud el 2026-10-08; el registro le exigió validar el número de NRC por WhatsApp. Fue solo un código de verificación: el número no quedó conectado.
- Decidido por Francisco el 2026-10-08 al revisar las specs (tercera ronda): las respuestas aprobadas se envían a cualquier número y el formulario se ofrece después, una vez; el nombre se pregunta solo cuando no se sabe (MSG-01) y, si el número está en la hoja, el saludo usa el primer nombre del formulario (MSG-06); el asistente escribe el último evento de cada prospecto en una columna `WhatsApp` de `Respuestas de formulario 1` (única celda que toca ahí) y mantiene la pestaña `WhatsApp` como historial; Toto revisa a YCloud antes de conectar el número, porque desde ese momento recibe todos los chats aunque haya modo sombra.
- Francisco creó a mano el 2026-10-08 las columnas `Seguimiento` y `WhatsApp` en la hoja viva. El 2026-10-09 insertó `Visita realizada` en la columna M y las otras dos se corrieron a Q y R (informado por Francisco; no verificado en la hoja). El código las busca por encabezado, no por posición, así que el corrimiento no lo afecta. Francisco ejecutó `setupNrcWhatsAppSheet` el 2026-10-08 y la pestaña `WhatsApp` quedó creada. Se le puede dar formato, pero no cambiar su nombre ni el orden de sus cuatro columnas (A–D), ni escribir debajo de los datos. Francisco llenó `Seguimiento` ese día; valores: `activo`, `desistió` y `residente` (ya ingresó; Francisco confirmó ese día que lo usa). Solo `activo` permite envíos salientes. `inspectNrcFollowUpColumn` (en `WhatsAppSheetAdapter.gs`, subido al proyecto vivo el 2026-10-08) revisa la columna y devuelve solo conteos y números de fila.
- Salir del modo sombra tiene una sola condición legal: aviso de privacidad de SPEC-004 aprobado y publicado. Vale para todas las respuestas automáticas, porque el formulario se ofrece junto con ellas.
- El número de NRC usa hoy WhatsApp normal, no WhatsApp Business App. La coexistencia exige Business App, así que antes hay que pasar el número a esa aplicación y usarla con normalidad al menos 7 días (requisito citado por proveedores; confirmar al conectar).
- Francisco aprobó el 2026-10-08 el texto MSG-05 ("Mucho gusto. Cuéntame, ¿en qué te puedo ayudar?").
- Don Humberto aprobó el 2026-10-08 (informado por Francisco) FAQ-01, 04, 05, 06 y 07 tal cual; fijó la experiencia en "más de 15 años" sin cargos, lugares ni su nombre (FAQ-11); confirmó el precio de 32 UF + IVA; y pidió agregar las frases publicadas del sitio y el brochure, que ahora son FAQ-12 a FAQ-16 (seguridad 24/7, equipo profesional, menús, accesibilidad y 32 habitaciones). FAQ-12 a FAQ-16 se cotejaron con el sitio y el brochure el 2026-10-09: coinciden, salvo que FAQ-13 sigue la lista de profesionales de la página de inicio y el brochure publica otra. El clasificador sigue derivando todo mensaje que hable de la situación de una persona (salud, silla de ruedas, medicamentos, una emergencia) y la disponibilidad.

**SPEC-003 — visitas (lógica local; nada conectado):**

- `automation/visits/` valida horarios y modela los estados de la visita con pruebas sintéticas (`node --test automation/visits/visits.test.cjs`). No envía mensajes ni escribe en la hoja.
- Decidido por Francisco el 2026-10-08: la visita dura cerca de 30 minutos y se reserva una hora; Nico y Frank manejan su horario y solo responden sí o no. Festivos: calendario público de Google "Festivos en Chile" (lista guardada en `automation/visits/holidays-cl.json`, 2026–2031; `node automation/visits/holidays.cjs` la actualiza). Sin plazo fijo de espera a los anfitriones. El asistente puede preguntarles por sí mismo la disponibilidad para un día y hora y esperar la respuesta; nada más por ahora.
- Confirmado por Francisco el 2026-10-08 (segunda ronda): 11:30 y 16:00 son inicios válidos; bloquea solo lo que Google lista como festivo oficial ("Día festivo"); las "Celebración" (Jueves Santo, Corpus Christi, 31 de diciembre) son días hábiles (corregido por Francisco en la tercera ronda); texto de la pregunta a los anfitriones: "Hola Nico, cómo estás?, buenas tardes!, tienes disponibilidad para una visita el martes 13 de octubre a las 10:30?", con nombre y saludo según la hora.
- Plazo aceptado por Francisco (2026-10-08): la solicitud vuelve a él a las 24 horas o al llegar la hora pedida.
- La pregunta a Nico y Frank lleva dos botones ("Sí puedo" / "No puedo") con el ID de visita oculto, para saber a qué visita responden. Casi siempre saldrá como plantilla pagada, porque ellos no suelen escribirle al número de NRC; Francisco lo aceptó. Falta crear la plantilla.
- Días puente, cierres y feriados que Google no publique no se detectan solos: se agregan a mano en `extra` de `holidays-cl.json`.

**SPEC-005 — captación e informes (lógica local; nada conectado):**

- `automation/acquisition/` calcula el embudo mensual, compara el gasto con el tope, clasifica el origen de una consulta, controla la publicación de contenido y arma el informe para dirección (`node --test automation/acquisition/acquisition.test.cjs`). No lee la hoja ni llama a Google.
- Línea base y auditoría externa del 2026-10-09 en `specs/005-baseline-2026-10.md`: 21 consultas, 16 con visita agendada, 1 ingreso. Google Ads, Analytics y Search Console se leyeron ese día en la sesión de Chrome de Francisco. Único cambio hecho: `contact_link_click` marcado como evento clave en Analytics, aprobado por Francisco.
- Francisco fijó el tope de publicidad en $80.000 al mes el 2026-10-09. Desde el 2026-10-09 el gasto que se informa es el "Costo neto" del mes en Facturación de Google Ads, no las cargas ni el presupuesto (decisión de Francisco).
- Analytics, 1 de julio al 8 de octubre: 966 sesiones, 0 eventos clave; `contact_link_click` existe (10 veces) sin estar marcado como evento clave.
- El formulario es un Google Form incrustado: el sitio no ve los envíos, Analytics marca 0 eventos clave y ninguna consulta se puede atribuir a un anuncio. Las columnas de atribución de la hoja están vacías.
- Francisco agregó `Visita realizada` (columna M) a la hoja viva el 2026-10-09 y la llenó para los 21 prospectos. Falta `Fecha Pago`; mientras no exista, el pago y la comisión devengada se informan como "sin dato".
- Los dos enlaces cortos de formulario de la página de inicio llevan al mismo formulario (comprobado el 2026-10-09).
- Los informes de julio y agosto entregados a don Humberto nombran prospectos e incluyen una captura de la hoja. Los siguientes van solo con cantidades.
- Elecciones de implementación: el embudo sigue a las consultas del mes hasta hoy; los costos reparten todo el gasto entre todas las consultas; los identificadores de clic de Google no se guardan mientras Toto no lo apruebe.

**SPEC-006 — avisos del buzón de NRC (activo desde el 2026-10-09):**

- Decidido por Francisco el 2026-10-09: solo el buzón `nuestraresidenciachile@gmail.com`; leer y avisar, sin etiquetar, marcar, archivar ni responder; Apps Script con reglas, sin modelo de lenguaje; aviso solo cuando llega una consulta o algo urgente, sin resumen diario.
- `automation/gmail/GmailTriage.gs` revisa la bandeja cada 15 minutos, pide solo encabezados y extracto, y envía un correo con tipo, hora y enlace (`node --test automation/gmail/GmailTriage.test.cjs`). Se subió el 2026-10-09 al proyecto independiente `NRC Gmail Triage` de la cuenta NRC, separado del de la hoja para no tocar sus permisos.
- Francisco informó el 2026-10-09 que creó la propiedad `NRC_GMAIL_ALERT_TO`, ejecutó `previewNrcGmailTriage`, e instaló el activador con `installNrcGmailTriageTrigger`. Falta el correo de prueba desde otra cuenta; no constan aquí los conteos de la vista previa.
- Elecciones de implementación: el aviso no lleva remitente ni asunto; todo correo escrito por una persona avisa, aunque sea una oferta comercial; los avisos de cuenta se detectan solo por el asunto.

**SPEC-007 a SPEC-013 — requerimientos sin cubrir (borradores del 2026-10-09; nada implementado):**

- 007 recontacto a los verdes (R3), 008 respuesta de respaldo (R7), 009 prospectos y estado desde WhatsApp (R8), 010 blog y redes (R6), 011 posicionamiento y sitio (R2), 012 informe para Don Humberto (R4), 013 operación de Google Ads (R5). Orden de trabajo y bloqueos en `specs/requirements.md`.
- Lo primero es la etapa 1 de SPEC-007: no depende de conectar el número ni de ningún despliegue.
- Aprobado por Francisco el 2026-10-09: RC-01 a RC-05 tal cual, con envíos cualquier día entre 10:00 y 19:00 (también fin de semana, nunca de madrugada); RS-01 a RS-08, con RS-03 indicando el equivalente en pesos y RS-07 diciendo solo que escribe Francisco Barrientos, sin mencionar un asistente; plazo de respaldo de 30 minutos, porque no estará pendiente del teléfono; Frank como segundo contacto de reclamos y urgencias.
- **Precio en pesos (Francisco, 2026-10-09):** el equivalente de 32 UF + IVA se comunica como número cerrado, redondeado a la decena de mil más cercana. Al 2026-10-09: UF $41.130,94 × 32 × 1,19 = $1.566.266 → "cerca de $1.570.000". FAQ-08 y RS-03 llevan el mismo monto y se recalculan juntas cada mes; la mención de $1.550.000 más arriba es la cifra anterior.
- **Del formulario a la visita (2026-10-09):** con los ID 22 y 23 Francisco hizo a mano todo desde la llegada del formulario hasta la visita. Ninguna spec iniciaba la conversación con un prospecto nuevo; lo cubre SPEC-014 (borrador), cuyo flujo y textos PC-01 a PC-07 Francisco aprobó ese día ("es como lo hago ahora"). Cambia la decisión 7 (Francisco, 2026-10-09): cuando Nico o Frank aceptan, el asistente confirma la visita al prospecto a nombre de Francisco, la anota en la hoja y a él solo le avisa que se generó una visita.
- **Sin llamadas (Francisco, 2026-10-09):** atiende a los prospectos solo por WhatsApp y no quiere llamar a nadie. Ningún texto, flujo o propuesta debe ofrecer ni comprometer una llamada suya. RS-07 quedó en "Te escribe Francisco Barrientos, asesor de Nuestra Residencia Chile."
- Aceptado por Francisco el 2026-10-09: el plazo de respaldo corre entre 8:00 y 22:00; fuera de ese horario el asistente responde de inmediato.
- `specs/008-facts.md` tiene 14 hechos del brochure y el sitio, aprobados por Francisco el 2026-10-09. `specs/013-ads-log.md` registra los cambios de publicidad.
- Francisco aprobó el 2026-10-09 la lista de estados y las reglas de SPEC-009. No se ha revisado qué valores tiene hoy `Estado` en la hoja viva.
- No queda ninguna aprobación de Francisco pendiente en SPEC-007, 008, 009 ni 014.
- **Etapa 1 de SPEC-007 y SPEC-014, subida el 2026-10-09:** `automation/apps-script/Reactivation.gs` con 14 pruebas sintéticas. `buildNrcReactivationDrafts` arma la pestaña `Recontacto` y el activador de ID agrega el borrador de PC-01 para cada ID nuevo. Francisco autorizó subirlo y se hizo `clasp push` ese día (4 archivos, incluido el activador de ID). Francisco ejecutó `buildNrcReactivationDrafts` el 2026-10-11: 23 prospectos con ID, 10 borradores preparados, 13 fuera por no estar `activo`, ninguno sin teléfono y ninguna fila por revisar. Calza con la línea base (8 activos de 21) más los ID 22 y 23. La pestaña `Recontacto` existe desde ese día y el activador ya agrega el borrador de cada ID nuevo. Los ID 22 y 23 ya habían sido atendidos a mano: se le indicó marcar `Respondió` en sus filas y no enviarles el borrador. Ningún formulario real ha pasado por el activador nuevo.
- **Francisco no quiere actualizar estados a mano (2026-10-11):** pidió que lo haga el asistente. Ese día envió el primer ciclo de recontacto desde WhatsApp Web; no escribió todavía a los ID 22 y 23 porque sus visitas del viernes 9 están muy recientes y esperará unos días. Un prospecto respondió que eligió otra residencia y Francisco lo dejó en `desistió` a mano. Para reducir ese trabajo se subió el 2026-10-11 la columna `Resultado` de `Recontacto`: una sola elección marca `Respondió` y actualiza `Estado` y `Seguimiento` en la pestaña de respuestas (SPEC-009, etapa 1). Leer las respuestas y actualizar sin que él marque nada solo es posible con el número conectado. Francisco volvió a ejecutar `buildNrcReactivationDrafts` ese día con el código nuevo: 7 prospectos con el primer mensaje enviado y en espera, 2 borradores sin enviar (ID 22 y 23), 14 fuera por no estar `activo` y ninguno nuevo en cola. El segundo mensaje corresponde desde el 2026-10-15.
- **El asistente lee la hoja viva por sí mismo (Francisco, 2026-10-11):** "lee el excel de respuestas siempre, no quiero andar yo leyéndotelo; necesito automatizar, no darme más tareas". Cómo leerla sin nombres ni teléfonos está en `AGENTS.md`. Esto ajusta la regla anterior de no mirar la hoja: se leen solo las columnas sin datos identificables.
- Leído en la hoja el 2026-10-11: 23 prospectos; 9 con `Seguimiento` = `Activo` (ID 11, 13, 14, 15, 19, 20, 21, 22 y 23), 13 en `Desistió` y 1 `Residente` (ID 4). Los ID 22 y 23 tienen la visita del 2026-10-09 marcada como realizada. `Seguimiento` e `Ingresó?` se escriben con mayúscula inicial. El ID 20 tiene `Visita realizada` = Si y `Estado` = "Por visitar": uno de los dos está mal y recibió el mensaje de después de la visita.
- **`Estado` es texto libre de Francisco**, no una lista: la lista de estados aprobada para SPEC-009 no se puede aplicar reemplazando la celda. El código agrega notas con fecha al final ("Recontactado 11/10."). Falta decidir con él qué pasa con la lista.
- Dos errores de lo subido el 2026-10-11, corregidos y subidos ese mismo día: el estado no se escribía porque el código no reemplazaba texto libre, y los ID 22 y 23 tenían preparado el texto de "visita pendiente" en vez del de después de la visita. Ahora un borrador sin enviar se reescribe si el prospecto cambia de segmento.
- La pestaña `Recontacto` se actualiza sola al abrir la hoja (`onOpen`); Francisco ya no tiene que ejecutar nada. Con `desistió` el código cambia también `Ingresó?`, que antes llenaba él.
- La etapa 1 no necesita el número conectado ni los 7 días en WhatsApp Business App: Francisco creyó que sí y hubo que aclararlo. Envía desde WhatsApp Web en su PC con la sesión del número de NRC. El paso a paso está en `automation/apps-script/README.md`, sección "Uso".
- Los ID 22 y 23 tienen preparado RC-03 (después de la visita), sin enviar, a la espera de que Francisco decida escribirles. Elecciones de implementación: el aviso por correo de SPEC-014 se cambió por una fila en `Recontacto` para no pedir un permiso nuevo que habría hecho fallar el activador; una fila recién llegada sin `Seguimiento` sí recibe borrador de primer contacto; los valores de `Agendo Visita` y `Visita realizada` de la hoja viva no se han visto, y lo que no sea Sí, No o vacío se devuelve como fila por revisar.
- El correo de acuerdos del 2026-05-28 dice que los USD 80 de publicidad salen de los $300.000; el contrato los pone aparte, como presupuesto del contratante. Se sigue el contrato.
- El contrato (cláusula tercera C) obliga a entregar el número con WhatsApp Business; hoy usa WhatsApp normal.
- Los informes de julio muestran una cuenta de TikTok y publicidad en Instagram y TikTok; ese gasto no está registrado en ninguna parte.

**Al 2026-10-13:**

- Informe de septiembre redactado (con avance al 13 de octubre y solo cantidades): DOCX en `InformesNRC/2026-09/` y subido a la carpeta de Drive `InformesNRC`; Francisco lo revisa y lo envía. Se armó con conteos leídos de la hoja; `getNrcMonthlyCounts` sigue sin existir. Para subir un archivo a Drive desde Chrome DEV sirve interceptar el `input` de archivo de "Subir archivo" y pasarle el archivo con la herramienta de carga.
- Respuestas al recontacto del 11, informadas por Francisco: ID 11 retoma en noviembre, ID 20 quiere volver a visitar en cerca de un mes, ID 17 desistió por el tamaño de la habitación y del clóset, ID 19 respondió algo ambiguo y falta aclararlo. Los ID 13, 14, 15 y 21 no contestan.
- Francisco pidió que el asistente anote las respuestas en la hoja. `recordNrcReply_` (en `Reactivation.gs`, con prueba) lo hace y está subido desde el 2026-10-13. Como el editor no pasa argumentos, cada tanda se aplica con un archivo temporal que llama a esa función: se sube, se ejecuta una vez desde el editor en Chrome DEV y se retira con otro `clasp push`. Las cuatro respuestas quedaron anotadas y comprobadas en la hoja ese día.
- Lectura de Google Ads y Analytics del 2026-10-13 en `specs/013-ads-log.md`: la campaña pagaba cerca de $800 por clic. Ese día se puso un límite de puja de $400, se subió el presupuesto a $2.750 al día y se agregaron diez palabras clave en concordancia de frase. El 1 de noviembre hay que bajarlo a $2.200 (estado al 2026-10-17 más abajo). También ese día: se creó la conversión "Contacto", que cuenta las llegadas a `/contact` desde un anuncio (es interés, no un formulario enviado: el Google Form incrustado no se puede detectar), y se agregaron dos vínculos a sitio. El asistente de conversiones mostró que la cuenta tiene conectada una fuente "Google Sheets" de conversiones sin conexión; no se tocó. La primera revisión se hizo el 2026-10-17.

- **Campaña al máximo (Francisco, 2026-10-13):** pidió enfocar toda la documentación en la campaña y sacarle el mayor provecho. SPEC-013 se reescribió como fuente única. Ese día se agregaron 12 negativas (búsquedas de hogares de beneficencia y otros servicios que estaban recibiendo clics) y el anuncio pasó de 7 a 12 títulos y de 3 a 4 descripciones, con hechos aprobados. Las búsquedas por nombre de otras residencias privadas no se excluyen. Lo que más limita a la campaña es el destino: `/contact/` con un Google Form incrustado; una página propia necesita acceso al WordPress.

- **Acceso al WordPress (2026-10-13):** Francisco creó una contraseña de aplicación y la guardó en `.env` (`NRC_WP_APP_PASSWORD`); el usuario es administrador y la API REST responde. El sitio usa Elementor. Con ese acceso se creó como borrador la página de destino `/visita/` (página 17773, plantilla sin encabezado ni pie): textos de hechos aprobados, cuatro fotos sin personas, botón de WhatsApp y formulario que se carga al pulsar. Francisco la aprobó y se publicó ese mismo día en `/visita/`, revisada en celular, tablet y escritorio. Francisco confirmó identidad y el anuncio apunta a `/visita/` desde ese día. La página envía a Google Ads la conversión "Clic en WhatsApp o formulario" cuando alguien pulsa uno de sus botones; el 2026-10-17 la acción estaba "Activa" y llevaba 3 registros.

## Estado al 2026-10-17

- **Hoja:** no hay prospectos nuevos desde los ID 22 y 23 (2026-10-09). Hay 9 activos: 11, 13, 14, 15, 19, 20, 21, 22 y 23.
- **Recontacto, segundo mensaje (RC-04):** los borradores para 13, 14, 15 y 21 están listos y sin enviar desde el 2026-10-15. Lo envía Francisco desde WhatsApp Web.
- **Recontacto, primer mensaje a 22 y 23 (RC-03):** sigue sin enviar. Ya pasaron 8 días desde su visita, el plazo que Francisco quería esperar.
- **ID 19:** respondió el 2026-10-13 "no se pudo concretar" y sigue `activo` sin `Resultado`; Francisco debe aclarar si desistió.
- **ID 11 y 20:** sin acción hasta noviembre. El 11 retoma en noviembre y el 20 volverá a visitar con su papá cerca de mediados de noviembre.
- **Google Ads:** la primera revisión semanal se adelantó al 2026-10-17 (otra sesión; detalle en `specs/013-ads-log.md`): 21 negativas nuevas y "residencia tercera edad las condes" se mantiene. De las 3 conversiones, al menos una no fue consulta (alguien que buscaba otra residencia).
- **Prospecto sin fila:** una familia que cotiza para Providencia o Las Condes escribió por WhatsApp el 2026-10-16 y no tiene fila ni ID. Francisco debe ingresarla con el formulario (origen WhatsApp).
- **Calendario:** 2026-10-26 próxima revisión semanal; 2026-10-25 vence el crédito publicitario; 2026-11-01 presupuesto a $2.200 al día; 2026-11-09 decidir si se puja por conversiones (antes, resolver las dos acciones con "Configuración incorrecta").

## Decisiones abiertas / bloqueos

- Aprobar por Toto la política/aviso de privacidad y el lenguaje del formulario sobre respuesta, WhatsApp, seguimientos, terceros/proveedores, conservación y derechos.
- Confirmar el responsable legal de los datos, datos de contacto de privacidad y períodos de retención.
- El asistente no puede inferir elegibilidad ni inventar datos: las respuestas de `specs/002-faq-base.md` describen la residencia en general y nunca dicen si una persona puede ingresar.
- Pasar el número de NRC a WhatsApp Business App, esperar 7 días de uso y, con la revisión de YCloud por Toto hecha, conectarlo. No asumir que Chrome DEV es un runtime.
- SPEC-003: conectar la pregunta a los anfitriones con WhatsApp (depende de SPEC-002), crear la plantilla con botones y decidir dónde se registra la visita por prospecto. La confirmación final al prospecto queda a cargo de Francisco según lo acordado.
- Acordar cadencia y destinatarios del informe; el formato quedó definido en `automation/acquisition/report.cjs`.
- Google Ads: campaña "Autovalentes zona oriente - Búsqueda" activa desde el 2026-10-09; configuración vigente, medición y calendario en SPEC-013. Próximos hitos: revisión semanal (la próxima, el 2026-10-26) y presupuesto a $2.200 al día el 2026-11-01. Al operar Google Ads desde el Chrome de Francisco, el entorno bloquea de forma intermitente los pasos que comprometen gasto y Google pide confirmar identidad: el clic de publicar y esa confirmación los hace Francisco. Revisar consentimientos antes de habilitar conversiones avanzadas/importaciones.
- Obtener acceso al WordPress activo o su fuente fiable/staging antes de cambiar el sitio. Validar local pages, disponibilidad, datos del equipo, testimonios e imágenes antes de SEO/social.
- SPEC-006: enviar el correo de prueba, confirmar que el aviso llega y ajustar las reglas con las primeras semanas de avisos.

## Referencias operativas

- [Ley 21.719 — BCN](https://www.bcn.cl/leychile/navegar?idNorma=1209272)
- [WhatsApp: opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/)
- [WhatsApp: ventana de servicio y plantillas](https://developers.facebook.com/docs/whatsapp/conversation-types/)
- [Google Apps Script: activadores instalables](https://developers.google.com/apps-script/guides/triggers/installable)
- [Google Search: guía SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google Ads: Data Manager para enhanced conversions for leads](https://support.google.com/google-ads/answer/15707550?hl=en)
