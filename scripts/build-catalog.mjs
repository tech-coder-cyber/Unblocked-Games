import fs from 'fs';
import path from 'path';

const gamesDir = path.resolve('public/games');
const outDir = path.resolve('public/data');
const outFile = path.join(outDir, 'games.json');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function decodeHtml(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

const files = fs.existsSync(gamesDir) ? fs.readdirSync(gamesDir) : [];

const games = files
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .sort()
  .map((file) => {
    const fullPath = path.join(gamesDir, file);
    let html = fs.readFileSync(fullPath, 'utf8');

    // Fix root-relative /games/launcher.css and /games/launcher.js so they work in /study-portal/
    const fixedHtml = html
      .replace(/href=["']\/games\/launcher\.css["']/gi, 'href="./launcher.css"')
      .replace(/src=["']\/games\/launcher\.js["']/gi, 'src="./launcher.js"');

    if (fixedHtml !== html) {
      fs.writeFileSync(fullPath, fixedHtml, 'utf8');
      html = fixedHtml;
    }

    const id = file.replace(/\.html$/i, '');

    // Extract original title
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const fallbackTitle = id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const title = decodeHtml(h1Match?.[1] || titleMatch?.[1]) || fallbackTitle;

    // Extract original cover image URL
    const iconImgMatch = html.match(/<div class="icon">[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
    const anyImgMatch = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    const localJpg = path.resolve(`public/images/${id}.jpg`);
    const localPng = path.resolve(`public/images/${id}.png`);
    const thumbnail =
      iconImgMatch?.[1] ||
      anyImgMatch?.[1] ||
      (fs.existsSync(localJpg)
        ? `./images/${id}.jpg`
        : fs.existsSync(localPng)
        ? `./images/${id}.png`
        : '');

    // Extract original category, description, tip, and note
    const kickerMatch = html.match(/<div class="title-kicker">([\s\S]*?)<\/div>/i);
    const category = decodeHtml(kickerMatch?.[1]?.split('·')?.[0]) || 'Arcade';

    const descMatch = html.match(/<p class="desc">([\s\S]*?)<\/p>/i);
    const description =
      decodeHtml(descMatch?.[1]) || `Play ${title} directly in your browser.`;

    const miniParagraphs = [...html.matchAll(/<div class="card-mini">[\s\S]*?<p>([\s\S]*?)<\/p>/gi)];
    const tip =
      decodeHtml(miniParagraphs[0]?.[1]) ||
      'Click inside the game once it opens to focus keyboard and mouse input.';
    const note =
      decodeHtml(miniParagraphs[1]?.[1]) ||
      'First load can take a few moments on lower-end devices.';

    const launchPath = `./games/${file}`;

    return {
      id,
      title,
      category,
      players: '1P',
      difficulty: 'Medium',
      description,
      tip,
      note,
      controls: [
        { key: 'WASD / Arrows', action: 'Move' },
        { key: 'Mouse / Space', action: 'Interact / Action' },
      ],
      iframe: {
        src: launchPath,
        title: `${title} Game Frame`,
        allow: 'fullscreen; autoplay; encrypted-media; pointer-lock; gamepad',
      },
      iframeHtml: `<iframe src="${launchPath}" title="${title}" allowfullscreen></iframe>`,
      thumbnail,
    };
  });

fs.writeFileSync(outFile, JSON.stringify({ games }, null, 2), 'utf8');
console.log(`Generated ${games.length} games with original cover images and fixed launcher paths.`);
