# CONFECCIONES ORELLANA

Sitio web para catálogo de confección, arreglos y recepción de pedidos de la sastrería.

## Estructura principal

- `index.html`: página de clientes.
- `admin.html`: panel administrativo independiente.
- `assets/css/`: estilos.
- `assets/js/app.js`: interacción de la página de clientes.
- `assets/js/admin.js`: operaciones del panel administrativo.
- `assets/js/core/supabase-client.js`: inicialización del cliente Supabase.
- `assets/js/services/`: servicios de catálogo y pedidos.
- `supabase/schema-v2.sql`: esquema recomendado para el proyecto Supabase nuevo.
- `supabase/REBUILD_GUIDE.md`: pasos de configuración.

## Arquitectura

GitHub conserva el código, Netlify publica el sitio y Supabase administra autenticación, datos y fotografías del catálogo.

La página de clientes consulta el catálogo y las telas compatibles desde Supabase. Los pedidos se envían mediante la función RPC `submit_public_order`; los visitantes no tienen permiso para consultar pedidos. El panel administrativo usa Supabase Auth y permisos separados para pedidos, pagos y catálogo.

Los precios de costura todavía no confirmados permanecen vacíos y se muestran como cotización pendiente. No se deben completar con tarifas supuestas.

## Configurar el proyecto Supabase

Sigue `supabase/REBUILD_GUIDE.md` y ejecuta **solo** `supabase/schema-v2.sql` en un proyecto nuevo. No mezcles el esquema antiguo `schema.sql` con el nuevo.

Después:
1. Registra la cuenta del propietario en Supabase Auth.
2. Promueve su perfil a `owner` siguiendo la instrucción SQL comentada al final de `schema-v2.sql`.
3. Copia `assets/js/config.example.js` como `assets/js/config.js`.
4. Completa la Project URL y la clave pública anon/publishable.
5. Sube `config.js` al repositorio para que Netlify también pueda cargarla. La clave publishable/anon está diseñada para el navegador; la seguridad depende de RLS y las funciones RPC. **Nunca incluyas la clave `service_role` ni otras claves secretas en el frontend.**

## Catálogo inicial

El esquema inserta los tipos aprobados:
- Femeninas: polleras, vestidos de 15, faldas, vestidos maternos, vestidos de novia y vestidos de novia para cholitas.
- Masculinas: pantalones y sacos.
- Arreglos: busos, jeans, chamarras, camisas, poleras y pantalones.

Las tarifas se dejan sin confirmar para que el taller las complete desde el panel administrativo.

## Estado y límites conocidos

La reconstrucción está en la rama `rebuild/architecture-v1` y se revisa en el PR de GitHub. La rama `main` no se ha modificado.

Antes de usar el sitio con clientes reales todavía hay que:
- Crear/configurar el proyecto Supabase y probar el flujo real.
- Completar un flujo seguro de creación y revocación de cuentas administrativas delegadas mediante servidor/Edge Function.
- Completar la carga de imágenes de referencia adjuntas a pedidos.
- Probar permisos, actualización de pedidos, pagos, catálogo, almacenamiento y diseño adaptable.
- Conectar y verificar el despliegue de Netlify con la rama correcta.

No publicar esta rama como versión de producción hasta completar las pruebas.
