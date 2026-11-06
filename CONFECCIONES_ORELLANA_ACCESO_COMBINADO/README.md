# CONFECCIONES ORELLANA — versión de integración y pruebas

## Actualización de interfaz — 6 de noviembre de 2026

- Se conserva el flujo separado de solicitudes de arreglos.
- La selección de arreglos ahora se presenta como tarjetas táctiles generadas desde el catálogo de Supabase.
- El panel usa una superficie textil blanca y plateada, texto negro y detalles/base dorados; las tarjetas se elevan sutilmente al pasar el cursor, enfocar o tocar.
- Al elegir una tarjeta, se actualiza el selector interno y se despliega el formulario independiente. Los arreglos siguen excluidos del personalizador y del carrito de confección.

Sitio web estático de confección personalizada y arreglos. La raíz de esta carpeta contiene `index.html`, `admin.html`, `assets/` y `supabase/`; puede copiarse directamente a la raíz del repositorio GitHub.

## Qué queda conectado

- **Página de clientes (`index.html`):** catálogo de confección, personalizador, carrito, selección de telas compatibles, formulario de pedidos y QR al lado del resumen.
- **Panel de administración (`admin.html`):** inicio de sesión con Supabase Auth; gestión de prendas, arreglos, precios de costura, telas, precio por metro, compatibilidad entre cada prenda y sus telas, fotografías de catálogo y QR oficial.
- **Catálogo remoto:** los artículos, arreglos, precios, telas compatibles e imágenes activos en Supabase aparecen en la página pública. Los cambios se reflejan al recargar la página.
- **Pedidos:** los pedidos de confección y las solicitudes independientes de arreglo se registran en `public.orders`. Los administradores autenticados pueden consultarlas, cotizarlas y actualizar el estado; las solicitudes de arreglo se identifican por separado e indican que el cliente debe acudir a la tienda.
- **QR oficial:** se almacena en el bucket `qr-pagos` y su ruta se registra en `public.site_settings`.
- **Ubicación:** Admin puede publicar/reemplazar una fotografía de la tienda; se almacena en el bucket `catalogo` y se muestra junto al mapa. El enlace compartido de Google Maps se conserva y el mapa integrado solicita un acercamiento mayor.
- **Avisos:** el panel escucha nuevos pedidos mediante Supabase Realtime; puede mostrar un aviso dentro del panel y, con permiso del navegador, una notificación de escritorio.
- **Interfaz:** textos y controles ampliados; el personalizador utiliza una superficie clara para mejorar el contraste. El selector de arreglos presenta tarjetas independientes con acabado textil blanco/plata, detalles dorados y elevación al pasar el cursor o tocar; al elegir una prenda se despliega el formulario exclusivo de arreglo, sin abrir el personalizador ni el carrito de confección.

## 1. Preparar Supabase

1. Crea un proyecto en Supabase.
2. Si es un proyecto Supabase completamente nuevo, abre **SQL Editor** y ejecuta `supabase/schema.sql`.
3. Si ya creaste la primera versión V1 de ocho tablas (`profiles`, `categories`, `fabrics`, `products`, `product_fabrics`, `pricing_rules`, `orders` y `order_items`), **no ejecutes `schema.sql`**: ejecuta únicamente `supabase/COMPATIBILITY_FROM_V1.sql`. Esta migración agrega las columnas y tablas que necesita esta versión y conserva los registros existentes.
4. En **Authentication → Users**, crea la cuenta del propietario/administrador con correo y contraseña.
5. Copia el UUID de esa cuenta y ejecuta una inserción como la siguiente, reemplazando los valores de ejemplo:

```sql
insert into public.profiles (id, display_name, role)
values ('UUID-DE-LA-CUENTA-AUTH', 'Propietario', 'owner')
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;
```

El UUID debe ser exactamente el de la cuenta creada en Supabase Auth. Para una cuenta administrativa adicional usa `role = 'admin'`. No concedas esos roles a clientes.

Si tu proyecto ya tiene datos reales, realiza una copia de seguridad antes de aplicar cualquier migración. No ejecutes dos esquemas iniciales distintos sobre la misma base.

## 2. Configurar la conexión

La página usa la URL del proyecto y la **clave pública** `anon`/publishable de Supabase. Nunca utilices `service_role`, `sb_secret` ni una clave privada dentro del navegador.

### Publicación con Netlify

Este proyecto incluye `netlify.toml` y un pequeño script de compilación que genera `assets/js/config.js` a partir de variables de entorno.

1. Sube el contenido de esta carpeta a la **raíz** del repositorio GitHub: `index.html`, `admin.html`, `assets/`, `supabase/`, `package.json`, `scripts/` y `netlify.toml`.
2. En Netlify, importa ese repositorio.
3. En **Site configuration → Environment variables**, añade:
   - `SUPABASE_URL` = URL HTTPS del proyecto Supabase.
   - `SUPABASE_ANON_KEY` = clave pública anon/publishable del proyecto.
4. Usa estos parámetros de publicación:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: déjala vacía si los archivos se copiaron a la raíz del repositorio.
5. Ejecuta un nuevo deploy después de guardar las variables.

El script genera `assets/js/config.js` y prepara `dist/` durante el deploy. Netlify publica únicamente `dist/`, así que el SQL, la documentación y los scripts de mantenimiento permanecen en GitHub pero no quedan expuestos en el sitio público. El archivo de configuración está excluido de Git por `.gitignore`; se crea en cada compilación a partir de las variables configuradas.

### Prueba local en Windows (PowerShell)

Instala Node.js 20 o posterior. Desde la carpeta raíz del proyecto ejecuta:

```powershell
$env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_ANON_KEY="TU_CLAVE_PUBLICA_ANON"
npm run build
```

Después sirve la carpeta `dist` con un servidor local (por ejemplo, la extensión Live Server de VS Code). No abras directamente `index.html` con `file://`, porque las conexiones y el almacenamiento del navegador pueden comportarse de forma distinta.

También puedes copiar `assets/js/config.example.js` como `assets/js/config.js` y completar esos dos valores para una prueba local. No subas `config.js` a GitHub.

## 3. Cargar el catálogo de prueba

Entra a `admin.html` con la cuenta creada en Supabase. En **Prendas y arreglos** registra cada prenda y selecciona su categoría:

- `Confección femenina`
- `Confección masculina`
- `Arreglo de prendas`

Cada registro tiene nombre, descripción, precio de confección/arreglo, estado de publicación e imagen opcional. Para administrar telas, crea cada material con su precio por metro y después utiliza **Tipos de tela permitidos por prenda** para asignar una o varias telas a cada artículo. Solo las combinaciones activas y asignadas aparecerán en el selector del cliente.

El precio de costura/arreglo y el precio de la tela por metro se muestran por separado. El total del cliente es referencial; el costo final de tela depende de los metros utilizados y debe confirmarse en la cotización del taller.

Para el QR, abre **QR y pagos**, carga una imagen PNG, JPG o WEBP de hasta 3 MB y publícala. Comprueba primero que el código corresponda a la cuenta bancaria correcta y que se pueda escanear.

## 4. Comprobaciones recomendadas

1. Entrar a `admin.html` con el perfil `owner`.
2. Crear una prenda de prueba, una prenda de categoría `arreglos` y dos telas.
3. Asignar diferentes telas a cada prenda; comprobar que no se mezclen las listas.
4. Cambiar precio, ocultar y volver a publicar un registro.
5. Cargar el QR y la fotografía de ubicación; abrir `index.html` en otra ventana/dispositivo para confirmar que aparecen desde Supabase.
6. Seleccionar la opción de medidas desconocidas y verificar que el QR se oculte y se muestre el contacto.
7. Enviar un pedido con un nombre y teléfono de prueba; revisar su aparición en el panel y actualizar su cotización/estado.
8. Enviar una solicitud desde **Arreglo de prendas**; confirmar que no abre el personalizador de confección, aparece como “SOLICITUD DE ARREGLO” en Admin y genera el aviso en tiempo real.
9. Repetir pruebas en móvil y escritorio.

## Límites que deben conocerse antes del uso real

- Las políticas `orders_public_test_insert` y `orders_authenticated_test_insert` permiten que visitantes sin cuenta o una sesión autenticada envíen pedidos de prueba con `customer_id` nulo; **no permiten leer pedidos públicamente**. Antes de abrir el sitio al público, conviene reemplazar este flujo por autenticación de clientes, validación del lado del servidor y controles antispam. El panel recibe avisos en tiempo real solo mientras permanece abierto; las notificaciones de escritorio requieren permiso manual del navegador.
- La verificación de CI de la interfaz actual es una comprobación del formulario en el navegador, no una verificación de identidad oficial. El CI no se envía a Supabase.
- La imagen de referencia seleccionada en el formulario se previsualiza y queda en el registro local del navegador; esta versión todavía no la sube al almacenamiento remoto del pedido.
- Los permisos por módulo para cuentas delegadas todavía no se aplican en RLS. Por ahora los perfiles `owner` y `admin` pueden administrar todas las secciones del panel nuevo. La gestión segura de delegados debe ampliarse antes de delegar accesos reales.
- Los pedidos creados antes de la migración y guardados en `localStorage` no se copian automáticamente a Supabase.
- Las sesiones y cuentas de cliente del flujo anterior siguen almacenadas en el navegador; no son cuentas de Supabase Auth ni se sincronizan entre dispositivos. El acceso administrativo de esta versión se realiza desde `admin.html` mediante Supabase Auth.
- El QR oficial y las imágenes del catálogo se almacenan en Supabase Storage; GitHub guarda el código y Netlify publica la web.

## Archivos principales

- `index.html`: página de clientes.
- `admin.html`: panel de administración conectado a Supabase.
- `assets/css/style.css`: estilos de clientes.
- `assets/css/admin.css`: estilos administrativos.
- `assets/js/app.js`: catálogo, personalización, carrito y envío de pedidos.
- `assets/js/admin.js`: operaciones de administración.
- `assets/js/services/catalog-service.js`: consulta del catálogo, gestión del QR y fotografía de ubicación.
- `assets/js/core/supabase-client.js`: inicialización de Supabase.
- `scripts/generate-config.mjs`: genera la configuración pública desde variables de entorno.
- `supabase/schema.sql`: tablas, políticas RLS y buckets.
- `supabase/UPGRADE_PHASE_TEST.sql`: actualización de una fase de pruebas anterior.
- `supabase/COMPATIBILITY_FROM_V1.sql`: adaptación no destructiva para la base V1 de ocho tablas.


## Solicitudes de arreglos

Los arreglos se envían mediante el bloque independiente **Arreglo de prendas**. Al elegir una prenda, aparece un formulario que solicita nombre, teléfono y descripción del trabajo. No abre el configurador de confección, no añade servicios al carrito ni solicita adelanto. El cliente recibe un recordatorio para acercarse a la tienda con la prenda y dispone de un botón hacia el contacto de los propietarios.

Cada solicitud se registra en `public.orders` con `order_details.service_type = "arreglo"`. El panel `admin.html` las identifica como **SOLICITUD DE ARREGLO** y recibe un aviso Realtime mientras una cuenta administrativa autorizada mantenga el panel abierto y conectado. Para avisos del sistema operativo, el administrador debe activar el permiso desde el botón **ACTIVAR AVISOS**.

## Ubicación y estilo del panel de telas

La ubicación oficial conserva el enlace de Google Maps facilitado por el taller y el mapa integrado usa un acercamiento mayor. Desde el panel administrativo, una cuenta autorizada puede cargar, reemplazar o retirar la fotografía de referencia de la tienda.

El módulo de telas utiliza una superficie blanco/plata con tipografía oscura y fichas doradas que se elevan ligeramente al pasar el cursor o al enfocar/interactuar en dispositivos táctiles.

## Modelo 3D

Se conserva el modelo 3D externo y el SVG de respaldo que ya estaban integrados. Se revisó una alternativa de un personaje de pie con traje azul marino, pero el archivo GLB supera los 20 MB y no se pudo validar su carga embebida desde el alojamiento externo en este entorno; se mantiene el modelo anterior según la condición de respaldo solicitada.