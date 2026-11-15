import { useEffect, useState } from 'react';
import { Sun, Moon, Trash2, X, Check } from 'lucide-react';
import { formatBytes, getSiteDataSummary } from '../utils/storage.js';

export default function SettingsModal({
  isOpen,
  theme,
  onChangeTheme,
  onClearSiteData,
  onClose,
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);
  const [summary, setSummary] = useState(() => getSiteDataSummary());

  useEffect(() => {
    if (!isOpen) {
      setConfirmClear(false);
      setClearedNotice(false);
      return;
    }
    setSummary(getSiteDataSummary());

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirmClear = () => {
    onClearSiteData();
    setConfirmClear(false);
    setClearedNotice(true);
    setSummary(getSiteDataSummary());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/25 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="settings-modal-title"
            className="font-display text-lg font-bold text-slate-900 dark:text-slate-50"
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme toggle section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Appearance Theme
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Switch between light and dark mode across the catalog and embedded games.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChangeTheme('light')}
                aria-pressed={theme === 'light'}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-cyan-50 border-cyan-600 text-cyan-800 dark:bg-cyan-950/60 dark:border-cyan-400 dark:text-cyan-300'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4" aria-hidden="true" />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeTheme('dark')}
                aria-pressed={theme === 'dark'}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-cyan-50 border-cyan-600 text-cyan-800 dark:bg-cyan-950/60 dark:border-cyan-400 dark:text-cyan-300'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4" aria-hidden="true" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Site data section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Browser Site Data
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage favorites, play history, play counts, likes, dislikes, and theme storage.
            </p>

            <dl className="mt-3 grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Favorites</dt>
                <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {summary.favoritesCount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Recent Plays</dt>
                <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {summary.recentCount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Play & Vote Records</dt>
                <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {summary.trackedGamesCount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Storage Used</dt>
                <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatBytes(summary.totalBytes)}
                </dd>
              </div>
            </dl>

            {clearedNotice && (
              <div
                role="status"
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300"
              >
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>All local site data and game records have been cleared.</span>
              </div>
            )}

            <div className="mt-4">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => {
                    setClearedNotice(false);
                    setConfirmClear(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-red-700 dark:text-red-300 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Clear Site Data</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 space-y-2.5">
                  <p className="text-xs font-medium text-red-800 dark:text-red-200">
                    This will erase all favorites, play history, play counts, likes, dislikes, and theme settings.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmClear}
                      className="flex-1 px-3 py-2 min-h-[40px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Confirm Clear Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="px-3 py-2 min-h-[40px] rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
