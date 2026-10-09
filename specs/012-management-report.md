# SPEC-012 — Informe de avance para Don Humberto

**Estado:** `borrador` (2026-10-09). El formato existe en `automation/acquisition/report.cjs` como lógica local; nada lo alimenta. Cubre R4 de [requirements.md](requirements.md) y la letra f) de la cláusula primera del contrato.

## Problema y resultado

Don Humberto pide informes de avance. Los de julio y agosto se armaron a mano con capturas, nombraban prospectos e incluían una imagen de la hoja. El de septiembre no se ha emitido. El código del informe existe, pero no lee ninguna fuente: alguien tiene que juntar los números.

Resultado: un informe mensual que se arma solo con cantidades, que Francisco revisa y envía, y un informe corto que se puede pedir cualquier día.

## Contenido

| Sección | Qué muestra | Fuente |
|---|---|---|
| Resumen | Consultas, visitas e ingresos del mes frente a la meta de 2 ingresos, y frente al mes anterior | Hoja |
| Embudo | Consultas → visita agendada → visita realizada → ingreso firmado → ingreso pagado, con sus tasas | Hoja |
| Seguimiento | Prospectos activos, recontactados, respuestas, sin respuesta y desistidos | Hoja y pestaña `WhatsApp` |
| WhatsApp | Conversaciones atendidas, respondidas por el asistente, derivadas y tiempo hasta la primera respuesta | Pestaña `WhatsApp` |
| Publicidad | Costo neto cobrado, clics, costo por clic, conversiones y gasto frente al tope | Google Ads |
| Sitio | Visitantes, canales, eventos de contacto, posiciones de las búsquedas objetivo | Analytics y Search Console |
| Contenido y redes | Artículos y publicaciones del mes, alcance y seguidores | Registro de SPEC-010 y cada red |
| Comisiones | Ingresos firmados, ingresos pagados y comisión devengada, en cantidades | Hoja |
| Próximo mes | Tres acciones concretas y lo que se necesita de Don Humberto | Francisco |

Una cifra sin fuente se informa como "sin dato", nunca como cero.

## Requisitos

- **REQ-001:** el informe lleva solo cantidades. Ningún nombre, teléfono, correo, RUT ni captura de la hoja. `report.cjs` ya lo rechaza.
- **REQ-002:** los números de la hoja los entrega una función de Apps Script en el proyecto de la hoja, `getNrcMonthlyCounts(mes)`, que devuelve solo conteos. El informe nunca recibe filas.
- **REQ-003:** el gasto es el "Costo neto" de Facturación de Google Ads para el mes (decisión de Francisco, 2026-10-09).
- **REQ-004:** los datos de Google Ads, Analytics, Search Console y redes se leen en la sesión de Francisco o desde sus exportaciones. Conectarlos por API es una mejora posterior.
- **REQ-005:** el informe sale como borrador. Francisco lo revisa, completa "Próximo mes" y lo envía él.
- **REQ-006:** un ingreso firmado sin pago registrado no cuenta como comisión devengada.
- **REQ-007:** el informe distingue lo que pasó en el mes de lo que pasó con las consultas del mes (regla de SPEC-005).
- **REQ-008:** un informe corto de avance (resumen, embudo y seguimiento a la fecha) se puede generar cualquier día con el mismo mecanismo.
- **REQ-009:** cada informe enviado queda guardado como PDF en una carpeta local por mes (`AAAA-MM/`), sin datos personales.

## Cadencia y entrega (propuesta)

- Mensual, dentro de los primeros cinco días hábiles del mes siguiente, que es el plazo de pago del contrato.
- Destinatario: Don Humberto. Formato: PDF de una o dos páginas, enviado por Francisco por el canal que ya usan.
- El de septiembre se emite apenas exista `getNrcMonthlyCounts`.

## Criterios de aceptación

- **AC-001:** el informe de un mes se genera sin que nadie copie números a mano desde la hoja.
- **AC-002:** si se le pasa una fila, un nombre o un teléfono, el informe no se genera.
- **AC-003:** los conteos coinciden con un recuento manual de la hoja para el mismo mes.
- **AC-004:** una etapa sin columna aparece como "sin dato".
- **AC-005:** el gasto informado coincide con Facturación de Google Ads.
- **AC-006:** el informe muestra la meta de 2 ingresos y el resultado del mes.
- **AC-007:** el informe corto se genera en cualquier fecha con los datos a ese día.
- **AC-008:** los informes de julio y agosto, que nombran prospectos, no se reenvían.

## Cómo volver atrás

No hay nada desplegado que detener: `getNrcMonthlyCounts` solo lee. Un informe con un error se corrige y se reenvía indicando qué cambió.

## Tareas

1. Agregar `Fecha Pago` a la hoja (pendiente de SPEC-005).
2. `getNrcMonthlyCounts` con pruebas sintéticas; `clasp push`; comparar con un recuento manual.
3. Plantilla del PDF a partir del Markdown de `report.cjs`.
4. Informe de septiembre.
5. Sumar las secciones de WhatsApp, seguimiento y contenido a medida que SPEC-007 a 010 produzcan registros.

## Decisiones abiertas

- Destinatarios: solo Don Humberto, o también Nicolás.
- Fecha exacta de entrega.
- Si Don Humberto quiere además un informe corto semanal.
