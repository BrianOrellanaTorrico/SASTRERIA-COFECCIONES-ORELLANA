import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ['index.html', 'admin.html']) {
  await cp(resolve(root, file), resolve(dist, file));
}
await cp(resolve(root, 'assets'), resolve(dist, 'assets'), { recursive: true });

console.log('Sitio estático preparado correctamente en dist/. No requiere variables de entorno ni servicios de base de datos.');
