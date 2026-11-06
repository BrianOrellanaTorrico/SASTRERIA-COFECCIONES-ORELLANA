import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan las variables SUPABASE_URL y/o SUPABASE_ANON_KEY. Configúralas en Netlify o en tu entorno local.');
  process.exit(1);
}

if (!/^https:\/\//i.test(supabaseUrl)) {
  console.error('SUPABASE_URL debe comenzar con https://.');
  process.exit(1);
}

if (/service_role|sb_secret/i.test(supabaseAnonKey)) {
  console.error('No uses una clave service_role o sb_secret en el frontend. Utiliza únicamente la clave pública anon/publishable.');
  process.exit(1);
}

const output = resolve('assets/js/config.js');
await mkdir(dirname(output), { recursive: true });
const content = `// Archivo generado en el entorno de compilación. No editar ni versionar.\nwindow.ORELLANA_CONFIG = ${JSON.stringify({ supabaseUrl, supabaseAnonKey }, null, 2)};\n`;
await writeFile(output, content, 'utf8');
console.log('Configuración pública de Supabase generada en assets/js/config.js.');

const dist = resolve('dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve('index.html'), resolve(dist, 'index.html'));
await cp(resolve('admin.html'), resolve(dist, 'admin.html'));
await cp(resolve('assets'), resolve(dist, 'assets'), { recursive: true });
console.log('Directorio dist preparado para Netlify.');
