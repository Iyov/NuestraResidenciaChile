# Avisos del buzón de NRC (SPEC-006)

`GmailTriage.gs` revisa cada 15 minutos la bandeja de entrada de la cuenta NRC y envía un aviso cuando llega un correo de una persona o un aviso urgente de una cuenta. No modifica el buzón. Reglas y categorías: [`specs/006-gmail-triage.md`](../../specs/006-gmail-triage.md).

## Estado en Google

Desde el 2026-10-09 el código está en el proyecto independiente `NRC Gmail Triage` de la cuenta NRC. Francisco lo autorizó e instaló el activador ese mismo día: **está activo** sobre el buzón vivo. `.clasp.json` es local y no se versiona; para subir cambios, `clasp push` desde esta carpeta.

`clasp create-script` reemplaza `appsscript.json` por uno genérico: si se vuelve a crear el proyecto, restaurar el del repositorio antes de `clasp push`.

## Activación

En el proyecto `NRC Gmail Triage`, con la cuenta NRC:

1. **Configuración del proyecto → Propiedades de la secuencia de comandos:** crear `NRC_GMAIL_ALERT_TO` con el correo donde deben llegar los avisos.
2. Ejecutar `previewNrcGmailTriage` y aceptar los permisos (leer Gmail, enviar correo como la cuenta, administrar activadores). El registro muestra cuántos correos de los últimos dos días caen en cada categoría; no envía nada.
3. Ejecutar `installNrcGmailTriageTrigger`. La primera revisión anota lo que ya hay sin avisar.

Prueba: enviar un correo desde otra cuenta al buzón de NRC y esperar hasta 15 minutos el aviso. Ante dudas, revisar **Ejecuciones**: cada una registra solo cantidades.

Para detenerlo: ejecutar `uninstallNrcGmailTriageTrigger`.

## Verificación local

```sh
node --test automation/gmail/GmailTriage.test.cjs
```

Las pruebas usan datos sintéticos y no acceden a Google.
