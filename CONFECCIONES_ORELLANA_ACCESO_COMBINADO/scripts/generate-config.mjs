import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY en las variables de entorno.");
}

let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch {
  throw new Error("SUPABASE_URL no es una URL válida.");
}

if (parsedUrl.protocol !== "https:") {
  throw new Error("SUPABASE_URL debe utilizar HTTPS.");
}

const keyLower = supabaseAnonKey.toLowerCase();
if (keyLower.includes("service_role") || keyLower.includes("sb_secret")) {
  throw new Error("No uses una clave service_role ni sb_secret en el frontend. Usa la clave pública anon/publishable.");
}

const config = {
  supabaseUrl: parsedUrl.origin,
  supabaseAnonKey
};
const outputPath = resolve(projectDir, "assets/js/config.js");
await writeFile(outputPath, "window.ORELLANA_CONFIG = " + JSON.stringify(config, null, 2) + ";\n", "utf8");
console.log("Configuración pública de Supabase generada en assets/js/config.js.");
