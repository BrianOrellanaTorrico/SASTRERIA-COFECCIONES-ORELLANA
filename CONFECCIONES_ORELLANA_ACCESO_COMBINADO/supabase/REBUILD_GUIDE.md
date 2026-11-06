# Reconstrucción v1 — CONFECCIONES ORELLANA

## Decisión técnica
Esta rama conserva la interfaz existente, pero prepara una base limpia para integrar el frontend con Supabase. La versión actual de `main` no se modifica.

## Nuevo flujo de pedidos
La web pública no escribe directamente en `orders` ni puede leer pedidos. Envía la solicitud mediante la función RPC validada `submit_public_order`. La lectura y gestión de pedidos queda restringida a cuentas autorizadas.

## Preparar Supabase
1. Crea un proyecto Supabase nuevo.
2. Abre SQL Editor y ejecuta `supabase/schema-v2.sql` completo una sola vez.
3. En Authentication, registra la cuenta del propietario.
4. En SQL Editor, localiza el UUID de esa cuenta en `auth.users` y ejecuta el INSERT comentado al final del esquema, reemplazando UUID-AQUI. Hazlo únicamente para el propietario legítimo.
5. Copia Project URL y la clave pública anon/publishable en `assets/js/config.js` (archivo local no versionado). Nunca uses service_role en el navegador.

## Seguridad y límites
- Los pedidos no tienen SELECT público.
- La función pública valida nombre, teléfono, tamaño de detalles y total.
- Los administradores delegados reciben permisos por módulo en `profiles.permissions`.
- Los propietarios tienen acceso completo.
- La subida de imágenes de catálogo requiere permiso `catalogo`.

## Integración ya preparada\n- El catálogo de confección y el selector de arreglos se alimentan de Supabase.\n- Las telas compatibles se consultan por prenda.\n- El envío de pedidos usa la RPC pública validada; los pedidos quedan privados.\n- La tabla administrativa separa permisos de pedidos y pagos.\n\n## Pendientes de integración
La capa de envío se añade en `assets/js/services/order-service.js`. La interfaz de cliente y el panel administrativo deben terminar de migrarse para eliminar el almacenamiento local de pedidos y las credenciales locales antiguas. No publicar la rama como producción hasta completar y probar esa migración.
