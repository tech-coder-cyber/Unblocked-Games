import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Header from './components/Header.jsx';
import HomeLanding from './components/HomeLanding.jsx';
import HeroSpotlight from './components/HeroSpotlight.jsx';
import GameGrid from './components/GameGrid.jsx';
import GamePlayer from './components/GamePlayer.jsx';
import WebProxyView from './components/WebProxyView.jsx';
import MiscToolsView from './components/MiscToolsView.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import {
  applyTabCloak,
  applyTheme,
  applyUserPrefs,
  clearAllSiteData,
  fetchServerStats,
  getFavorites,
  getGameStatsMap,
  getInitialCloak,
  getInitialTheme,
  getRecentGames,
  getSingleGameStats,
  getUserPrefs,
  incrementGamePlays,
  normalizePanicUrl,
  postServerPlay,
  postServerVote,
  recordRecentGame,
  saveFavorites,
  saveUserPrefs,
  toggleGameVote,
  importAllSiteData,
} from './utils/storage.js';

export default function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [theme, setTheme] = useState(() => getInitialTheme());
  const [tabCloak, setTabCloak] = useState(() => getInitialCloak());
  const [prefs, setPrefs] = useState(() => getUserPrefs());
  const [favorites, setFavorites] = useState(() => getFavorites());
  const [recentList, setRecentList] = useState(() => getRecentGames());
  const [statsMap, setStatsMap] = useState(() => getGameStatsMap());

  const [currentScreen, setCurrentScreen] = useState(() => prefs.startScreen); // 'home' | 'catalog' | 'proxy' | 'misc-tools'
  const [activeGameId, setActiveGameId] = useState(null);
  const [activeView, setActiveView] = useState('catalog'); // 'catalog' | 'favorites' | 'recent'
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState(() => prefs.defaultSort); // 'az' | 'popularity'
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reloadSignal, setReloadSignal] = useState(0);
  const pendingStatsOpsRef = useRef(0);

  const syncStatsFromServer = useCallback(async () => {
    if (pendingStatsOpsRef.current > 0) return;
    try {
      const synced = await fetchServerStats();
      if (pendingStatsOpsRef.current === 0) {
        setStatsMap(synced);
      }
    } catch {
      // Keep cached stats if server is temporarily unreachable
    }
  }, []);

  useEffect(() => {
    syncStatsFromServer();
    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        syncStatsFromServer();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    const intervalId = window.setInterval(syncStatsFromServer, 10000);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [syncStatsFromServer]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyTabCloak(tabCloak);
  }, [tabCloak]);

  useEffect(() => {
    applyUserPrefs(prefs);
  }, [prefs]);

  // Global Panic Key shortcut (Shift + P outside text inputs)
  useEffect(() => {
    if (!prefs.panicEnabled) return undefined;

    function handlePanicKey(e) {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'P' && e.key !== 'p') return;
      const target = e.target;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      window.location.replace(normalizePanicUrl(prefs.panicUrl));
    }

    window.addEventListener('keydown', handlePanicKey);
    return () => window.removeEventListener('keydown', handlePanicKey);
  }, [prefs.panicEnabled, prefs.panicUrl]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCatalog() {
      try {
        setLoading(true);
        setLoadError('');
        const res = await fetch('./data/games.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Failed to load catalog (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) {
          setGames(Array.isArray(data.games) ? data.games : []);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || 'Unable to load games.json');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(games.map((g) => g.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    return ['All', ...unique];
  }, [games]);

  // Ensure stale or removed categories reset automatically to All
  useEffect(() => {
    if (activeCategory !== 'All' && categories.length > 1 && !categories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [categories, activeCategory]);

  const featuredGame = useMemo(() => {
    return games.find((g) => g.featured) || games[0] || null;
  }, [games]);

  const recentIds = useMemo(() => recentList.map((r) => r.id), [recentList]);

  const totalGamesCount = useMemo(
    () =>
      games.reduce(
        (sum, game) => sum + (Array.isArray(game.versions) && game.versions.length > 0 ? game.versions.length : 1),
        0
      ),
    [games]
  );

  const totalPlays = useMemo(
    () => Object.values(statsMap || {}).reduce((sum, entry) => sum + (entry?.plays || 0), 0),
    [statsMap]
  );

  const filteredGames = useMemo(() => {
    let list = [...games];

    if (activeView === 'favorites') {
      list = list.filter((g) => favorites.includes(g.id));
    } else if (activeView === 'recent') {
      const recentSet = new Set(recentIds);
      list = list.filter((g) => recentSet.has(g.id));
    }

    if (activeCategory !== 'All') {
      list = list.filter((g) => g.category === activeCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'popularity') {
      list.sort((a, b) => {
        const sa = getSingleGameStats(statsMap, a.id);
        const sb = getSingleGameStats(statsMap, b.id);
        if (sb.plays !== sa.plays) return sb.plays - sa.plays;
        const netB = sb.likes - sb.dislikes;
        const netA = sa.likes - sa.dislikes;
        if (netB !== netA) return netB - netA;
        return a.title.localeCompare(b.title);
      });
    } else {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [games, activeView, activeCategory, searchQuery, sortBy, favorites, recentIds, statsMap]);

  const activeGame = useMemo(
    () => games.find((g) => g.id === activeGameId) || null,
    [games, activeGameId]
  );

  const handleUpdatePrefs = (patch) => {
    setPrefs((prev) => {
      const updated = saveUserPrefs({ ...prev, ...patch });
      if (patch.defaultSort && (patch.defaultSort === 'az' || patch.defaultSort === 'popularity')) {
        setSortBy(patch.defaultSort);
      }
      return updated;
    });
  };

  const handlePlayGame = (game) => {
    setCurrentScreen('catalog');
    setActiveGameId(game.id);
    setRecentList(recordRecentGame(game.id));
    setStatsMap(incrementGamePlays(game.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });

    pendingStatsOpsRef.current += 1;
    postServerPlay(game.id)
      .then((synced) => {
        setStatsMap(synced);
      })
      .catch(() => {})
      .finally(() => {
        pendingStatsOpsRef.current = Math.max(0, pendingStatsOpsRef.current - 1);
      });
  };

  const handleVote = (gameId, voteType) => {
    const prevVote = getSingleGameStats(statsMap, gameId).userVote;
    const optimistic = toggleGameVote(gameId, voteType);
    const nextVote = getSingleGameStats(optimistic, gameId).userVote;
    setStatsMap(optimistic);

    pendingStatsOpsRef.current += 1;
    postServerVote(gameId, prevVote, nextVote)
      .then((synced) => {
        setStatsMap(synced);
      })
      .catch(() => {})
      .finally(() => {
        pendingStatsOpsRef.current = Math.max(0, pendingStatsOpsRef.current - 1);
      });
  };

  const handleToggleFavorite = (gameId) => {
    setFavorites((prev) => {
      const next = prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId];
      saveFavorites(next);
      return next;
    });
  };

  const handleSelectLanding = () => {
    setActiveGameId(null);
    setCurrentScreen('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAllGames = () => {
    setActiveGameId(null);
    setCurrentScreen('catalog');
    setActiveView('catalog');
    setActiveCategory('All');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectView = (view) => {
    setActiveGameId(null);
    setCurrentScreen('catalog');
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProxy = () => {
    setActiveGameId(null);
    setCurrentScreen('proxy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMiscTools = () => {
    setActiveGameId(null);
    setCurrentScreen('misc-tools');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHeaderSearchChange = (value) => {
    setSearchQuery(value);
    if (value.trim()) {
      setActiveGameId(null);
      setCurrentScreen('catalog');
      setActiveView('catalog');
    }
  };

  const handleResetFilters = () => {
    setActiveView('catalog');
    setActiveCategory('All');
    setSortBy(prefs.defaultSort);
    setSearchQuery('');
  };

  const handleImportSiteData = (raw) => {
    const restored = importAllSiteData(raw);
    setTheme(restored.theme);
    setTabCloak(restored.tabCloak);
    setPrefs(restored.prefs);
    setSortBy(restored.prefs.defaultSort);
    setFavorites(restored.favorites);
    setRecentList(restored.recent);
    setStatsMap(restored.statsMap);
    setReloadSignal((s) => s + 1);
  };

  const handleClearSiteData = () => {
    const { theme: resetTheme, prefs: resetPrefs } = clearAllSiteData();
    setTheme(resetTheme);
    setPrefs(resetPrefs);
    setSortBy(resetPrefs.defaultSort);
    setTabCloak('default');
    setFavorites([]);
    setRecentList([]);
    setStatsMap({});
    setReloadSignal((s) => s + 1);
    syncStatsFromServer();
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('game-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const viewTransitionKey = loading
    ? 'loading'
    : loadError
      ? 'error'
      : activeGame
        ? `player-${activeGame.id}`
        : currentScreen;

  return (
    <div
      id="top"
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200"
    >
      <Header
        currentScreen={currentScreen}
        activeGameId={activeGameId}
        activeView={activeView}
        searchQuery={searchQuery}
        showTopStrip={prefs.showTopStrip}
        totalGames={totalGamesCount}
        totalCategories={Math.max(0, categories.length - 1)}
        favoritesCount={favorites.length}
        totalPlays={totalPlays}
        onSearchChange={handleHeaderSearchChange}
        onSelectLanding={handleSelectLanding}
        onSelectAllGames={handleSelectAllGames}
        onSelectView={handleSelectView}
        onSelectProxy={handleSelectProxy}
        onSelectMiscTools={handleSelectMiscTools}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewTransitionKey}
            initial={prefs.reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefs.reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: prefs.reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {loading ? (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Loading game catalog...
                </p>
              </div>
            ) : loadError ? (
              <div className="max-w-xl mx-auto px-4 py-20 text-center">
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
                  Unable to load games catalog
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{loadError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 rounded-lg accent-solid-btn text-sm font-bold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : activeGame ? (
              <GamePlayer
                game={activeGame}
                allGames={games}
                theme={theme}
                stats={getSingleGameStats(statsMap, activeGame.id)}
                isFavorite={favorites.includes(activeGame.id)}
                reloadSignal={reloadSignal}
                onBack={() => setActiveGameId(null)}
                onSelectGame={handlePlayGame}
                onToggleFavorite={handleToggleFavorite}
                onVote={handleVote}
              />
            ) : currentScreen === 'home' ? (
              <HomeLanding
                games={games}
                statsMap={statsMap}
                sortBy={sortBy}
                showTopStrip={prefs.showTopStrip}
                reducedMotion={prefs.reducedMotion}
                onChangeSort={setSortBy}
                onEnterCatalog={handleSelectAllGames}
                onPlayGame={handlePlayGame}
              />
            ) : currentScreen === 'proxy' ? (
              <WebProxyView onBackToCatalog={handleSelectAllGames} />
            ) : currentScreen === 'misc-tools' ? (
              <MiscToolsView
                games={games}
                statsMap={statsMap}
                tabCloak={tabCloak}
                onChangeCloak={setTabCloak}
                onPlayGame={handlePlayGame}
                onBackToCatalog={handleSelectAllGames}
              />
            ) : (
              <div className="pb-12">
                {activeView === 'catalog' && activeCategory === 'All' && !searchQuery && (
                  <HeroSpotlight
                    featuredGame={featuredGame}
                    stats={
                      featuredGame
                        ? getSingleGameStats(statsMap, featuredGame.id)
                        : { plays: 0, likes: 0, dislikes: 0 }
                    }
                    onPlayGame={handlePlayGame}
                    onBrowseAll={scrollToCatalog}
                  />
                )}
                <GameGrid
                  games={filteredGames}
                  categories={categories}
                  activeCategory={activeCategory}
                  activeView={activeView}
                  sortBy={sortBy}
                  gridDensity={prefs.gridDensity}
                  showDescriptions={prefs.showDescriptions}
                  searchQuery={searchQuery}
                  favorites={favorites}
                  recentIds={recentIds}
                  statsMap={statsMap}
                  onSelectCategory={setActiveCategory}
                  onSelectView={setActiveView}
                  onChangeSort={setSortBy}
                  onChangeDensity={(density) => handleUpdatePrefs({ gridDensity: density })}
                  onSearchChange={setSearchQuery}
                  onResetFilters={handleResetFilters}
                  onPlayGame={handlePlayGame}
                  onToggleFavorite={handleToggleFavorite}
                  onVote={handleVote}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        theme={theme}
        prefs={prefs}
        tabCloak={tabCloak}
        onChangeTheme={setTheme}
        onUpdatePrefs={handleUpdatePrefs}
        onChangeCloak={setTabCloak}
        onImportSiteData={handleImportSiteData}
        onClearSiteData={handleClearSiteData}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
