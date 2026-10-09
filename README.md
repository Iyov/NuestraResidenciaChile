# Nuestra Residencia Chile

Proyecto para apoyar la captación y seguimiento de prospectos de Nuestra Residencia Chile (NRC), la web pública y el marketing digital. Este repositorio combina material de referencia con una primera automatización en Google Apps Script; **no contiene el código fuente del WordPress activo ni despliega integraciones a Google o Meta automáticamente**.

## Estado actual

- **ID de prospecto:** código en [`automation/apps-script/AssignLeadId.gs`](automation/apps-script/AssignLeadId.gs), subido el 2026-10-08 al proyecto Apps Script vinculado a la hoja real. Asigna el siguiente ID al recibir una respuesta válida; el activador se instaló ese día con la cuenta NRC y se verificó con un envío de prueba (ID 22). Está activo.
- **Atención por WhatsApp:** lógica y pruebas sintéticas en [`automation/whatsapp/`](automation/whatsapp/README.md). Sin número conectado, sin Worker desplegado y sin mensajes enviados. Su acceso a la hoja (`automation/apps-script/WhatsAppSheetAdapter.gs`) se subió al proyecto de Apps Script el 2026-10-08 y está inactivo: falta el token y publicar la aplicación web.
- **Visitas y permisos del formulario:** lógica local con pruebas sintéticas en `automation/visits/` y `automation/consent/`; ningún flujo las usa todavía. El aviso y la política de privacidad son borradores sin aprobar.
- **Captación e informes:** embudo mensual, tope de gasto, atribución, control de publicación e informe para dirección como lógica local con pruebas sintéticas en `automation/acquisition/`; ningún flujo la usa. La línea base y la auditoría del sitio están en [`specs/005-baseline-2026-10.md`](specs/005-baseline-2026-10.md).
- **Google Ads, SEO, blog/redes y Gmail:** requisitos y especificaciones; no asumir que están implementados.
- **Web activa:** [nuestraresidenciachile.cl](https://nuestraresidenciachile.cl/), WordPress externo. Los archivos de `Backup/` son respaldos, no código de producción.

## Documentación del proyecto

- [`AGENTS.md`](AGENTS.md): instrucciones breves para agentes que trabajen en este repositorio.
- [`MEMORY.md`](MEMORY.md): contexto, decisiones confirmadas, estado actual y pendientes.
- [`specs/README.md`](specs/README.md): índice de especificaciones, estado y flujo SDD.
- [`specs/constitution.md`](specs/constitution.md): principios y controles comunes del proyecto.
- [`specs/`](specs/): especificaciones funcionales, criterios de aceptación, dependencias y decisiones abiertas por función.
- [`automation/apps-script/README.md`](automation/apps-script/README.md): instalación manual, supuestos y prueba de la asignación de IDs.

## Verificación local

Requiere Node.js; desde la raíz:

```sh
node --test automation/apps-script/AssignLeadId.test.cjs
node --test automation/whatsapp/frontdesk.test.cjs automation/whatsapp/ycloud.test.cjs automation/whatsapp/service.test.cjs
node --test automation/apps-script/WhatsAppSheetAdapter.test.cjs
node --test automation/visits/visits.test.cjs
node --test automation/consent/consent.test.cjs
node --test automation/acquisition/acquisition.test.cjs
```

No existe flujo local para compilar o desplegar el WordPress, instalar activadores de Google ni conectar WhatsApp.
