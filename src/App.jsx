import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import HeroSpotlight from './components/HeroSpotlight.jsx';
import GameGrid from './components/GameGrid.jsx';
import GamePlayer from './components/GamePlayer.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import {
  applyTheme,
  clearAllSiteData,
  getFavorites,
  getGameStatsMap,
  getInitialTheme,
  getRecentGames,
  getSingleGameStats,
  incrementGamePlays,
  recordRecentGame,
  saveFavorites,
  toggleGameVote,
} from './utils/storage.js';

export default function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [theme, setTheme] = useState(() => getInitialTheme());
  const [favorites, setFavorites] = useState(() => getFavorites());
  const [recentList, setRecentList] = useState(() => getRecentGames());
  const [statsMap, setStatsMap] = useState(() => getGameStatsMap());

  const [activeGameId, setActiveGameId] = useState(null);
  const [activeView, setActiveView] = useState('catalog'); // 'catalog' | 'favorites' | 'recent'
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('az'); // 'az' | 'popularity'
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCatalog() {
      try {
        setLoading(true);
        setLoadError('');
        const res = await fetch('/data/games.json', { cache: 'no-store' });
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

  const featuredGame = useMemo(() => {
    return games.find((g) => g.featured) || games[0] || null;
  }, [games]);

  const recentIds = useMemo(() => recentList.map((r) => r.id), [recentList]);

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

  const handlePlayGame = (game) => {
    setActiveGameId(game.id);
    setRecentList(recordRecentGame(game.id));
    setStatsMap(incrementGamePlays(game.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVote = (gameId, voteType) => {
    setStatsMap(toggleGameVote(gameId, voteType));
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

  const handleSelectHome = () => {
    setActiveGameId(null);
    setActiveView('catalog');
    setActiveCategory('All');
    setSearchQuery('');
  };

  const handleSelectCategory = (category) => {
    setActiveGameId(null);
    setActiveView('catalog');
    setActiveCategory(category);
  };

  const handleSelectView = (view) => {
    setActiveGameId(null);
    setActiveView(view);
  };

  const handleResetFilters = () => {
    setActiveView('catalog');
    setActiveCategory('All');
    setSortBy('az');
    setSearchQuery('');
  };

  const handleClearSiteData = () => {
    const resetTheme = clearAllSiteData();
    setTheme(resetTheme);
    setFavorites([]);
    setRecentList([]);
    setStatsMap({});
    setReloadSignal((s) => s + 1);
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('game-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      id="top"
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150"
    >
      <Header
        activeView={activeView}
        activeCategory={activeCategory}
        onSelectHome={handleSelectHome}
        onSelectCategory={handleSelectCategory}
        onSelectView={handleSelectView}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 pb-12">
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
              className="mt-4 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-bold cursor-pointer"
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
        ) : (
          <>
            {activeView === 'catalog' && activeCategory === 'All' && !searchQuery && (
              <HeroSpotlight
                featuredGame={featuredGame}
                stats={featuredGame ? getSingleGameStats(statsMap, featuredGame.id) : { plays: 0, likes: 0, dislikes: 0 }}
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
              searchQuery={searchQuery}
              favorites={favorites}
              recentIds={recentIds}
              statsMap={statsMap}
              onSelectCategory={setActiveCategory}
              onSelectView={setActiveView}
              onChangeSort={setSortBy}
              onSearchChange={setSearchQuery}
              onResetFilters={handleResetFilters}
              onPlayGame={handlePlayGame}
              onToggleFavorite={handleToggleFavorite}
              onVote={handleVote}
            />
          </>
        )}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        theme={theme}
        onChangeTheme={setTheme}
        onClearSiteData={handleClearSiteData}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
