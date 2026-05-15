const fs = require('fs');
const { execSync } = require('child_process');

async function download(url, path) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(path, Buffer.from(buffer));
  console.log(`Downloaded ${path}`);
}

async function run() {
  if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
  }
  
  await download('https://raw.githubusercontent.com/ionic-team/capacitor-assets/main/assets/icon-only.png', 'assets/icon.png');
  await download('https://raw.githubusercontent.com/ionic-team/capacitor-assets/main/assets/splash.png', 'assets/splash.png');
  await download('https://raw.githubusercontent.com/ionic-team/capacitor-assets/main/assets/splash-dark.png', 'assets/splash-dark.png');
  // Need to also download the general background colored ones just in case
  
  console.log('Generating assets...');
  execSync('npx --yes @capacitor/assets generate --ios --android', { stdio: 'inherit' });
  console.log('Done.');
}

run().catch(console.error);
