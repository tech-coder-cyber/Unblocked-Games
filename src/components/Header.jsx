import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Clock,
  Flame,
  Gamepad2,
  Globe,
  Layers,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from 'lucide-react';

export default function Header({
  currentScreen,
  activeGameId,
  activeView,
  searchQuery,
  totalGames = 0,
  totalCategories = 0,
  favoritesCount = 0,
  totalPlays = 0,
  onSearchChange,
  onSelectLanding,
  onSelectAllGames,
  onSelectView,
  onSelectAiStudio,
  onSelectProxy,
  onSelectMiscTools,
  onOpenSettings,
}) {
  const [miscOpen, setMiscOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const dropdownRef = useRef(null);
  const mobileInputRef = useRef(null);

  const inCatalog = currentScreen === 'catalog' && !activeGameId;
  const inMisc =
    !activeGameId &&
    (currentScreen === 'proxy' || currentScreen === 'misc-tools' || currentScreen === 'ai-studio');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!miscOpen) return;

    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMiscOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setMiscOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [miscOpen]);

  const timeString = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = now.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const navLinkClass = (isActive) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 py-1 border-b-2 cursor-pointer ${
      isActive
        ? 'text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400'
        : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
    }`;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-cyan-500/20 transition-colors duration-150">
      {/* Top Info Strip: Time, Date, Library Count & Arcade Stats */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-900/75">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between gap-4 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-cyan-300 tabular-nums whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
              <span>{timeString}</span>
            </span>
            <span className="hidden xs:inline-flex sm:inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{dateString}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0 tabular-nums">
            <button
              type="button"
              onClick={() => {
                setMiscOpen(false);
                onSelectAllGames();
              }}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors whitespace-nowrap cursor-pointer"
              title="Browse all games"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
              <span>{totalGames} Games</span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{totalCategories} Genres</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setMiscOpen(false);
                onSelectView('favorites');
              }}
              className="hidden md:inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer"
              title="View saved favorites"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span>{favoritesCount} Saved</span>
            </button>

            <span className="hidden md:inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" aria-hidden="true" />
              <span>{totalPlays} Plays</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Single-line brand wordmark returns to Home */}
        <button
          type="button"
          onClick={() => {
            setMiscOpen(false);
            onSelectLanding();
          }}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500 rounded"
        >
          Recess Arcade
        </button>

        {/* Zone 2: Concise single-line navigation links + Misc. dropdown */}
        <nav aria-label="Primary navigation" className="flex items-center gap-3.5 sm:gap-5">
          <button
            type="button"
            onClick={() => {
              setMiscOpen(false);
              onSelectAllGames();
            }}
            className={navLinkClass(inCatalog && activeView === 'catalog')}
          >
            All Games
          </button>

          <button
            type="button"
            onClick={() => {
              setMiscOpen(false);
              onSelectView('favorites');
            }}
            className={`hidden md:inline-block ${navLinkClass(inCatalog && activeView === 'favorites')}`}
          >
            Favorites
          </button>

          <button
            type="button"
            onClick={() => {
              setMiscOpen(false);
              onSelectView('recent');
            }}
            className={`hidden lg:inline-block ${navLinkClass(inCatalog && activeView === 'recent')}`}
          >
            Recent
          </button>

          {/* Misc. Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMiscOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={miscOpen}
              className={`inline-flex items-center gap-1 ${navLinkClass(inMisc)}`}
            >
              <span>Misc.</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${miscOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {miscOpen && (
              <div
                role="menu"
                aria-label="Miscellaneous tools"
                className="absolute right-0 sm:left-0 mt-2.5 w-60 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/25 shadow-xl py-1.5 z-50"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMiscOpen(false);
                    onSelectAiStudio();
                  }}
                  className={`w-full px-3.5 py-2.5 flex items-center gap-3 text-left text-sm transition-colors cursor-pointer ${
                    currentScreen === 'ai-studio' && !activeGameId
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" aria-hidden="true" />
                  <div>
                    <div>AI Game Studio</div>
                    <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      Build, Save & Download
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMiscOpen(false);
                    onSelectProxy();
                  }}
                  className={`w-full px-3.5 py-2.5 flex items-center gap-3 text-left text-sm transition-colors cursor-pointer ${
                    currentScreen === 'proxy' && !activeGameId
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                  <div>
                    <div>Web Proxy</div>
                    <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      Reader & Live Viewport
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMiscOpen(false);
                    onSelectMiscTools();
                  }}
                  className={`w-full px-3.5 py-2.5 flex items-center gap-3 text-left text-sm transition-colors cursor-pointer ${
                    currentScreen === 'misc-tools' && !activeGameId
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <SlidersHorizontal
                    className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <div>
                    <div>Arcade Utilities</div>
                    <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      Tab Cloak & Stats
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Quick Search Bar + Mobile Search Toggle + Settings */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label={mobileSearchOpen ? 'Close search bar' : 'Search games'}
            aria-expanded={mobileSearchOpen}
            className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {mobileSearchOpen ? <X className="w-4 h-4" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" />}
          </button>

          <div className="relative hidden sm:block w-44 lg:w-56">
            <Search
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search games..."
              aria-label="Quick search games"
              className="w-full pl-8 pr-7 py-1.5 min-h-[38px] text-xs sm:text-sm rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear quick search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setMiscOpen(false);
              onOpenSettings();
            }}
            className="px-3.5 sm:px-4 py-2 min-h-[38px] text-xs sm:text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            Settings
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-white/95 dark:bg-slate-950/95">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={mobileInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search all games..."
              aria-label="Search games on mobile"
              className="w-full pl-9 pr-8 py-2 min-h-[40px] text-sm rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear mobile search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
