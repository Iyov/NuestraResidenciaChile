# Constitución de NRC para agentes y automatizaciones

**Estado:** principios acordados para guiar futuras especificaciones; no autoriza por sí sola despliegues o comunicaciones.

1. **Personas primero:** ayudar a adultos mayores y familias con información clara, digna y comprobable; nunca presionar ni explotar su situación.
2. **Humanos deciden el ingreso:** la IA no determina autovalencia, elegibilidad, necesidad clínica, admisión, precio excepcional ni capacidad disponible.
3. **Datos mínimos:** consultar/escribir solo los datos necesarios para la tarea. No poner registros de prospectos, conversaciones completas, credenciales ni identificadores publicitarios en prompts, logs o fixtures.
4. **Permisos mínimos y separados:** lectura por defecto; acceso de escritura solo a campos autorizados. Enviar WhatsApp, publicar, modificar campañas o gastar requiere autorización explícita según la especificación funcional.
5. **Fuente verificable:** usar hechos aprobados por NRC. Ante falta de información, responder que se confirmará y derivar a Francisco; no inventar tarifas, disponibilidad, salud, servicios ni testimonios.
6. **Reversibilidad e idempotencia:** no sobrescribir IDs/estados de forma silenciosa; soportar reintentos sin duplicar mensajes, leads o citas; registrar eventos mínimos y reversibles.
7. **Fail closed:** ante identidad, consentimiento, estado, horario o anfitrión ambiguo, no enviar ni confirmar; dejar la operación pendiente y alertar a Francisco.
8. **Respeto de desistimientos:** rojo suprime la prospección saliente. Una solicitud entrante nueva se puede contestar, pero no reactiva automáticamente campañas/seguimientos.
9. **Aprobación humana de publicación:** artículos, redes, anuncios, cambios al sitio y avisos legales deben pasar por revisión humana antes de su publicación/despliegue.
10. **SDD antes de código:** cada capacidad externa debe tener especificación, criterios de aceptación, permisos, pruebas con datos sintéticos, plan de recuperación y estado de despliegue documentado.

## Modelo de agentes

- OpenCode es un asistente interactivo para trabajo interno; por sí solo no escucha mensajes 24/7.
- Un servicio persistente oficial de Meta/proveedor gestiona webhooks y atención WhatsApp; OpenCode Skills guían tareas recurrentes; MCP ofrece herramientas estrechas, no reemplaza la aplicación de runtime.
- No crear agentes autónomos por plataforma prematuramente. Empezar con un asistente interno y capacidades especializadas, con herramientas de escritura/mensajería deshabilitadas o con aprobación hasta validar el flujo.
- Herramientas MCP deben exponer operaciones tipadas (`buscar prospecto`, `registrar evento`, `cambiar estado permitido`), no edición arbitraria de hojas, SQL libre o envío a cualquier destinatario.
