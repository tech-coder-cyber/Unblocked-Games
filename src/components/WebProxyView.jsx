import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Globe,
  BookOpen,
  Monitor,
  ExternalLink,
  Search,
} from 'lucide-react';

const QUICK_BOOKMARKS = [
  { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
  { label: 'DuckDuckGo', url: 'https://html.duckduckgo.com/html/' },
  { label: 'Internet Archive', url: 'https://archive.org/' },
  { label: 'Scratch', url: 'https://scratch.mit.edu/' },
];

function resolveAddressInput(rawInput) {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
}

export default function WebProxyView({ onBackToCatalog }) {
  const [addressInput, setAddressInput] = useState('https://en.wikipedia.org/wiki/Main_Page');
  const [navState, setNavState] = useState({ items: [], index: -1 });
  const [viewMode, setViewMode] = useState('reader'); // 'reader' | 'viewport'
  const [reloadNonce, setReloadNonce] = useState(0);

  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState('');
  const [readerData, setReaderData] = useState(null);

  const activeUrl = navState.index >= 0 ? navState.items[navState.index] : '';

  const navigateTo = (raw) => {
    const target = resolveAddressInput(raw);
    if (!target) return;

    setAddressInput(target);
    setNavState((prev) => {
      const sliced = prev.items.slice(0, prev.index + 1);
      if (sliced[sliced.length - 1] === target) {
        return { items: sliced, index: sliced.length - 1 };
      }
      const nextItems = [...sliced, target];
      return { items: nextItems, index: nextItems.length - 1 };
    });
  };

  useEffect(() => {
    navigateTo('https://en.wikipedia.org/wiki/Main_Page');
  }, []);

  useEffect(() => {
    if (!activeUrl || viewMode !== 'reader') return;
    let cancelled = false;

    async function loadReaderPage() {
      try {
        setReaderLoading(true);
        setReaderError('');
        const res = await fetch(`/api/proxy/inspect?url=${encodeURIComponent(activeUrl)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Proxy request failed (${res.status})`);
        }
        if (!cancelled) {
          setReaderData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setReaderError(err?.message || 'Unable to fetch page through custom proxy.');
        }
      } finally {
        if (!cancelled) {
          setReaderLoading(false);
        }
      }
    }

    loadReaderPage();
    return () => {
      cancelled = true;
    };
  }, [activeUrl, viewMode, reloadNonce]);

  const handleSubmit = (e) => {
    e.preventDefault();
    navigateTo(addressInput);
  };

  const canGoBack = navState.index > 0;
  const canGoForward = navState.index >= 0 && navState.index < navState.items.length - 1;

  const handleBack = () => {
    if (!canGoBack) return;
    const nextIndex = navState.index - 1;
    setNavState((prev) => ({ ...prev, index: nextIndex }));
    setAddressInput(navState.items[nextIndex]);
  };

  const handleForward = () => {
    if (!canGoForward) return;
    const nextIndex = navState.index + 1;
    setNavState((prev) => ({ ...prev, index: nextIndex }));
    setAddressInput(navState.items[nextIndex]);
  };

  const handleReload = () => {
    setReloadNonce((n) => n + 1);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
            Custom Web Proxy
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Browse public sites through this server&apos;s own HTTP proxy in Direct Reader or Live Viewport mode.
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

      {/* Browser Toolbar */}
      <div className="mt-5 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/20 shadow-sm space-y-3">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              disabled={!canGoBack}
              aria-label="Proxy back"
              className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={!canGoForward}
              aria-label="Proxy forward"
              className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleReload}
              aria-label="Reload proxied page"
              className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${readerLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>

          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Enter URL (https://...) or search term"
              aria-label="Proxy URL or search"
              className="w-full pl-10 pr-4 py-2 min-h-[40px] text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              className="px-5 py-2 min-h-[40px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold transition-colors cursor-pointer"
            >
              Go
            </button>

            <div
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              role="group"
              aria-label="Proxy render mode"
            >
              <button
                type="button"
                onClick={() => setViewMode('reader')}
                aria-pressed={viewMode === 'reader'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'reader'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Direct Reader</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('viewport')}
                aria-pressed={viewMode === 'viewport'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'viewport'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Live Viewport</span>
              </button>
            </div>
          </div>
        </form>

        {/* Quick Bookmarks */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quick links:</span>
            {QUICK_BOOKMARKS.map((bm) => (
              <button
                key={bm.url}
                type="button"
                onClick={() => navigateTo(bm.url)}
                className="px-2.5 py-1 min-h-[28px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {bm.label}
              </button>
            ))}
          </div>

          {activeUrl && (
            <a
              href={`/api/proxy?url=${encodeURIComponent(activeUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open Proxied Tab</span>
            </a>
          )}
        </div>
      </div>

      {/* Render Area */}
      {viewMode === 'reader' ? (
        <div className="mt-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 min-h-[480px]">
          {readerLoading ? (
            <div className="py-20 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
              Fetching through custom proxy...
            </div>
          ) : readerError ? (
            <div className="py-12 text-center max-w-md mx-auto">
              <p className="text-base font-semibold text-rose-600 dark:text-rose-400">
                Could not fetch URL
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{readerError}</p>
            </div>
          ) : readerData ? (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 break-words">
                    {readerData.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {readerData.finalUrl}
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                  HTTP {readerData.status} · {readerData.timingMs} ms
                </div>
              </div>

              {readerData.description && (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  {readerData.description}
                </p>
              )}

              {readerData.headings?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    Page Sections
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {readerData.headings.map((h, idx) => (
                      <span
                        key={`${h.text}-${idx}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                      >
                        {h.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {readerData.paragraphs?.length > 0 && (
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl">
                  {readerData.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              )}

              {readerData.links?.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Extracted Links ({readerData.links.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {readerData.links.map((link) => (
                      <button
                        key={link.url}
                        type="button"
                        onClick={() => navigateTo(link.url)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-400 text-left transition-colors cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {link.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl overflow-hidden border border-slate-200 dark:border-cyan-500/25 bg-white dark:bg-slate-950 shadow-xl h-[640px]">
          {activeUrl ? (
            <iframe
              key={`${activeUrl}-${reloadNonce}`}
              src={`/api/proxy?url=${encodeURIComponent(activeUrl)}`}
              title="Custom Proxied Viewport"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              className="w-full h-full border-0 block bg-white"
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
