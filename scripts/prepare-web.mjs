// Monta a pasta www/: copia a página e embute as fontes (Inter e Nunito) para funcionar offline.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });

const fonts = [
  ['@fontsource-variable/inter', 'inter-latin-wght-normal.woff2'],
  ['@fontsource-variable/nunito', 'nunito-latin-wght-normal.woff2'],
];
for (const [pkg, file] of fonts) {
  fs.copyFileSync(path.join(root, 'node_modules', pkg, 'files', file), path.join(out, 'fonts', file));
}

const faces = `<style>
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(fonts/inter-latin-wght-normal.woff2) format('woff2')}
@font-face{font-family:'Nunito';font-style:normal;font-weight:200 1000;font-display:swap;src:url(fonts/nunito-latin-wght-normal.woff2) format('woff2')}
</style>`;

let html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const linkRe = /<link href="https:\/\/fonts\.googleapis[^>]*>/;
if (!linkRe.test(html)) throw new Error('Tag de fontes do Google não encontrada em src/index.html');
html = html.replace(linkRe, faces);
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('www/ pronto');
