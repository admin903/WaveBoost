(() => {
  if (window.__smartVolumeBoosterInjected) return;
  window.__smartVolumeBoosterInjected = true;

  const MAX_GAIN = 3.0; // 300%
  const MIN_GAIN = 0.5; // 50%
  const MIN_GAIN_PERCENT = 50;
  const MAX_GAIN_PERCENT = 300;

  const MONITOR_INTERVAL_MS = 200;
  const PEAK_CLIP_THRESHOLD = 0.98;
  const PEAK_RECOVER_THRESHOLD = 0.6;
  const AUTO_GAIN_MIN = 0.2;
  const AUTO_GAIN_ATTACK_MULTIPLIER = 0.88;
  const AUTO_GAIN_RELEASE_MULTIPLIER = 1.02;

  let state = {
    gainPercent: 100,
    safeMode: true
  };

  /** @type {AudioContext | null} */
  let audioContext = null;
  /** @type {DynamicsCompressorNode | null} */
  let compressor = null;
  /** @type {GainNode | null} */
  let safeMix = null;
  /** @type {AnalyserNode | null} */
  let analyser = null;

  /**
   * Each element gets its own source + gain.
   * In safeMode, graph is: source -> userGain -> autoGain -> compressor -> destination
   * Otherwise: source -> userGain -> destination
   */
  const nodesByElement = new WeakMap();

  let autoGainValue = 1.0;
  let monitorTimer = null;

  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  function gainPercentToLinear(percent) {
    return clamp(percent / 100, MIN_GAIN, MAX_GAIN);
  }

  function ensureAudioContext() {
    if (audioContext) return audioContext;

    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctor();

    compressor = audioContext.createDynamicsCompressor();
    // Conservative limiter-ish settings
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    safeMix = audioContext.createGain();
    safeMix.gain.value = 1.0;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    // Build the safe-mode chain once.
    safeMix.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(audioContext.destination);

    return audioContext;
  }

  async function resumeIfNeeded() {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch {
        // Ignore; some pages may block resuming until a page gesture.
      }
    }
  }

  function disconnectGraph(graph) {
    try { graph.source.disconnect(); } catch {}
    try { graph.userGain.disconnect(); } catch {}
    if (graph.autoGain) {
      try { graph.autoGain.disconnect(); } catch {}
    }
  }

  function connectGraph(graph) {
    const ctx = ensureAudioContext();

    // Always rebuild connections so toggling safe mode is clean.
    disconnectGraph(graph);

    if (state.safeMode) {
      if (!graph.autoGain) graph.autoGain = ctx.createGain();
      graph.autoGain.gain.value = autoGainValue;

      graph.source.connect(graph.userGain);
      graph.userGain.connect(graph.autoGain);
      graph.autoGain.connect(safeMix);
    } else {
      graph.source.connect(graph.userGain);
      graph.userGain.connect(ctx.destination);
    }
  }

  function attachToMediaElement(el) {
    if (!el || nodesByElement.has(el)) return;

    const ctx = ensureAudioContext();

    let source;
    try {
      source = ctx.createMediaElementSource(el);
    } catch {
      // Some pages may already wrap the element or disallow source creation.
      return;
    }

    const userGain = ctx.createGain();
    userGain.gain.value = gainPercentToLinear(state.gainPercent);

    const graph = { source, userGain, autoGain: null };
    nodesByElement.set(el, graph);

    connectGraph(graph);
  }

  function scanAndAttach() {
    const media = Array.from(document.querySelectorAll('audio, video'));
    for (const el of media) attachToMediaElement(el);
  }

  function setUserGainAll() {
    const linear = gainPercentToLinear(state.gainPercent);
    // WeakMap isn't iterable, so rescan and set for known elements.
    const media = Array.from(document.querySelectorAll('audio, video'));
    for (const el of media) {
      const graph = nodesByElement.get(el);
      if (graph) graph.userGain.gain.value = linear;
    }
  }

  function rebuildAllGraphs() {
    const media = Array.from(document.querySelectorAll('audio, video'));
    for (const el of media) {
      const graph = nodesByElement.get(el);
      if (graph) connectGraph(graph);
    }
  }

  function startMonitoring() {
    if (monitorTimer) return;
    if (!analyser) return;

    const data = new Float32Array(analyser.fftSize);

    monitorTimer = window.setInterval(() => {
      if (!state.safeMode) return;
      if (!analyser) return;

      analyser.getFloatTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i]);
        if (v > peak) peak = v;
      }

      // Anti-clipping: if near full-scale, reduce autoGain quickly.
      // If comfortably low, slowly recover back to 1.0.
      if (peak > PEAK_CLIP_THRESHOLD) {
        autoGainValue = Math.max(AUTO_GAIN_MIN, autoGainValue * AUTO_GAIN_ATTACK_MULTIPLIER);
        applyAutoGainAll();
      } else if (peak < PEAK_RECOVER_THRESHOLD && autoGainValue < 1.0) {
        autoGainValue = Math.min(1.0, autoGainValue * AUTO_GAIN_RELEASE_MULTIPLIER);
        applyAutoGainAll();
      }
    }, MONITOR_INTERVAL_MS);
  }

  function stopMonitoring() {
    if (!monitorTimer) return;
    clearInterval(monitorTimer);
    monitorTimer = null;
  }

  function applyAutoGainAll() {
    const media = Array.from(document.querySelectorAll('audio, video'));
    for (const el of media) {
      const graph = nodesByElement.get(el);
      if (graph?.autoGain) graph.autoGain.gain.value = autoGainValue;
    }
  }

  function resetAutoGain() {
    autoGainValue = 1.0;
    applyAutoGainAll();
  }

  function observeMutations() {
    const observer = new MutationObserver(() => {
      scanAndAttach();
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'SVB_GET') {
      sendResponse({ ok: true, ...state });
      return true;
    }

    if (message.type === 'SVB_SET') {
      const payload = message.payload || {};
      const gainPercent = payload.gainPercent;
      const safeMode = payload.safeMode;

      if (typeof gainPercent === 'number') state.gainPercent = clamp(gainPercent, MIN_GAIN_PERCENT, MAX_GAIN_PERCENT);
      if (typeof safeMode === 'boolean') state.safeMode = safeMode;

      if (payload.resetAuto) resetAutoGain();

      scanAndAttach();
      setUserGainAll();
      rebuildAllGraphs();

      if (state.safeMode) {
        startMonitoring();
      } else {
        stopMonitoring();
      }

      resumeIfNeeded();

      sendResponse({ ok: true, ...state });
      return true;
    }
  });

  // Initial setup
  scanAndAttach();
  observeMutations();
  startMonitoring();
})();
