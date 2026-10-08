# SPEC-001 — ID automático de prospecto

**Estado:** código local implementado y pruebas sintéticas aprobadas; pendiente instalar y validar el activador en Google. No desplegado.

## Problema y resultado

Cada envío real del Google Form crea una fila en la hoja `Respuestas de formulario 1`; Francisco hoy asigna `#` manualmente. Se debe asignar un ID determinista sin alterar las respuestas ni los estados.

## Requisitos

- **REQ-001:** procesar únicamente la fila entregada por un activador instalable de Spreadsheet `On form submit`.
- **REQ-002:** conservar IDs existentes 1–21; el siguiente prospecto no duplicado recibe 22, luego `max(#)+1`.
- **REQ-003:** ignorar la fila en blanco y envíos sin marca temporal; si un envío tiene marca temporal pero carece de teléfono o nombre del adulto mayor, fallar sin asignar y dejar error genérico para revisión.
- **REQ-004:** no sobrescribir un `#` existente; repetición del mismo evento es idempotente.
- **REQ-005:** conservar el ID si coincide el nombre normalizado del adulto mayor y teléfono normalizado; si la misma identidad tiene varios IDs distintos, detener para reconciliación manual.
- **REQ-006:** serializar ejecución concurrente mediante `LockService`.
- **REQ-007:** escribir solo en la celda `#`. No modificar color, estado, comentarios, datos de respuesta, comisión ni valores de Ads.
- **REQ-008:** no registrar valores, nombre, teléfono o email en logs.
- **REQ-009:** trigger y hoja quedan bajo una cuenta NRC controlada. La instalación y autorización son manuales.

## Criterios de aceptación

- **AC-001:** con IDs 1–21 y un envío válido distinto, la fila recibe 22.
- **AC-002:** dos prospectos distintos válidos reciben IDs consecutivos distintos, incluso si sus eventos se ejecutan muy juntos.
- **AC-003:** fila vacía/espaciadora no recibe ID ni incrementa secuencia.
- **AC-004:** repetición del activador para la misma fila no cambia el ID.
- **AC-005:** una repetición de la misma persona (mismo nombre normalizado del adulto mayor y mismo teléfono normalizado) reutiliza el ID existente.
- **AC-006:** si una identidad coincide con dos IDs previos diferentes, no se elige automáticamente; la celda queda intacta y la ejecución falla con mensaje sin datos personales.
- **AC-007:** un ID existente no se sobrescribe, incluso si no sigue la secuencia actual.
- **AC-008:** activador sobre otra pestaña no escribe.
- **AC-009:** el test local `node --test automation/apps-script/AssignLeadId.test.cjs` pasa; la copia de prueba en Google se valida antes del activador real.

## Implementación actual

- Fuente: `automation/apps-script/AssignLeadId.gs`; instalación manual y pruebas: `automation/apps-script/README.md`.
- La deduplicación es intencionalmente conservadora: nombre del adulto mayor + teléfono. Cambios de número/contacto requieren revisión; el código no fusiona por nombre solamente.
- No existe conexión de despliegue desde este repositorio a la hoja. No afirmar que los IDs automáticos estén activos hasta verificar una respuesta real bajo control de NRC.

## Pendientes de operación

- Confirmar que la pestaña viva y encabezados coinciden con la exportación del 2026-10-08.
- Dar permiso Editor a la cuenta autenticada por `clasp` o autenticarlo con la cuenta propietaria de la hoja. El intento actual fue rechazado por Google antes de instalar.
- Ejecutar en copia de prueba bajo la cuenta propietaria NRC; revisar activador y ejecuciones.
- Instalar en producción y observar el primer envío válido antes de declarar el flujo activo.
