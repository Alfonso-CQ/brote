const fs = require("fs");
const zlib = require("zlib");

function png(n) {
  const fila = 1 + n * 3;
  const raw = Buffer.alloc(fila * n);
  for (let y = 0; y < n; y++) {
    raw[y * fila] = 0;
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2, y - n / 2) / n;
      const color = d < 0.18 ? [242, 165, 65] : d < 0.3 ? [251, 247, 238] : [47, 125, 79];
      raw.set(color, y * fila + 1 + x * 3);
    }
  }
  const trozo = (tipo, datos) => {
    const b = Buffer.alloc(12 + datos.length);
    b.writeUInt32BE(datos.length, 0);
    b.write(tipo, 4, "ascii");
    datos.copy(b, 8);
    b.writeUInt32BE(zlib.crc32(b.subarray(4, 8 + datos.length)), 8 + datos.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozo("IHDR", ihdr),
    trozo("IDAT", zlib.deflateSync(raw)),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync("public/icons", { recursive: true });
for (const n of [192, 512]) fs.writeFileSync(`public/icons/icon-${n}.png`, png(n));
console.log("Iconos creados en public/icons");
