# Nuestra Residencia Chile

- Objetivo: apoyar `https://nuestraresidenciachile.cl/` y automatizar captación, seguimiento, informes y marketing digital; las funciones pendientes siguen siendo metas, no asumir que están desplegadas.
- Antes de cambiar una integración, revisar `README.md`, `docs/PROJECT_MEMORY.md`, `specs/README.md` y la especificación pertinente; sus estados distinguen lo local, lo pendiente y lo desplegado.
- La web activa es WordPress externa. `Backup/` contiene respaldos `.rar`; no tratarlos como código activo ni sobrescribirlos.
- `automation/apps-script/AssignLeadId.gs` contiene el primer flujo de automatización: activador instalable de Google Sheets para asignar IDs. Está desplegado y activo en la hoja viva desde el 2026-10-08 (proyecto `NRC Auto Lead ID`, cuenta NRC); los cambios se suben con `clasp push`; ver `automation/apps-script/README.md`.
- Verificación local disponible: `node --test automation/apps-script/AssignLeadId.test.cjs` (Node.js). No hay flujo local de build ni despliegue del sitio WordPress.
- No leer credenciales ni versionar exportaciones de datos; nunca incluir datos identificables en logs o prompts.
