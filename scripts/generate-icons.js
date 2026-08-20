/**
 * Generate Neuriy tray / app PNG icons (no external deps).
 * Creates template (macOS) and color icons at multiple sizes.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(filePath, size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size);
      const i = rowStart + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, png);
}

function circlePaint(r, g, b) {
  return (x, y, size) => {
    const cx = (size - 1) / 2;
    const cy = (size - 1) / 2;
    const rad = size * 0.38;
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= rad - 0.5) return [r, g, b, 255];
    if (d <= rad + 0.5) {
      const a = Math.round(255 * (1 - (d - (rad - 0.5))));
      return [r, g, b, a];
    }
    return [0, 0, 0, 0];
  };
}

/** Template: white circle on transparent — macOS menu bar adapts to light/dark. */
function templatePaint(x, y, size) {
  return circlePaint(255, 255, 255)(x, y, size);
}

/** Color brand mark. */
function colorPaint(x, y, size) {
  return circlePaint(124, 58, 237)(x, y, size); // violet-600
}

const root = path.join(__dirname, '..', 'assets');
const trayDir = path.join(root, 'tray');
const iconsDir = path.join(root, 'icons');

for (const size of [16, 32, 64]) {
  writePng(path.join(trayDir, `iconTemplate${size === 16 ? '' : `@${size / 16}x`}.png`), size, templatePaint);
  writePng(path.join(trayDir, `icon${size === 16 ? '' : `@${size / 16}x`}.png`), size, colorPaint);
}

// Canonical names Electron / electron-builder expect
writePng(path.join(trayDir, 'iconTemplate.png'), 16, templatePaint);
writePng(path.join(trayDir, 'iconTemplate@2x.png'), 32, templatePaint);
writePng(path.join(trayDir, 'icon.png'), 32, colorPaint);
writePng(path.join(iconsDir, 'icon.png'), 256, colorPaint);
writePng(path.join(iconsDir, 'icon-512.png'), 512, colorPaint);
writePng(path.join(iconsDir, 'icon-128.png'), 128, colorPaint);
writePng(path.join(iconsDir, 'icon-64.png'), 64, colorPaint);
writePng(path.join(iconsDir, 'icon-32.png'), 32, colorPaint);
writePng(path.join(iconsDir, 'icon-16.png'), 16, colorPaint);

console.log('Generated tray/app icons under assets/');
