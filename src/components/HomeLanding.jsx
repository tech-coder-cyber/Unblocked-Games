import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, ThumbsUp, ThumbsDown, ArrowRight, ArrowDownAZ, Flame, Search, X } from 'lucide-react';
import { getSingleGameStats } from '../utils/storage.js';

export default function HomeLanding({
  games,
  statsMap,
  sortBy,
  showTopStrip = true,
  reducedMotion = false,
  onChangeSort,
  onEnterCatalog,
  onPlayGame,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [homeSearch, setHomeSearch] = useState('');

  const sortedGames = useMemo(() => {
    const q = homeSearch.trim().toLowerCase();
    const list = q
      ? games.filter(
          (g) =>
            g.title.toLowerCase().includes(q) ||
            g.category.toLowerCase().includes(q)
        )
      : [...games];
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
  }, [games, statsMap, sortBy, homeSearch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMotionReduced =
      reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animId = null;

    const pointer = { x: -9999, y: -9999, active: false };
    let particles = [];

    function createParticles(w, h) {
      const targetCount = Math.max(38, Math.min(95, Math.floor((w * h) / 14500)));
      const next = [];
      for (let i = 0; i < targetCount; i++) {
        next.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55,
          r: 1.5 + Math.random() * 1.9,
        });
      }
      return next;
    }

    function resize() {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particles.length === 0) {
        particles = createParticles(width, height);
      } else {
        for (let i = 0; i < particles.length; i++) {
          if (particles[i].x > width) particles[i].x = Math.random() * width;
          if (particles[i].y > height) particles[i].y = Math.random() * height;
        }
      }
    }

    function stepAndDraw() {
      ctx.clearRect(0, 0, width, height);

      const maxLinkDist = 148;
      const pointerLinkDist = 185;

      if (!isMotionReduced) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          if (pointer.active) {
            const dx = pointer.x - p.x;
            const dy = pointer.y - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 900 && distSq < pointerLinkDist * pointerLinkDist) {
              const dist = Math.sqrt(distSq);
              p.vx += (dx / dist) * 0.014;
              p.vy += (dy / dist) * 0.014;
            }
          }

          p.vx *= 0.992;
          p.vy *= 0.992;
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 1.35) {
            p.vx = (p.vx / speed) * 1.35;
            p.vy = (p.vy / speed) * 1.35;
          } else if (speed < 0.14) {
            p.vx += (Math.random() - 0.5) * 0.06;
            p.vy += (Math.random() - 0.5) * 0.06;
          }

          p.x += p.vx;
          p.y += p.vy;

          if (p.x <= 0) {
            p.x = 0;
            p.vx = Math.abs(p.vx);
          } else if (p.x >= width) {
            p.x = width;
            p.vx = -Math.abs(p.vx);
          }
          if (p.y <= 0) {
            p.y = 0;
            p.vy = Math.abs(p.vy);
          } else if (p.y >= height) {
            p.y = height;
            p.vy = -Math.abs(p.vy);
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxLinkDist * maxLinkDist) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxLinkDist) * 0.3;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      if (pointer.active && !isMotionReduced) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < pointerLinkDist) {
            const alpha = (1 - dist / pointerLinkDist) * 0.52;
            ctx.strokeStyle = `rgba(125, 211, 252, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!isMotionReduced) {
        animId = window.requestAnimationFrame(stepAndDraw);
      }
    }

    function handlePointerMove(e) {
      if (isMotionReduced) return;
      const rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }

    function handlePointerLeave() {
      pointer.active = false;
    }

    function handlePointerDown(e) {
      if (isMotionReduced) return;
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      pointer.x = clickX;
      pointer.y = clickY;
      pointer.active = true;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - clickX;
        const dy = p.y - clickY;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist < 210) {
          const force = (1 - dist / 210) * 1.65;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }
    }

    resize();
    stepAndDraw();

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('pointerdown', handlePointerDown);

    return () => {
      if (animId) window.cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [reducedMotion]);

  return (
    <section
      ref={containerRef}
      aria-label="Home landing"
      className={`relative ${
        showTopStrip ? 'min-h-[calc(100vh-6rem)]' : 'min-h-[calc(100vh-4rem)]'
      } flex items-center justify-center overflow-hidden bg-slate-900 dark:bg-slate-950 text-slate-100`}
    >
      {/* Interactive floating white dots + connecting lines canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Subtle vignette to preserve crisp typography legibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(2,6,23,0.68)_100%)]"
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left intro + moving light-blue Enter button */}
          <div className="lg:col-span-6 text-center lg:text-left">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08] text-balance">
              Recess Arcade
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-md mx-auto lg:mx-0">
              Unblocked browser games ready to launch. Explore the text directory or enter the full catalog.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <button
                type="button"
                onClick={onEnterCatalog}
                className="btn-enter-stream normal-case inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[48px] rounded-xl text-base font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <span>Enter</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Right text-only games list (no images) */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-slate-900/75 backdrop-blur-md border border-white/15 shadow-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-semibold text-white">
                      Games ({sortedGames.length})
                    </h2>
                  </div>

                  <div
                    className="inline-flex items-center gap-1 p-0.5 bg-slate-950/70 border border-white/10 rounded-lg"
                    role="group"
                    aria-label="Sort games on home list"
                  >
                    <button
                      type="button"
                      onClick={() => onChangeSort('az')}
                      aria-pressed={sortBy === 'az'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        sortBy === 'az'
                          ? 'bg-sky-400/20 text-sky-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowDownAZ className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>A-Z</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeSort('popularity')}
                      aria-pressed={sortBy === 'popularity'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        sortBy === 'popularity'
                          ? 'bg-sky-400/20 text-sky-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Popularity</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search
                    className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={homeSearch}
                    onChange={(e) => setHomeSearch(e.target.value)}
                    placeholder="Search games by title or genre..."
                    aria-label="Search games on home directory"
                    className="w-full pl-8 pr-8 py-1.5 min-h-[36px] text-xs rounded-lg bg-slate-950/80 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  {homeSearch && (
                    <button
                      type="button"
                      onClick={() => setHomeSearch('')}
                      aria-label="Clear home search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <ul
                className="divide-y divide-white/10 max-h-[360px] overflow-y-auto"
                aria-label="Available games"
              >
                {sortedGames.length === 0 ? (
                  <li className="px-5 py-8 text-center text-xs text-slate-400">
                    No games matched &ldquo;{homeSearch}&rdquo;.
                  </li>
                ) : (
                  sortedGames.map((game) => {
                    const stats = getSingleGameStats(statsMap, game.id);
                    return (
                      <li key={game.id}>
                        <button
                          type="button"
                          onClick={() => onPlayGame(game)}
                          className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-4 hover:bg-white/6 transition-colors duration-150 group cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-300"
                        >
                          <div className="min-w-0">
                            <div className="font-display text-base font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                              {game.title}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300 tabular-nums">
                              <span>{game.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>{game.players}</span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-emerald-300">
                                <Play className="w-3 h-3" aria-hidden="true" />
                                {stats.plays.toLocaleString()} {stats.plays === 1 ? 'play' : 'plays'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-sky-300">
                                <ThumbsUp className="w-3 h-3" aria-hidden="true" />
                                {stats.likes.toLocaleString()}
                              </span>
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <ThumbsDown className="w-3 h-3" aria-hidden="true" />
                                {stats.dislikes.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-white/10 group-hover:bg-sky-400 group-hover:text-slate-950 text-xs font-semibold text-white transition-colors shrink-0">
                            <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                            <span>Play</span>
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
