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
    var primaryIsXml = !googleScriptUrl && Boolean(gameXmlUrl);
    var faviconUrl = config.faviconUrl || 'https://ssl.gstatic.com/classroom/favicon.png';
    var pageTitle = config.pageTitle || config.title || 'Game';
    var allowAttrs = config.allow || 'fullscreen; autoplay; encrypted-media; pointer-lock; gamepad';

    var readyHtmlContent = null;
    var activeBlobUrl = null;

    function revokeActiveBlob() {
      if (activeBlobUrl) {
        try {
          URL.revokeObjectURL(activeBlobUrl);
        } catch (e) {}
        activeBlobUrl = null;
      }
    }

    window.addEventListener('pagehide', revokeActiveBlob);

    function decodeBase64Utf8(b64) {
      var clean = String(b64 || '').replace(/\s+/g, '');
      var bin = window.atob(clean);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(bytes);
      }
      var pct = '';
      for (var j = 0; j < bytes.length; j++) {
        pct += '%' + ('00' + bytes[j].toString(16)).slice(-2);
      }
      return decodeURIComponent(pct);
    }

    function decodeDataUri(dataUri) {
      var commaIdx = dataUri.indexOf(',');
      if (commaIdx === -1) return dataUri;
      var header = dataUri.slice(0, commaIdx).toLowerCase();
      var payload = dataUri.slice(commaIdx + 1);
      if (header.indexOf(';base64') !== -1) {
        return decodeBase64Utf8(payload);
      }
      return decodeURIComponent(payload);
    }

    function mountIframe(srcUrl, fullscreen) {
      if (fullscreen && gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen().catch(function () {});
      }

      gameContainer.innerHTML = '';

      var loader = document.createElement('div');
      loader.className = 'frame-loading';
      var spinner = document.createElement('div');
      spinner.className = 'frame-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      var loadText = document.createElement('div');
      loadText.textContent = 'Loading ' + (config.title || 'game') + '...';
      loader.appendChild(spinner);
      loader.appendChild(loadText);

      var frame = document.createElement('iframe');
      frame.src = srcUrl;
      frame.title = config.title || 'Game Frame';
      frame.allow = allowAttrs;
      frame.allowFullscreen = true;
      if (config.sandbox) {
        frame.setAttribute('sandbox', config.sandbox);
      }
      if (config.referrerPolicy) {
        frame.referrerPolicy = config.referrerPolicy;
      }
      frame.addEventListener('load', function () {
        if (loader.parentNode) {
          loader.style.opacity = '0';
          window.setTimeout(function () {
            if (loader.parentNode) loader.parentNode.removeChild(loader);
          }, 220);
        }
        try {
          frame.focus();
        } catch (e) {}
      });

      gameContainer.appendChild(loader);
      gameContainer.appendChild(frame);
    }

    function launchAltGame(fullscreen) {
      if (!readyHtmlContent) {
        if (statusNote) {
          statusNote.textContent = 'Game bundle is still preparing. Please wait a moment.';
        }
        return;
      }
      revokeActiveBlob();
      var blob = new Blob([readyHtmlContent], { type: 'text/html' });
      activeBlobUrl = URL.createObjectURL(blob);
      mountIframe(activeBlobUrl, fullscreen);
    }

    function launchPrimary(fullscreen) {
      if (primaryIsXml) {
        launchAltGame(fullscreen);
        return;
      }
      revokeActiveBlob();
      if (typeof googleScriptUrl === 'string' && googleScriptUrl.indexOf('data:') === 0) {
        try {
          var decodedHtml = decodeDataUri(googleScriptUrl);
          var blob = new Blob([decodedHtml], { type: 'text/html' });
          activeBlobUrl = URL.createObjectURL(blob);
          mountIframe(activeBlobUrl, fullscreen);
          return;
        } catch (e) {}
      }
      mountIframe(googleScriptUrl, fullscreen);
    }

    if (playPrimaryInlineBtn) {
      playPrimaryInlineBtn.addEventListener('click', function () {
        launchPrimary(false);
      });
    }

    if (playPrimaryFullscreenBtn) {
      playPrimaryFullscreenBtn.addEventListener('click', function () {
        launchPrimary(true);
      });
    }

    async function prepareGameContent() {
      if (!gameXmlUrl) {
        if (playAltInlineBtn) playAltInlineBtn.disabled = true;
        if (playAltFullscreenBtn) playAltFullscreenBtn.disabled = true;
        if (statusNote && !statusNote.textContent) {
          statusNote.textContent = 'Ready to launch.';
        }
        return;
      }

      if (primaryIsXml) {
        if (playPrimaryInlineBtn) playPrimaryInlineBtn.disabled = true;
        if (playPrimaryFullscreenBtn) playPrimaryFullscreenBtn.disabled = true;
      }

      try {
        var t;
        if (gameXmlUrl.indexOf('data:') === 0) {
          t = decodeDataUri(gameXmlUrl);
        } else {
          var res = await fetch(gameXmlUrl);
          if (!res.ok) throw new Error('Failed to load XML (' + res.status + ')');
          t = await res.text();
          if (t.trim().indexOf('PD94') === 0 || t.indexOf('<') === -1) {
            t = decodeBase64Utf8(t);
          }
        }

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(t, 'application/xml');
        var contentEl = xmlDoc.querySelector('Content');
        var rawHtml = contentEl ? contentEl.textContent : t;

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
          'html,body,#container{margin:0;padding:0;width:100%!important;height:100%!important;overflow:hidden!important}' +
          '#unity-container{width:100%!important;height:100%!important;display:flex;align-items:center;justify-content:center}' +
          '#unity-canvas{max-width:100%!important;max-height:100%!important}';
        doc.head.appendChild(styleReset);

        var isDataXml = gameXmlUrl.substring(0, 5) === 'data:';
        var xmlBase = isDataXml
          ? window.location.href
          : gameXmlUrl.substring(0, gameXmlUrl.lastIndexOf('/') + 1);

        var discoveredBuildUrl = null;
        if (isDataXml) {
          try {
            var bMatch = rawHtml.match(/(?:const|var|let)\s+buildUrl\s*=\s*['"]([^'"]+)['"]/i);
            if (bMatch) discoveredBuildUrl = bMatch[1];
            if (!discoveredBuildUrl) {
              var loaderMatch = rawHtml.match(/(?:const|var|let)\s+loaderUrl\s*=\s*['"]([^'"]+)['"]/i);
              if (loaderMatch) {
                discoveredBuildUrl = loaderMatch[1].substring(0, loaderMatch[1].lastIndexOf('/') + 1);
              }
            }
            if (discoveredBuildUrl && discoveredBuildUrl.charAt(discoveredBuildUrl.length - 1) !== '/') {
              discoveredBuildUrl += '/';
            }
          } catch (e) {}
        }

        var baseHref = discoveredBuildUrl || xmlBase;
        var hostJson = JSON.stringify(window.location.hostname);
        var refJson = JSON.stringify('https://sites.google.com');
        var patchScript = doc.createElement('script');

        var scriptLines = [
          '(function(){',
          '  const siteUrl = ' + refJson + ';',
          '  const injectedDomain = ' + hostJson + ';',
          '  const BASE_FOR_REL = ' + JSON.stringify(baseHref) + ';',
          '  function absolutize(url){ try{ new URL(url); return url; }catch(e){ try { return new URL(url, BASE_FOR_REL).href; } catch(e2){ return url; } } }',
          '  if (typeof window.Worker === "function") {',
          '    const NativeWorker = window.Worker;',
          '    window.Worker = function(scriptURL, options) {',
          '      const raw = String(scriptURL || "");',
          '      if (/^(?:blob|data):/i.test(raw)) {',
          '        return new NativeWorker(scriptURL, options);',
          '      }',
          '      const absUrl = absolutize(raw);',
          '      const workerDir = absUrl.substring(0, absUrl.lastIndexOf("/") + 1);',
          '      try {',
          '        if (location.protocol !== "blob:" && new URL(absUrl, location.href).origin === location.origin) {',
          '          return new NativeWorker(absUrl, options);',
          '        }',
          '      } catch (e) {}',
          '      const isModule = options && options.type === "module";',
          '      const shimCode = isModule',
          '        ? "import " + JSON.stringify(absUrl) + ";"',
          '        : "(function(){const __dir=" + JSON.stringify(workerDir) + ";const __orig=self.importScripts;self.importScripts=function(){const args=[];for(let i=0;i<arguments.length;i++){const u=String(arguments[i]||\\"\\");try{new URL(u);args.push(u);}catch(e){try{args.push(new URL(u,__dir).href);}catch(e2){args.push(u);}}}return __orig.apply(self,args);};__orig.call(self," + JSON.stringify(absUrl) + ");})();";',
          '      const blobUrl = URL.createObjectURL(new Blob([shimCode], { type: "application/javascript" }));',
          '      return new NativeWorker(blobUrl, options);',
          '    };',
          '    window.Worker.prototype = NativeWorker.prototype;',
          '  }',
          '  function hookIMA() {',
          '    let _google = window.google;',
          '    Object.defineProperty(window, \'google\', {',
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
          "  function patchDomainParamToUrl(u){ try{ if(!(u instanceof URL)) u=new URL(u,location.href); const cur=u.searchParams.get('domain'); if(!cur||cur.trim()===''||cur.toLowerCase().startsWith('blob')){ u.searchParams.set('domain', injectedDomain); } return u.toString(); }catch(e){ return u.toString?u.toString():u; } }",
          "  const _fetch=window.fetch; window.fetch=function(i,n){ try{ let u=null; if(typeof i==='string')u=i; else if(i instanceof Request)u=i.url; if(u && !/^(?:blob|data):/i.test(u)){ const orig=u; try{ new URL(u);}catch(e){u=absolutize(u);} if(isAdHost(u)){ u=patchDomainParamToUrl(new URL(u,location.href)); } if(u!==orig){ i=(typeof i==='string')?u:new Request(u,i); } } }catch(e){} return _fetch.call(this,i,n); };",
          '  try{ const _o=XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open=function(m,u,a,s,p){ try{ let f=u; if(typeof f==="string" && !/^(?:blob|data):/i.test(f)){ try{ new URL(f);}catch(e){ f=absolutize(f);} if(isAdHost(f)) f=patchDomainParamToUrl(new URL(f,location.href)); } return _o.call(this,m,f,a!==false,s,p); }catch(e){ return _o.apply(this,arguments);} }; }catch(e){}',
          '  try{ Object.defineProperty(document,\'referrer\',{ get:function(){ return siteUrl; }, configurable:true }); }catch(e){}',
          '  try{ if(location.protocol==="blob:"&&window.history){ const _ps=history.pushState,_rs=history.replaceState; history.pushState=function(){ try{ return _ps.apply(this,arguments); }catch(e){} }; history.replaceState=function(){ try{ return _rs.apply(this,arguments); }catch(e){} }; } }catch(e){}',
          '  (async function(){',
          '    const blobCache = new Map();',
          '    function makeAbsolute(u){ if(!u||/^(?:blob|data):/i.test(u)) return u; try{ new URL(u); return u; }catch(e){ try{ return new URL(u, BASE_FOR_REL).href; }catch(e2){ return u; } } }',
          '    async function toBlobUrl(url){ if(/^(?:blob|data):/i.test(url)) return url; if(blobCache.has(url)) return blobCache.get(url); try{ const r=await fetch(url); if(!r.ok) return url; const ab=await r.arrayBuffer(); const mime=/\\.wasm$/i.test(url)?"application/wasm":"application/octet-stream"; const b=URL.createObjectURL(new Blob([ab],{type:mime})); blobCache.set(url,b); return b; }catch(e){ return url; } }',
          '    async function mapUnityConfig(configOrUrl){ let cfg=typeof configOrUrl==="string"?await (await fetch(makeAbsolute(configOrUrl))).json():Object.assign({},configOrUrl); if(cfg.streamingAssetsUrl){ cfg.streamingAssetsUrl=(cfg.streamingAssetsUrl==="StreamingAssets"||cfg.streamingAssetsUrl==="StreamingAssets/")?new URL("StreamingAssets/",BASE_FOR_REL).toString():makeAbsolute(cfg.streamingAssetsUrl); } const blobKeys=["dataUrl","codeUrl","memoryUrl","symbolsUrl","wasmCodeUrl"]; const passthroughKeys=["frameworkUrl","wasmFrameworkUrl"]; for(const k of passthroughKeys){ if(cfg[k]&&typeof cfg[k]==="string"){ cfg[k]=makeAbsolute(cfg[k]); } } for(const k of blobKeys){ if(cfg[k]&&typeof cfg[k]==="string"){ const abs=makeAbsolute(cfg[k]); if(!/^(?:blob|data):/i.test(abs) && /\\.wasm$|\\.data$|\\.mem$|\\.symbols$/i.test(abs)){ cfg[k]=await toBlobUrl(abs); } else { cfg[k]=abs; } } } return cfg; }',
          '    let originalCreate=null;',
          '    try{ Object.defineProperty(window,"createUnityInstance",{ configurable:true, enumerable:true, get:function(){ return async function(container,config,onProgress){ const start=Date.now(); while(!originalCreate&&Date.now()-start<8000){ await new Promise(r=>setTimeout(r,25)); } let mapped=config; try{ mapped=await mapUnityConfig(config); }catch(e){} if(originalCreate) return originalCreate(container,mapped,onProgress); if(typeof window.__createUnityInstance_orig==="function") return window.__createUnityInstance_orig(container,mapped,onProgress); throw new Error("createUnityInstance not found"); }; }, set:function(fn){ if(typeof fn==="function"){ originalCreate=fn; window.__createUnityInstance_orig=fn; } } }); }catch(e){}',
          '  })();',
          '})();',
        ];

        patchScript.textContent = scriptLines.join('\n');
        doc.head.prepend(patchScript);

        var baseEl = doc.createElement('base');
        baseEl.href = baseHref;
        doc.head.prepend(baseEl);

        readyHtmlContent = doc.documentElement.outerHTML;
        if (primaryIsXml) {
          if (playPrimaryInlineBtn) playPrimaryInlineBtn.disabled = false;
          if (playPrimaryFullscreenBtn) playPrimaryFullscreenBtn.disabled = false;
        }
        if (statusNote) {
          statusNote.textContent = primaryIsXml
            ? (config.title || 'Game') + ' bundle ready. Click Play Here or Fullscreen to start.'
            : 'Primary and alternative game mirrors are ready.';
        }
      } catch (err) {
        if (statusNote) {
          statusNote.textContent = primaryIsXml
            ? 'Failed to prepare game bundle (' + err.message + ').'
            : 'Alternative mirror unavailable (' + err.message + '). Use Play Here.';
        }
        if (playAltInlineBtn) playAltInlineBtn.disabled = true;
        if (playAltFullscreenBtn) playAltFullscreenBtn.disabled = true;
      }
    }

    if (playAltInlineBtn) {
      playAltInlineBtn.addEventListener('click', function () {
        launchAltGame(false);
      });
    }
    if (playAltFullscreenBtn) {
      playAltFullscreenBtn.addEventListener('click', function () {
        launchAltGame(true);
      });
    }

    prepareGameContent();
  };
})();
