import fs from 'fs';
import path from 'path';

const gamesDir = path.resolve('public/games');
const aistudioDir = path.resolve('public/assets/aistudio');
const outDir = path.resolve('public/data');
const outFile = path.join(outDir, 'games.json');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Scan public/assets/aistudio/ to recover any original cover image URLs
const pasteEntries = [];
if (fs.existsSync(aistudioDir)) {
  const pasteFiles = fs.readdirSync(aistudioDir).sort();
  for (const pf of pasteFiles) {
    const fullPath = path.join(aistudioDir, pf);
    if (!fs.statSync(fullPath).isFile()) continue;
    const raw = fs.readFileSync(fullPath).toString('utf8').replace(/\u0000/g, '');
    const urls = (raw.match(/https?:\/\/[^\s"'<>\\)\]]+/g) || []).filter((u) => u.length > 12);
    if (urls.length > 0) {
      pasteEntries.push({ text: raw.toLowerCase(), urls });
    }
  }
}

function findOriginalCover(id, title) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (fs.existsSync(path.resolve(`public/images/${id}.${ext}`))) {
      return `./images/${id}.${ext}`;
    }
  }

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

    const embedCandidate = `${id}-embed.html`;
    const hasEmbed = files.includes(embedCandidate);
    const launchPath = `./games/${hasEmbed ? embedCandidate : file}`;
    const iframeTag = `<iframe src="${launchPath}" title="${title}" allowfullscreen></iframe>`;

    return {
      id,
      title,
      category: 'Arcade',
      players: '1P',
      difficulty: 'Medium',
      description: `Play ${title} directly in your browser.`,
      tip: 'Click inside the game window after it loads to enable keyboard controls.',
      note: 'Runs directly in your browser.',
      controls: [
        { key: 'WASD / Arrows', action: 'Move' },
        { key: 'Mouse / Space', action: 'Action' },
      ],
      url: launchPath,
      path: launchPath,
      file: launchPath,
      gameUrl: launchPath,
      embedUrl: launchPath,
      iframeUrl: launchPath,
      src: launchPath,
      iframeHtml: iframeTag,
      embedCode: iframeTag,
      thumbnail: findOriginalCover(id, title),
    };
  });

fs.writeFileSync(outFile, JSON.stringify({ games }, null, 2), 'utf8');
console.log(`Generated ${games.length} games cleanly.`);
