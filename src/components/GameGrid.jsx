import { Search, X, ArrowDownAZ, Flame } from 'lucide-react';
import GameCard from './GameCard.jsx';
import { getSingleGameStats } from '../utils/storage.js';

export default function GameGrid({
  games,
  categories,
  activeCategory,
  activeView,
  sortBy,
  searchQuery,
  favorites,
  recentIds,
  statsMap,
  onSelectCategory,
  onSelectView,
  onChangeSort,
  onSearchChange,
  onResetFilters,
  onPlayGame,
  onToggleFavorite,
  onVote,
}) {
  return (
    <section
      id="game-catalog"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10"
    >
      {/* Toolbar */}
      <div className="flex flex-col gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* View switcher */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg self-start">
            <button
              type="button"
              onClick={() => onSelectView('catalog')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'catalog'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              All Games
            </button>
            <button
              type="button"
              onClick={() => onSelectView('favorites')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeView === 'favorites'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Favorites ({favorites.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectView('recent')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeView === 'recent'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Recent ({recentIds.length})
            </button>
          </div>

          {/* Sort & Search controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg self-start sm:self-auto"
              role="group"
              aria-label="Sort games"
            >
              <button
                type="button"
                onClick={() => onChangeSort('az')}
                aria-pressed={sortBy === 'az'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sortBy === 'az'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <ArrowDownAZ className="w-3.5 h-3.5" aria-hidden="true" />
                <span>A-Z</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeSort('popularity')}
                aria-pressed={sortBy === 'popularity'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sortBy === 'popularity'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Popularity</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search library..."
                aria-label="Search games"
                className="w-full pl-9 pr-9 py-2 min-h-[40px] text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category tabs & count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Game categories">
            {categories.map((cat) => {
              const selected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Showing {games.length} {games.length === 1 ? 'game' : 'games'} · Sorted by{' '}
            {sortBy === 'popularity' ? 'Popularity' : 'A-Z'}
          </p>
        </div>
      </div>

      {/* Grid or Empty state */}
      {games.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              stats={getSingleGameStats(statsMap, game.id)}
              isFavorite={favorites.includes(game.id)}
              onPlay={onPlayGame}
              onToggleFavorite={onToggleFavorite}
              onVote={onVote}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 py-14 px-6 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
            No matching games found
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {activeView === 'favorites'
              ? 'Save games using the star button on any card to build your favorites list.'
              : activeView === 'recent'
                ? 'Launch any game from the catalog and it will appear here for quick access.'
                : 'Try adjusting your search keyword or switching back to all categories.'}
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 px-4 py-2 min-h-[40px] rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold transition-colors cursor-pointer"
          >
            Show All Games
          </button>
        </div>
      )}
    </section>
  );
}
