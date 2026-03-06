<div align="center">

# WaveBoost

### Browser Audio Booster Chrome Extension

**Boost your browser audio up to 3× — clean, private, and safe.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/version-0.1.0-F4A261?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-2ECC71?style=for-the-badge)](LICENSE)
[![Privacy](https://img.shields.io/badge/No%20Tracking-100%25%20Local-8E44AD?style=for-the-badge)](#privacy)

</div>

---

## What is WaveBoost?

**WaveBoost** is a lightweight, open-source Chrome extension that lets you amplify any browser tab's audio beyond the default 100% limit — up to **300%** — using the native **Web Audio API**. No installs, no accounts, no data collection. Just louder, cleaner sound.

Whether you're watching a quiet video on YouTube, listening to a podcast, or streaming music on Spotify Web — WaveBoost gives you the volume control your browser should have had by default.

---

## Features

| Feature | Description |
|---|---|
| **Volume Boost 50–300%** | Push audio beyond the browser's native cap with a smooth real-time slider |
| **Safe Mode** | Built-in `DynamicsCompressor` limiter + automatic anti-clipping protection |
| **Auto Anti-Clipping** | Monitors audio peaks every 200ms and adjusts gain dynamically to prevent distortion |
| **Per-Site Memory** | Remembers your boost level per website — restored automatically on your next visit |
| **Instant Apply** | Changes take effect immediately without refreshing the page |
| **Dynamic Attachment** | `MutationObserver` detects and attaches to audio/video elements added after page load |

---

## Privacy First

WaveBoost is **fully local** — it never touches the internet.

- **Zero network requests** — CSP enforces `connect-src 'none'`, blocking even accidental fetch/WebSocket calls
- **No analytics** — no tracking, no telemetry, no third-party scripts
- **No accounts** — nothing to sign up for, nothing stored on any server
- **Minimal permissions** — only `activeTab`, `scripting`, and `storage`
- **Local storage only** — settings live in `chrome.storage.local` and never leave your device

---

## How It Works

WaveBoost builds a custom **Web Audio API** processing graph for every `<audio>` and `<video>` element on the page:

**Safe Mode (recommended)**
```
MediaElementSource → UserGain → AutoGain → DynamicsCompressor → Analyser → Output
```

**Normal Mode**
```
MediaElementSource → UserGain → Output
```

**The Safe Mode pipeline explained:**
1. The popup injects the content script into the active tab via `chrome.scripting.executeScript`
2. Each media element gets its own `GainNode` controlled by your slider
3. A second `AutoGain` node is managed automatically by the anti-clipping monitor
4. The `DynamicsCompressor` acts as a brick-wall limiter (threshold: −24dB, ratio: 12:1)
5. An `AnalyserNode` reads peak amplitude every 200ms — if audio clips, gain is pulled back fast; it slowly recovers when safe

---

## Browser Support

| Browser | Supported |
|---|---|
| Google Chrome 109+ | ✅ |
| Microsoft Edge 109+ | ✅ |
| Brave | ✅ |
| Opera | ✅ |

---

## Installation (Developer Mode)

> No Chrome Web Store listing yet — load it manually in under 30 seconds.

1. [Download or clone](https://github.com/admin903/WaveBoost) this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked**
5. Select the `WaveBoost` folder
6. The WaveBoost icon appears in your toolbar — click it and start boosting

---

## Project Structure

```
WaveBoost/
├── manifest.json            ← MV3 manifest (must be at root)
├── README.md
├── LICENSE
├── icons/                   ← Extension icons (16, 32, 48, 128px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                   ← Extension UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── content/                 ← Injected into browser tabs
    └── contentScript.js
```

---

## Notes & Limitations

- Works on any page using standard `<audio>` / `<video>` elements — YouTube, Spotify Web, Twitch, Netflix, podcasts, and more
- Does **not** work on `chrome://` pages, the Chrome Web Store, or pages that explicitly block script injection
- Sites that route audio entirely through their own Web Audio API graph (bypassing `<audio>`/`<video>` elements) may not be affected

---

## Keywords

`chrome extension` · `volume booster` · `browser audio` · `web audio api` · `manifest v3` · `javascript extension` · `audio amplifier` · `tab volume` · `open source chrome extension` · `audio boost` · `chromium extension`

---

## License

Released under the [MIT License](LICENSE) — free to use, modify, and distribute with attribution.

---

<div align="center">

**Built by [Anees Aleideh](https://linkedin.com/in/anees-aleideh)**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Anees%20Aleideh-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/anees-aleideh)

*If you find this useful, consider leaving a ⭐ on the repo.*

</div>
