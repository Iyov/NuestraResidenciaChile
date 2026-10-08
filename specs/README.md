# Índice de especificaciones NRC

Las especificaciones son la fuente de requisitos funcionales y aceptación. Un estado de especificación **no** prueba que la integración esté desplegada.

## Estado

| Especificación | Estado actual | Próximo gate |
|---|---|---|
| [Constitución](constitution.md) | Principios vigentes | Revisar si cambian permisos o sensibilidad de datos |
| [001 — Auto-ID](001-auto-lead-id.md) | Código subido al proyecto Apps Script vinculado a la hoja viva (2026-10-08) y verificado con un envío de prueba que recibió el ID 22 | Revisar **Ejecuciones** si algún envío queda sin ID |
| [002 — Atención WhatsApp](002-whatsapp-frontdesk.md) | Reglas, [base de respuestas](002-faq-base.md) y proveedor (YCloud) definidos el 2026-10-08; lógica `local` en `automation/whatsapp/` con pruebas sintéticas; sin conexión a WhatsApp ni despliegue | Pasar el número a WhatsApp Business App, desplegar en Cloudflare en modo sombra; aprobar filas pendientes del Anexo A |
| [003 — Visitas](003-visit-coordination.md) | Reglas acordadas; validación de horarios y estados de la visita `local` en `automation/visits/` con pruebas sintéticas (2026-10-08); integración pendiente | Conectar la pregunta a los anfitriones con WhatsApp (depende de SPEC-002) |
| [004 — Privacidad del formulario](004-form-privacy-and-consent.md) | Borrador de aviso redactado (2026-10-08); pendiente de abogado, no publicado | Confirmar responsable, bases/finalidades y aviso con Toto |
| [005 — Captación y marketing](005-acquisition-content-and-reporting.md) | Alcance inicial; falta auditoría | Baseline, presupuesto mutuo, hechos aprobados y métricas |
| [006 — Gmail](006-gmail-triage.md) | Backlog de descubrimiento | Definir buzón, filtros, datos y acciones permitidas |

## Flujo SDD

1. Registrar problema, personas afectadas, objetivo y límites en la especificación correspondiente.
2. Aclarar las decisiones abiertas y marcar las aceptadas en `MEMORY.md`.
3. Escribir plan técnico, permisos, amenazas/privacidad, tareas y criterios verificables antes de código.
4. Probar primero con datos sintéticos y entorno/copia de prueba; usar pruebas de integración autorizadas antes de producción.
5. Revisar criterios, publicar estado real (`local`, `test`, `deployed`) y registrar incidencias/decisiones.

Este repositorio aún no tiene instalación de Spec Kit ni configuración OpenCode de agentes/Skills/MCP. El flujo de arriba es documental; no ejecutar comandos `/speckit.*` ni suponer conectores instalados.
