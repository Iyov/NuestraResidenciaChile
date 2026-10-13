# Índice de especificaciones NRC

Las especificaciones son la fuente de requisitos funcionales y aceptación. Un estado de especificación **no** prueba que la integración esté desplegada.

Los ocho requerimientos iniciales de Francisco y la especificación que cubre cada uno están en [requirements.md](requirements.md). Son la vara del proyecto: si una especificación anterior los recorta, manda la nueva que ahí se indica.

## Estado

| Especificación | Estado actual | Próximo gate |
|---|---|---|
| [Constitución](constitution.md) | Principios vigentes | Revisar si cambian permisos o sensibilidad de datos |
| [001 — Auto-ID](001-auto-lead-id.md) | Código subido al proyecto Apps Script vinculado a la hoja viva (2026-10-08) y verificado con un envío de prueba que recibió el ID 22 | Revisar **Ejecuciones** si algún envío queda sin ID |
| [002 — Atención WhatsApp](002-whatsapp-frontdesk.md) | Reglas, [base de respuestas](002-faq-base.md) y proveedor (YCloud) definidos el 2026-10-08; lógica `local` en `automation/whatsapp/` con pruebas sintéticas; sin conexión a WhatsApp ni despliegue | Pasar el número a WhatsApp Business App, revisión de YCloud por Toto y desplegar en Cloudflare en modo sombra. Las respuestas del Anexo A quedaron todas aprobadas el 2026-10-08 |
| [003 — Visitas](003-visit-coordination.md) | Reglas acordadas; validación de horarios y estados de la visita `local` en `automation/visits/` con pruebas sintéticas (2026-10-08); integración pendiente | Conectar la pregunta a los anfitriones con WhatsApp (depende de SPEC-002) |
| [004 — Privacidad del formulario](004-form-privacy-and-consent.md) | Borradores de aviso y de [Política de Privacidad](004-privacy-policy-draft.md) redactados; registro de permisos `local` en `automation/consent/` con pruebas sintéticas (2026-10-08); pendiente de abogado, nada publicado | Confirmar responsable, bases/finalidades, aviso y política con Toto |
| [005 — Captación y marketing](005-acquisition-content-and-reporting.md) | Tope de gasto de $80.000 al mes (2026-10-09); [línea base y auditoría](005-baseline-2026-10.md) del 2026-10-09, con lectura de Google Ads, Analytics y Search Console; embudo, tope, atribución, control de publicación e informe `local` en `automation/acquisition/` con pruebas sintéticas; nada conectado | La campaña se opera según SPEC-013; agregar `Fecha Pago` a la hoja |
| [007 — Recontacto a prospectos activos](007-prospect-reactivation.md) | Etapa 1 activa: subida el 2026-10-09 y ejecutada por Francisco el 2026-10-11 (10 borradores en la pestaña `Recontacto`); etapa 2 sin implementar | Segundo mensaje desde el 2026-10-15; la pestaña se actualiza sola al abrir la hoja |
| [008 — Respuesta de respaldo en WhatsApp](008-whatsapp-fallback-reply.md) | `borrador` (2026-10-09); textos RS-01 a RS-08 y plazo de 30 minutos aprobados por Francisco ese día; nada implementado | Toto revisa RS-07 y el proveedor del modelo. La [base de hechos](008-facts.md) quedó aprobada el 2026-10-09 |
| [009 — Prospectos y estado desde WhatsApp](009-whatsapp-lead-registry.md) | Etapa 1 activa desde el 2026-10-11: notas con fecha en `Estado`, y `Seguimiento` e `Ingresó?` al desistir, desde la pestaña `Recontacto`; la lista cerrada de estados no calza con el uso real de `Estado`; alta de prospectos y escritura desde WhatsApp en `borrador` | Decidir qué pasa con la lista de estados y probar el alta de filas en la pestaña de Forms |
| [010 — Blog y redes](010-blog-and-social.md) | `borrador` (2026-10-09); nada implementado | Inventario de cuentas y contraseña de aplicación del WordPress |
| [011 — Posicionamiento y sitio](011-seo-and-site.md) | `borrador` (2026-10-09); nada implementado | Acceso al WordPress y paquete de medición |
| [012 — Informe para Don Humberto](012-management-report.md) | `borrador` (2026-10-09); formato `local` en `automation/acquisition/report.cjs` | `Fecha Pago`, `getNrcMonthlyCounts` e informe de septiembre |
| [013 — Operación de Google Ads](013-google-ads-operation.md) | Campaña "Autovalentes zona oriente - Búsqueda" activa desde el 2026-10-09; el 2026-10-13 quedó con límite de puja, 17 palabras, 22 negativas, anuncio de 12 títulos, vínculos a sitio y conversión "Contacto" medida. Fuente única de su configuración | Primera revisión semanal el 2026-10-19; bajar el presupuesto diario el 2026-11-01 |
| [014 — Del formulario a la visita](014-form-to-visit.md) | Etapa 1 subida el 2026-10-09 (borrador de PC-01 desde el activador), activa desde el 2026-10-11 al crearse la pestaña `Recontacto`; flujo y textos aprobados; etapa 2 sin implementar | Comprobar el borrador de PC-01 con el próximo formulario real |
| [006 — Gmail](006-gmail-triage.md) | Alcance definido el 2026-10-09 (solo buzón NRC, leer y avisar); código en `automation/gmail/` con pruebas sintéticas, subido al proyecto `NRC Gmail Triage`; activador instalado por Francisco el 2026-10-09 | Enviar el correo de prueba, confirmar que el aviso llega y ajustar las reglas con las primeras semanas |

## Flujo SDD

1. Registrar problema, personas afectadas, objetivo y límites en la especificación correspondiente.
2. Aclarar las decisiones abiertas y marcar las aceptadas en `MEMORY.md`.
3. Escribir plan técnico, permisos, amenazas/privacidad, tareas y criterios verificables antes de código.
4. Probar primero con datos sintéticos en local. La primera prueba real puede ser en una copia o en el sistema vivo, supervisada por Francisco, con datos ficticios y con la sección "Cómo volver atrás" de la especificación ya escrita.
5. Revisar criterios, publicar estado real (`local`, `test`, `deployed`) y registrar incidencias/decisiones.

Este repositorio aún no tiene instalación de Spec Kit ni configuración de agentes, Skills o MCP; siguen previstos para el trabajo interno (ver "Modelo de agentes" en la constitución). El flujo de arriba es documental; no ejecutar comandos `/speckit.*` ni suponer conectores instalados.
