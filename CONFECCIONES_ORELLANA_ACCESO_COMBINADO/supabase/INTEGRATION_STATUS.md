# Estado de integración — Panel administrativo

## Incorporado en esta versión
- Panel administrativo independiente en `admin.html`.
- Estilos propios y fondo animado de taller en `assets/css/admin.css`.
- Inicio/cierre de sesión con Supabase Auth.
- Comprobación del rol en `profiles`; acceso limitado a `owner` y `admin`.
- Lectura y actualización de pedidos existentes en `public.orders`.
- Alta, edición y activación/desactivación de prendas y arreglos.
- Alta, edición y activación/desactivación de telas.
- Asignación y eliminación de compatibilidades `garment_fabrics`.
- Subida de fotografías al bucket `catalogo` y registro en `garment_images`.
- Enlaces desde la página de clientes y acceso directo mediante `admin.html`.

## Antes de probarlo
1. Crear `assets/js/config.js` a partir de `config.example.js` y completar URL + clave pública anon/publishable.
2. Ejecutar `supabase/schema.sql` en el SQL Editor del proyecto Supabase.
3. Crear la cuenta del propietario en Supabase Auth.
4. Insertar/actualizar el perfil con el mismo UUID de Auth y `role = 'owner'` desde un entorno seguro. No permitir que un usuario cambie su propio rol.
5. Probar el acceso y las operaciones con una cuenta de prueba antes de cargar información real.

## Pendiente
- Ejecutado en código: pedidos de confección y arreglos se envían a `public.orders`; LocalStorage conserva una copia de respaldo y evita fallos de cuota.
- Ejecutado en código: el catálogo cliente carga prendas, imágenes, precios y compatibilidades desde Supabase; los datos de telas se mantienen también como caché local.
- Implementar permisos delegados por módulo en la base de datos y en la interfaz.
- Revisar las políticas RLS y el flujo de pedidos de clientes antes de publicar para uso real.


## Ajustes de conexión y seguridad para el flujo de arreglos
- La migración `supabase/migrations/20261106_public_orders.sql` reemplaza la política anterior y permite insertar pedidos de confección y solicitudes de arreglos sin cotización ni verificación de pago por parte del visitante.
- El panel administrativo permite revisar y actualizar el estado del pedido, la cotización y el estado del pago.
- La tabla no permite a visitantes anónimos consultar o modificar pedidos.
- Netlify genera `assets/js/config.js` durante el build a partir de `SUPABASE_URL` y `SUPABASE_ANON_KEY`; no se guarda la configuración del proyecto en Git.
- Para desplegar, configurar la base de Netlify como `CONFECCIONES_ORELLANA_ACCESO_COMBINADO`, ejecutar `npm run build` y publicar `.`.
- Pendiente de ejecución en el proyecto Supabase: aplicar `supabase/migrations/20261106_public_orders.sql` desde SQL Editor.
- Pendiente de prueba de extremo a extremo: registrar un pedido de prueba, comprobarlo en `admin.html` y revisar actualización de pago/estado.
- Los perfiles delegados por módulo todavía requieren políticas/roles específicos en Supabase; no se deben considerar terminados por el control visual del navegador.
