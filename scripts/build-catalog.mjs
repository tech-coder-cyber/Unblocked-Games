import fs from 'fs';
import path from 'path';

const gamesDir = path.resolve('public/games');
const aistudioDir = path.resolve('public/assets/aistudio');
const outDir = path.resolve('public/data');
const outFile = path.join(outDir, 'games.json');
const linksDebugFile = path.join(outDir, 'found-links.txt');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Read all files in public/assets/aistudio/ (handling both UTF-8 and UTF-16/binary)
const pasteEntries = [];
const allUniqueUrls = new Set();

if (fs.existsSync(aistudioDir)) {
  const pasteFiles = fs.readdirSync(aistudioDir).sort();
  for (const pf of pasteFiles) {
    const fullPath = path.join(aistudioDir, pf);
    if (!fs.statSync(fullPath).isFile()) continue;

    const buf = fs.readFileSync(fullPath);
    const utf8Text = buf.toString('utf8');
    const utf16Text = buf.toString('utf16le');
    const combined = `${utf8Text}\n${utf16Text}`.replace(/\u0000/g, '');

    const urls = combined.match(/https?:\/\/[^\s"'<>\\)\]]+/g) || [];
    const cleanUrls = urls.filter((u) => u.length > 12);
    cleanUrls.forEach((u) => allUniqueUrls.add(u));

    if (cleanUrls.length > 0) {
      pasteEntries.push({
        file: pf,
        text: combined.toLowerCase(),
        urls: cleanUrls,
      });
    }
  }
}

// Save all recovered links to /data/found-links.txt so you can inspect them anytime
fs.writeFileSync(
  linksDebugFile,
  `Found ${allUniqueUrls.size} URLs across ${pasteEntries.length} AI Studio files:\n\n` +
    Array.from(allUniqueUrls).join('\n'),
  'utf8'
);

function findOriginalCover(id, title) {
  // 1. Check local public/images/
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (fs.existsSync(path.resolve(`public/images/${id}.${ext}`))) {
      return `./images/${id}.${ext}`;
    }
  }

  // 2. Match URLs containing the game's keywords
  const keywords = id
    .split('-')
    .filter((w) => w.length > 2 && w !== 'old' && w !== 'embed' && w !== 'lite');

  for (const entry of pasteEntries) {
    for (const u of entry.urls) {
      const lowerU = u.toLowerCase();
      if (keywords.length > 0 && keywords.every((kw) => lowerU.includes(kw))) {
        return u;
      }
    }
  }

  // 3. Match paste files where the game name was pasted alongside an image URL
  const cleanTitle = title.toLowerCase();
  const spacedId = id.replace(/-/g, ' ');
  for (const entry of pasteEntries) {
    if (entry.text.includes(cleanTitle) || entry.text.includes(spacedId)) {
      const imgLike = entry.urls.find(
        (u) => !u.includes('youtube.com') && !u.includes('github.com') && !u.includes('://poki.com')
      );
      if (imgLike) return imgLike;
    }
  }

  return '';
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

    return {
      id,
      title,
      category: 'Arcade',
      description: `Play ${title} directly in your browser.`,
      controls: 'Keyboard & Mouse',
      url: `./games/${file}`,
      path: `./games/${file}`,
      thumbnail: findOriginalCover(id, title),
    };
  });

fs.writeFileSync(outFile, JSON.stringify({ games }, null, 2), 'utf8');
console.log(`Generated ${games.length} games. Total URLs recovered: ${allUniqueUrls.size}`);
