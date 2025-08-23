import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function build() {
  try {
    await esbuild.build({
      entryPoints: [join(projectRoot, 'src/index.ts')],
      bundle: true,
      outfile: join(projectRoot, 'dist/index.js'),
      platform: 'node',
      target: 'node18',
      format: 'esm',
      minify: false,
      sourcemap: true,
      external: ['@modelcontextprotocol/sdk', 'ws', 'axios', 'winston'],
      banner: {
        js: '#!/usr/bin/env node',
      },
    });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();