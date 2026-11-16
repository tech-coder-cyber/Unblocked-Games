import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

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

const STATS_DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE_PATH = path.join(STATS_DATA_DIR, 'game-stats.json');

function sanitizeGameId(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return /^[a-z0-9-]{1,64}$/.test(trimmed) ? trimmed : null;
}

function normalizeStatEntry(entry) {
  return {
    plays: Math.max(0, Math.floor(Number(entry?.plays) || 0)),
    likes: Math.max(0, Math.floor(Number(entry?.likes) || 0)),
    dislikes: Math.max(0, Math.floor(Number(entry?.dislikes) || 0)),
  };
}

function loadStatsFromDisk() {
  try {
    if (!fs.existsSync(STATS_FILE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(STATS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const source = parsed && typeof parsed.stats === 'object' ? parsed.stats : parsed;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return {};
    }
    const normalized = {};
    for (const [key, val] of Object.entries(source)) {
      const id = sanitizeGameId(key);
      if (!id || !val || typeof val !== 'object') continue;
      normalized[id] = normalizeStatEntry(val);
    }
    return normalized;
  } catch (err) {
    console.warn('Could not read persisted game stats, starting fresh:', err?.message || err);
    return {};
  }
}

const statsStore = loadStatsFromDisk();
let statsWriteChain = Promise.resolve();

function persistStatsToDisk() {
  const snapshot = JSON.stringify({ version: 1, stats: statsStore }, null, 2);
  statsWriteChain = statsWriteChain
    .then(async () => {
      await fs.promises.mkdir(STATS_DATA_DIR, { recursive: true });
      const tmpPath = `${STATS_FILE_PATH}.tmp`;
      await fs.promises.writeFile(tmpPath, snapshot, 'utf8');
      await fs.promises.rename(tmpPath, STATS_FILE_PATH);
    })
    .catch((err) => {
      console.error('Failed to persist game stats:', err);
    });
  return statsWriteChain;
}

function getOrCreateStatEntry(gameId) {
  if (!statsStore[gameId]) {
    statsStore[gameId] = { plays: 0, likes: 0, dislikes: 0 };
  }
  return statsStore[gameId];
}

async function createAppServer() {
  const app = express();
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/stats', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ stats: statsStore });
  });

  app.post('/api/stats/:gameId/play', async (req, res) => {
    const gameId = sanitizeGameId(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game id.' });
    }
    const entry = getOrCreateStatEntry(gameId);
    entry.plays += 1;
    await persistStatsToDisk();
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ gameId, stats: entry, allStats: statsStore });
  });

  app.post('/api/stats/:gameId/vote', async (req, res) => {
    const gameId = sanitizeGameId(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: 'Invalid game id.' });
    }
    const normalizeVote = (val) => (val === 'like' || val === 'dislike' ? val : null);
    const prevVote = normalizeVote(req.body?.prevVote);
    const nextVote = normalizeVote(req.body?.nextVote);

    const entry = getOrCreateStatEntry(gameId);
    if (prevVote !== nextVote) {
      if (prevVote === 'like') entry.likes = Math.max(0, entry.likes - 1);
      if (prevVote === 'dislike') entry.dislikes = Math.max(0, entry.dislikes - 1);
      if (nextVote === 'like') entry.likes += 1;
      if (nextVote === 'dislike') entry.dislikes += 1;
      await persistStatsToDisk();
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ gameId, stats: entry, allStats: statsStore });
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
