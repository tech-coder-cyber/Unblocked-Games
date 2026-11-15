import { useState } from 'react';
import { Play, Gamepad2, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function HeroSpotlight({ featuredGame, stats, onPlayGame, onBrowseAll }) {
  const [imgError, setImgError] = useState(false);

  if (!featuredGame) return null;

  return (
    <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800/80">
      {/* Subtle blurred cover backdrop inspired by launcher UI */}
      {!imgError && featuredGame.thumbnail && (
        <div className="absolute inset-0 pointer-events-none hidden dark:block" aria-hidden="true">
          <img
            src={featuredGame.thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-15 blur-2xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950" />
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 sm:pt-12 sm:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left frosted spotlight column */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 tracking-wide mb-2">
              Featured Release · {featuredGame.category}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] text-balance">
              {featuredGame.title}
            </h1>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
              {featuredGame.description}
            </p>

            {/* Unboxed telemetry counters */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {stats.plays.toLocaleString()} {stats.plays === 1 ? 'Play' : 'Plays'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ThumbsUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                {stats.likes.toLocaleString()} Likes
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ThumbsDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {stats.dislikes.toLocaleString()} Dislikes
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onPlayGame(featuredGame)}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Play Here</span>
              </button>
              <button
                type="button"
                onClick={onBrowseAll}
                className="inline-flex items-center px-5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Browse All Games
              </button>
            </div>
          </div>

          {/* Right 16:9 featured cover showcase */}
          <div className="lg:col-span-7">
            <div
              onClick={() => onPlayGame(featuredGame)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPlayGame(featuredGame);
                }
              }}
              aria-label={`Launch ${featuredGame.title}`}
              className="relative aspect-video w-full h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-cyan-500/25 bg-slate-900 group cursor-pointer shadow-lg dark:shadow-cyan-950/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
            >
              {!imgError && featuredGame.thumbnail ? (
                <img
                  src={featuredGame.thumbnail}
                  alt={featuredGame.title}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-300 p-8">
                  <Gamepad2 className="w-12 h-12 mb-3 text-slate-400" aria-hidden="true" />
                  <span className="font-display text-lg font-semibold">{featuredGame.title}</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-200 mb-1">
                    <span>{featuredGame.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{featuredGame.players}</span>
                    <span aria-hidden="true">·</span>
                    <span>{featuredGame.difficulty}</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                    {featuredGame.title}
                  </h2>
                </div>
                <span className="inline-flex items-center justify-center px-4 py-2 min-h-[40px] rounded-lg bg-emerald-500 text-slate-950 group-hover:bg-emerald-400 text-sm font-bold transition-colors whitespace-nowrap shrink-0">
                  ▶ Launch
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
