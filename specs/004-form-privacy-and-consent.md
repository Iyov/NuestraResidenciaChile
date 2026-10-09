# SPEC-004 — Aviso, finalidades y datos del formulario

**Estado:** borradores de aviso y de [Política de Privacidad](004-privacy-policy-draft.md) redactados; registro de permisos en `local` (`automation/consent/`, 2026-10-08) con pruebas sintéticas; pendiente de revisión jurídica, nada publicado; no modificar el formulario automáticamente.

## Situación conocida

- El formulario público de NRC dice que un especialista contactará para resolver dudas, conocer necesidades y coordinar una visita.
- Solicita nombre, email, teléfono, nombre del adulto mayor, autovalencia y origen del contacto. La hoja añade datos de seguimiento/atribución.
- El formulario no muestra un aviso de privacidad propio de NRC ni identifica expresamente WhatsApp como canal o marketing futuro. Los consentimientos publicitarios de la hoja son distintos.
- El dato de autovalencia y el nombre de una persona mayor requieren revisar necesidad, titularidad/representación y protección; no asumir que deben enviarse a un modelo.

## Requisitos a validar con el abogado

- Identidad legal del responsable, canal para consultas, finalidad y base de legitimidad de cada uso.
- Distinguir responder la consulta y coordinar visita de publicidad/recontacto posterior; explicar canales previstos (WhatsApp, teléfono/email) y opción de no recibir marketing.
- Información de terceros/proveedores (incluido Google/Meta y cualquier proveedor de IA), transferencias, período de conservación, medidas generales de seguridad y derechos del titular; el aviso debe enlazar a una política completa cuando corresponda.
- Determinar si la solicitud actual basta para responder la consulta y qué permiso/documentación exige WhatsApp para seguimiento posterior. No se afirma que la ley exija un checkbox específico; la solución legal debe revisarse según el caso.
- Revisar minimización de nombre del adulto mayor/autovalencia en el primer formulario; considerar obtener datos sensibles más tarde por un canal adecuado.
- Diseñar corrección/revocación/desistimiento; si un registro pasa a rojo se suprime de outreach. Retener solo lo estrictamente necesario y con base válida.

## Criterios de aceptación previos a automatización saliente

- **AC-001:** texto de privacidad y finalidades aprobado por Toto y publicado/enlazado desde el formulario.
- **AC-002:** la persona entiende que NRC responderá la solicitud y qué canal(es) puede usar.
- **AC-003:** cualquier permiso para marketing/recontacto es distinguible de la coordinación de la solicitud inicial.
- **AC-004:** el registro de permiso conserva finalidad, canal, fecha/fuente y versión del aviso, con acceso restringido.
- **AC-005:** opt-out se propaga a todos los flujos de prospección; una nueva consulta entrante se atiende sin reactivar campañas automáticamente.
- **AC-006:** no se envían datos personales a analítica/Ads/LLM sin configuración y autorización revisadas.

## Borrador de texto para el formulario (2026-10-08) — no publicado

Propuesta de trabajo para revisión de Toto; no es asesoría legal ni está aplicada al formulario vivo. Los campos entre corchetes son hechos que NRC debe confirmar; no publicar con corchetes pendientes. La razón social y el RUT los entregó Francisco el 2026-10-08; el correo es el del proyecto, `nuestraresidenciachile@gmail.com` (decisión de Francisco, 2026-10-08; la página de contacto del sitio muestra otro y no se modifica).

### Descripción del formulario

> Queremos acompañarte en esta nueva etapa. Déjanos tus datos y un especialista de Nuestra Residencia Chile se pondrá en contacto contigo por teléfono, WhatsApp o correo electrónico para resolver tus dudas, conocer tus necesidades y agendar una visita personalizada. Tu tranquilidad y la de tu familia son nuestra prioridad.
>
> **Confidencialidad y protección de tus datos**
>
> - **Quién es responsable:** Hotel Melado Humberto Piemonte SpA, RUT 77.060.284-K, que opera Nuestra Residencia – Senior Living, Camino Las Flores 10961, Las Condes, Santiago.
> - **Para qué usamos tus datos:** solo para responder tu solicitud, orientarte y coordinar tu visita. No te enviaremos publicidad ni novedades salvo que lo autorices más abajo.
> - **Confidencialidad:** tus datos y los del adulto mayor son confidenciales. Solo accede a ellos el equipo de Nuestra Residencia Chile a cargo de tu solicitud, que está obligado a guardar reserva. No vendemos tus datos. Para atenderte nos apoyamos en servicios tecnológicos de terceros, que tratan tus datos solo por encargo nuestro, para los fines de este aviso y con resguardos de seguridad.
> - **Datos del adulto mayor:** al enviar el formulario declaras que la persona mayor está informada o que actúas en su representación. La edad y la respuesta sobre autovalencia son solo referenciales para orientarte; no son una evaluación ni condicionan el ingreso.
> - **Cuánto tiempo los guardamos:** [PLAZO — no figura en ningún documento; sugerencia de trabajo: 12 meses] desde tu último contacto con nosotros, o hasta que nos pidas eliminarlos.
> - **Tus derechos:** puedes pedir acceso, rectificación, supresión, oposición, portabilidad o bloqueo de tus datos, y retirar tu autorización en cualquier momento, escribiendo a nuestraresidenciachile@gmail.com. Tratamos tus datos conforme a la Ley N° 19.628 y a la Ley N° 21.719 de Protección de Datos Personales, vigente desde el 1 de diciembre de 2026.
> - Más información en nuestra Política de Privacidad: [ENLACE].

### Preguntas nuevas al final del formulario

1. **Casilla obligatoria:** "He leído el aviso de confidencialidad y protección de datos y autorizo a Nuestra Residencia Chile a contactarme por teléfono, WhatsApp o correo electrónico para responder esta solicitud."
2. **Casilla opcional, separada de la anterior (AC-003):** "Además, acepto recibir información y novedades de Nuestra Residencia Chile por WhatsApp o correo electrónico. Puedo darme de baja cuando quiera."

### Puntos que Toto y Don Humberto deben resolver antes de publicar

- Responsable: confirmar que Hotel Melado Humberto Piemonte SpA es la entidad que opera la residencia y trata los datos. El contrato de servicios y la resolución sanitaria están a nombre de don Humberto como persona natural, no de la sociedad.
- Instrucción de Francisco (2026-10-08): el aviso no expone datos personales de don Humberto (RUT personal, correo o teléfono propios); solo los datos de la sociedad que la ley exija. Toto debe indicar si la ley obliga a nombrar al representante legal.
- Plazo de conservación: ningún documento lo define. El buzón para solicitudes de derechos es `nuestraresidenciachile@gmail.com` (Francisco, 2026-10-08).
- Proveedores: por preferencia de Francisco (2026-10-08) el aviso habla de "terceros" sin nombrarlos. Hoy son Google y WhatsApp/Meta; YCloud y Cloudflare se suman al conectar el asistente (SPEC-002). Toto debe indicar si la ley exige nombrarlos o indicar sus categorías, y revisar a YCloud antes de que se conecte el número. Además, la hoja tiene columnas para identificadores de Google Ads, hoy vacías (revisado el 2026-10-09), y cualquier envío a Ads/Meta o a un proveedor de IA debe quedar descrito (AC-006).
- Si la autovalencia es dato sensible de salud que exige consentimiento expreso de la propia persona mayor, o si conviene sacarla del primer formulario.
- Si las dos casillas son la forma adecuada de documentar el permiso, y cómo se registra la versión del aviso aceptada (AC-004).
- Existencia y enlace de la Política de Privacidad completa en el sitio. Hay un borrador en [004-privacy-policy-draft.md](004-privacy-policy-draft.md), con sus propios puntos por verificar.

## Implementación local

`automation/consent/` contiene solo lógica, sin red ni hoja: **no lee respuestas, no envía mensajes y ningún flujo la usa todavía.**

- `consent.cjs`: convierte las dos casillas de una respuesta en un registro de permiso con finalidad, canales, fecha, fuente y versión del aviso (AC-004); registra retiros; y responde la única pregunta que todo envío saliente debe hacer antes de escribirle a un prospecto (`mayContact`).
- Prueba: `node --test automation/consent/consent.test.cjs`.

Cómo quedó aplicado (elecciones de implementación sobre el borrador; cambian si Toto cambia las casillas):

- **Finalidades y canales:** `solicitud` por teléfono, WhatsApp o correo; `novedades` por WhatsApp o correo. La casilla de la solicitud no cubre novedades (AC-003).
- **Versión del aviso:** el formulario no guarda qué texto vio la persona, así que la versión es la que estaba publicada en el momento del envío, según una lista de versiones con su fecha de publicación. La lista está vacía hasta que se publique un aviso.
- **Filas sin registro:** las anteriores al aviso (incluidos los IDs existentes) y las que no traen la casilla obligatoria no cuentan como permiso. Ningún envío automático sale hacia ellas; quedan para gestión manual de Francisco.
- **Rojo:** una fila en rojo, o cuyo color no se informa, bloquea todo envío saliente.
- **Retiro:** se puede retirar solo `novedades` o pedir que no se contacte más (todas las finalidades y canales). Lo segundo también se registra para un prospecto sin registro previo. La fecha del primer retiro no se mueve.
- **Consulta entrante:** responder a un mensaje que la persona acaba de enviar siempre está permitido y no modifica el registro: no reactiva seguimientos ni novedades (AC-005).
- **AC-006:** no hay código. Ningún flujo envía datos a analítica, Ads o un modelo de lenguaje, y no existe una autorización que modelar.

## Plan de aplicación tras la aprobación

Pasos manuales, en este orden; ninguno está hecho:

1. Toto aprueba aviso y política; se reemplazan todos los corchetes.
2. Publicar la Política de Privacidad en el sitio WordPress y anotar su URL y versión.
3. En el Google Form: reemplazar la descripción y agregar las dos casillas al final (la primera obligatoria). Forms agrega dos columnas al final de la hoja; el script de IDs busca sus columnas por encabezado y no se ve afectado.
4. Anotar la fecha y hora de publicación como primera versión del aviso; esa lista es la entrada de `createNoticeHistory`.
5. Enviar una respuesta de prueba con datos ficticios y comprobar que recibe ID y que las dos columnas se llenan.
6. Antes de activar cualquier envío iniciado por NRC (seguimientos, novedades), conectar ese flujo a `mayContact` y decidir dónde se guardan los retiros.

## Pendientes

- Dónde se guardan los retiros y quién los registra. El asistente de WhatsApp ya deriva a Francisco los mensajes del tipo "no me contacten"; hoy eso no deja un registro de retiro.
- Propuesta en [SPEC-009](009-whatsapp-lead-registry.md) (borrador): el asistente registra el retiro poniendo `Estado` y `Seguimiento` en `desistió`.
- Puntos nuevos para Toto desde el 2026-10-09: si la solicitud del formulario basta para el recontacto automático de [SPEC-007](007-prospect-reactivation.md), que contradice la elección de `automation/consent/` de tratar las filas anteriores al aviso como sin permiso; el texto RS-07 de [SPEC-008](008-whatsapp-fallback-reply.md), que responde "te escribe Francisco Barrientos" a quien pregunta si habla con una persona; y el proveedor del modelo de lenguaje de SPEC-008, que recibiría texto de conversaciones.
- Cómo se atienden las solicitudes de derechos que lleguen por correo (responsable y plazo).
- Qué hacer con los prospectos anteriores al aviso: mantenerlos en gestión manual o pedirles autorización.
- Cookies del sitio: auditadas el 2026-10-09 (Google Analytics 4 y Google Ads activos, sin banner; detalle en las notas de la política). Falta que Toto diga si se necesita un banner de consentimiento y, si es así, instalarlo en el WordPress.
- Edad de la persona mayor: hoy Francisco la pregunta al conversar y la anota en la hoja; decidió el 2026-10-09 agregarla como pregunta del formulario. El aviso y la política ya la mencionan. Falta agregar la pregunta al Google Form (la hoja ya tiene la columna `Edad`).

## Referencias

- [Ley 21.719, BCN — vigencia diferida al 2026-12-01](https://www.bcn.cl/leychile/navegar?idNorma=1209272)
- [WhatsApp Business — opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/)
