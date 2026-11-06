# Estado de reconstrucción — rama rebuild/architecture-v1

## Decisiones y cambios aplicados
- La rama principal `main` permanece intacta.
- La reconstrucción usa `supabase/schema-v2.sql` como esquema de un proyecto Supabase nuevo.
- La web de clientes envía pedidos mediante la RPC validada `submit_public_order`; el navegador ya no guarda los pedidos nuevos en localStorage.
- La página pública no puede consultar pedidos.
- El catálogo, los arreglos y las telas compatibles se leen desde Supabase cuando existe configuración.
- Los precios de costura no confirmados permanecen vacíos; no se inventan tarifas.
- El panel administrativo usa Supabase Auth y lee permisos de módulo desde `profiles.permissions`.
- La interfaz administrativa separa consulta/gestión de pedidos y verificación de pagos; el estado de pago se actualiza mediante RPC protegida.
- El flujo predeterminado no solicita adelanto y mantiene oculto el QR.
- Se retiró la configuración local antigua de administradores de la página de clientes.

## Para activar la nueva configuración
Sigue exclusivamente `supabase/REBUILD_GUIDE.md`. No ejecutes el esquema antiguo `schema.sql` en el proyecto nuevo; usa `schema-v2.sql`.

## Pendiente antes de publicar
- Crear el proyecto Supabase nuevo y aplicar el esquema v2.
- Registrar la cuenta propietaria y promover su perfil a `owner`.
- Crear `assets/js/config.js` local con Project URL y clave pública.
- Migrar completamente gestión de cuentas delegadas a un flujo seguro de servidor/Edge Function (no usar contraseñas guardadas en localStorage).
- Implementar autenticación real de clientes con Supabase Auth (la identificación actual del formulario aún no es una cuenta autenticada).
- Migrar carga de imágenes de referencia de pedidos a almacenamiento privado.
- Implementar creación/revocación segura de cuentas delegadas mediante Edge Function.
- Completar la carga de imágenes de referencia de pedidos a almacenamiento privado.
- Ejecutar pruebas reales de registro, pedidos, permisos, imágenes, móvil y despliegue Netlify.

## Estado
La base de arquitectura y el primer flujo de pedido están preparados en esta rama. La aplicación todavía no está lista para producción hasta configurar Supabase y completar las pruebas pendientes.
