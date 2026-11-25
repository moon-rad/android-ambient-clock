// Monta duas pastas a partir de src/:
//   www/  -> vai dentro do APK: index.html (porta de entrada) + app.html (relógio embutido) + fontes
//   site/ -> vai para o GitHub Pages: index.html (o relógio) + fontes (o app baixa as atualizações daqui)
// As fontes Inter e Nunito são embutidas para funcionar offline.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const www = path.join(root, 'www');
const site = path.join(root, 'site');
for (const dir of [www, site]) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
}

const fonts = [
  ['@fontsource-variable/inter', 'inter-latin-wght-normal.woff2'],
  ['@fontsource-variable/nunito', 'nunito-latin-wght-normal.woff2'],
];
for (const [pkg, file] of fonts) {
  for (const dir of [www, site]) {
    fs.copyFileSync(path.join(root, 'node_modules', pkg, 'files', file), path.join(dir, 'fonts', file));
  }
}

const faces = `<style>
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(fonts/inter-latin-wght-normal.woff2) format('woff2')}
@font-face{font-family:'Nunito';font-style:normal;font-weight:200 1000;font-display:swap;src:url(fonts/nunito-latin-wght-normal.woff2) format('woff2')}
</style>`;

let html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const linkRe = /<link href="https:\/\/fonts\.googleapis[^>]*>/;
if (!linkRe.test(html)) throw new Error('Tag de fontes do Google não encontrada em src/index.html');
html = html.replace(linkRe, faces);

const stampFrom = 'name="relogio-build" content="dev"';
if (!html.includes(stampFrom)) throw new Error('Marca de versão (relogio-build) não encontrada em src/index.html');
const build = process.env.BUILD_ID || new Date().toISOString();
html = html.replace(stampFrom, `name="relogio-build" content="${build}"`);

fs.writeFileSync(path.join(www, 'app.html'), html);
fs.copyFileSync(path.join(root, 'src', 'loader.html'), path.join(www, 'index.html'));
fs.writeFileSync(path.join(site, 'index.html'), html);
console.log('www/ e site/ prontos (versão ' + build + ')');
