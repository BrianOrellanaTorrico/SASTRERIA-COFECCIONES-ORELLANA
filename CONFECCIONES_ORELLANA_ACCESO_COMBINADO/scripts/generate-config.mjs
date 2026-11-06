import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Supabase es opcional para esta publicación inicial.
// Si no hay variables configuradas en Netlify, la web se publica en modo local.
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

if ((supabaseUrl && !supabaseAnonKey) || (!supabaseUrl && supabaseAnonKey)) {
  console.error('Para activar Supabase debes configurar juntas SUPABASE_URL y SUPABASE_ANON_KEY. También puedes dejar ambas vacías para publicar solo la web.');
  process.exit(1);
}

if (supabaseUrl && !/^https:\/\//i.test(supabaseUrl)) {
  console.error('SUPABASE_URL debe comenzar con https://.');
  process.exit(1);
}

if (/service_role|sb_secret/i.test(supabaseAnonKey)) {
  console.error('No uses una clave service_role o sb_secret en el frontend. Utiliza únicamente la clave pública anon/publishable.');
  process.exit(1);
}

const output = resolve('assets/js/config.js');
await mkdir(dirname(output), { recursive: true });
const content = `// Archivo generado durante la compilación de Netlify.\nwindow.ORELLANA_CONFIG = ${JSON.stringify({ supabaseUrl, supabaseAnonKey }, null, 2)};\n`;
await writeFile(output, content, 'utf8');
console.log(supabaseUrl ? 'Configuración pública de Supabase generada.' : 'Supabase omitido: se publicará la página sin conexión a la base de datos.');

const dist = resolve('dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve('index.html'), resolve(dist, 'index.html'));
await cp(resolve('admin.html'), resolve(dist, 'admin.html'));
await cp(resolve('assets'), resolve(dist, 'assets'), { recursive: true });
console.log('Directorio dist preparado para Netlify.');
