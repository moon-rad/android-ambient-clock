// Gera o ícone do app (gatinho dorminhoco em pixel art) em todas as densidades do Android.
// Roda depois de `npx cap add android`, sem dependências: o PNG é montado aqui mesmo.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const res = path.join(root, 'android/app/src/main/res');
if (!fs.existsSync(res)) throw new Error('Pasta res/ não encontrada: rode `npx cap add android` antes.');

/* ---------- PNG ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- Sprite 24x24: gatinho dormindo sob a lua ---------- */
const G = 24;
const grid = Array.from({ length: G }, () => Array(G).fill(null));
const px = (x, y, c) => { if (x >= 0 && y >= 0 && x < G && y < G) grid[y][x] = c; };
const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); };
const FUR = [232, 150, 72], FURD = [178, 100, 44], FURL = [250, 214, 170];
const DARK = [58, 36, 40], PINK = [244, 150, 166], MOON = [255, 236, 170], STAR = [255, 246, 214], Z = [214, 222, 255];

// lua crescente
for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
  if (Math.hypot(x - 16, y - 6.5) <= 3.4 && Math.hypot(x - 18, y - 5.5) > 3.0) px(x, y, MOON);
}
// estrelas
[[4, 5], [3, 6], [5, 6], [4, 7]].forEach(([x, y]) => px(x, y, STAR)); px(4, 6, [255, 255, 255]);
px(8, 2, STAR); px(2, 9, STAR); px(20, 9, STAR);
// zzz
rect(9, 3, 4, 1, Z); px(11, 4, Z); px(10, 5, Z); rect(9, 6, 4, 1, Z);
rect(6, 7, 3, 1, Z); px(7, 8, Z); rect(6, 9, 3, 1, Z);
// corpo, cabeça, orelhas, rabo
rect(6, 14, 12, 6, FUR); rect(7, 13, 10, 1, FUR);
rect(2, 13, 7, 7, FUR);
px(2, 10, FUR); rect(2, 11, 2, 2, FUR); px(8, 10, FUR); rect(7, 11, 2, 2, FUR);
px(3, 12, PINK); px(7, 12, PINK);
rect(18, 17, 2, 3, FUR); rect(19, 13, 1, 5, FUR);
// listras
[[10, 14], [10, 15], [10, 16], [13, 14], [13, 15], [13, 16], [13, 17], [16, 14], [16, 15], [16, 16], [19, 14], [19, 16], [4, 13], [4, 14], [6, 13], [6, 14]].forEach(([x, y]) => px(x, y, FURD));
rect(6, 19, 12, 1, FURD);
// rosto: olhos fechados, nariz e patinhas
rect(3, 16, 2, 1, DARK); rect(6, 16, 2, 1, DARK); px(5, 17, PINK);
rect(3, 19, 2, 1, FURL); rect(6, 19, 2, 1, FURL);

/* ---------- Render ---------- */
const BG_TOP = [64, 46, 112], BG_BOT = [28, 22, 54];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function spriteLayer(S, cell, ox, oy, out) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const gx = Math.floor((x - ox) / cell), gy = Math.floor((y - oy) / cell);
    if (gx < 0 || gy < 0 || gx >= G || gy >= G) continue;
    const c = grid[gy][gx]; if (!c) continue;
    const i = (y * S + x) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255;
  }
}
// camada de primeiro plano do ícone adaptativo (108dp): sprite dentro da zona segura
function foreground(S) {
  const cell = Math.max(2, Math.floor(S / 40));
  const off = Math.floor((S - G * cell) / 2);
  const buf = Buffer.alloc(S * S * 4);
  spriteLayer(S, cell, off, off + cell, buf);
  return buf;
}
// ícone antigo (antes do Android 8): fundo + sprite + máscara
function legacy(S, round) {
  const buf = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) { const c = mix(BG_TOP, BG_BOT, y / (S - 1)); for (let x = 0; x < S; x++) { const i = (y * S + x) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; } }
  const cell = S / 31, off = (S - G * cell) / 2;
  spriteLayer(S, cell, off, off + 0.5 * cell, buf);
  const r = S / 2, rr = S * 0.22;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d;
    if (round) d = Math.hypot(x + 0.5 - r, y + 0.5 - r) - r;
    else { const qx = Math.abs(x + 0.5 - r) - (r - rr), qy = Math.abs(y + 0.5 - r) - (r - rr); d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr; }
    const a = Math.max(0, Math.min(1, 0.5 - d));
    const i = (y * S + x) * 4; buf[i + 3] = Math.round(buf[i + 3] * a);
  }
  return buf;
}

const dens = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
for (const [name, [L, F]] of Object.entries(dens)) {
  const dir = path.join(res, `mipmap-${name}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), encodePNG(L, L, legacy(L, false)));
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), encodePNG(L, L, legacy(L, true)));
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), encodePNG(F, F, foreground(F)));
}

// fundo do ícone adaptativo: degradê roxo noturno
fs.writeFileSync(path.join(res, 'drawable', 'ic_launcher_bg.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:angle="270" android:startColor="#402E70" android:endColor="#1C1636"/>
</shape>
`);
for (const f of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', f), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_bg"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`);
}
// o vetor de primeiro plano padrão do Capacitor não é mais usado
fs.rmSync(path.join(res, 'drawable-v24', 'ic_launcher_foreground.xml'), { force: true });
console.log('Ícones gerados em', res);
