const sharp = require('sharp');
const fs = require('fs');
const { execSync } = require('child_process');

async function run() {
  if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
  }

  // Capacitor requires icon.png to be at least 1024x1024 without alpha
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 122, b: 255, alpha: 1 }
    }
  })
  .png()
  .toFile('assets/icon.png');

  // Capacitor requires splash.png to be at least 2732x2732 without alpha
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: { r: 0, g: 122, b: 255, alpha: 1 }
    }
  })
  .png()
  .toFile('assets/splash.png');

  // Capacitor requires splash-dark.png to be at least 2732x2732 without alpha
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 }
    }
  })
  .png()
  .toFile('assets/splash-dark.png');
}

run().catch(console.error);
