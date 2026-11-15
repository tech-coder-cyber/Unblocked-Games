/**
 * Extracts safe iframe attributes from a game entry in games.json.
 * Supports either structured `game.iframe` objects or raw `game.iframeHtml` strings.
 */
export function resolveGameIframe(game) {
  if (!game) {
    return { src: '', title: 'Game Frame', allow: 'fullscreen', sandbox: undefined };
  }

  if (game.iframe && typeof game.iframe === 'object' && game.iframe.src) {
    return {
      src: game.iframe.src,
      title: game.iframe.title || `${game.title} Game Frame`,
      allow: game.iframe.allow || 'fullscreen; autoplay',
      sandbox: game.iframe.sandbox || undefined,
    };
  }

  if (typeof game.iframeHtml === 'string' && game.iframeHtml.includes('<iframe')) {
    const getAttr = (attrName) => {
      const match = game.iframeHtml.match(new RegExp(`${attrName}=["']([^"']*)["']`, 'i'));
      return match ? match[1] : '';
    };
    const sb = getAttr('sandbox');
    return {
      src: getAttr('src'),
      title: getAttr('title') || `${game.title} Game Frame`,
      allow: getAttr('allow') || 'fullscreen; autoplay',
      sandbox: sb || undefined,
    };
  }

  return {
    src: '',
    title: `${game.title} Game Frame`,
    allow: 'fullscreen; autoplay',
    sandbox: undefined,
  };
}
