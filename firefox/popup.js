/**
 * TubeCourier - Remote Video Downloader
 * Popup Interface: Tab detection, folder selection, and live queue tracking.
 */

const api = typeof browser !== 'undefined' ? browser : chrome;

// DOM Elements - Navigation & Header
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const serverStatusPill = document.getElementById('server-status-pill');
const btnTabSettings = document.getElementById('btn-tab-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');

const navTabs = document.querySelectorAll('.nav-tab');
const viewPanels = document.querySelectorAll('.view-panel');
const queueBadge = document.getElementById('queue-badge');

// DOM Elements - Download View
const videoThumbnail = document.getElementById('video-thumbnail');
const videoTitle = document.getElementById('video-title');
const videoDomain = document.getElementById('video-domain');
const containerTag = document.getElementById('container-tag');
const targetUrlInput = document.getElementById('target-url-input');
const urlStatusBanner = document.getElementById('url-status-banner');
const urlStatusText = document.getElementById('url-status-text');

const folderInput = document.getElementById('folder-input');
const folderDatalist = document.getElementById('folder-datalist');
const folderChipsRow = document.getElementById('folder-chips-row');
const btnRefreshDirs = document.getElementById('btn-refresh-dirs');

const typeSelect = document.getElementById('type-select');
const qualitySelect = document.getElementById('quality-select');
const chkAutoSyncCookies = document.getElementById('chk-auto-sync-cookies');
const btnStartDownload = document.getElementById('btn-start-download');
const btnDownloadLabel = document.getElementById('btn-download-label');

// DOM Elements - Queue View
const activeQueueList = document.getElementById('active-queue-list');
const completedQueueList = document.getElementById('completed-queue-list');
const btnRefreshQueue = document.getElementById('btn-refresh-queue');
const btnClearCompleted = document.getElementById('btn-clear-completed');

// DOM Elements - Settings View
const settingServerUrl = document.getElementById('setting-server-url');
const settingDefaultFolder = document.getElementById('setting-default-folder');
const settingNotifyComplete = document.getElementById('setting-notify-complete');
const settingAutoCookies = document.getElementById('setting-auto-cookies');
const btnTestConnection = document.getElementById('btn-test-connection');
const btnSaveSettings = document.getElementById('btn-save-settings');

// DOM Elements - Toast
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Local State
let currentTab = null;
let serverState = null;
let pollTimer = null;
let availableDirs = [];

// Helpers
function showToast(msg, isSuccess = true) {
  toastMessage.textContent = msg;
  toast.style.backgroundColor = isSuccess ? '#22c55e' : '#ef4444';
  toast.classList.remove('hidden');

  toast.style.animation = 'none';
  void toast.offsetWidth;
  toast.style.animation = 'fadeInOut 2.8s ease forwards';

  setTimeout(() => toast.classList.add('hidden'), 2800);
}

function extractYouTubeId(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    if (host.includes('youtu.be')) {
      return url.pathname.replace(/^\/+/, '').split('/')[0];
    }
    if (host.includes('youtube.com')) {
      if (url.searchParams.get('v')) {
        return url.searchParams.get('v');
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2];
      }
      if (url.pathname.startsWith('/live/')) {
        return url.pathname.split('/')[2];
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/')[2];
      }
      if (url.pathname.startsWith('/v/')) {
        return url.pathname.split('/')[2];
      }
    }
  } catch (e) {}
  return null;
}

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

function setValidUrlState(url, title = null) {
  targetUrlInput.value = url;
  if (title) {
    videoTitle.textContent = title;
  }
  videoDomain.textContent = 'YouTube';

  const ytId = extractYouTubeId(url);
  if (ytId) {
    videoThumbnail.src = `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`;
  } else {
    videoThumbnail.src = 'icons/icon-48.png';
  }

  btnStartDownload.disabled = false;
  btnDownloadLabel.textContent = 'Download Video';

  if (urlStatusBanner) {
    urlStatusBanner.classList.add('hidden');
  }
}

function setInvalidUrlState(reason = 'Not a YouTube video page', rawUrl = '') {
  targetUrlInput.value = '';
  videoTitle.textContent = reason;
  try {
    videoDomain.textContent = rawUrl ? new URL(rawUrl).hostname.replace(/^www\./, '') : 'None';
  } catch (e) {
    videoDomain.textContent = 'None';
  }
  videoThumbnail.src = 'icons/icon-48.png';

  btnStartDownload.disabled = true;
  btnDownloadLabel.textContent = 'Waiting for YouTube Video';

  if (urlStatusBanner) {
    urlStatusBanner.classList.remove('hidden');
    urlStatusBanner.classList.remove('valid');
    if (urlStatusText) {
      urlStatusText.textContent = 'Open a YouTube video page or paste a valid YouTube URL below.';
    }
  }
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || isNaN(bytesPerSec)) return '';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatEta(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '';
  if (seconds < 60) return `ETA: ${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `ETA: ${mins}m ${secs}s`;
}

// Switch Active View
function switchView(viewId) {
  viewPanels.forEach(p => p.classList.add('hidden'));
  navTabs.forEach(t => t.classList.remove('active'));

  const targetPanel = document.getElementById(viewId);
  if (targetPanel) {
    targetPanel.classList.remove('hidden');
  }

  const matchingTab = Array.from(navTabs).find(t => t.dataset.view === viewId);
  if (matchingTab) {
    matchingTab.classList.add('active');
  }
}

// Populate Folder Datalist & Quick Chips
function updateFoldersUI(customDirs = []) {
  availableDirs = customDirs;

  // 1. Populate <datalist> for fast autocomplete search
  folderDatalist.textContent = '';
  for (const dir of customDirs) {
    const opt = document.createElement('option');
    opt.value = dir;
    folderDatalist.appendChild(opt);
  }

  // 2. Compute top-level categories for quick chips
  const topCategories = new Set();
  for (const dir of customDirs) {
    const top = dir.split('/')[0];
    if (top) topCategories.add(top);
  }

  // Render chips
  folderChipsRow.textContent = '';

  // Default root chip
  const defaultChip = document.createElement('button');
  defaultChip.className = `chip ${!folderInput.value ? 'active' : ''}`;
  defaultChip.dataset.folder = '';
  defaultChip.textContent = 'Default (/downloads)';
  defaultChip.addEventListener('click', () => selectChip(''));
  folderChipsRow.appendChild(defaultChip);

  // Top category chips (e.g. Music, Videos, Podcasts)
  for (const cat of Array.from(topCategories).sort()) {
    const chip = document.createElement('button');
    chip.className = `chip ${folderInput.value === cat ? 'active' : ''}`;
    chip.dataset.folder = cat;
    chip.textContent = `📁 ${cat}`;
    chip.addEventListener('click', () => selectChip(cat));
    folderChipsRow.appendChild(chip);
  }
}

function selectChip(folderName) {
  folderInput.value = folderName;
  updateActiveChipHighlight();
}

function updateActiveChipHighlight() {
  const currentVal = folderInput.value.trim();
  const chips = folderChipsRow.querySelectorAll('.chip');
  chips.forEach(chip => {
    if (chip.dataset.folder === currentVal) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

// Render Queue Items
function renderQueueView(queue = [], done = []) {
  const activeCount = queue.filter(x => {
    const s = (x.status || '').toLowerCase();
    return s === 'downloading' || s === 'pending' || s === 'scheduled';
  }).length;

  if (activeCount > 0) {
    queueBadge.textContent = activeCount.toString();
    queueBadge.classList.remove('hidden');
  } else {
    queueBadge.classList.add('hidden');
  }

  // Render Active Queue
  activeQueueList.textContent = '';
  if (queue.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-queue-msg';
    emptyMsg.textContent = 'No active downloads in queue';
    activeQueueList.appendChild(emptyMsg);
  } else {
    for (const item of queue) {
      const card = document.createElement('div');
      card.className = 'queue-item-card';

      const percent = Math.min(100, Math.max(0, item.percent || 0));
      const speedStr = formatSpeed(item.speed);
      const etaStr = formatEta(item.eta);

      // Header
      const header = document.createElement('div');
      header.className = 'queue-item-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'queue-item-title';
      titleSpan.title = item.title || item.url || '';
      titleSpan.textContent = item.title || item.url || '';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-cancel-item';
      cancelBtn.dataset.id = item.id;
      cancelBtn.title = 'Cancel download';
      cancelBtn.textContent = '×';
      cancelBtn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        card.style.opacity = '0.5';
        await api.runtime.sendMessage({ action: 'cancelDownload', id });
        showToast('Download cancelled');
        await syncState();
      });

      header.appendChild(titleSpan);
      header.appendChild(cancelBtn);
      card.appendChild(header);

      // Progress bar
      const progBg = document.createElement('div');
      progBg.className = 'queue-progress-bar-bg';
      const progFill = document.createElement('div');
      progFill.className = 'queue-progress-bar-fill';
      progFill.style.width = `${percent}%`;
      progBg.appendChild(progFill);
      card.appendChild(progBg);

      // Meta
      const meta = document.createElement('div');
      meta.className = 'queue-item-meta';

      const statusSpan = document.createElement('span');
      statusSpan.textContent = percent > 0 ? `${percent.toFixed(1)}%` : (item.status || 'Queued');
      meta.appendChild(statusSpan);

      const speedSpan = document.createElement('span');
      speedSpan.textContent = etaStr ? `${speedStr} • ${etaStr}` : speedStr;
      meta.appendChild(speedSpan);

      if (item.folder) {
        const folderSpan = document.createElement('span');
        folderSpan.className = 'queue-folder-tag';
        folderSpan.textContent = `📁 /${item.folder}`;
        meta.appendChild(folderSpan);
      }

      card.appendChild(meta);
      activeQueueList.appendChild(card);
    }
  }

  // Render Completed Items
  completedQueueList.textContent = '';
  if (done.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-queue-msg';
    emptyMsg.textContent = 'No completed downloads';
    completedQueueList.appendChild(emptyMsg);
  } else {
    const recentDone = done.slice(0, 10);
    for (const item of recentDone) {
      const card = document.createElement('div');
      card.className = 'queue-item-card';

      // Header
      const header = document.createElement('div');
      header.className = 'queue-item-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'queue-item-title';
      titleSpan.title = item.title || item.url || '';
      titleSpan.textContent = `✓ ${item.title || item.url || ''}`;

      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn-clear-item';
      clearBtn.dataset.id = item.id;
      clearBtn.title = 'Clear from list';
      clearBtn.textContent = '×';
      clearBtn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await api.runtime.sendMessage({ action: 'clearDownload', id });
        card.remove();
      });

      header.appendChild(titleSpan);
      header.appendChild(clearBtn);
      card.appendChild(header);

      // Meta
      const meta = document.createElement('div');
      meta.className = 'queue-item-meta';

      const statusSpan = document.createElement('span');
      statusSpan.style.color = '#22c55e';
      statusSpan.textContent = 'Finished';
      meta.appendChild(statusSpan);

      if (item.folder) {
        const folderSpan = document.createElement('span');
        folderSpan.className = 'queue-folder-tag';
        folderSpan.textContent = `📁 /${item.folder}`;
        meta.appendChild(folderSpan);
      }

      card.appendChild(meta);
      completedQueueList.appendChild(card);
    }
  }
}

// Fetch State from Background Service
async function syncState() {
  try {
    const state = await api.runtime.sendMessage({ action: 'getState' });
    if (!state) return;
    serverState = state;

    const folderCount = (state.customDirs || []).length;

    // Update connection status dot & label
    if (state.isConnected) {
      statusDot.className = 'status-dot connected';
      if (folderCount > 0) {
        statusText.textContent = `Connected (${folderCount} folders)`;
      } else {
        statusText.textContent = 'Connected';
      }
    } else {
      statusDot.className = 'status-dot error';
      if (!state.serverUrl) {
        statusText.textContent = 'Configure Server';
      } else {
        statusText.textContent = 'Disconnected';
      }
    }

    // Refresh button text
    btnRefreshDirs.textContent = folderCount > 0 ? `Refresh (${folderCount})` : 'Refresh';

    // Populate folders
    updateFoldersUI(state.customDirs || []);

    // Set default folder if input is empty
    if (!folderInput.value && state.settings && state.settings.defaultFolder) {
      folderInput.value = state.settings.defaultFolder;
      updateActiveChipHighlight();
    }

    // Render Queue
    renderQueueView(state.queue || [], state.done || []);

    // Update settings form if empty
    if (!settingServerUrl.value && state.settings) {
      settingServerUrl.value = state.settings.serverUrl || 'http://localhost:8081';
      settingDefaultFolder.value = state.settings.defaultFolder || '';
      settingNotifyComplete.checked = state.settings.notifyOnComplete !== false;
      settingAutoCookies.checked = state.settings.autoSyncCookies !== false;
      chkAutoSyncCookies.checked = state.settings.autoSyncCookies !== false;
    }
  } catch (err) {
    console.error('[TubeCourier] Failed to sync state:', err);
    statusDot.className = 'status-dot error';
    statusText.textContent = 'Extension Error';
  }
}

// Load Active Tab Info
async function loadActiveTab() {
  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      setInvalidUrlState('No active tab detected');
      return;
    }

    currentTab = tabs[0];
    const tabUrl = currentTab.url || '';

    if (isValidYouTubeVideoUrl(tabUrl)) {
      setValidUrlState(tabUrl, currentTab.title);
    } else {
      setInvalidUrlState('No YouTube video detected on active tab', tabUrl);
    }

    // Container Tab info
    if (api.contextualIdentities && currentTab.cookieStoreId && currentTab.cookieStoreId !== 'firefox-default') {
      try {
        const container = await api.contextualIdentities.get(currentTab.cookieStoreId);
        if (container) {
          containerTag.textContent = container.name;
          containerTag.style.backgroundColor = container.colorCode || '#3b4261';
          containerTag.classList.remove('hidden');
        }
      } catch (e) {}
    }
  } catch (err) {
    console.error('[TubeCourier] Error loading tab info:', err);
    setInvalidUrlState('Error inspecting active tab');
  }
}

// Setup Event Listeners
function setupEvents() {
  // Navigation tabs
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchView(tab.dataset.view);
    });
  });

  // Settings toggle
  btnTabSettings.addEventListener('click', () => {
    switchView('settings-view');
  });

  btnCloseSettings.addEventListener('click', () => {
    switchView('download-view');
  });

  serverStatusPill.addEventListener('click', () => {
    switchView('settings-view');
  });

  // Target URL input validation in real time
  targetUrlInput.addEventListener('input', () => {
    const entered = targetUrlInput.value.trim();
    if (isValidYouTubeVideoUrl(entered)) {
      setValidUrlState(entered, videoTitle.textContent.startsWith('No YouTube') ? 'YouTube Video' : null);
    } else if (entered.length > 0) {
      btnStartDownload.disabled = true;
      btnDownloadLabel.textContent = 'Invalid YouTube URL';
      if (urlStatusBanner) {
        urlStatusBanner.classList.remove('hidden');
        urlStatusBanner.classList.remove('valid');
        if (urlStatusText) {
          urlStatusText.textContent = 'URL must be a valid YouTube video, Short, or Live stream link.';
        }
      }
    } else {
      setInvalidUrlState('No YouTube video URL entered');
    }
  });

  // Folder input change
  folderInput.addEventListener('input', () => {
    updateActiveChipHighlight();
  });

  btnRefreshDirs.addEventListener('click', async () => {
    btnRefreshDirs.textContent = 'Refreshing...';
    await api.runtime.sendMessage({ action: 'reconnect' });
    showToast('Re-syncing with server...');
    setTimeout(async () => {
      await syncState();
      const count = (serverState && serverState.customDirs) ? serverState.customDirs.length : 0;
      if (serverState && serverState.isConnected) {
        showToast(`Connected! Synced ${count} subfolders.`);
      } else {
        showToast('Could not reach server. Check settings.', false);
      }
    }, 1500);
  });

  // Download Trigger
  btnStartDownload.addEventListener('click', async () => {
    const targetUrl = targetUrlInput.value.trim();
    if (!isValidYouTubeVideoUrl(targetUrl)) {
      showToast('Please open or paste a valid YouTube video URL', false);
      return;
    }

    const targetFolder = folderInput.value.trim();

    btnStartDownload.disabled = true;
    btnDownloadLabel.textContent = 'Queueing...';

    try {
      const response = await api.runtime.sendMessage({
        action: 'addDownload',
        downloadParams: {
          url: targetUrl,
          folder: targetFolder,
          download_type: typeSelect.value,
          quality: qualitySelect.value,
          autoSyncCookies: chkAutoSyncCookies.checked,
          storeId: currentTab ? currentTab.cookieStoreId : null
        }
      });

      if (response && response.success) {
        showToast('Video added to download queue!');
        setTimeout(() => {
          switchView('queue-view');
          syncState();
        }, 500);
      } else {
        showToast(`Failed: ${response ? response.error : 'Server error'}`, false);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, false);
    } finally {
      btnStartDownload.disabled = false;
      btnDownloadLabel.textContent = 'Download Video';
    }
  });

  // Queue toolbar
  btnRefreshQueue.addEventListener('click', async () => {
    await syncState();
    showToast('Queue updated');
  });

  btnClearCompleted.addEventListener('click', async () => {
    if (serverState && serverState.done) {
      for (const item of serverState.done) {
        await api.runtime.sendMessage({ action: 'clearDownload', id: item.id });
      }
      showToast('Finished list cleared');
      await syncState();
    }
  });

  // Test Server Connection
  btnTestConnection.addEventListener('click', async () => {
    const testUrl = settingServerUrl.value.trim().replace(/\/+$/, '');
    if (!testUrl) {
      showToast('Please enter a URL first', false);
      return;
    }

    btnTestConnection.textContent = 'Testing...';
    try {
      const res = await fetch(`${testUrl}/`, { method: 'GET' });
      if (res.ok) {
        showToast('Server reachable! Connecting...');
        await api.runtime.sendMessage({
          action: 'saveSettings',
          settings: { serverUrl: testUrl }
        });
        setTimeout(syncState, 1000);
      } else {
        showToast(`Server responded with HTTP ${res.status}`, false);
      }
    } catch (e) {
      showToast(`Cannot reach ${testUrl}: ${e.message}`, false);
    } finally {
      btnTestConnection.textContent = 'Test';
    }
  });

  // Save Settings
  btnSaveSettings.addEventListener('click', async () => {
    const newSettings = {
      serverUrl: settingServerUrl.value.trim().replace(/\/+$/, ''),
      defaultFolder: settingDefaultFolder.value.trim(),
      notifyOnComplete: settingNotifyComplete.checked,
      autoSyncCookies: settingAutoCookies.checked
    };

    await api.runtime.sendMessage({ action: 'saveSettings', settings: newSettings });
    showToast('Settings saved successfully!');
    setTimeout(() => {
      switchView('download-view');
      syncState();
    }, 600);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEvents();
  await loadActiveTab();
  await syncState();

  // Poll state every 1.5s for live progress bars while popup is open
  pollTimer = setInterval(syncState, 1500);
});

window.addEventListener('unload', () => {
  if (pollTimer) clearInterval(pollTimer);
});
