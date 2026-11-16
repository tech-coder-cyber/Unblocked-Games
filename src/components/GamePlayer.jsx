import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Maximize2,
  RotateCcw,
  Star,
  Columns2,
  Play,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Gamepad2,
} from 'lucide-react';
import { resolveGameIframe } from '../utils/iframeParser.js';

function RelatedThumbnail({ src, title, imageFit }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div className="w-16 h-10 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
        <Gamepad2 className="w-5 h-5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`w-16 h-10 rounded-md ${imageFit === 'contain' ? 'object-contain p-0.5' : 'object-cover'} bg-slate-200 dark:bg-slate-800 shrink-0`}
    />
  );
}

export default function GamePlayer({
  game,
  allGames,
  theme,
  stats,
  isFavorite,
  reloadSignal,
  onBack,
  onSelectGame,
  onToggleFavorite,
  onVote,
}) {
  const stageRef = useRef(null);
  const iframeRef = useRef(null);
  const [frameKey, setFrameKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTheater, setIsTheater] = useState(false);

  const iframeConfig = resolveGameIframe(game);
  const relatedGames = [
    ...allGames.filter((g) => g.id !== game.id && g.category === game.category),
    ...allGames.filter((g) => g.id !== game.id && g.category !== game.category),
  ].slice(0, 4);

  useEffect(() => {
    setIsLoading(true);
    setFrameKey((k) => k + 1);
  }, [game.id, reloadSignal]);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.postMessage({ type: 'RECESS_THEME', theme }, '*');
    }
  }, [theme]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.postMessage({ type: 'RECESS_THEME', theme }, '*');
    }
    iframeRef.current?.focus();
  };

  const handleReload = () => {
    setIsLoading(true);
    setFrameKey((k) => k + 1);
  };

  const handleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  return (
    <section
      className={`${isTheater ? 'max-w-[1440px]' : 'max-w-6xl'} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 transition-all duration-200`}
    >
      {/* Stage header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Library</span>
          </button>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
              {game.titleStyle === 'glitch-red' ? (
                <span className="glitch-title-red" aria-label={game.title}>
                  {game.displayTitle || game.title}
                </span>
              ) : (
                game.title
              )}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>{game.category}</span>
              <span aria-hidden="true">·</span>
              <span>{game.players}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Play className="w-3 h-3" aria-hidden="true" />
                {stats.plays.toLocaleString()} {stats.plays === 1 ? 'play' : 'plays'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onVote(game.id, 'like')}
            aria-label={`Like ${game.title}`}
            aria-pressed={stats.userVote === 'like'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border text-xs font-semibold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stats.userVote === 'like'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{stats.likes.toLocaleString()}</span>
          </button>

          <button
            type="button"
            onClick={() => onVote(game.id, 'dislike')}
            aria-label={`Dislike ${game.title}`}
            aria-pressed={stats.userVote === 'dislike'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border text-xs font-semibold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stats.userVote === 'dislike'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-500/60 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{stats.dislikes.toLocaleString()}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(game.id)}
            aria-pressed={isFavorite}
            className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl border text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isFavorite
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
            <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Restart</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTheater((t) => !t)}
            aria-pressed={isTheater}
            className="hidden lg:inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Columns2 className="w-4 h-4" aria-hidden="true" />
            <span>{isTheater ? 'Standard Width' : 'Wide View'}</span>
          </button>

          {game.externalUrl && (
            <a
              href={game.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              <span>New Tab</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleFullscreen}
            className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" aria-hidden="true" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Iframe stage */}
      <div
        ref={stageRef}
        className="mt-5 relative w-full h-[min(74vh,720px)] min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 accent-border-panel bg-slate-100 dark:bg-slate-950 shadow-xl"
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-950 z-10 pointer-events-none">
            <div
              className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-cyan-500 animate-spin"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading {game.title}...
            </p>
          </div>
        )}

        {iframeConfig.src ? (
          <iframe
            ref={iframeRef}
            key={`${game.id}-${frameKey}`}
            src={iframeConfig.src}
            title={iframeConfig.title}
            allow={iframeConfig.allow}
            {...(iframeConfig.sandbox ? { sandbox: iframeConfig.sandbox } : {})}
            onLoad={handleIframeLoad}
            className="w-full h-full border-0 block"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Game frame unavailable
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              This entry in games.json is missing a valid iframe source.
            </p>
          </div>
        )}
      </div>

      {/* Unified Tip / Note / Warning + Controls cards */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-cyan-500/20">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold">
                TIP
              </span>
              <span>Quick Controls</span>
            </div>
            <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {game.tip || 'Click inside the game once it opens to focus keyboard and mouse input.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-cyan-500/20">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold">
                NOTE
              </span>
              <span>Load Time</span>
            </div>
            <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {game.note || 'First load can take a few moments on lower-end devices. Try Play Here (Alt) if needed.'}
            </p>
          </div>

          {game.warning && (
            <div className="sm:col-span-2 p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-300/60 dark:border-amber-500/25">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  WARNING
                </span>
                <span>Maturity Notice</span>
              </div>
              <p className="mt-2 text-sm text-amber-900/85 dark:text-amber-100/85 leading-relaxed">
                {game.warning}
              </p>
            </div>
          )}

          <div className="sm:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              About {game.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {game.description}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
            Controls
          </h2>
          <ul className="mt-4 space-y-3">
            {(game.controls || []).map((item) => (
              <li
                key={`${item.key}-${item.action}`}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="text-slate-600 dark:text-slate-400">{item.action}</span>
                <kbd className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  {item.key}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick switch to other games */}
      {relatedGames.length > 0 && (
        <div className="mt-2 pt-6 border-t border-slate-200 dark:border-slate-800 pb-8">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50 mb-4">
            More Games
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedGames.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectGame(item)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-400 text-left transition-colors cursor-pointer"
              >
                <RelatedThumbnail src={item.thumbnail} title={item.title} imageFit={item.imageFit} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-50 truncate">
                    {item.titleStyle === 'glitch-red' ? (
                      <span className="glitch-title-red" aria-label={item.title}>
                        {item.displayTitle || item.title}
                      </span>
                    ) : (
                      item.title
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {item.category} · {item.difficulty}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
