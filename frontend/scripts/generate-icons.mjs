// Génère toutes les icônes du site à partir du logo (app/icon.svg).
// Usage : node scripts/generate-icons.mjs   (à relancer si le logo change)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = await readFile(join(root, "app", "icon.svg"));
const CREAM = { r: 250, g: 245, b: 236, alpha: 1 }; // #FAF5EC

// Logo seul sur fond transparent (onglets, favicon)
const plain = (size) => sharp(svg, { density: 512 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

// Logo centré sur fond crème avec marge (icône d'écran d'accueil, PWA)
async function padded(size, ratio) {
  const inner = Math.round(size * ratio);
  const mark = await sharp(svg, { density: 512 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
}

// Fichier .ico : un conteneur qui range plusieurs images PNG (16, 32, 48 px)
function ico(images) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2); // type : icône
  head.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0);
    e.writeUInt8(size, 1);
    e.writeUInt16LE(1, 4); // plans
    e.writeUInt16LE(32, 6); // bits par pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...entries, ...images.map((i) => i.data)]);
}

await mkdir(join(root, "public"), { recursive: true });

const sizes = [16, 32, 48];
await writeFile(join(root, "app", "favicon.ico"), ico(await Promise.all(sizes.map(async (size) => ({ size, data: await plain(size) })))));
await writeFile(join(root, "app", "apple-icon.png"), await padded(180, 0.72));
await writeFile(join(root, "public", "icon-192.png"), await plain(192));
await writeFile(join(root, "public", "icon-512.png"), await plain(512));
await writeFile(join(root, "public", "icon-maskable-512.png"), await padded(512, 0.6)); // zone de sécurité des icônes « maskable »

console.log("Icônes générées : app/favicon.ico, app/apple-icon.png, public/icon-192.png, icon-512.png, icon-maskable-512.png");
