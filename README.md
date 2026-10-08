# Nuestra Residencia Chile

Proyecto para apoyar la captación y seguimiento de prospectos de Nuestra Residencia Chile (NRC), la web pública y el marketing digital. Este repositorio combina material de referencia con una primera automatización en Google Apps Script; **no contiene el código fuente del WordPress activo ni despliega integraciones a Google o Meta automáticamente**.

## Estado actual

- **ID de prospecto:** código en [`automation/apps-script/AssignLeadId.gs`](automation/apps-script/AssignLeadId.gs), subido el 2026-10-08 al proyecto Apps Script vinculado a la hoja real. Asigna el siguiente ID al recibir una respuesta válida; el activador se instaló ese día con la cuenta NRC y se verificó con un envío de prueba (ID 22). Está activo.
- **WhatsApp, informes, Google Ads, SEO, blog/redes y Gmail:** requisitos y especificaciones; no asumir que están implementados.
- **Web activa:** [nuestraresidenciachile.cl](https://nuestraresidenciachile.cl/), WordPress externo. Los archivos de `Backup/` son respaldos, no código de producción.

## Documentación del proyecto

- [`AGENTS.md`](AGENTS.md): instrucciones breves para agentes que trabajen en este repositorio.
- [`docs/PROJECT_MEMORY.md`](docs/PROJECT_MEMORY.md): contexto, decisiones confirmadas, estado actual y pendientes.
- [`specs/README.md`](specs/README.md): índice de especificaciones, estado y flujo SDD.
- [`specs/constitution.md`](specs/constitution.md): principios y controles comunes del proyecto.
- [`specs/`](specs/): especificaciones funcionales, criterios de aceptación, dependencias y decisiones abiertas por función.
- [`automation/apps-script/README.md`](automation/apps-script/README.md): instalación manual, supuestos y prueba de la asignación de IDs.

## Verificación local

Requiere Node.js; desde la raíz:

```sh
node --test automation/apps-script/AssignLeadId.test.cjs
```

No existe flujo local para compilar o desplegar el WordPress, instalar activadores de Google ni conectar WhatsApp.
