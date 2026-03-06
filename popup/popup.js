const gainEl = document.getElementById('gain');
const gainValueEl = document.getElementById('gainValue');
const safeModeEl = document.getElementById('safeMode');
const resetEl = document.getElementById('reset');
const statusEl = document.getElementById('status');

const STORAGE_PREFIX = 'site:';
const MIN_GAIN_PERCENT = 50;
const MAX_GAIN_PERCENT = 300;

function setStatus(text) {
  statusEl.textContent = text || '';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function getOriginFromTab(tab) {
  try {
    const url = new URL(tab.url);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
    return null;
  } catch {
    return null;
  }
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/contentScript.js']
  });
}

function tabMessage(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

function renderGain(percent) {
  gainValueEl.textContent = `${percent}%`;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

async function loadSiteSettings(origin) {
  if (!origin) return { gainPercent: 100, safeMode: true };

  const key = `${STORAGE_PREFIX}${origin}`;
  const result = await chrome.storage.local.get(key);
  const value = result[key];

  return {
    gainPercent: clamp(Number(value?.gainPercent ?? 100), MIN_GAIN_PERCENT, MAX_GAIN_PERCENT),
    safeMode: Boolean(value?.safeMode ?? true)
  };
}

async function saveSiteSettings(origin, partial) {
  if (!origin) return;
  const key = `${STORAGE_PREFIX}${origin}`;
  const current = (await chrome.storage.local.get(key))[key] || {};
  await chrome.storage.local.set({
    [key]: {
      ...current,
      ...partial,
      updatedAt: Date.now()
    }
  });
}

async function applyToTab(tabId, settings) {
  await ensureContentScript(tabId);
  return tabMessage(tabId, { type: 'SVB_SET', payload: settings });
}

async function requestState(tabId) {
  await ensureContentScript(tabId);
  return tabMessage(tabId, { type: 'SVB_GET' });
}

async function init() {
  setStatus('');

  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus('No active tab.');
    return;
  }

  const origin = getOriginFromTab(tab);
  if (!origin) {
    setStatus('This page cannot be controlled.');
    gainEl.disabled = true;
    safeModeEl.disabled = true;
    resetEl.disabled = true;
    return;
  }

  const stored = await loadSiteSettings(origin);
  gainEl.value = String(stored.gainPercent);
  safeModeEl.checked = stored.safeMode;
  renderGain(stored.gainPercent);

  try {
    const state = await requestState(tab.id);
    if (state?.ok && typeof state?.gainPercent === 'number') {
      gainEl.value = String(state.gainPercent);
      renderGain(state.gainPercent);
      safeModeEl.checked = Boolean(state.safeMode);
    }
  } catch (e) {
    // Injection fails on restricted pages or if the tab disallows scripting.
    setStatus('Cannot inject on this page.');
    gainEl.disabled = true;
    safeModeEl.disabled = true;
    resetEl.disabled = true;
    return;
  }

  async function onChange() {
    const gainPercent = clamp(Number(gainEl.value), MIN_GAIN_PERCENT, MAX_GAIN_PERCENT);
    const safeMode = Boolean(safeModeEl.checked);

    renderGain(gainPercent);

    try {
      await applyToTab(tab.id, { gainPercent, safeMode });
      await saveSiteSettings(origin, { gainPercent, safeMode });
      setStatus('Applied');
      setTimeout(() => setStatus(''), 800);
    } catch {
      setStatus('Failed to apply.');
    }
  }

  gainEl.addEventListener('input', () => {
    renderGain(clamp(Number(gainEl.value), MIN_GAIN_PERCENT, MAX_GAIN_PERCENT));
  });

  gainEl.addEventListener('change', onChange);
  safeModeEl.addEventListener('change', onChange);

  resetEl.addEventListener('click', async () => {
    gainEl.value = '100';
    safeModeEl.checked = true;
    renderGain(100);
    try {
      await applyToTab(tab.id, { gainPercent: 100, safeMode: true, resetAuto: true });
      await saveSiteSettings(origin, { gainPercent: 100, safeMode: true });
      setStatus('Reset');
      setTimeout(() => setStatus(''), 800);
    } catch {
      setStatus('Failed to reset.');
    }
  });
}

init().catch(() => {
  setStatus('Error');
});
