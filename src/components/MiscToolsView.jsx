import { ArrowLeft, EyeOff, Check } from 'lucide-react';
import { TAB_CLOAK_PRESETS } from '../utils/storage.js';

export default function MiscToolsView({
  games,
  tabCloak,
  onChangeCloak,
  onPlayGame,
  onBackToCatalog,
}) {
  const sortedGames = [...games].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
            Arcade Utilities
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Customize your browser tab disguise and jump directly to any title in the library.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors self-start cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Games</span>
        </button>
      </div>

      {/* Tab Cloak Utility */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-cyan-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <EyeOff className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">
              Tab Cloak
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Instantly rename your browser tab title and icon. Reset anytime in Settings → Clear Site Data.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TAB_CLOAK_PRESETS.map((preset) => {
            const active = tabCloak === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangeCloak(preset.id)}
                aria-pressed={active}
                className={`flex items-center justify-between gap-3 px-4 py-3 min-h-[48px] rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-500 text-cyan-900 dark:text-cyan-200'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="text-sm font-semibold truncate">{preset.label}</span>
                {active && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Launch Directory */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">
            Quick Game Directory
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            {sortedGames.length} {sortedGames.length === 1 ? 'Title' : 'Titles'}
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {sortedGames.map((game, idx) => (
            <div
              key={game.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-white dark:bg-slate-950/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-xs font-mono font-bold text-slate-400 tabular-nums shrink-0">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                    {game.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {game.category} · {game.players} · {game.difficulty}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPlayGame(game)}
                className="px-3.5 py-1.5 min-h-[34px] rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Play
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
