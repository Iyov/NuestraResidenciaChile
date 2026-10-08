# SPEC-004 — Aviso, finalidades y datos del formulario

**Estado:** pendiente de revisión jurídica; no modificar el formulario automáticamente.

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

## Referencias

- [Ley 21.719, BCN — vigencia diferida al 2026-12-01](https://www.bcn.cl/leychile/navegar?idNorma=1209272)
- [WhatsApp Business — opt-in](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/)
