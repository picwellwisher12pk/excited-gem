<p align="center">
  <img src="src/assets/logo.svg" width="128" alt="Excited Gem Logo">
</p>

<h1 align="center">💎 Excited Gem</h1>

<p align="center">
  <strong>The High-Performance Workspace for Chrome Tabs, Automation, Media & AI</strong>
</p>

<p align="center">
  <a href="https://github.com/picwellwisher12pk/excited-gem/releases"><img src="https://img.shields.io/badge/version-1.7.0-indigo.svg?style=flat-square" alt="Version 1.7.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.5+-3178c6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18-61dafb.svg?style=flat-square&logo=react&logoColor=black" alt="React 18"></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-1.0+-fbf0df.svg?style=flat-square&logo=bun&logoColor=black" alt="Bun"></a>
  <a href="https://docs.plasmo.com/"><img src="https://img.shields.io/badge/Plasmo-Framework-brightgreen.svg?style=flat-square" alt="Plasmo Framework"></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285f4.svg?style=flat-square&logo=googlechrome&logoColor=white" alt="Manifest V3"></a>
  <a href="https://picwellwisher12pk.github.io/excited-gem/privacy.html"><img src="https://img.shields.io/badge/Privacy-100%25%20Local-success.svg?style=flat-square" alt="100% Local Privacy"></a>
</p>

<p align="center">
  <a href="https://picwellwisher12pk.github.io/excited-gem/"><strong>Website & Documentation</strong></a> •
  <a href="#-key-features"><strong>Features</strong></a> •
  <a href="#-architecture--tech-stack"><strong>Tech Stack</strong></a> •
  <a href="#-getting-started"><strong>Getting Started</strong></a> •
  <a href="#-privacy--security"><strong>Privacy & Security</strong></a> •
  <a href="CHANGELOG.md"><strong>Changelog</strong></a>
</p>

---

## 📖 Overview

**Excited Gem** is a unified, high-performance productivity workspace for power users who juggle dozens of windows and hundreds—or even thousands—of tabs. 

Unlike traditional tab managers that crash under heavy loads or clutter your workflow, Excited Gem combines **virtualized DOM performance**, **spatial multi-window grid management**, **deep domain analytics**, **autonomous routines & macros**, **local-first AI assistance**, and **universal YouTube media control** into a seamless, lightning-fast extension.

---

## ✨ Key Features

### 🪟 1. Multi-Window Spatial Grid View `New in v1.7`
* **Interactive Window Grid**: Experience your entire browser layout as dynamic, interactive window cards instead of a cramped single-column list.
* **Cross-Window Drag & Drop**: Effortlessly migrate tabs between windows with intuitive drag-and-drop targets and real-time visual positioning.
* **In-Window Search**: Filter tabs within a specific window directly in that window's header without altering the rest of your workspace.
* **Incognito & Private Window Recognition**: Sleek dark-themed tiles instantly distinguish incognito and private browsing sessions.
* **Window Batch Operations**: One-click actions to save an entire window as a session, save as a curated tab list, discard inactive tabs to reclaim memory, or close with Ant Design confirmation modals.

### 📊 2. Deep Analytics Dashboard & Domain Intelligence `New in v1.7`
* **6-in-1 Intelligence Suite**: Modular dashboards for **Overview**, **Tabs**, **Bookmarks**, **Lists**, **Sessions**, and **Domain Cross-Explorer**.
* **Domain Cross-Matrix**: Correlate domain overlap across your digital footprint to spot duplicate links and see where your resources are concentrated.
* **Memory & Resource Metrics**: Monitor discarded vs active tabs, audio-playing tabs, and pinned distribution in real-time.
* **Exportable Reports**: Generate and export rich markdown summaries and structured JSON reports for personal auditing or automation.

### ⚙️ 3. Autonomous Routines & Macros Automation `New in v1.7`
* **No-Code Tab Automation**: Build custom trigger-filter-action pipelines to automate repetitive tab hygiene.
* **Preset Gallery**: One-click prebuilt routines to clean workspace, suspend inactive tabs, group tabs by domain, or mute noisy background tabs.
* **Custom Routine Editor**: Visual step-by-step rule builder with condition matching and dry-run execution testing.
* **Quick Run Navigation Menu**: Trigger your favorite macros instantly from the extension header bar.

### 🤖 4. Universal Multi-Provider AI Assistant
* **100% On-Device Prompt API (Gemini Nano)**: Leverage Chrome's built-in AI for 100% private, zero-latency tab management that never sends your browsing data to external servers.
* **Multi-Provider BYOK (Bring Your Own Key)**:
  * **Google Gemini Cloud**: Support for Gemini 2.5 Flash, Gemini 3.5 Pro, and Gemini 3.5 Flash.
  * **Anthropic Claude**: Connect your Claude API key for high-reasoning workspace orchestration.
  * **Ollama (Local LLM)**: Connect directly to your local models running at `http://localhost:11434`.
  * **OpenAI-Compatible Endpoints**: Use any OpenAI-compatible API gateway.
* **Natural Language Tab Actions**: Tell the assistant to `"close all shopping tabs"`, `"group research tabs into a new window"`, `"suspend tabs from github.com"`, or `"deduplicate duplicate links"`.
* **Token Budget Calculator**: Live token counter and context builder that estimates token usage and optimizes tab context before sending prompts.
* **Multi-Session Chat History**: Searchable, persistent chat sessions with full markdown rendering and interactive tab preview buttons.

### 📺 5. Advanced YouTube Workspace Remote
* **Universal Media Remote**: Floating YouTube Tabs Modal and inline seekbar controllers to Play/Pause, Seek, and Mute media without hunting for tabs.
* **Shorts & Music Integration**: Dedicated detection and control for YouTube Shorts, standard videos, and YouTube Music.
* **Clickable Jump Titles**: Click any playing video's title to immediately bring that window and tab into focus.
* **BYOK YouTube Data API v3**: Optional custom API key integration for high-speed metadata and thumbnail fetching without hitting public quota caps.

### 📑 6. Curated Tab Lists & Bookmarks Management
* **Save as List Modal**: Save any group of selected tabs into persistent, categorized collections.
* **Dual Storage Strategy**: Choose between fast **Extension Local Storage** or native **Chrome Bookmarks** with live bidirectional folder synchronization.
* **Full Bookmarks Suite**: Dedicated hierarchy manager with folder tree navigation, search, and bulk operations.

### ☁️ 7. Intelligent Sessions & Google Drive Sync
* **Full-State Snapshots**: Save entire browsing environments across all open windows and restore them with a single click.
* **Selective Tab Restoration**: Open only the tabs you need from a saved session without cluttering your active window.
* **Google Drive AppData Backup**: Back up settings, sessions, and lists to your personal Google Drive hidden `appData` folder using direct Google OAuth2.

### ⚡ 8. High-Performance Virtualized Core
* **10,000+ Tab Virtualization**: Virtualized list rendering powered by `@types/react-window` handles thousands of tabs at 60 FPS using minimal RAM.
* **Bounded Favicon Cache**: Intelligent LRU domain favicon cache prevents memory leaks while ensuring instant icon display.
* **Advanced Regex Search**: Search across tab titles, URLs, or both using powerful regular expression queries with instant "as you type" or "on enter" execution.
* **Adaptive Layouts**: Seamlessly switch between **Side Panel (Sidebar)**, **Popup**, and **Full Tab** views with compact and expanded density options.

---

## 🛠 Architecture & Tech Stack

Excited Gem is built on modern, battle-tested web standards:

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Bundler** | [Bun](https://bun.sh/) & [Plasmo Framework](https://docs.plasmo.com/) (Manifest V3) |
| **Core Framework** | [React 18](https://reactjs.org/) & [TypeScript 5.5+](https://www.typescriptlang.org/) |
| **State Management** | [Redux Toolkit](https://redux-toolkit.js.org/) & `@plasmohq/redux-persist` |
| **UI Components** | [Ant Design 5](https://ant.design/) & [Tailwind CSS](https://tailwindcss.com/) |
| **Drag & Drop** | [@dnd-kit/core](https://dndkit.com/) & `@dnd-kit/sortable` |
| **AI Layer** | Chrome Prompt API (Gemini Nano), Google Gemini API, Anthropic, Ollama, OpenAI |
| **Cloud Sync** | Google Identity Services (OAuth2) & Google Drive REST API (AppData) |

---

## 🚀 Getting Started

### Prerequisites
* [Bun](https://bun.sh/) (version 1.0 or higher recommended)
* Google Chrome (or Chromium-based browser like Brave, Edge, Arc)

### 1. Clone & Install
```bash
git clone https://github.com/picwellwisher12pk/excited-gem.git
cd excited-gem
bun install
```

### 2. Development Mode
Start the live-reloading development server:
```bash
bun dev
```

For WSL / Windows dual development with sync:
```bash
bun run dev:win
```

### 3. Production Build
Compile optimized production bundles:
```bash
bun build
```
The compiled Manifest V3 extension will be created in the `build/chrome-mv3-prod` directory.

### 4. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `build/chrome-mv3-prod` folder (or `build/chrome-mv3-dev` during development).
5. Open Excited Gem from your extension toolbar or press `Alt + Shift + E`!

---

## ⌨️ Shortcuts & Navigation

| Shortcut / Action | Function |
| :--- | :--- |
| `Alt + Shift + E` | Open Excited Gem Side Panel |
| `Click on Tab` | Focus window and jump to tab |
| `Drag Handle` | Reorder tab in window or drag across Window Grid |
| `Right-Click Tab` | Open custom context menu (Pin, Mute, Discard, Move to New Window) |
| `Slash (/) in Search` | Focus the instant Regex search bar |
| `Quick Run Menu` | Trigger automation routines directly from the header |
| `AI Drawer Button` | Slide out the universal AI Assistant drawer |

---

## 🔒 Privacy & Security

Data sovereignty is fundamental to Excited Gem's architecture:

* **100% Local by Default**: Your tab history, window states, bookmarks, and sessions are stored in your browser's local sandbox (`chrome.storage.local`).
* **Zero Telemetry**: No third-party trackers, no analytics beacons, and no data harvesting.
* **On-Device AI**: Chrome's Prompt API runs locally on your machine via Gemini Nano.
* **Direct BYOK Communication**: Custom AI API keys and YouTube Data API keys communicate directly and exclusively with official endpoints.
* **Isolated Cloud Backup**: Google Drive sync writes exclusively to your personal hidden `appData` folder. The extension cannot view or access any other files in your Drive.
* **Full Transparency**: Review our [Privacy Policy](https://picwellwisher12pk.github.io/excited-gem/privacy.html) for detailed permissions documentation.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<p align="center">
  Built with ❤️ for power users by <a href="https://github.com/picwellwisher12pk"><strong>Amir Hameed</strong></a>
</p>
