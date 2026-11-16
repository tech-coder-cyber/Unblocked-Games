const THEME_KEY = 'recess_theme';
const FAVORITES_KEY = 'recess_favorites';
const RECENT_KEY = 'recess_recent';
const STATS_KEY = 'recess_game_stats';
const USER_VOTES_KEY = 'recess_user_votes';
const CLOAK_KEY = 'recess_tab_cloak';
const PREFS_KEY = 'recess_prefs';

export const TAB_CLOAK_PRESETS = [
  {
    id: 'default',
    label: 'Recess Arcade (Default)',
    title: 'Recess Arcade — Unblocked Browser Games',
    icon: '',
  },
  {
    id: 'classroom',
    label: 'Google Classroom',
    title: 'Home - Classroom',
    icon: 'https://ssl.gstatic.com/classroom/favicon.png',
  },
  {
    id: 'docs',
    label: 'Google Docs',
    title: 'Untitled document - Google Docs',
    icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
  },
  {
    id: 'drive',
    label: 'Google Drive',
    title: 'My Drive - Google Drive',
    icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png',
  },
];

export const ACCENT_PRESETS = [
  { id: 'cyan', label: 'Ocean Cyan', swatch: '#06b6d4' },
  { id: 'emerald', label: 'Arcade Emerald', swatch: '#10b981' },
  { id: 'violet', label: 'Electric Violet', swatch: '#8b5cf6' },
  { id: 'amber', label: 'Solar Amber', swatch: '#f59e0b' },
];

export const PANIC_URL_PRESETS = [
  { label: 'Google Classroom', url: 'https://classroom.google.com' },
  { label: 'Google Docs', url: 'https://docs.google.com' },
  { label: 'Google Drive', url: 'https://drive.google.com' },
  { label: 'Khan Academy', url: 'https://www.khanacademy.org' },
];

export const DEFAULT_PREFS = {
  accent: 'cyan',
  startScreen: 'home',
  defaultSort: 'az',
  gridDensity: 'comfortable',
  showDescriptions: true,
  showTopStrip: true,
  reducedMotion: false,
  panicEnabled: false,
  panicUrl: 'https://classroom.google.com',
};

const VALID_ACCENTS = new Set(ACCENT_PRESETS.map((a) => a.id));

export function normalizePanicUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_PREFS.panicUrl;
  try {
    const parsed = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    // Fallback to default
  }
  return DEFAULT_PREFS.panicUrl;
}

export function normalizePrefs(input) {
  const src = input && typeof input === 'object' ? input : {};
  return {
    accent: VALID_ACCENTS.has(src.accent) ? src.accent : DEFAULT_PREFS.accent,
    startScreen: src.startScreen === 'catalog' ? 'catalog' : 'home',
    defaultSort: src.defaultSort === 'popularity' ? 'popularity' : 'az',
    gridDensity: src.gridDensity === 'compact' ? 'compact' : 'comfortable',
    showDescriptions: typeof src.showDescriptions === 'boolean' ? src.showDescriptions : DEFAULT_PREFS.showDescriptions,
    showTopStrip: typeof src.showTopStrip === 'boolean' ? src.showTopStrip : DEFAULT_PREFS.showTopStrip,
    reducedMotion: typeof src.reducedMotion === 'boolean' ? src.reducedMotion : DEFAULT_PREFS.reducedMotion,
    panicEnabled: typeof src.panicEnabled === 'boolean' ? src.panicEnabled : DEFAULT_PREFS.panicEnabled,
    panicUrl: normalizePanicUrl(src.panicUrl),
  };
}

export function getUserPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function applyUserPrefs(prefs) {
  const safe = normalizePrefs(prefs);
  document.documentElement.dataset.accent = safe.accent;
  document.documentElement.classList.toggle('reduce-motion', Boolean(safe.reducedMotion));
}

export function saveUserPrefs(nextPrefs) {
  const safe = normalizePrefs(nextPrefs);
  applyUserPrefs(safe);
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(safe));
  } catch {
    // Ignore storage write errors
  }
  return safe;
}

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }
  return 'dark';
}

export function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage write errors
  }
}

export function getInitialCloak() {
  try {
    const saved = localStorage.getItem(CLOAK_KEY);
    if (TAB_CLOAK_PRESETS.some((p) => p.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'default';
}

export function applyTabCloak(presetId) {
  const preset = TAB_CLOAK_PRESETS.find((p) => p.id === presetId) || TAB_CLOAK_PRESETS[0];
  document.title = preset.title;

  let linkEl = document.querySelector("link[rel~='icon']");
  if (preset.icon) {
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'icon';
      document.head.appendChild(linkEl);
    }
    linkEl.href = preset.icon;
  } else if (linkEl) {
    linkEl.remove();
  }

  try {
    localStorage.setItem(CLOAK_KEY, preset.id);
  } catch {
    // Ignore storage errors
  }
}

export function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavorites(ids) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage write errors
  }
}

export function getRecentGames() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function recordRecentGame(gameId) {
  const existing = getRecentGames().filter((entry) => entry && entry.id !== gameId);
  const updated = [{ id: gameId, playedAt: Date.now() }, ...existing].slice(0, 12);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage write errors
  }
  return updated;
}

export function getLocalVotesMap() {
  try {
    const raw = localStorage.getItem(USER_VOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const clean = {};
        for (const [id, vote] of Object.entries(parsed)) {
          if (vote === 'like' || vote === 'dislike') clean[id] = vote;
        }
        return clean;
      }
    }
    // Fallback migration from legacy per-device stats map
    const legacy = getGameStatsMapRaw();
    const migrated = {};
    for (const [id, entry] of Object.entries(legacy)) {
      if (entry?.userVote === 'like' || entry?.userVote === 'dislike') {
        migrated[id] = entry.userVote;
      }
    }
    return migrated;
  } catch {
    return {};
  }
}

export function saveLocalVotesMap(votesMap) {
  try {
    localStorage.setItem(USER_VOTES_KEY, JSON.stringify(votesMap || {}));
  } catch {
    // Ignore storage write errors
  }
}

function getGameStatsMapRaw() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function mergeStatsWithLocalVotes(serverStats, localVotes = getLocalVotesMap()) {
  const merged = {};
  const source = serverStats && typeof serverStats === 'object' ? serverStats : {};
  const allIds = new Set([...Object.keys(source), ...Object.keys(localVotes || {})]);
  for (const gameId of allIds) {
    const entry = source[gameId];
    const vote = localVotes?.[gameId];
    merged[gameId] = {
      plays: Math.max(0, Number(entry?.plays || 0) || 0),
      likes: Math.max(0, Number(entry?.likes || 0) || 0),
      dislikes: Math.max(0, Number(entry?.dislikes || 0) || 0),
      userVote: vote === 'like' || vote === 'dislike' ? vote : null,
    };
  }
  return merged;
}

export function getGameStatsMap() {
  return mergeStatsWithLocalVotes(getGameStatsMapRaw(), getLocalVotesMap());
}

function saveGameStatsMap(statsMap) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(statsMap));
  } catch {
    // Ignore storage write errors
  }
}

export function getSingleGameStats(statsMap, gameId) {
  const entry = statsMap && statsMap[gameId];
  return {
    plays: Number(entry?.plays || 0),
    likes: Number(entry?.likes || 0),
    dislikes: Number(entry?.dislikes || 0),
    userVote: entry?.userVote === 'like' || entry?.userVote === 'dislike' ? entry.userVote : null,
  };
}

export function incrementGamePlays(gameId) {
  const map = getGameStatsMap();
  const current = getSingleGameStats(map, gameId);
  const next = {
    ...map,
    [gameId]: {
      ...current,
      plays: current.plays + 1,
    },
  };
  saveGameStatsMap(next);
  return next;
}

export function toggleGameVote(gameId, voteType) {
  const map = getGameStatsMap();
  const localVotes = getLocalVotesMap();
  const current = getSingleGameStats(map, gameId);
  let { likes, dislikes, userVote } = current;

  if (userVote === voteType) {
    if (voteType === 'like') likes = Math.max(0, likes - 1);
    if (voteType === 'dislike') dislikes = Math.max(0, dislikes - 1);
    userVote = null;
  } else {
    if (userVote === 'like') likes = Math.max(0, likes - 1);
    if (userVote === 'dislike') dislikes = Math.max(0, dislikes - 1);
    if (voteType === 'like') likes += 1;
    if (voteType === 'dislike') dislikes += 1;
    userVote = voteType;
  }

  const nextVotes = { ...localVotes };
  if (userVote) {
    nextVotes[gameId] = userVote;
  } else {
    delete nextVotes[gameId];
  }
  saveLocalVotesMap(nextVotes);

  const next = {
    ...map,
    [gameId]: {
      ...current,
      likes,
      dislikes,
      userVote,
    },
  };
  saveGameStatsMap(next);
  return next;
}

export async function fetchServerStats() {
  const res = await fetch('/api/stats', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch stats (${res.status})`);
  }
  const data = await res.json();
  const merged = mergeStatsWithLocalVotes(data?.stats || {}, getLocalVotesMap());
  saveGameStatsMap(merged);
  return merged;
}

export async function postServerPlay(gameId) {
  const res = await fetch(`/api/stats/${encodeURIComponent(gameId)}/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  });
  if (!res.ok) {
    throw new Error(`Failed to record play (${res.status})`);
  }
  const data = await res.json();
  const merged = mergeStatsWithLocalVotes(data?.allStats || {}, getLocalVotesMap());
  saveGameStatsMap(merged);
  return merged;
}

export async function postServerVote(gameId, prevVote, nextVote) {
  const res = await fetch(`/api/stats/${encodeURIComponent(gameId)}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prevVote: prevVote || null, nextVote: nextVote || null }),
    keepalive: true,
  });
  if (!res.ok) {
    throw new Error(`Failed to record vote (${res.status})`);
  }
  const data = await res.json();
  const merged = mergeStatsWithLocalVotes(data?.allStats || {}, getLocalVotesMap());
  saveGameStatsMap(merged);
  return merged;
}

export function getSiteDataSummary() {
  let favoritesCount = 0;
  let recentCount = 0;
  let trackedGamesCount = 0;
  let totalBytes = 0;

  try {
    favoritesCount = getFavorites().length;
    recentCount = getRecentGames().length;
    trackedGamesCount = Object.keys(getGameStatsMap()).length;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      totalBytes += (key.length + val.length) * 2;
    }

    for (let j = 0; j < sessionStorage.length; j++) {
      const sKey = sessionStorage.key(j);
      if (!sKey) continue;
      const sVal = sessionStorage.getItem(sKey) || '';
      totalBytes += (sKey.length + sVal.length) * 2;
    }
  } catch {
    // Ignore storage inspection errors
  }

  return {
    favoritesCount,
    recentCount,
    trackedGamesCount,
    totalBytes,
  };
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function exportAllSiteData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    theme: getInitialTheme(),
    tabCloak: getInitialCloak(),
    prefs: getUserPrefs(),
    favorites: getFavorites(),
    recent: getRecentGames(),
    statsMap: getGameStatsMap(),
  };
}

export function importAllSiteData(rawInput) {
  const parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Backup file must be a JSON object.');
  }

  const nextTheme = parsed.theme === 'light' ? 'light' : 'dark';
  const nextCloak = TAB_CLOAK_PRESETS.some((p) => p.id === parsed.tabCloak)
    ? parsed.tabCloak
    : 'default';
  const nextPrefs = normalizePrefs(parsed.prefs);
  const nextFavorites = Array.isArray(parsed.favorites)
    ? Array.from(new Set(parsed.favorites.filter((id) => typeof id === 'string')))
    : [];
  const nextRecent = Array.isArray(parsed.recent)
    ? parsed.recent
        .filter((r) => r && typeof r.id === 'string')
        .map((r) => ({ id: r.id, playedAt: Number(r.playedAt || Date.now()) }))
        .slice(0, 12)
    : [];

  const nextStats = {};
  const nextVotes = {};
  if (parsed.statsMap && typeof parsed.statsMap === 'object' && !Array.isArray(parsed.statsMap)) {
    for (const [id, entry] of Object.entries(parsed.statsMap)) {
      if (typeof id !== 'string' || !entry || typeof entry !== 'object') continue;
      const vote = entry.userVote === 'like' || entry.userVote === 'dislike' ? entry.userVote : null;
      if (vote) nextVotes[id] = vote;
      nextStats[id] = {
        plays: Math.max(0, Number(entry.plays || 0) || 0),
        likes: Math.max(0, Number(entry.likes || 0) || 0),
        dislikes: Math.max(0, Number(entry.dislikes || 0) || 0),
        userVote: vote,
      };
    }
  }

  applyTheme(nextTheme);
  applyTabCloak(nextCloak);
  saveUserPrefs(nextPrefs);
  saveFavorites(nextFavorites);
  saveLocalVotesMap(nextVotes);
  saveGameStatsMap(nextStats);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
  } catch {
    // Ignore storage errors
  }

  return {
    theme: nextTheme,
    tabCloak: nextCloak,
    prefs: nextPrefs,
    favorites: nextFavorites,
    recent: nextRecent,
    statsMap: nextStats,
  };
}

export function clearAllSiteData() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Ignore storage clear errors
  }
  applyTabCloak('default');
  applyUserPrefs(DEFAULT_PREFS);
  const fallbackTheme = 'dark';
  document.documentElement.classList.add('dark');
  return {
    theme: fallbackTheme,
    prefs: { ...DEFAULT_PREFS },
  };
}
