export default function Header({
  activeView,
  activeCategory,
  onSelectHome,
  onSelectCategory,
  onSelectView,
  onOpenSettings,
}) {
  const navLinkClass = (isActive) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 py-1 border-b-2 cursor-pointer ${
      isActive
        ? 'text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400'
        : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
    }`;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-cyan-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={onSelectHome}
          className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500 rounded"
        >
          Recess Arcade
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={onSelectHome}
            className={navLinkClass(activeView === 'catalog' && activeCategory === 'All')}
          >
            All Games
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('Rhythm')}
            className={navLinkClass(activeView === 'catalog' && activeCategory === 'Rhythm')}
          >
            Rhythm
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('Sports')}
            className={navLinkClass(activeView === 'catalog' && activeCategory === 'Sports')}
          >
            Sports
          </button>
          <button
            type="button"
            onClick={() => onSelectView('favorites')}
            className={navLinkClass(activeView === 'favorites')}
          >
            Favorites
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-4 py-2 min-h-[40px] text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}
