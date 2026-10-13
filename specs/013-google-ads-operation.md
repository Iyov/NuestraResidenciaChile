# SPEC-013 — Operación de Google Ads y publicidad pagada

**Estado:** `borrador` (2026-10-09). La campaña "Autovalentes zona oriente - Búsqueda" está activa desde ese día; esta especificación define cómo se opera. Cubre R5 y parte de R1 de [requirements.md](requirements.md). La configuración de la campaña y el tope están en [SPEC-005](005-acquisition-content-and-reporting.md).

## Problema y resultado

La campaña apunta a autovalentes en la zona oriente, pero partió sin una conversión medida y sin nadie que la revise.

Resultado: la publicidad se revisa cada semana con una rutina fija, mide consultas, se mantiene bajo el tope y cada cambio que compromete gasto lo confirma Francisco.

## Puesta a punto (una vez)

1. Importar `contact_link_click` desde Analytics como conversión, y los eventos de WhatsApp y teléfono cuando existan (SPEC-011, P1).
2. Corregir o eliminar los dos objetivos con error ("Enviar formulario de clientes potenciales" y "Contacto").
3. Agregar recursos al anuncio: enlaces de sitio, llamada y ubicación (esta última necesita el Perfil de Negocio de SPEC-011).
4. Revisar la promoción de anunciante nuevo (gastar USD 350 para recibir USD 350, vence el 2026-10-25). Con el tope de $80.000 al mes no se alcanza: se informa a Don Humberto y decide él.
5. Confirmar la zona y las negativas contra lo publicado.

## Rutina semanal

Cada lunes, sobre los 7 días anteriores:

| Paso | Qué se mira | Acción |
|---|---|---|
| 1 | Gasto de la semana y del mes frente al tope de $80.000 | Si la proyección del mes supera el tope, bajar el presupuesto diario |
| 2 | Términos de búsqueda reales | Agregar como negativas los que no son de autovalentes (cuidados, empleo, precios bajos, otras comunas lejanas) |
| 3 | Clics, costo por clic y conversiones por palabra | Pausar la palabra que lleve 30 clics o más sin ninguna conversión |
| 4 | Anuncios | Reemplazar el título o la descripción con peor rendimiento, usando solo hechos aprobados |
| 5 | Consultas de la semana en la hoja | Comparar con las conversiones medidas |

El resultado es una nota de cinco líneas para Francisco: gasto, clics, conversiones, cambios hechos y cambios propuestos.

## Requisitos

- **REQ-001:** el gasto mensual cobrado no supera $80.000. El presupuesto diario se fija para que Google no pueda pasarlo.
- **REQ-002:** agregar negativas y pausar palabras o anuncios no aumenta el gasto y se puede hacer en la rutina. Subir presupuesto, crear campañas, agregar palabras, cambiar la zona o la estrategia de puja requiere la confirmación de Francisco.
- **REQ-003:** el clic de publicar y la confirmación de identidad que pide Google los hace Francisco.
- **REQ-004:** los textos de los anuncios usan solo hechos aprobados. Sin afirmaciones de salud, sin precios y sin disponibilidad.
- **REQ-005:** las palabras apuntan a personas autovalentes en la zona oriente; "casa de reposo", "cuidados" y "enfermería" se mantienen como negativas.
- **REQ-006:** no se envían datos personales a Google Ads. Las conversiones mejoradas y la importación de datos de la hoja siguen apagadas hasta que Toto las apruebe (SPEC-004).
- **REQ-007:** las opciones automáticas de Google (IA Max, personalización de texto, expansión de la URL final, socios de búsqueda, Display) siguen desactivadas.
- **REQ-008:** cada cambio queda anotado con fecha y motivo en `specs/013-ads-log.md`.
- **REQ-009:** publicidad en Meta u otro medio solo con acuerdo de Don Humberto, dentro del mismo tope, y con su gasto informado aparte.

## Criterios de aceptación

- **AC-001:** Google Ads muestra conversiones desde el evento de contacto.
- **AC-002:** hay una nota semanal por cada semana con la campaña activa.
- **AC-003:** el costo neto de cada mes es menor o igual a $80.000.
- **AC-004:** ningún cambio que aumente gasto figura en el registro sin la confirmación de Francisco.
- **AC-005:** el informe mensual (SPEC-012) trae gasto, clics, costo por clic, conversiones y costo por consulta.
- **AC-006:** a las cuatro semanas, ningún término de búsqueda con más de 5 clics corresponde a cuidados, empleo o precios bajos.

## Cómo volver atrás

- Pausar la campaña desde Google Ads: el gasto se detiene de inmediato.
- Un cambio puntual: el historial de cambios de la cuenta permite deshacerlo.
- El registro de cambios dice qué se tocó y cuándo.

## Tareas

1. Puesta a punto, pasos 1 a 5.
2. Primera revisión semanal el lunes 2026-10-19, con la primera semana completa de datos.
3. Informar a Don Humberto la promoción antes del 2026-10-25.
4. A las cuatro semanas: decidir con datos si se mantiene "Maximizar clics" o se pasa a una puja por conversiones.

## Decisiones abiertas

- Si se sube el tope para aprovechar la promoción.
- Si parte del presupuesto va a Meta, que es lo que nombra el contrato.
