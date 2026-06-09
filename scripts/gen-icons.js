const sharp = require('sharp');
const path  = require('path');

const src  = path.join(__dirname, '../icons/icon.svg');
const dest = path.join(__dirname, '../icons');

async function run() {
  // Standard icons
  await sharp(src).resize(192, 192).png().toFile(path.join(dest, 'icon-192.png'));
  console.log('✓ icon-192.png');

  await sharp(src).resize(512, 512).png().toFile(path.join(dest, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // Maskable: add 20% safe-zone padding (icon fills 80% of canvas on dark bg)
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 13, g: 15, b: 26, alpha: 1 } }
  })
  .composite([{ input: await sharp(src).resize(410, 410).png().toBuffer(), gravity: 'centre' }])
  .png()
  .toFile(path.join(dest, 'icon-maskable.png'));
  console.log('✓ icon-maskable.png');
}

run().catch(e => { console.error(e); process.exit(1); });
