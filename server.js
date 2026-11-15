import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const DATA_DIR = path.join(__dirname, 'data');
const STUDIO_STORE_PATH = path.join(DATA_DIR, 'studio-games.json');

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function readStudioStore() {
  try {
    if (!fs.existsSync(STUDIO_STORE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(STUDIO_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.games) ? parsed.games : [];
  } catch {
    return [];
  }
}

function writeStudioStore(games) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STUDIO_STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify({ version: '1.0', games }, null, 2), 'utf8');
  fs.renameSync(tmpPath, STUDIO_STORE_PATH);
}

function sanitizeStudioRecord(record, requesterCreatorId) {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    controls: record.controls,
    html: record.html,
    creatorName: record.creatorName || 'ArcadeBuilder',
    isPublic: Boolean(record.isPublic),
    plays: Number(record.plays || 0),
    likes: Number(record.likes || 0),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isOwner: Boolean(requesterCreatorId && record.creatorId === requesterCreatorId),
  };
}

function stripCodeFences(raw) {
  if (typeof raw !== 'string') return '';
  let text = raw.trim();
  const match = text.match(/^```(?:html|xml)?\s*\n?([\s\S]*?)\n?```$/i);
  if (match) {
    text = match[1].trim();
  }
  return text;
}

function isPrivateHostname(hostname) {
  if (!hostname) return true;
  const lower = hostname.toLowerCase().trim();

  if (
    lower === 'localhost' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }

  const ipVersion = net.isIP(lower);
  if (ipVersion === 4) {
    const parts = lower.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  } else if (ipVersion === 6) {
    if (
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    ) {
      return true;
    }
  }

  return false;
}

function normalizeTargetUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let candidate = raw.trim();
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (isPrivateHostname(parsed.hostname)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function makeProxyUrl(absoluteUrl) {
  return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
}

function resolveMaybeRelative(rawUrl, baseUrl) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    /^(?:javascript|data|blob|mailto|tel|about):/i.test(trimmed)
  ) {
    return null;
  }
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    if (isPrivateHostname(resolved.hostname)) {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

function rewriteCssUrls(cssText, baseUrl) {
  let out = cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, rawTarget) => {
    const resolved = resolveMaybeRelative(rawTarget, baseUrl);
    if (!resolved) return full;
    const proxied = makeProxyUrl(resolved);
    return `url("${proxied}")`;
  });

  out = out.replace(/@import\s+(['"])([^'"]+)\1/gi, (full, quote, rawTarget) => {
    const resolved = resolveMaybeRelative(rawTarget, baseUrl);
    if (!resolved) return full;
    return `@import "${makeProxyUrl(resolved)}"`;
  });

  return out;
}

function rewriteSrcset(srcsetValue, baseUrl) {
  return srcsetValue
    .split(',')
    .map((entry) => {
      const parts = entry.trim().split(/\s+/);
      if (!parts[0]) return entry;
      const resolved = resolveMaybeRelative(parts[0], baseUrl);
      if (!resolved) return entry;
      parts[0] = makeProxyUrl(resolved);
      return parts.join(' ');
    })
    .join(', ');
}

function rewriteHtml(html, finalUrl) {
  const clientHook = `<script data-recess-proxy-hook="true">
(function(){
  var BASE_URL = ${JSON.stringify(finalUrl)};
  var PREFIX = '/api/proxy?url=';
  function toAbs(raw){
    try { return new URL(raw, BASE_URL).href; } catch(e) { return null; }
  }
  function isSkippable(raw){
    if (!raw || typeof raw !== 'string') return true;
    var s = raw.trim();
    return !s || s.startsWith('#') || s.startsWith(PREFIX) || /^(?:javascript|data|blob|mailto|tel|about):/i.test(s);
  }
  function toProxy(raw){
    if (isSkippable(raw)) return raw;
    if (raw.startsWith('/api/proxy')) return raw;
    var abs = toAbs(raw);
    if (!abs || !/^https?:/i.test(abs)) return raw;
    return PREFIX + encodeURIComponent(abs);
  }
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      try {
        if (typeof input === 'string') {
          input = toProxy(input);
        } else if (input && typeof input.url === 'string' && !input.url.includes('/api/proxy')) {
          input = new Request(toProxy(input.url), input);
        }
      } catch(e) {}
      return origFetch.call(this, input, init);
    };
  }
  try {
    var origXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      try {
        if (typeof url === 'string') url = toProxy(url);
      } catch(e) {}
      return origXhrOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
    };
  } catch(e) {}
  document.addEventListener('click', function(e) {
    var el = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!el) return;
    var href = el.getAttribute('href');
    if (isSkippable(href)) return;
    if (href.startsWith('/api/proxy')) {
      el.removeAttribute('target');
      return;
    }
    var proxied = toProxy(href);
    if (proxied !== href) {
      e.preventDefault();
      window.location.assign(proxied);
    }
  }, true);
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || !form.tagName || form.tagName.toLowerCase() !== 'form') return;
    var method = (form.getAttribute('method') || 'GET').toUpperCase();
    var action = form.getAttribute('action') || BASE_URL;
    var absAction = toAbs(action);
    if (!absAction) return;
    if (method === 'GET') {
      e.preventDefault();
      var target = new URL(absAction);
      var fd = new FormData(form);
      fd.forEach(function(val, key){
        if (typeof val === 'string') target.searchParams.set(key, val);
      });
      window.location.assign(PREFIX + encodeURIComponent(target.href));
    } else {
      form.setAttribute('action', PREFIX + encodeURIComponent(absAction));
    }
  }, true);
})();
</script>`;

  let rewritten = html
    .replace(/<meta[^>]+http-equiv=["']?(?:content-security-policy|x-frame-options)["']?[^>]*>/gi, '')
    .replace(/\s+integrity=(["'])[^"']*\1/gi, '')
    .replace(/\s+nonce=(["'])[^"']*\1/gi, '');

  rewritten = rewritten.replace(
    /\b(src|href|action|poster)\s*=\s*(["'])([^"']+)\2/gi,
    (full, attr, quote, val) => {
      const resolved = resolveMaybeRelative(val, finalUrl);
      if (!resolved) return full;
      return `${attr}=${quote}${makeProxyUrl(resolved)}${quote}`;
    }
  );

  rewritten = rewritten.replace(/\bsrcset\s*=\s*(["'])([^"']+)\1/gi, (full, quote, val) => {
    return `srcset=${quote}${rewriteSrcset(val, finalUrl)}${quote}`;
  });

  rewritten = rewritten.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, css) => {
    return `<style${attrs}>${rewriteCssUrls(css, finalUrl)}</style>`;
  });

  if (/<head[^>]*>/i.test(rewritten)) {
    rewritten = rewritten.replace(/<head([^>]*)>/i, `<head$1>${clientHook}`);
  } else {
    rewritten = `${clientHook}${rewritten}`;
  }

  return rewritten;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractReadableSummary(html, finalUrl) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ').trim()) : finalUrl;

  const metaDescMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const description = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1].trim()) : '';

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const headings = [];
  const headingRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hMatch;
  while ((hMatch = headingRe.exec(stripped)) !== null && headings.length < 16) {
    const clean = decodeHtmlEntities(hMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (clean) headings.push({ level: Number(hMatch[1]), text: clean });
  }

  const paragraphs = [];
  const paraRe = /<(?:p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/gi;
  let pMatch;
  while ((pMatch = paraRe.exec(stripped)) !== null && paragraphs.length < 30) {
    const clean = decodeHtmlEntities(pMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (clean.length >= 24) paragraphs.push(clean);
  }

  if (paragraphs.length === 0) {
    const fallbackText = decodeHtmlEntities(stripped.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (fallbackText) {
      paragraphs.push(fallbackText.slice(0, 1200));
    }
  }

  const links = [];
  const seenLinks = new Set();
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lMatch;
  while ((lMatch = linkRe.exec(stripped)) !== null && links.length < 36) {
    const resolved = resolveMaybeRelative(lMatch[1], finalUrl);
    if (!resolved || seenLinks.has(resolved)) continue;
    const label = decodeHtmlEntities(lMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!label) continue;
    seenLinks.add(resolved);
    links.push({ url: resolved, label: label.slice(0, 90) });
  }

  return { title, description, headings, paragraphs, links };
}

async function createAppServer() {
  const app = express();
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Server-side AI Game Generator (returns a complete playable standalone HTML5 game)
  app.post('/api/ai/generate-game', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const prompt = String(req.body?.prompt || '').trim().slice(0, 2000);
    const genre = String(req.body?.genre || 'Auto').trim().slice(0, 60);
    const themeStyle = String(req.body?.themeStyle || 'Neon Arcade').trim().slice(0, 60);
    const currentHtml = typeof req.body?.currentHtml === 'string' ? req.body.currentHtml.slice(0, 200000) : '';

    if (!prompt) {
      return res.status(400).json({ error: 'Describe the game you want to create or update.' });
    }

    const systemInstruction = [
      'You are an expert HTML5 canvas and Web game developer building crisp, fun, zero-dependency single-file browser games.',
      'Rules for the generated "html" field:',
      '1. Return a COMPLETE, self-contained HTML5 document starting with <!DOCTYPE html> that runs completely offline in a sandboxed iframe or downloaded .html file.',
      '2. Do NOT use external CDNs, external images, external audio files, or network requests. Use procedural HTML5 Canvas 2D drawing, CSS gradients, and Web Audio API sound effects (unlocked safely after user interaction).',
      '3. Never use window.alert, window.confirm, window.prompt, or window.open.',
      '4. Fill the viewport cleanly (html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }) and resize the canvas smoothly.',
      '5. Include: a crisp start overlay or immediate start button, smooth requestAnimationFrame loop with delta time clamping, responsive keyboard (WASD + Arrows + Space) and/or mouse/touch controls, live score/HUD, and a clean Game Over overlay with an instant Play Again button.',
      '6. Ensure zero syntax errors, zero undefined variables, and engaging, fair gameplay.',
    ].join('\n');

    const contents = currentHtml
      ? `Update and improve the existing HTML5 game below based on these instructions.\n\nCreator Instructions: ${prompt}\nRequested Genre: ${genre}\nVisual Style: ${themeStyle}\n\nExisting HTML:\n${currentHtml}`
      : `Create a brand-new, super playable single-file HTML5 browser game.\n\nGame Idea: ${prompt}\nPreferred Genre: ${genre}\nVisual Style: ${themeStyle}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Short catchy title of the game (2-5 words).',
              },
              description: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence description of gameplay and objective.',
              },
              category: {
                type: Type.STRING,
                description: 'Single-word genre category (e.g. Arcade, Action, Puzzle, Racing, Shooter, Strategy, Horror).',
              },
              controls: {
                type: Type.STRING,
                description: 'Short controls summary for the player (e.g. "WASD or Arrow Keys to move, Space to dash").',
              },
              html: {
                type: Type.STRING,
                description: 'Complete self-contained <!DOCTYPE html> single-file HTML5 game.',
              },
            },
            required: ['title', 'description', 'category', 'controls', 'html'],
          },
        },
      });

      const rawText = (response.text || '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'The model returned an empty response. Please try again.' });
      }

      const parsed = JSON.parse(rawText);
      const html = stripCodeFences(parsed.html || '');
      if (!html || html.length < 120) {
        return res.status(502).json({ error: 'Generated game HTML was incomplete. Try refining your prompt.' });
      }

      return res.json({
        title: String(parsed.title || 'Custom Arcade Game').slice(0, 80),
        description: String(parsed.description || prompt).slice(0, 320),
        category: String(parsed.category || 'Arcade').slice(0, 32),
        controls: String(parsed.controls || 'Keyboard & Mouse').slice(0, 140),
        html,
      });
    } catch (err) {
      const message = err?.message || 'Failed to generate game.';
      const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;
      return res.status(status).json({ error: message });
    }
  });

  // Studio Save & Community Games API (persistent local JSON store)
  app.get('/api/studio/games', (req, res) => {
    const creatorId = String(req.query.creatorId || '').trim().slice(0, 128);
    const all = readStudioStore();

    const myGames = creatorId
      ? all
          .filter((item) => item.creatorId === creatorId)
          .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
          .map((item) => sanitizeStudioRecord(item, creatorId))
      : [];

    const publicGames = all
      .filter((item) => Boolean(item.isPublic))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .map((item) => sanitizeStudioRecord(item, creatorId));

    return res.json({ myGames, publicGames });
  });

  app.post('/api/studio/games', (req, res) => {
    const creatorId = String(req.body?.creatorId || '').trim().slice(0, 128);
    const creatorName = String(req.body?.creatorName || 'ArcadeBuilder').trim().slice(0, 40) || 'ArcadeBuilder';
    const title = String(req.body?.title || '').trim().slice(0, 80);
    const description = String(req.body?.description || '').trim().slice(0, 400);
    const category = String(req.body?.category || 'Arcade').trim().slice(0, 32) || 'Arcade';
    const controls = String(req.body?.controls || 'Keyboard & Mouse').trim().slice(0, 160);
    const html = typeof req.body?.html === 'string' ? req.body.html : '';
    const isPublic = Boolean(req.body?.isPublic);

    if (!creatorId) {
      return res.status(400).json({ error: 'Missing creator profile ID.' });
    }
    if (!title || !html || html.length < 50) {
      return res.status(400).json({ error: 'Game title and valid HTML content are required.' });
    }
    if (html.length > 450000) {
      return res.status(400).json({ error: 'Game HTML exceeds maximum size (450 KB).' });
    }

    const now = Date.now();
    const record = {
      id: `studio-${crypto.randomBytes(6).toString('hex')}`,
      creatorId,
      creatorName,
      title,
      description,
      category,
      controls,
      html,
      isPublic,
      plays: 0,
      likes: 0,
      createdAt: now,
      updatedAt: now,
    };

    const all = readStudioStore();
    all.unshift(record);
    writeStudioStore(all);

    return res.status(201).json({ game: sanitizeStudioRecord(record, creatorId) });
  });

  app.patch('/api/studio/games/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const creatorId = String(req.body?.creatorId || '').trim().slice(0, 128);
    if (!creatorId) {
      return res.status(400).json({ error: 'Missing creator profile ID.' });
    }

    const all = readStudioStore();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Saved game not found.' });
    }

    const existing = all[index];
    if (existing.creatorId !== creatorId) {
      return res.status(403).json({ error: 'Only the creator can modify this game.' });
    }

    const updated = {
      ...existing,
      title:
        typeof req.body?.title === 'string' && req.body.title.trim()
          ? req.body.title.trim().slice(0, 80)
          : existing.title,
      description:
        typeof req.body?.description === 'string'
          ? req.body.description.trim().slice(0, 400)
          : existing.description,
      category:
        typeof req.body?.category === 'string' && req.body.category.trim()
          ? req.body.category.trim().slice(0, 32)
          : existing.category,
      controls:
        typeof req.body?.controls === 'string'
          ? req.body.controls.trim().slice(0, 160)
          : existing.controls,
      creatorName:
        typeof req.body?.creatorName === 'string' && req.body.creatorName.trim()
          ? req.body.creatorName.trim().slice(0, 40)
          : existing.creatorName,
      html:
        typeof req.body?.html === 'string' && req.body.html.length >= 50 && req.body.html.length <= 450000
          ? req.body.html
          : existing.html,
      isPublic: typeof req.body?.isPublic === 'boolean' ? req.body.isPublic : existing.isPublic,
      updatedAt: Date.now(),
    };

    all[index] = updated;
    writeStudioStore(all);
    return res.json({ game: sanitizeStudioRecord(updated, creatorId) });
  });

  app.post('/api/studio/games/:id/play', (req, res) => {
    const id = String(req.params.id || '').trim();
    const creatorId = String(req.body?.creatorId || '').trim().slice(0, 128);
    const all = readStudioStore();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Game not found.' });
    }
    if (!all[index].isPublic && all[index].creatorId !== creatorId) {
      return res.status(403).json({ error: 'This game is private.' });
    }
    all[index] = {
      ...all[index],
      plays: Number(all[index].plays || 0) + 1,
    };
    writeStudioStore(all);
    return res.json({ game: sanitizeStudioRecord(all[index], creatorId) });
  });

  app.post('/api/studio/games/:id/like', (req, res) => {
    const id = String(req.params.id || '').trim();
    const creatorId = String(req.body?.creatorId || '').trim().slice(0, 128);
    const delta = req.body?.delta === -1 ? -1 : 1;
    const all = readStudioStore();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Game not found.' });
    }
    if (!all[index].isPublic && all[index].creatorId !== creatorId) {
      return res.status(403).json({ error: 'This game is private.' });
    }
    all[index] = {
      ...all[index],
      likes: Math.max(0, Number(all[index].likes || 0) + delta),
    };
    writeStudioStore(all);
    return res.json({ game: sanitizeStudioRecord(all[index], creatorId) });
  });

  app.delete('/api/studio/games/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const creatorId = String(req.query.creatorId || req.body?.creatorId || '').trim().slice(0, 128);
    if (!creatorId) {
      return res.status(400).json({ error: 'Missing creator profile ID.' });
    }
    const all = readStudioStore();
    const existing = all.find((item) => item.id === id);
    if (!existing) {
      return res.status(404).json({ error: 'Game not found.' });
    }
    if (existing.creatorId !== creatorId) {
      return res.status(403).json({ error: 'Only the creator can delete this game.' });
    }
    const filtered = all.filter((item) => item.id !== id);
    writeStudioStore(filtered);
    return res.json({ ok: true });
  });

  // Custom Reader / Direct Fetch Endpoint (no iframe required)
  app.get('/api/proxy/inspect', async (req, res) => {
    const targetUrl = normalizeTargetUrl(String(req.query.url || ''));
    if (!targetUrl) {
      return res.status(400).json({ error: 'Enter a valid public http(s) URL.' });
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    try {
      const upstream = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const contentType = upstream.headers.get('content-type') || 'text/plain';
      const finalUrl = upstream.url || targetUrl;
      const bodyText = await upstream.text();
      const timingMs = Date.now() - startedAt;

      if (contentType.includes('html')) {
        const parsed = extractReadableSummary(bodyText, finalUrl);
        return res.json({
          status: upstream.status,
          finalUrl,
          contentType,
          timingMs,
          kind: 'html',
          ...parsed,
        });
      }

      return res.json({
        status: upstream.status,
        finalUrl,
        contentType,
        timingMs,
        kind: 'text',
        title: finalUrl,
        description: '',
        headings: [],
        paragraphs: [bodyText.slice(0, 8000)],
        links: [],
      });
    } catch (err) {
      return res.status(502).json({
        error: err?.name === 'AbortError' ? 'Upstream request timed out.' : err?.message || 'Proxy fetch failed.',
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  // Custom Full Rewriting Web Proxy Endpoint
  app.all('/api/proxy', async (req, res) => {
    const rawUrl = String(req.query.url || '');
    const targetUrl = normalizeTargetUrl(rawUrl);
    if (!targetUrl) {
      return res.status(400).send('Invalid or restricted URL.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 16000);

    try {
      const method = req.method === 'POST' ? 'POST' : 'GET';
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: req.headers.accept || '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      const fetchOptions = {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers,
      };

      if (method === 'POST' && req.body && typeof req.body === 'object') {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(req.body)) {
          if (typeof v === 'string') params.append(k, v);
        }
        fetchOptions.body = params.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const upstream = await fetch(targetUrl, fetchOptions);
      const finalUrl = upstream.url || targetUrl;
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

      res.status(upstream.status);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Proxy-Final-Url', finalUrl);

      if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
        const html = await upstream.text();
        return res.send(rewriteHtml(html, finalUrl));
      }

      if (contentType.includes('text/css')) {
        const css = await upstream.text();
        return res.send(rewriteCssUrls(css, finalUrl));
      }

      const arrayBuf = await upstream.arrayBuffer();
      return res.send(Buffer.from(arrayBuf));
    } catch (err) {
      return res
        .status(502)
        .send(
          `<!doctype html><html><body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:24px;"><h2>Proxy Connection Error</h2><p>${
            err?.name === 'AbortError' ? 'Target site timed out.' : String(err?.message || 'Unable to reach destination.')
          }</p></body></html>`
        );
    } finally {
      clearTimeout(timeout);
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

createAppServer();
