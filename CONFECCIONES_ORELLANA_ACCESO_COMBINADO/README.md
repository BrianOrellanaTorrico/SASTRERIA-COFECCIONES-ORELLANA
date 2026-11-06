# CONFECCIONES ORELLANA

Sitio web de sastrería, confección personalizada y arreglos.

## Estructura

```text
CONFECCIONES_ORELLANA/
├── index.html
├── admin.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── img/
│   └── js/
│       ├── app.js
│       ├── admin.js
│       ├── admin-config.example.js
│       ├── config.example.js
│       ├── core/
│       │   └── supabase-client.js
│       ├── modules/
│       └── services/
│           └── catalog-service.js
├── supabase/
│   └── schema.sql
├── .gitignore
└── README.md
```

## Responsabilidad de cada parte

- `index.html`: estructura y contenido de la página.
- `assets/css/style.css`: presentación visual.
- `assets/js/app.js`: lógica actual de la interfaz.
- `assets/js/core/`: inicialización y servicios centrales.
- `assets/js/services/`: acceso a datos y archivos remotos.
- `assets/js/modules/`: futuras funciones separadas por área.
- `assets/img/`: imágenes fijas incluidas en el repositorio.
- `supabase/schema.sql`: tablas, relaciones, políticas RLS y bucket de imágenes.

## Configuración de Supabase

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor** y ejecuta `supabase/schema.sql`.
3. En **Project Settings → API** (o **Connect**) copia la URL del proyecto y la clave pública `anon`/publishable.
4. En Netlify abre **Site configuration → Environment variables** y agrega:
   - `SUPABASE_URL`: URL del proyecto.
   - `SUPABASE_ANON_KEY`: clave pública anon/publishable.
5. En Netlify configura **Base directory** como `CONFECCIONES_ORELLANA_ACCESO_COMBINADO`. El comando de compilación es `npm run build` y el directorio de publicación es `.`.
6. Vuelve a desplegar. El proceso genera automáticamente `assets/js/config.js`; ese archivo está excluido del repositorio.

La clave pública anon/publishable está diseñada para usarse en el navegador junto con RLS. Nunca incluyas `service_role`, claves `sb_secret` ni contraseñas en archivos del frontend.

## Estado de integración

La estructura de conexión y el esquema inicial de Supabase están preparados. `OrellanaCatalogService` contiene funciones iniciales para consultar prendas y telas y cargar imágenes en el bucket `catalogo`.

**La aplicación visual todavía no está migrada por completo a Supabase.** El archivo `app.js` conserva funciones que guardan pedidos, perfiles, tarifas, telas e imágenes en `localStorage`. Para que la web trabaje completamente en línea, hay que sustituir esas operaciones por llamadas a Supabase y conectar la autenticación de Supabase Auth. Hasta completar esa migración, no usar el panel actual para gestionar datos reales de clientes.

## Perfiles y permisos

El esquema contempla los roles `owner`, `admin` y `client`. La primera cuenta propietaria debe crearse mediante Supabase Auth y su perfil debe asignarse desde el panel seguro de Supabase. No habilites que un usuario pueda cambiar su propio rol desde la página. La gestión individual de permisos delegados requiere una ampliación posterior de `profiles` y sus políticas.

## Publicación con GitHub

1. Sube el contenido de esta carpeta al repositorio, manteniendo las rutas.
2. Conecta el repositorio con Netlify.
3. Usa la raíz del repositorio como directorio de publicación; no se requiere compilación para este sitio estático.
4. Cada commit nuevo en la rama publicada puede iniciar una nueva implementación en Netlify.

GitHub guarda el código y los cambios SQL; Supabase guarda los datos y archivos; Netlify genera la configuración pública desde variables de entorno y publica el sitio.

## Imágenes

Las imágenes fijas se colocan en `assets/img/` y se referencian desde HTML mediante rutas como `assets/img/pantalon.jpg`. Las imágenes que los administradores carguen dinámicamente deben almacenarse en Supabase Storage y registrar su ruta en `garment_images`.

## Panel administrativo independiente

- `admin.html` contiene el panel privado y `assets/css/admin.css` su estética diferenciada.
- `assets/js/admin.js` usa Supabase Auth y consulta el perfil de `public.profiles`. Solo permite entrar a perfiles con rol `owner` o `admin`.
- Desde la página de clientes hay enlaces hacia el panel; también se puede abrir directamente `/admin.html`. En ambos casos se solicita autenticación.
- El panel permite revisar/actualizar pedidos, crear/editar/ocultar prendas y arreglos, administrar telas y asignar compatibilidades. También permite subir imágenes al bucket `catalogo`.
- La cuenta debe existir en Supabase Auth y tener un registro `profiles` con el mismo UUID y rol `owner` o `admin`. No se crean usuarios ni se elevan permisos desde este panel.
- Las políticas RLS del esquema deben estar instaladas. No publiques contraseñas ni claves secretas.

**Alcance actual:** la autenticación y las operaciones del nuevo panel usan Supabase cuando está configurado. El formulario de pedidos de `index.html` y algunas funciones antiguas del cliente todavía conservan lógica local; por eso la lista de pedidos estará vacía hasta migrar el envío de pedidos a Supabase. Los permisos delegados por módulo todavía no están implementados: por ahora `owner` y `admin` tienen las mismas capacidades en este panel.


## Acceso administrativo (ajuste visual)
- Se eliminó el aviso visible que preguntaba si la persona era propietaria o administradora.
- En el acceso de clientes se conserva la verificación inicial de teléfono, CI y nombre/usuario; cuando coincide con el perfil administrativo local configurado, aparece el segundo paso de inicio de sesión administrativo.
- La pantalla independiente `admin.html` conserva su acceso directo con correo y contraseña de Supabase Auth y verifica el rol del perfil antes de mostrar el panel.
- Ambas pantallas comparten la identidad visual negra, dorada y tipográfica del acceso de clientes.

**Importante:** la verificación de tres datos que existe actualmente en `app.js` todavía depende de los perfiles locales del navegador. No es una autenticación segura ni sincronizada entre dispositivos. La validación definitiva de identidad y permisos deberá migrarse a Supabase antes de publicar el sitio. El acceso directo `admin.html` tampoco debe considerarse operativo hasta configurar Supabase y crear el perfil autorizado.


## Solicitudes públicas de arreglos

El formulario de arreglos registra solicitudes sin anticipo ni cotización. La política RLS `orders_public_repair_insert` permite a visitantes anónimos insertar únicamente filas con `service_type = 'arreglo'`, precio nulo, estado pendiente y pago no requerido. Los visitantes no reciben permisos para leer, actualizar ni borrar pedidos. Esta protección limita los campos aceptados, pero no sustituye un sistema anti-spam o CAPTCHA para un despliegue de alto tráfico.
