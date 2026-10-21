/**
 * TubeCourier for MeTube (Chrome / Chromium MV3 Edition)
 * Background Service Worker: Socket.IO client, notifications, cookie syncing, declarativeNetRequest origin rewriting.
 */

// Import bundled Socket.IO client in Service Worker scope
try {
  importScripts('lib/socket.io.min.js');
} catch (e) {
  console.error('[TubeCourier] Failed to import socket.io.min.js:', e);
}

const api = typeof chrome !== 'undefined' ? chrome : browser;
const actionApi = api.action || api.browserAction;

// State Cache
let socket = null;
let isConnected = false;
let currentQueue = [];
let currentDone = [];
let customDirs = [];
let connectionError = null;

// Default settings
const DEFAULT_SETTINGS = {
  serverUrl: 'http://localhost:8081',
  defaultFolder: '',
  defaultQuality: 'best',
  defaultType: 'video', // 'video' or 'audio'
  defaultFormat: 'any',
  autoSyncCookies: true,
  notifyOnComplete: true,
  notifySound: true
};

let userSettings = { ...DEFAULT_SETTINGS };

// Load settings from storage
async function loadSettings() {
  try {
    const data = await api.storage.local.get(['tubecourierSettings', 'tuberelaySettings', 'metubeSettings']);
    if (data && data.tubecourierSettings) {
      userSettings = { ...DEFAULT_SETTINGS, ...data.tubecourierSettings };
    } else if (data && data.tuberelaySettings) {
      userSettings = { ...DEFAULT_SETTINGS, ...data.tuberelaySettings };
    } else if (data && data.metubeSettings) {
      userSettings = { ...DEFAULT_SETTINGS, ...data.metubeSettings };
    }
  } catch (err) {
    console.error('[TubeCourier] Error loading settings:', err);
  }
}

async function saveSettings(newSettings) {
  userSettings = { ...userSettings, ...newSettings };
  await api.storage.local.set({ tubecourierSettings: userSettings });
  await updateOriginHeaderRule(userSettings.serverUrl);
}

// -------------------------------------------------------------
// DeclarativeNetRequest: Origin header rewriting for MeTube
// -------------------------------------------------------------
async function updateOriginHeaderRule(serverUrl) {
  if (!api.declarativeNetRequest || !serverUrl) return;

  try {
    const cleanServer = serverUrl.replace(/\/+$/, '');
    let urlObj;
    try {
      urlObj = new URL(cleanServer);
    } catch (e) {
      return;
    }

    const domainFilter = urlObj.hostname;

    await api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [{
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'Origin', operation: 'set', value: cleanServer }
          ]
        },
        condition: {
          urlFilter: `||${domainFilter}`,
          resourceTypes: ['xmlhttprequest', 'websocket', 'other']
        }
      }]
    });
    console.log('[TubeCourier] declarativeNetRequest dynamic Origin rule set for:', domainFilter, '->', cleanServer);
  } catch (err) {
    console.warn('[TubeCourier] Error setting declarativeNetRequest rule:', err);
  }
}

// -------------------------------------------------------------
// Cookie Helpers (Netscape format for yt-dlp)
// -------------------------------------------------------------
function getBaseDomain(hostname) {
  if (!hostname) return '';
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) return hostname.toLowerCase();

  const multiPartTLDs = [
    'co.uk', 'gov.uk', 'ac.uk', 'org.uk',
    'com.au', 'net.au', 'org.au',
    'co.jp', 'ne.jp',
    'co.nz', 'net.nz',
    'com.br', 'com.mx'
  ];

  const lastTwo = parts.slice(-2).join('.');
  if (multiPartTLDs.includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

function mergeCookieLists(...lists) {
  const map = new Map();
  for (const list of lists) {
    if (!list) continue;
    for (const c of list) {
      const key = `${c.domain}|${c.path}|${c.name}`;
      if (!map.has(key)) {
        map.set(key, c);
      }
    }
  }
  return Array.from(map.values());
}

function formatNetscape(cookies, domainName) {
  const lines = [
    "# Netscape HTTP Cookie File",
    "# https://curl.se/docs/http-cookies.html",
    `# Exported by TubeCourier on ${new Date().toISOString()}`,
    `# Target Domain: ${domainName}`,
    "#",
    "# domain\tinclude_subdomains\tpath\tsecure\texpiry\tname\tvalue"
  ];

  for (const c of cookies) {
    let domain = c.domain || "";
    const includeSub = !c.hostOnly;
    if (includeSub && !domain.startsWith('.')) {
      domain = '.' + domain;
    }
    const domainField = c.httpOnly ? `#HttpOnly_${domain}` : domain;
    const subField = includeSub ? "TRUE" : "FALSE";
    const pathField = c.path || "/";
    const secureField = c.secure ? "TRUE" : "FALSE";
    const expiryField = c.session ? 0 : (c.expirationDate ? Math.round(c.expirationDate) : 0);
    const name = c.name || "";
    const value = c.value || "";

    lines.push(`${domainField}\t${subField}\t${pathField}\t${secureField}\t${expiryField}\t${name}\t${value}`);
  }

  return lines.join("\n") + "\n";
}

async function extractCookies(targetUrl, storeId = null) {
  try {
    const urlObj = new URL(targetUrl);
    const hostname = urlObj.hostname;
    const baseDomain = getBaseDomain(hostname);
    const queryOpts = storeId ? { storeId } : {};

    const byDomain = await api.cookies.getAll({ ...queryOpts, domain: baseDomain });
    const byUrl = await api.cookies.getAll({ ...queryOpts, url: targetUrl });
    let combined = mergeCookieLists(byDomain, byUrl);

    // If YouTube, include Google auth cookies
    const isYouTube = baseDomain === 'youtube.com' || hostname.endsWith('youtube.com') || hostname.endsWith('youtu.be');
    if (isYouTube) {
      try {
        const googleCookies = await api.cookies.getAll({ ...queryOpts, domain: 'google.com' });
        combined = mergeCookieLists(combined, googleCookies);
      } catch (e) {
        console.warn('[TubeCourier] Google cookie fetch warning:', e);
      }
    }

    return formatNetscape(combined, baseDomain);
  } catch (err) {
    console.error('[TubeCourier] Failed to extract cookies:', err);
    return null;
  }
}

async function uploadCookiesToServer(serverUrl, netscapeContent) {
  if (!netscapeContent) return false;
  try {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const formData = new FormData();
    const blob = new Blob([netscapeContent], { type: 'text/plain' });
    formData.append('cookies', blob, 'cookies.txt');

    const res = await fetch(`${cleanUrl}/upload-cookies`, {
      method: 'POST',
      body: formData
    });
    return res.ok;
  } catch (err) {
    console.error('[TubeCourier] Failed to upload cookies to server:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Badge & Notifications
// -------------------------------------------------------------
function updateBadge() {
  if (!actionApi) return;
  const activeCount = currentQueue.filter(item => {
    const s = (item.status || '').toLowerCase();
    return s === 'downloading' || s === 'pending' || s === 'scheduled';
  }).length;

  if (activeCount > 0) {
    actionApi.setBadgeText({ text: activeCount.toString() });
    actionApi.setBadgeBackgroundColor({ color: '#22c55e' });
  } else {
    actionApi.setBadgeText({ text: '' });
  }
}

function notifyDownloadComplete(item) {
  if (!userSettings.notifyOnComplete) return;

  const title = item.title || 'Video Download Complete';
  const folderInfo = item.folder ? ` (Saved to /${item.folder})` : '';

  try {
    api.notifications.create(`tubecourier-done-${item.id || Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'TubeCourier Download Finished',
      message: `${title}${folderInfo}`,
      priority: 2
    });
  } catch (err) {
    console.warn('[TubeCourier] Notification error:', err);
  }
}

// -------------------------------------------------------------
// Socket.IO Connection Setup
// -------------------------------------------------------------
function connectSocket() {
  if (typeof io === 'undefined') {
    console.warn('[TubeCourier] io is not defined yet');
    return;
  }

  if (socket) {
    try {
      socket.disconnect();
    } catch (e) {}
    socket = null;
  }

  if (!userSettings.serverUrl) {
    isConnected = false;
    connectionError = 'Server URL not configured';
    return;
  }

  const cleanUrl = userSettings.serverUrl.replace(/\/+$/, '');
  console.log('[TubeCourier] Connecting to Socket.IO at:', cleanUrl);

  try {
    socket = io(cleanUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
      autoConnect: true,
      path: '/socket.io'
    });

    socket.on('connect', () => {
      isConnected = true;
      connectionError = null;
      console.log('[TubeCourier] Socket.IO Connected! ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      isConnected = false;
      console.log('[TubeCourier] Socket.IO Disconnected:', reason);
      updateBadge();
    });

    socket.on('connect_error', (err) => {
      isConnected = false;
      connectionError = err.message || 'Connection failed';
      console.warn('[TubeCourier] Socket.IO Connect Error:', err.message);
    });

    // Initial state: 'all'
    socket.on('all', (data) => {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsed) {
          currentQueue = parsed.queue || [];
          currentDone = parsed.done || [];
          updateBadge();
          console.log('[TubeCourier] Queue updated. Active items:', currentQueue.length);
        }
      } catch (e) {
        console.error('[TubeCourier] Error parsing "all" event:', e);
      }
    });

    // Folders: 'custom_dirs'
    socket.on('custom_dirs', (data) => {
      try {
        let parsed = data;
        if (typeof data === 'string') {
          try {
            parsed = JSON.parse(data);
          } catch (e) {}
        }

        let dirList = [];
        if (Array.isArray(parsed)) {
          dirList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          const dl = Array.isArray(parsed.download_dir) ? parsed.download_dir : [];
          const audio = Array.isArray(parsed.audio_download_dir) ? parsed.audio_download_dir : [];
          dirList = Array.from(new Set([...dl, ...audio]));
        }

        customDirs = dirList
          .filter(d => d && typeof d === 'string' && d.trim().length > 0)
          .map(d => d.trim());

        console.log(`[TubeCourier] Successfully parsed ${customDirs.length} folders!`);
      } catch (e) {
        console.error('[TubeCourier] Error parsing "custom_dirs":', e);
      }
    });

    // Download added
    socket.on('added', (data) => {
      try {
        const item = typeof data === 'string' ? JSON.parse(data) : data;
        if (item && item.id) {
          const idx = currentQueue.findIndex(x => x.id === item.id);
          if (idx === -1) {
            currentQueue.push(item);
          } else {
            currentQueue[idx] = item;
          }
          updateBadge();
        }
      } catch (e) {}
    });

    // Download updated
    socket.on('updated', (data) => {
      try {
        const item = typeof data === 'string' ? JSON.parse(data) : data;
        if (item && item.id) {
          const idx = currentQueue.findIndex(x => x.id === item.id);
          if (idx !== -1) {
            currentQueue[idx] = { ...currentQueue[idx], ...item };
          } else {
            currentQueue.push(item);
          }
          updateBadge();
        }
      } catch (e) {}
    });

    // Download completed
    socket.on('completed', (data) => {
      try {
        const item = typeof data === 'string' ? JSON.parse(data) : data;
        if (item && item.id) {
          currentQueue = currentQueue.filter(x => x.id !== item.id);
          currentDone.unshift(item);
          updateBadge();
          notifyDownloadComplete(item);
        }
      } catch (e) {}
    });

    // Download canceled
    socket.on('canceled', (data) => {
      try {
        const id = typeof data === 'string' ? JSON.parse(data) : data;
        currentQueue = currentQueue.filter(x => x.id !== id);
        updateBadge();
      } catch (e) {}
    });

    // Download cleared
    socket.on('cleared', (data) => {
      try {
        const id = typeof data === 'string' ? JSON.parse(data) : data;
        currentDone = currentDone.filter(x => x.id !== id);
      } catch (e) {}
    });

  } catch (err) {
    console.error('[TubeCourier] Exception initializing Socket.IO client:', err);
    isConnected = false;
    connectionError = err.message;
  }
}

// -------------------------------------------------------------
// Server Actions: Add, Cancel, Clear
// -------------------------------------------------------------
async function addDownloadToServer({ url, folder, quality, download_type, format, autoSyncCookies = true, storeId = null }) {
  if (!userSettings.serverUrl) {
    throw new Error('Server URL is not configured. Please open settings.');
  }

  const cleanServerUrl = userSettings.serverUrl.replace(/\/+$/, '');

  // Step 1: Automatic Cookie Sync if enabled
  if (autoSyncCookies) {
    try {
      const cookiesNetscape = await extractCookies(url, storeId);
      if (cookiesNetscape) {
        await uploadCookiesToServer(cleanServerUrl, cookiesNetscape);
      }
    } catch (cookieErr) {
      console.warn('[TubeCourier] Cookie sync attempt failed:', cookieErr);
    }
  }

  // Step 2: Queue the download via POST /add
  const payload = {
    url: url,
    quality: quality || userSettings.defaultQuality || 'best',
    download_type: download_type || userSettings.defaultType || 'video',
    format: format || userSettings.defaultFormat || 'any',
    folder: (folder !== undefined && folder !== null) ? folder.trim() : (userSettings.defaultFolder || ''),
    auto_start: true
  };

  const response = await fetch(`${cleanServerUrl}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server returned HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const resData = await response.json().catch(() => ({ status: 'ok' }));
  return { success: true, data: resData };
}

async function deleteDownload(id, where = 'queue', deleteFiles = false) {
  if (!userSettings.serverUrl) return false;
  const cleanServerUrl = userSettings.serverUrl.replace(/\/+$/, '');

  try {
    const res = await fetch(`${cleanServerUrl}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: [id],
        where: where,
        delete_files: deleteFiles
      })
    });
    return res.ok;
  } catch (e) {
    console.error('[TubeCourier] Failed to delete/cancel download:', e);
    return false;
  }
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// YouTube URL Validation & Context Menu
// -------------------------------------------------------------
const YOUTUBE_PATTERNS = [
  "*://*.youtube.com/watch*",
  "*://*.youtube.com/shorts/*",
  "*://*.youtube.com/live/*",
  "*://*.youtube.com/embed/*",
  "*://*.youtube.com/v/*",
  "*://*.youtube.com/playlist*",
  "*://youtu.be/*"
];

function isValidYouTubeVideoUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    const isYT = host === 'youtube.com' || host.endsWith('.youtube.com');
    const isYoutuBe = host === 'youtu.be' || host.endsWith('.youtu.be');
    if (!isYT && !isYoutuBe) return false;

    if (isYoutuBe) {
      const id = url.pathname.replace(/^\/+/, '').split('/')[0];
      return Boolean(id && /^[a-zA-Z0-9_-]{6,}$/.test(id));
    }

    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      return Boolean(v && /^[a-zA-Z0-9_-]{6,}$/.test(v));
    }

    if (url.pathname.startsWith('/shorts/')) {
      const id = url.pathname.split('/')[2];
      return Boolean(id && /^[a-zA-Z0-9_-]{6,}$/.test(id));
    }

    if (url.pathname.startsWith('/live/')) {
      const id = url.pathname.split('/')[2];
      return Boolean(id && /^[a-zA-Z0-9_-]{6,}$/.test(id));
    }

    if (url.pathname.startsWith('/embed/')) {
      const id = url.pathname.split('/')[2];
      return Boolean(id && /^[a-zA-Z0-9_-]{6,}$/.test(id));
    }

    if (url.pathname.startsWith('/v/')) {
      const id = url.pathname.split('/')[2];
      return Boolean(id && /^[a-zA-Z0-9_-]{6,}$/.test(id));
    }

    if (url.pathname === '/playlist' && url.searchParams.get('list')) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

function setupContextMenu() {
  try {
    api.contextMenus.removeAll(() => {
      // 1. YouTube video page
      api.contextMenus.create({
        id: 'tubecourier-download-page',
        title: 'Download Video with TubeCourier',
        contexts: ['page', 'video'],
        documentUrlPatterns: YOUTUBE_PATTERNS
      });

      // 2. YouTube link
      api.contextMenus.create({
        id: 'tubecourier-download-link',
        title: 'Download Video with TubeCourier',
        contexts: ['link'],
        targetUrlPatterns: YOUTUBE_PATTERNS
      });
    });
  } catch (e) {}
}

api.contextMenus.onClicked.addListener(async (info, tab) => {
  const validIds = ['tubecourier-download-page', 'tubecourier-download-link', 'tubecourier-download-context'];
  if (validIds.includes(info.menuItemId)) {
    const targetUrl = info.linkUrl || info.srcUrl || info.pageUrl || (tab ? tab.url : null);
    if (!targetUrl || !isValidYouTubeVideoUrl(targetUrl)) {
      api.notifications.create(`tubecourier-warn-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'TubeCourier',
        message: 'Only valid YouTube video links can be queued.'
      });
      return;
    }

    try {
      await addDownloadToServer({
        url: targetUrl,
        folder: userSettings.defaultFolder || '',
        quality: userSettings.defaultQuality || 'best',
        download_type: userSettings.defaultType || 'video',
        format: userSettings.defaultFormat || 'any',
        autoSyncCookies: userSettings.autoSyncCookies,
        storeId: tab ? tab.cookieStoreId : null
      });

      api.notifications.create(`tubecourier-queued-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'TubeCourier',
        message: `Queued: ${targetUrl.slice(0, 60)}...`
      });
    } catch (err) {
      api.notifications.create(`tubecourier-err-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'TubeCourier Download Failed',
        message: err.message || 'Could not queue video.'
      });
    }
  }
});

// -------------------------------------------------------------
// Message Listener for Popup Communication
// -------------------------------------------------------------
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getState') {
    if (!socket || !isConnected) {
      connectSocket();
    }
    sendResponse({
      isConnected: isConnected,
      connectionError: connectionError,
      serverUrl: userSettings.serverUrl,
      settings: userSettings,
      queue: currentQueue,
      done: currentDone,
      customDirs: customDirs
    });
    return false;
  }

  if (request.action === 'saveSettings') {
    const prevUrl = userSettings.serverUrl;
    saveSettings(request.settings).then(() => {
      if (request.settings.serverUrl && request.settings.serverUrl !== prevUrl) {
        connectSocket();
      }
      sendResponse({ success: true, settings: userSettings });
    });
    return true; // async
  }

  if (request.action === 'addDownload') {
    if (!request.downloadParams || !isValidYouTubeVideoUrl(request.downloadParams.url)) {
      sendResponse({ success: false, error: 'Only valid YouTube video URLs are supported.' });
      return false;
    }
    addDownloadToServer(request.downloadParams)
      .then(res => sendResponse({ success: true, res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async
  }

  if (request.action === 'cancelDownload') {
    deleteDownload(request.id, 'queue')
      .then(ok => sendResponse({ success: ok }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async
  }

  if (request.action === 'clearDownload') {
    deleteDownload(request.id, 'done', request.deleteFiles || false)
      .then(ok => sendResponse({ success: ok }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async
  }

  if (request.action === 'reconnect') {
    connectSocket();
    sendResponse({ success: true });
    return false;
  }
});

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
async function init() {
  await loadSettings();
  await updateOriginHeaderRule(userSettings.serverUrl);
  setupContextMenu();
  connectSocket();
}

init();
