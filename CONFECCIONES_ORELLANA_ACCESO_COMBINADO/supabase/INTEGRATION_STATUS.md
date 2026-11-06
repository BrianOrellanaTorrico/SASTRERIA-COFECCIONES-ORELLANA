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
- Migrar el envío de pedidos del formulario de clientes desde `localStorage` a `public.orders`.
- Conectar el catálogo de `index.html` para que lea los datos de Supabase.
- Implementar permisos delegados por módulo en la base de datos y en la interfaz.
- Revisar las políticas RLS y el flujo de pedidos de clientes antes de publicar para uso real.


## Ajustes de conexión y seguridad para el flujo de arreglos
- La política RLS `orders_public_repair_insert` permite a visitantes anónimos registrar exclusivamente solicitudes de arreglos sin precio ni pago requerido.
- La tabla no permite a visitantes anónimos consultar o modificar pedidos.
- Netlify genera `assets/js/config.js` durante el build a partir de `SUPABASE_URL` y `SUPABASE_ANON_KEY`; no se guarda la configuración del proyecto en Git.
- Para desplegar, configurar la base de Netlify como `CONFECCIONES_ORELLANA_ACCESO_COMBINADO`, ejecutar `npm run build` y publicar `.`.
- El envío de pedidos de confección y la migración completa del catálogo cliente siguen pendientes.
