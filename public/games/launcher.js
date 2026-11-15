(function () {
  function syncTheme() {
    try {
      var saved = localStorage.getItem('recess_theme');
      document.documentElement.classList.toggle('dark', saved !== 'light');
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  }

  syncTheme();
  window.addEventListener('storage', syncTheme);
  window.addEventListener('message', function (ev) {
    if (ev.data && ev.data.type === 'RECESS_THEME') {
      document.documentElement.classList.toggle('dark', ev.data.theme !== 'light');
    }
  });

  window.initGameLauncher = function initGameLauncher(config) {
    var gameContainer = document.getElementById('gameContainer');
    var playPrimaryInlineBtn = document.getElementById('playPrimaryInline');
    var playPrimaryFullscreenBtn = document.getElementById('playPrimaryFullscreen');
    var playAltInlineBtn = document.getElementById('playAltInline');
    var playAltFullscreenBtn = document.getElementById('playAltFullscreen');
    var statusNote = document.getElementById('statusNote');

    var googleScriptUrl = config.googleScriptUrl;
    var gameXmlUrl = config.gameXmlUrl;
    var faviconUrl = config.faviconUrl || 'https://ssl.gstatic.com/classroom/favicon.png';
    var pageTitle = config.pageTitle || config.title || 'Game';

    var readyHtmlContent = null;

    function launchPrimary(fullscreen) {
      if (fullscreen && gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen().catch(function () {});
      }
      gameContainer.innerHTML = '';
      var frame = document.createElement('iframe');
      frame.src = googleScriptUrl;
      frame.title = config.title || 'Game Frame';
      frame.allow = 'fullscreen; autoplay; encrypted-media';
      gameContainer.appendChild(frame);
    }

    playPrimaryInlineBtn.addEventListener('click', function () {
      launchPrimary(false);
    });

    playPrimaryFullscreenBtn.addEventListener('click', function () {
      launchPrimary(true);
    });

    async function prepareGameContent() {
      if (!gameXmlUrl) {
        playAltInlineBtn.disabled = true;
        playAltFullscreenBtn.disabled = true;
        return;
      }

      try {
        var res = await fetch(gameXmlUrl);
        if (!res.ok) throw new Error('Failed to load XML (' + res.status + ')');

        var t = await res.text();
        if (t.trim().startsWith('PD94') || !t.includes('<')) {
          var base64str = gameXmlUrl.includes(',') ? gameXmlUrl.split(',')[1] : t;
          t = decodeURIComponent(escape(window.atob(base64str)));
        }

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(t, 'application/xml');
        var contentEl = xmlDoc.querySelector('Content');
        if (!contentEl) throw new Error('<Content> not found in XML');

        var rawHtml = contentEl.textContent;
        var doc = parser.parseFromString(rawHtml, 'text/html');
        if (!doc.head) {
          var h = doc.createElement('head');
          doc.documentElement.insertBefore(h, doc.documentElement.firstChild);
        }

        var titleEl = doc.querySelector('title');
        if (!titleEl) {
          titleEl = doc.createElement('title');
          doc.head.appendChild(titleEl);
        }
        titleEl.textContent = pageTitle;

        var iconLink = doc.createElement('link');
        iconLink.rel = 'icon';
        iconLink.href = faviconUrl;
        doc.head.appendChild(iconLink);

        var styleReset = doc.createElement('style');
        styleReset.textContent =
          'html,body,#container{margin:0;padding:0;width:100%!important;height:100%!important;overflow:hidden!important}';
        doc.head.appendChild(styleReset);

        var baseHref =
          gameXmlUrl.substring(0, 5) === 'data:'
            ? window.location.href
            : gameXmlUrl.substring(0, gameXmlUrl.lastIndexOf('/') + 1);
        var baseEl = doc.createElement('base');
        baseEl.href = baseHref;
        doc.head.prepend(baseEl);

        var hostJson = JSON.stringify(window.location.hostname);
        var hrefJson = JSON.stringify(window.location.href);
        var refJson = JSON.stringify('https://sites.google.com');
        var patchScript = doc.createElement('script');

        var scriptLines = [
          '(function(){',
          '  const injectedHref = ' + hrefJson + ';',
          '  const siteUrl = ' + refJson + ';',
          '  const injectedDomain = ' + hostJson + ';',
          '  const BASE_FOR_REL = ' + JSON.stringify(baseHref) + ';',
          '  function hookIMA() {',
          '    let _google = window.google;',
          "    Object.defineProperty(window, 'google', {",
          '      configurable: true, enumerable: true,',
          '      get: function() { return _google; },',
          '      set: function(v) {',
          '        _google = v;',
          '        if (v && v.ima) {',
          '          if (v.ima.settings && v.ima.settings.setPageUrl) { v.ima.settings.setPageUrl(siteUrl); }',
          '          if (v.ima.AdsRequest && !v.ima.AdsRequest.__patched) {',
          '            const OriginalAdsRequest = v.ima.AdsRequest;',
          '            v.ima.AdsRequest = function() {',
          '              const req = new OriginalAdsRequest();',
          '              req.descriptionUrl = siteUrl; req.contentUrl = siteUrl; req.url = siteUrl; req.pageUrl = siteUrl;',
          '              return req;',
          '            };',
          '            v.ima.AdsRequest.prototype = OriginalAdsRequest.prototype;',
          '            v.ima.AdsRequest.__patched = true;',
          '          }',
          '        }',
          '      }',
          '    });',
          '  }',
          '  hookIMA();',
          "  const AD_HOSTS = ['gamemonetize.com', 'gamedistribution.com'];",
          '  function isAdHost(url){ try { return AD_HOSTS.some(h => url.includes(h)); } catch(e){ return false; } }',
          '  function absolutize(url){ try{ new URL(url); return url; }catch(e){ try { return new URL(url, BASE_FOR_REL).href; } catch(e2){ return url; } } }',
          "  function patchDomainParamToUrl(u){ try{ if(!(u instanceof URL)) u=new URL(u,location.href); const cur=u.searchParams.get('domain'); if(!cur||cur.trim()===''||cur.toLowerCase().startsWith('blob')){ u.searchParams.set('domain', injectedDomain); } return u.toString(); }catch(e){ return u.toString?u.toString():u; } }",
          "  const _fetch=window.fetch; window.fetch=function(i,n){ try{ let u=null; if(typeof i==='string')u=i; else if(i instanceof Request)u=i.url; if(u){ try{ new URL(u);}catch(e){u=absolutize(u);} if(isAdHost(u)){ const p=patchDomainParamToUrl(new URL(u,location.href)); i=(typeof i==='string')?p:new Request(p,i); } } }catch(e){} return _fetch.call(this,i,n); };",
          '  try{ const _o=XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open=function(m,u,a,s,p){ try{ let f=u; try{ new URL(f);}catch(e){ f=absolutize(f);} if(isAdHost(f)) f=patchDomainParamToUrl(new URL(f,location.href)); return _o.call(this,m,f,a!==false,s,p); }catch(e){ return _o.apply(this,arguments);} }; }catch(e){}',
          "  try{ Object.defineProperty(document,'referrer',{ get:function(){ return siteUrl; }, configurable:true }); }catch(e){}",
          '})();',
        ];

        patchScript.textContent = scriptLines.join('\n');
        doc.head.prepend(patchScript);
        readyHtmlContent = doc.documentElement.outerHTML;
        if (statusNote) {
          statusNote.textContent = 'Primary and alternative game mirrors are ready.';
        }
      } catch (err) {
        if (statusNote) {
          statusNote.textContent = 'Alternative mirror unavailable (' + err.message + '). Use Play Here.';
        }
        playAltInlineBtn.disabled = true;
        playAltFullscreenBtn.disabled = true;
      }
    }

    function launchAltGame(fullscreen) {
      if (!readyHtmlContent) {
        if (statusNote) statusNote.textContent = 'Alternative bundle is still preparing. Please wait a moment.';
        return;
      }
      if (fullscreen && gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen().catch(function () {});
      }
      var blob = new Blob([readyHtmlContent], { type: 'text/html' });
      var blobUrl = URL.createObjectURL(blob);
      gameContainer.innerHTML = '';
      var frame = document.createElement('iframe');
      frame.src = blobUrl;
      frame.title = config.title || 'Game Frame';
      frame.allow = 'fullscreen; autoplay; encrypted-media';
      gameContainer.appendChild(frame);
    }

    playAltInlineBtn.addEventListener('click', function () {
      launchAltGame(false);
    });
    playAltFullscreenBtn.addEventListener('click', function () {
      launchAltGame(true);
    });

    prepareGameContent();
  };
})();
