# SPEC-001 — ID automático de prospecto

**Estado:** código subido el 2026-10-08 al proyecto Apps Script `NRC Auto Lead ID`, vinculado a la hoja viva bajo la cuenta NRC; pruebas sintéticas locales aprobadas. `installNrcLeadIdTrigger` se ejecutó sin errores ese mismo día con la cuenta NRC. **Flujo activo:** Francisco verificó ese día un envío de prueba con datos ficticios por el formulario público, que recibió el ID 22.

## Problema y resultado

Cada envío real del Google Form crea una fila en la hoja `Respuestas de formulario 1`; Francisco hoy asigna `#` manualmente. Se debe asignar un ID determinista sin alterar las respuestas ni los estados.

## Requisitos

- **REQ-001:** procesar únicamente la fila entregada por un activador instalable de Spreadsheet `On form submit`.
- **REQ-002:** conservar los IDs existentes; cada prospecto no duplicado recibe `max(#)+1`. Al desplegar había IDs 1–21 y el primero asignado por el script fue el 22.
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
- **AC-009:** el test local `node --test automation/apps-script/AssignLeadId.test.cjs` pasa. La validación en una copia de prueba de Google se reemplazó por un envío de prueba en la hoja viva (ver Pendientes de operación).

## Implementación actual

- Fuente: `automation/apps-script/AssignLeadId.gs`; instalación manual y pruebas: `automation/apps-script/README.md`.
- La deduplicación es intencionalmente conservadora: nombre del adulto mayor + teléfono. Cambios de número/contacto requieren revisión; el código no fusiona por nombre solamente.
- `clasp` (autenticado con la cuenta NRC) vincula esta carpeta al proyecto de la hoja viva mediante `.clasp.json` local, no versionado. Para actualizar el código en Google: `clasp push` desde `automation/apps-script/`.

## Pendientes de operación

- Francisco decidió el 2026-10-08 no crear copia de prueba y desplegar directamente en la hoja viva; la validación en Google de AC-009 se reemplazó por un envío de prueba en la hoja viva, que recibió el ID 22.
- La fila de prueba ocupa el ID 22: si se elimina, el siguiente prospecto recibirá 22; si se conserva, recibirá 23.
- Solo se probó en Google el caso de prospecto nuevo; duplicados, conflictos y concurrencia están cubiertos por las pruebas locales. Revisar **Ejecuciones** si un envío queda sin ID.
