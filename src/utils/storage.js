const THEME_KEY = 'recess_theme';
const FAVORITES_KEY = 'recess_favorites';
const RECENT_KEY = 'recess_recent';
const STATS_KEY = 'recess_game_stats';

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
  const fallbackTheme = 'dark';
  document.documentElement.classList.add('dark');
  return fallbackTheme;
}
