# SPEC-003 — Coordinación y confirmación de visitas

**Estado:** reglas funcionales acordadas; integración WhatsApp/calendario no implementada.

## Reglas no negociables

- Zona horaria: `America/Santiago`.
- Visitas solo lunes a viernes, en ventanas 10:00–11:30 o 14:00–16:00.
- Nunca sábado, domingo ni festivo chileno. La disponibilidad de Nico/Frank no autoriza una excepción.
- Fuente de festivos, duración de visita y si las ventanas definen hora de inicio o toda la duración quedan pendientes. Ante calendario de festivos no verificable, no confirmar.

## Flujo

1. Francisco recibe del prospecto una preferencia de fecha/hora y activa una solicitud de disponibilidad.
2. Validar día, hora y festivo **antes** de contactar a los anfitriones. Si es inválido, ofrecer opciones válidas; no pedir excepción.
3. Consultar a Nico y Frank por WhatsApp, asociando la solicitud a un ID de visita y al prospecto existente. Las consultas deben ser individuales o usar una función grupal solo si la cuenta elegida cumple los requisitos oficiales.
4. El primer “sí” válido dentro del horario permitido queda como anfitrión asignado. Si las respuestas tienen orden ambiguo, dejar pendiente para Francisco; nunca asignar dos anfitriones.
5. Si ambos dicen que no o no responden dentro del plazo, no confirmar; pedir a Francisco que proponga otra fecha.
6. Francisco envía confirmación final al prospecto con fecha/hora, dirección pública de NRC (Camino Las Flores 10961, Las Condes) y disponibilidad para resolver dudas.
7. Registrar estado de visita y anfitrión en la fila del prospecto; no almacenar la conversación completa.

## Estados propuestos

`pendiente de disponibilidad` → `anfitrión asignado` → `confirmada por Francisco` → `realizada`, `cancelada` o `reagendar`.

## Criterios de aceptación

- **AC-001:** no se crea ni envía solicitud a Nico/Frank para fin de semana, festivo o fuera de las dos ventanas.
- **AC-002:** una confirmación “sí” asigna exactamente un anfitrión; la primera respuesta aceptable gana.
- **AC-003:** respuestas simultáneas/ambiguas dejan la solicitud pendiente para Francisco.
- **AC-004:** no se informa al prospecto de una visita antes de que un anfitrión acepte y Francisco confirme.
- **AC-005:** la confirmación contiene la fecha, hora y dirección correctas y se vincula al ID existente.
- **AC-006:** horarios fuera de rango reciben alternativa válida; no hay override por respuesta del anfitrión.
- **AC-007:** no se asigna ni comunica visita a un prospecto rojo salvo que haya iniciado una nueva solicitud; ello no reactiva automáticamente el seguimiento promocional.

## Pendientes

- Duración/intervalo entre visitas, tiempo de espera a las respuestas de anfitriones y formato de aceptación (texto o botones).
- Elegir fuente de festivos chilenos y definir comportamiento de días puente/cierres excepcionales.
- Confirmar si la automatización podrá enviar el primer WhatsApp interno o solo preparar el mensaje para Francisco.
- Revisar elegibilidad de WhatsApp Cloud API. La Groups API tiene requisitos distintos y no se debe asumir disponible para un número que permanece solo en WhatsApp Business App.
