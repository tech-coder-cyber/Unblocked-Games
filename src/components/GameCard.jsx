import { useEffect, useState } from 'react';
import { Play, Star, Gamepad2 } from 'lucide-react';

export default function GameCard({
  game,
  isFavorite,
  compact = false,
  showDescription = true,
  onPlay,
  onToggleFavorite,
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [game.thumbnail]);

  return (
    <article className="group flex flex-col bg-white dark:bg-slate-900/85 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 accent-border-panel hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg dark:hover:shadow-slate-950/60 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
      <button
        type="button"
        onClick={() => onPlay(game)}
        aria-label={`Play ${game.title}`}
        className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-950 cursor-pointer block focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-500"
      >
        {!imgError && game.thumbnail ? (
          game.imageFit === 'contain' ? (
            <>
              <img
                src={game.thumbnail}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-55 blur-md scale-110 transition-transform duration-300 group-hover:scale-115"
              />
              <div className="absolute inset-0 bg-slate-950/25" aria-hidden="true" />
              <img
                src={game.thumbnail}
                alt={game.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="relative z-10 w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </>
          ) : (
            <img
              src={game.thumbnail}
              alt={game.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.04]"
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-950 text-slate-600 dark:text-slate-300 p-4">
            <Gamepad2 className="w-9 h-9 mb-2 opacity-75" aria-hidden="true" />
            <span className="font-display text-sm font-semibold">{game.title}</span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none flex items-end justify-end p-2.5"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-slate-950 shadow-md">
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </span>
        </div>
      </button>

      <div className={`flex flex-col flex-1 ${compact ? 'p-4 gap-2.5' : 'p-5 gap-3'}`}>
        <div>
          <h3 className={`font-display ${compact ? 'text-base' : 'text-lg'} font-semibold text-slate-900 dark:text-slate-50 leading-snug`}>
            {game.titleStyle === 'glitch-red' ? (
              <span className="glitch-title-red" aria-label={game.title}>
                {game.displayTitle || game.title}
              </span>
            ) : (
              game.title
            )}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{game.category}</span>
            <span aria-hidden="true">·</span>
            <span>{game.players}</span>
            <span aria-hidden="true">·</span>
            <span>{game.difficulty}</span>
          </div>
        </div>

        {showDescription && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 flex-1">
            {game.description}
          </p>
        )}

        {/* Action row */}
        <div className={`${showDescription ? 'pt-2' : 'mt-auto pt-2'} flex items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800/80`}>
          <button
            type="button"
            onClick={() => onPlay(game)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-colors duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>Play Here</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(game.id)}
            aria-label={isFavorite ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
            aria-pressed={isFavorite}
            className={`inline-flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl border transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
              isFavorite
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
