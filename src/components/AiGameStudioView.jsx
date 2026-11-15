import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Save,
  Globe,
  Lock,
  Play,
  RotateCcw,
  Maximize2,
  Search,
  X,
  Trash2,
  Wand2,
  Code2,
  ThumbsUp,
  User,
  CopyPlus,
} from 'lucide-react';
import {
  getCreatorProfile,
  getLikedStudioIds,
  saveCreatorProfile,
  saveLikedStudioIds,
} from '../utils/storage.js';

const STARTER_IDEAS = [
  {
    label: 'Neon Asteroid Dodger',
    genre: 'Arcade',
    style: 'Neon Vector',
    prompt:
      'Build a smooth space asteroid dodger where you pilot a sleek glowing ship with WASD or mouse, collect energy orbs for combo multipliers, and fire laser bursts with Space.',
  },
  {
    label: 'Brick Breaker Boss',
    genre: 'Action',
    style: 'Vibrant Arcade',
    prompt:
      'Build a brick breaker arcade game with mouse or arrow paddle controls, multi-ball powerups, widening paddle drops, and advancing brick waves.',
  },
  {
    label: 'Cyber Dash Runner',
    genre: 'Platformer',
    style: 'Minimal Dark',
    prompt:
      'Build a fast endless neon rooftop runner with Space or Click jump & double-jump, sliding spikes, floating coins, and increasing speed tiers.',
  },
  {
    label: 'Retro Snake Arena',
    genre: 'Puzzle',
    style: 'Retro Pixel',
    prompt:
      'Build a modern arcade snake game with smooth grid movement, golden bonus fruit, speed portals, and high-score tracking.',
  },
];

const GENRES = ['Auto', 'Arcade', 'Action', 'Platformer', 'Shooter', 'Puzzle', 'Racing', 'Strategy'];
const STYLES = ['Neon Vector', 'Retro Pixel', 'Minimal Dark', 'Vibrant Arcade'];

function downloadHtmlFile(title, html) {
  const safeSlug =
    String(title || 'custom-game')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'custom-game';
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeSlug}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AiGameStudioView({ onBackToCatalog, reloadSignal }) {
  const previewStageRef = useRef(null);
  const modalStageRef = useRef(null);

  const [profile, setProfile] = useState(() => getCreatorProfile());
  const [likedIds, setLikedIds] = useState(() => getLikedStudioIds());
  const [studioTab, setStudioTab] = useState('create'); // 'create' | 'saves' | 'community'

  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Auto');
  const [themeStyle, setThemeStyle] = useState('Neon Vector');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Active editor/preview draft
  const [draft, setDraft] = useState(null); // { id?, title, description, category, controls, html, isPublic }
  const [showCode, setShowCode] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Saved & Community libraries
  const [myGames, setMyGames] = useState([]);
  const [publicGames, setPublicGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [studioSearch, setStudioSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Dedicated player view inside Studio for playing saved/community games
  const [playingGame, setPlayingGame] = useState(null);
  const [playingKey, setPlayingKey] = useState(0);

  useEffect(() => {
    setProfile(getCreatorProfile());
    setLikedIds(getLikedStudioIds());
  }, [reloadSignal]);

  const fetchStudioGames = useCallback(async (creatorId) => {
    try {
      setLoadingGames(true);
      const res = await fetch(`/api/studio/games?creatorId=${encodeURIComponent(creatorId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load Studio games.');
      const data = await res.json();
      setMyGames(Array.isArray(data.myGames) ? data.myGames : []);
      setPublicGames(Array.isArray(data.publicGames) ? data.publicGames : []);
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Unable to sync Studio library.' });
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    fetchStudioGames(profile.id);
  }, [fetchStudioGames, profile.id]);

  const handleNameChange = (nextName) => {
    const updated = { ...profile, name: nextName };
    setProfile(updated);
    saveCreatorProfile(updated);
  };

  const handleGenerate = async (refineExisting = false) => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setFeedback({
        type: 'error',
        text: refineExisting
          ? 'Describe what you want to change or add to the current game.'
          : 'Describe the game idea you want AI to build.',
      });
      return;
    }

    setIsGenerating(true);
    setFeedback({ type: '', text: '' });

    try {
      const res = await fetch('/api/ai/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          genre,
          themeStyle,
          currentHtml: refineExisting && draft?.html ? draft.html : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Game generation failed.');
      }

      setDraft((prev) => ({
        id: refineExisting && prev?.id ? prev.id : undefined,
        title: data.title || prev?.title || 'Custom AI Game',
        description: data.description || trimmed,
        category: data.category || 'Arcade',
        controls: data.controls || 'Keyboard & Mouse',
        html: data.html,
        isPublic: refineExisting && prev ? Boolean(prev.isPublic) : false,
      }));
      setPreviewKey((k) => k + 1);
      if (refineExisting) {
        setPrompt('');
      }
      setFeedback({
        type: 'success',
        text: refineExisting
          ? 'Game updated. Test it in the live stage, save changes, or download the HTML.'
          : 'Game generated! Play it below, save to your library, publish it, or download the HTML file.',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to generate game.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async (publishOverride = null) => {
    if (!draft || !draft.html) return;
    const isPublicTarget =
      typeof publishOverride === 'boolean' ? publishOverride : Boolean(draft.isPublic);

    setIsSaving(true);
    setFeedback({ type: '', text: '' });

    try {
      const payload = {
        creatorId: profile.id,
        creatorName: (profile.name || '').trim() || 'ArcadeBuilder',
        title: (draft.title || '').trim() || 'Untitled Arcade Game',
        description: (draft.description || '').trim(),
        category: (draft.category || '').trim() || 'Arcade',
        controls: (draft.controls || '').trim() || 'Keyboard & Mouse',
        html: draft.html,
        isPublic: isPublicTarget,
      };

      const isUpdatingExisting = Boolean(draft.id) && myGames.some((g) => g.id === draft.id);
      const url = isUpdatingExisting ? `/api/studio/games/${draft.id}` : '/api/studio/games';
      const method = isUpdatingExisting ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not save game.');
      }

      const saved = data.game;
      setDraft({ ...saved });
      await fetchStudioGames(profile.id);
      setFeedback({
        type: 'success',
        text: saved.isPublic
          ? `"${saved.title}" saved and published to Community Games!`
          : `"${saved.title}" saved privately to My Saves.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Unable to save game.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (game) => {
    try {
      const res = await fetch(`/api/studio/games/${game.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: profile.id,
          isPublic: !game.isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update visibility.');
      if (draft?.id === game.id) {
        setDraft((prev) => (prev ? { ...prev, isPublic: data.game.isPublic } : prev));
      }
      if (playingGame?.id === game.id) {
        setPlayingGame(data.game);
      }
      await fetchStudioGames(profile.id);
      setFeedback({
        type: 'success',
        text: data.game.isPublic
          ? `"${data.game.title}" is now Public in Community Games.`
          : `"${data.game.title}" is now Private in My Saves.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Visibility update failed.' });
    }
  };

  const handleDeleteSaved = async (gameId) => {
    try {
      const res = await fetch(
        `/api/studio/games/${gameId}?creatorId=${encodeURIComponent(profile.id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not delete game.');
      setConfirmDeleteId(null);
      if (draft?.id === gameId) {
        setDraft((prev) => (prev ? { ...prev, id: undefined } : prev));
      }
      if (playingGame?.id === gameId) {
        setPlayingGame(null);
      }
      await fetchStudioGames(profile.id);
      setFeedback({ type: 'success', text: 'Saved game deleted.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Delete failed.' });
    }
  };

  const handlePlaySavedGame = async (game) => {
    setPlayingGame(game);
    setPlayingKey((k) => k + 1);
    try {
      const res = await fetch(`/api/studio/games/${game.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: profile.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlayingGame(data.game);
        fetchStudioGames(profile.id);
      }
    } catch {
      // Non-blocking play count increment
    }
  };

  const handleLikeStudioGame = async (game) => {
    const alreadyLiked = likedIds.includes(game.id);
    const delta = alreadyLiked ? -1 : 1;
    const nextLikes = alreadyLiked
      ? likedIds.filter((id) => id !== game.id)
      : [...likedIds, game.id];
    setLikedIds(nextLikes);
    saveLikedStudioIds(nextLikes);

    try {
      const res = await fetch(`/api/studio/games/${game.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: profile.id, delta }),
      });
      if (res.ok) {
        const data = await res.json();
        if (playingGame?.id === game.id) {
          setPlayingGame(data.game);
        }
        fetchStudioGames(profile.id);
      }
    } catch {
      // Ignore network hiccup
    }
  };

  const handleLoadIntoStudio = (game) => {
    const isMine = Boolean(game.isOwner);
    setDraft({
      id: isMine ? game.id : undefined,
      title: isMine ? game.title : `${game.title} (Remix)`,
      description: game.description,
      category: game.category,
      controls: game.controls,
      html: game.html,
      isPublic: isMine ? Boolean(game.isPublic) : false,
    });
    setPlayingGame(null);
    setStudioTab('create');
    setPreviewKey((k) => k + 1);
    setFeedback({
      type: 'success',
      text: isMine
        ? `Loaded "${game.title}" into the Studio editor.`
        : `Cloned "${game.title}" as your own remix! Tweak it or ask AI to modify it.`,
    });
  };

  const handleFullscreenStage = (ref) => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  const activeList = studioTab === 'saves' ? myGames : publicGames;

  const listCategories = useMemo(() => {
    const unique = Array.from(new Set(activeList.map((g) => g.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    return ['All', ...unique];
  }, [activeList]);

  const filteredList = useMemo(() => {
    const q = studioSearch.trim().toLowerCase();
    return activeList.filter((g) => {
      if (categoryFilter !== 'All' && g.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q) ||
        (g.category || '').toLowerCase().includes(q) ||
        (g.creatorName || '').toLowerCase().includes(q)
      );
    });
  }, [activeList, categoryFilter, studioSearch]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>AI Game Studio</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
            Build, Save, Share & Download Games
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Describe any playable browser game, test it live, save your drafts, publish to Community Games, or export as a standalone .html file.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 min-h-[40px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs">
            <User className="w-3.5 h-3.5 text-cyan-500 shrink-0" aria-hidden="true" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Creator:</span>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={32}
              aria-label="Creator display name"
              className="w-28 sm:w-32 bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Games</span>
          </button>
        </div>
      </div>

      {/* Studio Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
          role="tablist"
          aria-label="AI Game Studio sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={studioTab === 'create'}
            onClick={() => setStudioTab('create')}
            className={`inline-flex items-center gap-2 px-4 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              studioTab === 'create'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-cyan-500" aria-hidden="true" />
            <span>Create with AI</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={studioTab === 'saves'}
            onClick={() => {
              setStudioTab('saves');
              setCategoryFilter('All');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer tabular-nums ${
              studioTab === 'saves'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Save className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
            <span>My Saves ({myGames.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={studioTab === 'community'}
            onClick={() => {
              setStudioTab('community');
              setCategoryFilter('All');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer tabular-nums ${
              studioTab === 'community'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
            <span>Community Games ({publicGames.length})</span>
          </button>
        </div>

        {feedback.text && (
          <div
            role="status"
            className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/50 text-rose-700 dark:text-rose-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-200'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback({ type: '', text: '' })}
              aria-label="Dismiss notice"
              className="p-0.5 hover:opacity-75 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Inline Player for Community or Saved Games */}
      {playingGame && studioTab !== 'create' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-cyan-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 truncate">
                  {playingGame.title}
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 text-xs font-semibold">
                  {playingGame.category}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  by {playingGame.creatorName}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Controls: {playingGame.controls || 'Keyboard & Mouse'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleLikeStudioGame(playingGame)}
                aria-pressed={likedIds.includes(playingGame.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border text-xs font-semibold cursor-pointer ${
                  likedIds.includes(playingGame.id)
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{Number(playingGame.likes || 0)}</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadIntoStudio(playingGame)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{playingGame.isOwner ? 'Edit' : 'Remix'}</span>
              </button>

              <button
                type="button"
                onClick={() => downloadHtmlFile(playingGame.title, playingGame.html)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={() => setPlayingKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Restart</span>
              </button>

              <button
                type="button"
                onClick={() => handleFullscreenStage(modalStageRef)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Fullscreen</span>
              </button>

              <button
                type="button"
                onClick={() => setPlayingGame(null)}
                aria-label="Close game stage"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            ref={modalStageRef}
            className="w-full h-[480px] sm:h-[580px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950"
          >
            <iframe
              key={`${playingGame.id}-${playingKey}`}
              srcDoc={playingGame.html}
              title={playingGame.title}
              sandbox="allow-scripts allow-pointer-lock allow-forms"
              allow="fullscreen; autoplay; gamepad"
              className="w-full h-full border-0 block"
            />
          </div>
        </div>
      )}

      {/* TAB 1: CREATE WITH AI */}
      {studioTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Builder Panel */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/20 space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">
                {draft ? 'Build or Refine Game' : 'Describe Your Game'}
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Pick a starter idea or write your own rules, enemies, controls, and win conditions.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STARTER_IDEAS.map((idea) => (
                <button
                  key={idea.label}
                  type="button"
                  onClick={() => {
                    setPrompt(idea.prompt);
                    setGenre(idea.genre);
                    setThemeStyle(idea.style);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {idea.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Genre</span>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="mt-1 w-full px-3 py-2 min-h-[40px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Visual Style</span>
                <select
                  value={themeStyle}
                  onChange={(e) => setThemeStyle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 min-h-[40px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {draft ? 'Prompt (New Game or Changes to Apply)' : 'Game Prompt'}
              </span>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  draft
                    ? 'e.g. Add a boss wave every 500 points, double jump, and particle explosions...'
                    : 'e.g. A top-down zombie survival shooter with dash ability, ammo crates, and waves...'
                }
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </label>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerate(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 text-sm font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>{isGenerating ? 'Building Game...' : draft ? 'Generate New' : 'Generate Game'}</span>
              </button>

              {draft && (
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleGenerate(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-sm font-bold transition-colors cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" aria-hidden="true" />
                  <span>{isGenerating ? 'Updating...' : 'Apply Changes'}</span>
                </button>
              )}
            </div>

            {/* Metadata + Save/Visibility controls once draft exists */}
            {draft && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Game Title</span>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                      maxLength={80}
                      className="mt-1 w-full px-3 py-2 min-h-[38px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</span>
                    <input
                      type="text"
                      value={draft.category}
                      onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                      maxLength={32}
                      className="mt-1 w-full px-3 py-2 min-h-[38px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</span>
                  <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                    maxLength={320}
                    className="mt-1 w-full px-3 py-2 min-h-[38px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, isPublic: !prev.isPublic }))
                    }
                    aria-pressed={draft.isPublic}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      draft.isPublic
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-700 dark:text-sky-300'
                        : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {draft.isPublic ? (
                      <>
                        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Visibility: Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Visibility: Private</span>
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveDraft()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isSaving ? 'Saving...' : draft.id ? 'Update Save' : 'Save Game'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadHtmlFile(draft.title, draft.html)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Download .html</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Live Preview Stage */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                  {draft ? draft.title : 'Live Game Preview'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {draft ? `Controls: ${draft.controls}` : 'Generate a game or load one from Saves / Community to test it here.'}
                </p>
              </div>

              {draft && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCode((s) => !s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{showCode ? 'Show Game' : 'Edit HTML'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewKey((k) => k + 1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Restart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFullscreenStage(previewStageRef)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Fullscreen</span>
                  </button>
                </div>
              )}
            </div>

            <div
              ref={previewStageRef}
              className="relative w-full h-[520px] sm:h-[580px] rounded-2xl overflow-hidden border border-slate-200 dark:border-cyan-500/25 bg-slate-950 shadow-xl flex items-center justify-center"
            >
              {isGenerating ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-9 h-9 mx-auto rounded-full border-3 border-slate-700 border-t-cyan-400 animate-spin" />
                  <p className="text-sm font-semibold text-slate-200">
                    Writing game loop, graphics & controls...
                  </p>
                </div>
              ) : draft ? (
                showCode ? (
                  <textarea
                    value={draft.html}
                    onChange={(e) => setDraft((prev) => ({ ...prev, html: e.target.value }))}
                    spellCheck={false}
                    aria-label="Game HTML source editor"
                    className="w-full h-full p-4 bg-slate-950 text-cyan-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                  />
                ) : (
                  <iframe
                    key={`preview-${previewKey}`}
                    srcDoc={draft.html}
                    title={draft.title}
                    sandbox="allow-scripts allow-pointer-lock allow-forms"
                    allow="fullscreen; autoplay; gamepad"
                    className="w-full h-full border-0 block"
                  />
                )
              ) : (
                <div className="p-8 text-center max-w-md space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-cyan-400" aria-hidden="true" />
                  <p className="font-display text-base font-semibold text-slate-100">
                    Your playable stage is ready
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Choose a starter prompt or type your own idea on the left and click Generate Game. You can save drafts, toggle Public sharing, and download your game anytime.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 & 3: MY SAVES & COMMUNITY GAMES WITH SEARCH BAR */}
      {studioTab !== 'create' && (
        <div className="space-y-5">
          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={studioSearch}
                onChange={(e) => setStudioSearch(e.target.value)}
                placeholder={
                  studioTab === 'saves'
                    ? 'Search my saved games...'
                    : 'Search community games by title or creator...'
                }
                aria-label="Search studio games"
                className="w-full pl-9 pr-9 py-2 min-h-[40px] text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {studioSearch && (
                <button
                  type="button"
                  onClick={() => setStudioSearch('')}
                  aria-label="Clear studio search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {listCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Saved / Public Games */}
          {loadingGames ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading Studio library...
            </div>
          ) : filteredList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredList.map((game) => {
                const liked = likedIds.includes(game.id);
                return (
                  <article
                    key={game.id}
                    className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition-colors space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                            {game.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {game.category} · by {game.isOwner ? `${game.creatorName} (You)` : game.creatorName}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
                            game.isPublic
                              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/25'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {game.isPublic ? (
                            <>
                              <Globe className="w-3 h-3" aria-hidden="true" />
                              <span>Public</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" aria-hidden="true" />
                              <span>Private</span>
                            </>
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {game.description || 'Custom HTML5 game created in Recess Arcade Studio.'}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <Play className="w-3 h-3" aria-hidden="true" />
                          {Number(game.plays || 0).toLocaleString()} plays
                        </span>
                        <button
                          type="button"
                          onClick={() => handleLikeStudioGame(game)}
                          className={`inline-flex items-center gap-1 cursor-pointer ${
                            liked ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : 'hover:text-slate-200'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" aria-hidden="true" />
                          {Number(game.likes || 0).toLocaleString()}
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePlaySavedGame(game)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        <span>Play</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadIntoStudio(game)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{game.isOwner ? 'Edit' : 'Remix'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadHtmlFile(game.title, game.html)}
                        aria-label={`Download ${game.title}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>

                      {game.isOwner && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(game)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg border border-slate-300 dark:border-slate-700 hover:border-cyan-500 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            {game.isPublic ? 'Make Private' : 'Make Public'}
                          </button>

                          {confirmDeleteId === game.id ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteSaved(game.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(game.id)}
                              aria-label={`Delete ${game.title}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg text-rose-500 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-14 px-6 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                {studioSearch
                  ? 'No matching games found'
                  : studioTab === 'saves'
                    ? 'No saved games yet'
                    : 'No public community games yet'}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                {studioSearch
                  ? 'Try clearing or changing your search keyword.'
                  : studioTab === 'saves'
                    ? 'Create a game in the AI Builder tab and click Save Game to keep it here.'
                    : 'Be the first! Build a game in Create with AI, toggle Visibility to Public, and save it for everyone to play.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (studioSearch) {
                    setStudioSearch('');
                    setCategoryFilter('All');
                  } else {
                    setStudioTab('create');
                  }
                }}
                className="mt-5 px-4 py-2 min-h-[40px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold cursor-pointer"
              >
                {studioSearch ? 'Reset Search' : 'Open AI Builder'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
