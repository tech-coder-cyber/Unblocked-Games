const THEME_KEY = 'recess_theme';
const FAVORITES_KEY = 'recess_favorites';
const RECENT_KEY = 'recess_recent';
const STATS_KEY = 'recess_game_stats';
const CLOAK_KEY = 'recess_tab_cloak';

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
    return Array.isArray(parsed) ? parsed : [];
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
    return Array.isArray(parsed) ? parsed : [];
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

export function getGameStatsMap() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
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

export function clearAllSiteData() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Ignore storage clear errors
  }
  applyTabCloak('default');
  const fallbackTheme = 'dark';
  document.documentElement.classList.add('dark');
  return fallbackTheme;
}

const CREATOR_PROFILE_KEY = 'recess_creator_profile';
const STUDIO_LIKES_KEY = 'recess_studio_likes';

function generateCreatorId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `creator-${crypto.randomUUID()}`;
  }
  return `creator-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getCreatorProfile() {
  try {
    const raw = localStorage.getItem(CREATOR_PROFILE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.id === 'string' && parsed.id.trim()) {
      return {
        id: parsed.id,
        name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'ArcadeBuilder',
      };
    }
  } catch {
    // Ignore storage access errors
  }

  const created = {
    id: generateCreatorId(),
    name: 'ArcadeBuilder',
  };
  saveCreatorProfile(created);
  return created;
}

export function saveCreatorProfile(profile) {
  try {
    localStorage.setItem(CREATOR_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage write errors
  }
}

export function getLikedStudioIds() {
  try {
    const raw = localStorage.getItem(STUDIO_LIKES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLikedStudioIds(ids) {
  try {
    localStorage.setItem(STUDIO_LIKES_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage write errors
  }
}

