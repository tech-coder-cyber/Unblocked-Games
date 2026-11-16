import { useEffect, useRef, useState } from 'react';
import {
  Sun,
  Moon,
  Trash2,
  X,
  Check,
  Palette,
  LayoutGrid,
  Shield,
  Database,
  Download,
  Upload,
  AlertCircle,
} from 'lucide-react';
import {
  ACCENT_PRESETS,
  PANIC_URL_PRESETS,
  TAB_CLOAK_PRESETS,
  exportAllSiteData,
  formatBytes,
  getSiteDataSummary,
  normalizePanicUrl,
} from '../utils/storage.js';

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'layout', label: 'Layout', icon: LayoutGrid },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'data', label: 'Save Data', icon: Database },
];

export default function SettingsModal({
  isOpen,
  theme,
  prefs,
  tabCloak,
  onChangeTheme,
  onUpdatePrefs,
  onChangeCloak,
  onImportSiteData,
  onClearSiteData,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('appearance');
  const [confirmClear, setConfirmClear] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const [summary, setSummary] = useState(() => getSiteDataSummary());
  const [customPanicUrl, setCustomPanicUrl] = useState(prefs.panicUrl);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setCustomPanicUrl(prefs.panicUrl);
  }, [prefs.panicUrl]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmClear(false);
      setStatusBanner(null);
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
    setSummary(getSiteDataSummary());
    setStatusBanner({
      type: 'success',
      text: 'All local site data, preferences, and game records have been cleared.',
    });
  };

  const handleExportBackup = () => {
    try {
      const snapshot = exportAllSiteData();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `recess-arcade-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusBanner({
        type: 'success',
        text: 'Backup file downloaded cleanly.',
      });
    } catch {
      setStatusBanner({
        type: 'error',
        text: 'Could not export backup data in this browser.',
      });
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      onImportSiteData(text);
      setSummary(getSiteDataSummary());
      setStatusBanner({
        type: 'success',
        text: 'Backup restored. Favorites, stats, and preferences are now active.',
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Invalid backup JSON file.',
      });
    }
  };

  const handleSavePanicUrl = (e) => {
    e.preventDefault();
    const safeUrl = normalizePanicUrl(customPanicUrl);
    setCustomPanicUrl(safeUrl);
    onUpdatePrefs({ panicUrl: safeUrl });
    setStatusBanner({
      type: 'success',
      text: `Panic key destination saved (${safeUrl}).`,
    });
  };

  const optionClass = (selected) =>
    `flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
      selected
        ? 'accent-soft-box'
        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`;

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
      <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 accent-border-panel shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2
              id="settings-modal-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-50"
            >
              Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize theme, catalog layout, tab cloak, and save backups.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setActiveTab(tab.id);
                  setStatusBanner(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selected
                    ? 'accent-solid-btn'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {statusBanner && (
            <div
              role="status"
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium ${
                statusBanner.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {statusBanner.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{statusBanner.text}</span>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Color Mode
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Switch between light and dark mode across the catalog and game launchers.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onChangeTheme('light')}
                    aria-pressed={theme === 'light'}
                    className={optionClass(theme === 'light')}
                  >
                    <Sun className="w-4 h-4" aria-hidden="true" />
                    <span>Light Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    className={optionClass(theme === 'dark')}
                  >
                    <Moon className="w-4 h-4" aria-hidden="true" />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Accent Palette
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Personalize highlights, active filters, and primary action accents.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {ACCENT_PRESETS.map((preset) => {
                    const selected = prefs.accent === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onUpdatePrefs({ accent: preset.id })}
                        aria-pressed={selected}
                        className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 min-h-[42px] rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                          selected
                            ? 'accent-soft-box'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15"
                            style={{ backgroundColor: preset.swatch }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{preset.label}</span>
                        </span>
                        {selected && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Show Top Clock &amp; Library Strip
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Displays live clock, date, game count, and saved counter above navigation.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.showTopStrip}
                    onChange={(e) => onUpdatePrefs({ showTopStrip: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Reduced Motion &amp; Effects
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Pauses landing canvas particles and minimizes transitions for smoother Chromebook battery life.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.reducedMotion}
                    onChange={(e) => onUpdatePrefs({ reducedMotion: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer shrink-0"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Startup Screen
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Choose whether opening Recess Arcade starts on the Home Directory or straight in All Games.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdatePrefs({ startScreen: 'home' })}
                    aria-pressed={prefs.startScreen === 'home'}
                    className={optionClass(prefs.startScreen === 'home')}
                  >
                    Home Directory
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdatePrefs({ startScreen: 'catalog' })}
                    aria-pressed={prefs.startScreen === 'catalog'}
                    className={optionClass(prefs.startScreen === 'catalog')}
                  >
                    Game Catalog
                  </button>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Default Catalog Sort
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Applied automatically when launching Recess Arcade.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdatePrefs({ defaultSort: 'az' })}
                    aria-pressed={prefs.defaultSort === 'az'}
                    className={optionClass(prefs.defaultSort === 'az')}
                  >
                    Alphabetical (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdatePrefs({ defaultSort: 'popularity' })}
                    aria-pressed={prefs.defaultSort === 'popularity'}
                    className={optionClass(prefs.defaultSort === 'popularity')}
                  >
                    Most Played
                  </button>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Catalog Grid Density
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Switch between roomy 3-column cards and dense 4-column browsing on desktop screens.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdatePrefs({ gridDensity: 'comfortable' })}
                    aria-pressed={prefs.gridDensity === 'comfortable'}
                    className={optionClass(prefs.gridDensity === 'comfortable')}
                  >
                    Comfortable (3-Col)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdatePrefs({ gridDensity: 'compact' })}
                    aria-pressed={prefs.gridDensity === 'compact'}
                    className={optionClass(prefs.gridDensity === 'compact')}
                  >
                    Compact (4-Col)
                  </button>
                </div>
              </div>

              <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Show Game Descriptions on Cards
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Hide descriptions for cleaner, faster visual scanning across large grids.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.showDescriptions}
                  onChange={(e) => onUpdatePrefs({ showDescriptions: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer shrink-0"
                />
              </label>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Browser Tab Cloak
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Instantly disguise the page title and browser favicon.
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TAB_CLOAK_PRESETS.map((preset) => {
                    const active = tabCloak === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onChangeCloak(preset.id)}
                        aria-pressed={active}
                        className={`flex items-center justify-between gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl border text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'accent-soft-box'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{preset.label}</span>
                        {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Enable Panic Shortcut (Shift + P)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Press Shift + P anywhere outside text boxes to quickly redirect the tab.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.panicEnabled}
                    onChange={(e) => onUpdatePrefs({ panicEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer shrink-0"
                  />
                </label>

                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Panic Destination URL
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PANIC_URL_PRESETS.map((item) => (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => {
                          setCustomPanicUrl(item.url);
                          onUpdatePrefs({ panicUrl: item.url });
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          prefs.panicUrl === item.url
                            ? 'accent-soft-box'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleSavePanicUrl} className="flex items-center gap-2">
                    <input
                      type="url"
                      value={customPanicUrl}
                      onChange={(e) => setCustomPanicUrl(e.target.value)}
                      placeholder="https://classroom.google.com"
                      aria-label="Custom panic redirect URL"
                      className="flex-1 px-3 py-2 min-h-[38px] text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 min-h-[38px] rounded-lg accent-solid-btn text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Save URL
                    </button>
                  </form>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Keyboard Shortcuts
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between gap-2">
                    <span>Search</span>
                    <kbd className="font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      /
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Close / Blur</span>
                    <kbd className="font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      Esc
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Panic</span>
                    <kbd className="font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      Shift+P
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Browser Site Data
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Favorites, play history, and custom preferences stay local to your browser, while shared play, like, and dislike counts sync across devices.
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
                    <dt className="text-slate-500 dark:text-slate-400">Play &amp; Vote Records</dt>
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
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Backup &amp; Restore
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Transfer your favorites, play history, and settings between devices via JSON.
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    <span>Export Backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    <span>Import Backup</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              <div>
                {!confirmClear ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusBanner(null);
                      setConfirmClear(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-red-700 dark:text-red-300 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>Clear Site Data</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 space-y-2.5">
                    <p className="text-xs font-medium text-red-800 dark:text-red-200">
                      This will erase all favorites, play history, play counts, likes, dislikes, tab cloak, and appearance settings.
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
          )}
        </div>
      </div>
    </div>
  );
}
