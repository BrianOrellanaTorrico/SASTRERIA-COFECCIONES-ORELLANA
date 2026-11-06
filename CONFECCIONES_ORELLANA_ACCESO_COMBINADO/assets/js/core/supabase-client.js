// Conexión
// Requiere config.js y la biblioteca Supabase JS cargados previamente.
(function () {
  const config = window.ORELLANA_CONFIG || {};
  const sdk = window.supabase;

  if (!config.supabaseUrl || !config.supabaseAnonKey ||
      config.supabaseUrl.includes("TU-PROYECTO") ||
      config.supabaseAnonKey.includes("TU_CLAVE")) {
    console.info("[ORELLANA] Supabase aún no está configurado.");
    return;
  }

  if (!sdk || typeof sdk.createClient !== "function") {
    console.error("[ORELLANA] No se pudo cargar Supabase JS.");
    return;
  }

  window.ORELLANA_SUPABASE = sdk.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
  console.info("[ORELLANA] Cliente Supabase preparado.");
})();
