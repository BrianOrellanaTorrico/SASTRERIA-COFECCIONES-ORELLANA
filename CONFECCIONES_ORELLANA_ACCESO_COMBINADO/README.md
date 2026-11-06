# CONFECCIONES ORELLANA

Sitio web estático para catálogo, personalización de prendas, solicitudes de arreglo y contacto con el taller.

## Publicación en Netlify

1. En Netlify, selecciona **Add new site → Import an existing project**.
2. Conecta GitHub y elige `BrianOrellanaTorrico/SASTRERIA-COFECCIONES-ORELLANA`.
3. Selecciona la rama `main`.
4. Conserva la configuración de `netlify.toml`: directorio base `CONFECCIONES_ORELLANA_ACCESO_COMBINADO`, comando `npm run build` y directorio publicado `dist`.
5. Inicia el despliegue. Netlify generará una dirección pública terminada en `.netlify.app`.

No se necesitan claves, variables de entorno, cuentas de base de datos ni servicios externos para compilar y publicar la página.

## Funcionamiento sin base de datos

- El catálogo inicial está incluido en `index.html`.
- Los pedidos y las solicitudes de arreglo abren WhatsApp para que el cliente confirme manualmente el envío al taller.
- Algunos datos y ajustes se conservan en el almacenamiento del navegador (`localStorage`). No se sincronizan entre dispositivos ni se envían automáticamente a Netlify.
- Las imágenes cargadas desde el panel local se guardan en el navegador y no se publican para otros visitantes.
- El mapa, los teléfonos y TikTok se muestran mediante enlaces externos.

## Limitaciones importantes

Netlify aloja los archivos del sitio, pero no recibe ni almacena pedidos por sí solo. El cliente debe confirmar el envío del pedido o solicitud en WhatsApp. El panel administrativo local no ofrece autenticación segura ni sincronización multiusuario; no debe utilizarse para almacenar información sensible ni como sistema de gestión compartido.

## Estructura

- `index.html`: página pública, catálogo, pedidos y panel local.
- `admin.html`: acceso informativo que devuelve a la página principal.
- `assets/css/`: estilos.
- `assets/js/app.js`: interacciones, almacenamiento local y envío mediante WhatsApp.
- `scripts/build.mjs`: prepara los archivos estáticos para Netlify.
- `netlify.toml`: configuración del despliegue.
