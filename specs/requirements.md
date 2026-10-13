# Requerimientos iniciales de NRC y trazabilidad

**Estado:** vigente. Francisco indicó el 2026-10-09 que estos ocho requerimientos son la vara del proyecto: deben cumplirse todos, tal como los pidió, aunque una decisión posterior los haya recortado. Donde una especificación anterior los contradice, manda la especificación nueva que se indica abajo.

## Contexto

- NRC es la residencia para adultos mayores autovalentes de Las Condes y su sitio `nuestraresidenciachile.cl`, desarrollado por Francisco con Cristian Soto (Toto), abogado.
- Don Humberto Piemonte es el dueño. Nicolás Gabler, su nieto, también administra. Frank es la mano derecha y vive en la residencia.
- El trabajo de Francisco es llevar prospectos a residentes. El contrato paga una comisión del 50 % de la cuota de ingreso (cerca de $500.000) por cada ingreso firmado y pagado cuyo primer contacto venga de sus canales.
- Meta de Don Humberto: **2 ingresos al mes**. A la fecha hay 1 ingreso en total.
- Francisco no tiene tiempo para actualizar el sitio ni cargar contenido: el trabajo recurrente debe quedar automatizado o reducido a una aprobación.

## Requerimientos

| ID | Requerimiento | Especificación | Estado |
|---|---|---|---|
| R1 | Que más personas conozcan la residencia por el sitio o las redes sociales | [010](010-blog-and-social.md), [011](011-seo-and-site.md), [013](013-google-ads-operation.md) | borrador |
| R2 | Posicionar el sitio en Google y otros buscadores | [011](011-seo-and-site.md) | borrador |
| R3 | Cada registro de `/contact/` llega a la hoja; contactar por WhatsApp a los prospectos en verde e instarlos a visitar o volver a visitar | [001](001-auto-lead-id.md) (activo), [007](007-prospect-reactivation.md), [014](014-form-to-visit.md) | 001 activo; 007 y 014 borrador |
| R4 | Informes de avance para Don Humberto | [012](012-management-report.md) | borrador |
| R5 | Ayuda con Google Ads y la publicidad pagada | [005](005-acquisition-content-and-reporting.md), [013](013-google-ads-operation.md) | campaña activa y medida; revisión semanal desde el 2026-10-19 |
| R6 | Publicaciones de blog que se replican en Facebook e Instagram | [010](010-blog-and-social.md) | borrador |
| R7 | Atender al público por WhatsApp: dudas, aclaraciones y derivaciones; si Francisco no responde, responde el asistente | [002](002-whatsapp-frontdesk.md), [008](008-whatsapp-fallback-reply.md) | 002 local; 008 borrador |
| R8 | Con lo que pase en WhatsApp, actualizar el estado de cada prospecto en la hoja y hacer crecer el número de prospectos | [009](009-whatsapp-lead-registry.md), [014](014-form-to-visit.md) | borrador |

Especificaciones de apoyo, que no nacen de un requerimiento pero condicionan a los anteriores: [003](003-visit-coordination.md) (visitas), [004](004-form-privacy-and-consent.md) (privacidad) y [006](006-gmail-triage.md) (avisos del buzón).

## Qué cambia respecto de lo decidido antes

| Decisión anterior | Requerimiento que la corrige | Ahora |
|---|---|---|
| El asistente no inicia conversaciones; los seguimientos son borradores manuales | R3 | El recontacto a los verdes tiene flujo propio, primero con envío de un toque y después automático (SPEC-007) |
| Una consulta sin respuesta aprobada espera a Francisco sin límite | R7 | Pasado el plazo, el asistente responde (SPEC-008) |
| Un número nuevo de WhatsApp no crea fila ni ID | R8 | Toda consulta nueva crea su prospecto y recibe ID (SPEC-009) |
| `Estado` y `Seguimiento` los escribe solo Francisco | R8 | El asistente escribe una lista cerrada de estados con evidencia (SPEC-009) |
| El contenido se adapta y se publica a mano | R6 | Una sola aprobación publica el artículo y sus versiones para redes (SPEC-010) |

No cambian: los humanos deciden el ingreso, nadie inventa hechos, el rojo no se recontacta y nada sale con datos personales hacia informes, registros o modelos (constitución, principios 2, 3, 5 y 8).

## Orden de trabajo

El orden sigue la distancia a un ingreso, que es lo que mide Don Humberto y lo que paga la comisión:

1. **SPEC-014, etapa 1, y SPEC-007, etapa 1:** primer mensaje a cada formulario nuevo y recontacto a los prospectos activos, ambos con envío de un toque. No dependen de conectar el número.
2. **SPEC-012:** informe de septiembre, atrasado.
3. **SPEC-013:** revisión semanal de la campaña, ya con conversión medida.
4. **SPEC-002 + 008 + 009 + 014, etapa 2:** conectar el número y poner el asistente a responder, agendar visitas, registrar y actualizar la hoja.
5. **SPEC-011:** acceso al WordPress, medición, indexación y velocidad.
6. **SPEC-010:** calendario de blog y réplica en redes.
7. **SPEC-007, etapa 2:** recontacto automático.

## Bloqueos que no son de código

- Toto: aviso de privacidad (SPEC-004), revisión de YCloud y de la identidad del asistente (D-1), base para el recontacto automático y para usar un modelo de lenguaje.
- Francisco: pasar el número de NRC a WhatsApp Business App y usarlo 7 días; crear la contraseña de aplicación del WordPress; inventario de cuentas de Facebook, Instagram, TikTok y Perfil de Negocio de Google.
- Don Humberto: destinatarios y fecha del informe; aprobación de los hechos nuevos que se quieran comunicar.
