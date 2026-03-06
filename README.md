# WaveBoost

> A privacy-first Chrome extension that boosts page media volume up to 3× using the Web Audio API — with a built-in safety limiter and zero network access.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Version](https://img.shields.io/badge/version-0.1.0-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Permissions](https://img.shields.io/badge/permissions-minimal-brightgreen)

---

## Features

- **Boost from 50% to 300%** — go beyond the browser's native volume cap
- **Safe mode** — a `DynamicsCompressorNode` limiter plus automatic anti-clipping that dynamically reduces gain when audio peaks get too hot, then slowly recovers
- **Per-site memory** — settings are saved per origin and restored automatically on your next visit
- **Instant apply** — changes take effect in real time without refreshing the page
- **MutationObserver** — automatically attaches to `<audio>`/`<video>` elements added dynamically after page load

## Privacy

This extension is **fully local**. It:

- Makes **zero network requests** (CSP enforces `connect-src 'none'`)
- Has **no analytics, no telemetry, no remote code**
- Stores settings only in `chrome.storage.local` — never leaves your device
- Requests only 3 minimal permissions: `activeTab`, `scripting`, `storage`

## How It Works

1. When you adjust the slider, the popup injects `contentScript.js` into the active tab via `chrome.scripting.executeScript`
2. The content script creates a **Web Audio API** graph per `<audio>`/`<video>` element:
   - **Safe mode:** `MediaElementSource → GainNode (user) → GainNode (auto) → DynamicsCompressor → AnalyserNode → destination`
   - **Normal mode:** `MediaElementSource → GainNode (user) → destination`
3. An `AnalyserNode` monitor runs every 200ms — it reads peak amplitude and adjusts the auto-gain node to prevent clipping
4. Settings are persisted per site origin in `chrome.storage.local`

## Browser Support

Works on any **Chromium-based** browser that supports Manifest V3:

| Browser | Supported |
|---------|-----------|
| Chrome 109+ | ✅ |
| Edge 109+ | ✅ |
| Brave | ✅ |
| Opera | ✅ |

## Project Structure

```
Volume Booster/
├── manifest.json            ← MV3 manifest (Chrome requires this at root)
├── README.md
├── icons/                   ← Extension icons (16, 32, 48, 128px PNGs)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                   ← All popup UI files
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── content/                 ← Content scripts injected into pages
    └── contentScript.js
```

## Install (Load Unpacked)

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `Volume Booster` folder

## Notes & Limitations

- Works on pages using standard `<audio>` / `<video>` elements (YouTube, Spotify Web, Twitch, etc.)
- Does **not** work on `chrome://` pages, the Chrome Web Store, or pages that block script injection
- Some sites that use Web Audio API internally (rather than `<audio>`/`<video>` elements) may not be affected

## License

MIT — free to use, modify, and distribute.
