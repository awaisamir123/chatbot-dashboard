import { build } from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = pkg.version || '0.1.0';

build({
  entryPoints: ['src/olleh-voice-button.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: 'dist/olleh-voice-button.js',
  target: ['es2018'],
  banner: {
    js: `/* Olleh Voice Button Widget v${version} | https://olleh.ai */`,
  },
  logLevel: 'info',
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
