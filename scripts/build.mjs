import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));

await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });

await Promise.all([
  build({
    absWorkingDir: root,
    entryPoints: ['src/host/index.ts', 'src/contract.ts'],
    outdir: resolve(root, 'dist'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    target: 'node24',
  }),
  build({
    absWorkingDir: root,
    entryPoints: ['src/client/index.tsx'],
    outfile: resolve(root, 'dist/client/index.js'),
    bundle: true,
    platform: 'browser',
    format: 'cjs',
    target: 'es2022',
    external: ['react', 'react/jsx-runtime'],
    plugins: [{
      name: 'inline-css',
      setup(plugin) {
        plugin.onResolve({ filter: /\.css\?inline$/ }, args => ({ path: resolve(args.resolveDir, args.path.replace(/\?inline$/, '')), namespace: 'inline-css' }));
        plugin.onLoad({ filter: /.*/, namespace: 'inline-css' }, async args => ({ contents: `export default ${JSON.stringify(await readFile(args.path, 'utf8'))}`, loader: 'js' }));
      },
    }],
    banner: { js: 'window.__ModuleLoader__.load({id:"@songyanglin/dsh-annotations",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
    footer: { js: 'return module.exports;}});' },
  }),
]);

const result = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
