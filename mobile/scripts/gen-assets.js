/**
 * Generates the required Expo asset images as solid navy-blue PNGs.
 * Run once with: node scripts/gen-assets.js
 */
const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });

// CRC-32 table (required by PNG spec)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function solidPNG(w, h, r, g, b, outPath) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Raw scanlines: filter=0 then RGB per pixel
  const row = Buffer.alloc(1 + w * 3);
  row[0] = 0;
  for (let x = 0; x < w; x++) { row[1 + x*3] = r; row[2 + x*3] = g; row[3 + x*3] = b; }
  const raw = Buffer.concat(Array(h).fill(row));

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(outPath, png);
  console.log(`  created ${path.relative(process.cwd(), outPath)} (${w}×${h})`);
}

// Navy blue: #1a237e
const [R, G, B] = [26, 35, 126];

solidPNG(1024, 1024, R, G, B, path.join(ASSETS, 'icon.png'));
solidPNG(1024, 1024, R, G, B, path.join(ASSETS, 'adaptive-icon.png'));
solidPNG(1242, 2688, R, G, B, path.join(ASSETS, 'splash.png'));   // iPhone Plus logical res
solidPNG(48,   48,   R, G, B, path.join(ASSETS, 'favicon.png'));

console.log('Done.');
