import { useState } from 'react';
import { Play, Star, Gamepad2, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function GameCard({
  game,
  stats,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onVote,
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="flex flex-col bg-white dark:bg-slate-900/85 dark:backdrop-blur-md border border-slate-200 dark:border-cyan-500/20 hover:border-slate-300 dark:hover:border-cyan-400/45 rounded-2xl overflow-hidden transition-all duration-150 hover:-translate-y-0.5">
      <button
        type="button"
        onClick={() => onPlay(game)}
        aria-label={`Play ${game.title}`}
        className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-950 cursor-pointer block focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-500"
      >
        {!imgError && game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-950 text-slate-600 dark:text-slate-300 p-4">
            <Gamepad2 className="w-9 h-9 mb-2 opacity-75" aria-hidden="true" />
            <span className="font-display text-sm font-semibold">{game.title}</span>
          </div>
        )}
      </button>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50 leading-snug">
            {game.title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{game.category}</span>
            <span aria-hidden="true">·</span>
            <span>{game.players}</span>
            <span aria-hidden="true">·</span>
            <span>{game.difficulty}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 flex-1">
          {game.description}
        </p>

        {/* Plays, Likes, and Dislikes row */}
        <div className="pt-2 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums border-t border-slate-100 dark:border-slate-800/80">
          <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
            <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>
              {stats.plays.toLocaleString()} {stats.plays === 1 ? 'play' : 'plays'}
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onVote(game.id, 'like')}
              aria-label={`Like ${game.title} (${stats.likes} likes)`}
              aria-pressed={stats.userVote === 'like'}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                stats.userVote === 'like'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{stats.likes.toLocaleString()}</span>
            </button>

            <button
              type="button"
              onClick={() => onVote(game.id, 'dislike')}
              aria-label={`Dislike ${game.title} (${stats.dislikes} dislikes)`}
              aria-pressed={stats.userVote === 'dislike'}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                stats.userVote === 'dislike'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-500/60 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{stats.dislikes.toLocaleString()}</span>
            </button>
          </div>
        </div>

        {/* Action row */}
        <div className="pt-1 flex items-center justify-between gap-2.5">
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
