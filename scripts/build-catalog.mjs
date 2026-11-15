import fs from 'fs';
import path from 'path';

const gamesDir = path.resolve('public/games');
const outDir = path.resolve('public/data');
const outFile = path.join(outDir, 'games.json');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const files = fs.existsSync(gamesDir) ? fs.readdirSync(gamesDir) : [];

const games = files
  .filter((f) => f.endsWith('.html') && !f.endsWith('-embed.html'))
  .sort()
  .map((file) => {
    const id = file.replace(/\.html$/i, '');
    const title = id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const imgJpg = path.resolve(`public/images/${id}.jpg`);
    const imgPng = path.resolve(`public/images/${id}.png`);
    const thumbnail = fs.existsSync(imgJpg)
      ? `./images/${id}.jpg`
      : fs.existsSync(imgPng)
      ? `./images/${id}.png`
      : '';

    return {
      id,
      title,
      category: 'Arcade',
      description: `Play ${title} directly in your browser.`,
      controls: 'Keyboard & Mouse',
      url: `./games/${file}`,
      path: `./games/${file}`,
      thumbnail,
    };
  });

fs.writeFileSync(outFile, JSON.stringify({ games }, null, 2), 'utf8');
console.log(`Generated ${games.length} games in public/data/games.json`);
