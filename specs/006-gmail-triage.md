# SPEC-006 — Lectura y clasificación de Gmail

**Estado:** idea inicial en backlog; alcance operativo y permisos todavía sin especificar. No hay integración.

## Intención conocida

El usuario desea reducir trabajo manual relacionado con la lectura de Gmail. No se ha definido qué buzón/etiquetas, categorías, período histórico, datos personales, alertas o acciones se permiten.

## Propuesta segura para discovery

- Empezar en solo lectura, sobre etiquetas o búsquedas explícitamente seleccionadas por Francisco.
- Resumir/reclasificar mensajes de NRC con referencias al hilo y mantener fuera del prompt adjuntos/documentos no necesarios.
- Preparar borradores, nunca enviar, archivar, borrar, reenviar o marcar como leído automáticamente hasta aprobar una especificación posterior.
- No procesar contenido del buzón personal completo por defecto. No ingerir credenciales ni registrar cuerpos/adjuntos completos en logs.

## Pendiente antes de especificar

Definir buzón y cuenta, etiquetas/consultas, categorías prioritarias, resumen esperado, tratamiento de adjuntos, retención, destinatarios y acciones permitidas. Resolver autorización OAuth mínima y revisión de datos/confidencialidad.
