<p align="center">
  <img src="src/assets/logo.svg" width="128" alt="Excited Gem Logo">
</p>

# 💎 Excited Gem

Excited Gem is a high-performance, unified productivity browser extension designed for power users who manage hundreds of tabs. More than just a tab manager, it serves as your digital workspace—combining advanced session management, YouTube media control, on-device AI assistance, and secure cloud synchronization into a beautiful, lightning-fast interface.

---

## ✨ Key Features

### 🚀 Smart Tab & Session Power Tools
- **Visual Command Center (Virtualization)**: Handles thousands of open tabs with zero lag using React virtualization. Get a clean, real-time overview of your entire browser state across all windows in a single, high-performance view.
- **Intelligent Sessions & Collections**: 
  - **Sessions**: Snapshot your entire browser state (all windows and tabs) and restore it with one click. Ideal for switching between deep-work contexts.
  - **Tab Lists**: Curate specific groups of tabs and save them as persistent collections. Choose to store them in the **Extension Storage** for speed or directly as **Browser Bookmarks** for native sync.
- **Flexible Management Modes**: Configure the extension to run in **Single Tab Mode** (one instance for all windows) or **Per-Window Mode** (isolated management per browser window).
- **Bulk Productivity Actions**: Perform group actions like "Close all tabs from this domain," "Mute all tabs with sound," or "Unpin all tabs" with precision and speed.

### 🤖 Local-First AI Assistant (Beta)
- **On-Device Intelligence**: Leverages Chrome's native **Prompt API (Gemini Nano)** to provide assistant capabilities without sending your sensitive browsing data to any external servers.
- **Action-Oriented Context**: Your assistant "sees" your open tabs and can perform actions via text commands:
  - *"Mute all noisy tabs in the background"*
  - *"Close all shopping-related tabs"*
  - *"Group my research tabs into a new window"*
- **Privacy-First Design**: Designed for the privacy-conscious, the AI operates 100% locally on your machine, requiring zero external API calls for its core logic.

### 📺 🎥 Advanced YouTube Workspace
- **Universal Media Remote**: Control YouTube playback (Play/Pause, Seek) directly from the extension sidebar or popup. No more hunting for the tab that's playing music.
- **Playback Progress Tracking**: Real-time progress bars for every YouTube tab, allowing you to see exactly where you are in a video or Short without switching tabs.
- **Custom API Integration (BYOK)**: For advanced users, "Bring Your Own Key" support for the YouTube Data API ensures you have full control over metadata fetching and never hit shared quota limits.
- **Shorts & Videos Integration**: Seamlessly handles both standard videos and YouTube Shorts with dedicated extraction logic.

### 🔍 Precision Search & Filtering
- **Regex & Advanced Queries**: Find exactly what you need using Regular Expression support. Search across Titles, URLs, or both with customizable search scopes.
- **Dynamic Search Behavior**: Choose between **"As you type"** (instant results) or **"On Enter"** search behaviors to match your workflow.
- **Status Filtering**: Instantly isolate tabs that are Audible, Pinned, Discarded (suspended), or from specific windows.

### ☁️ Secure Cloud Sync & Privacy
- **Google Drive AppData Sync**: Back up your extension settings, sessions, and lists to your personal Google Drive's hidden `appData` folder. Your data stays in your personal cloud, not ours.
- **Privacy-Centric Permissions**: Built with minimal host permissions. We only request access to the URLs necessary for media control (YouTube), ensuring your other browsing remains private.
- **No Telemetry**: We believe in your right to privacy. Excited Gem includes zero third-party tracking, ads, or hidden telemetry.

### 🎨 Premium User Experience
- **Adaptive UI Layouts**: Optimized for the modern browser experience. Switch seamlessly between the **Side Panel** (best for persistent management), **Popup**, and **Full Tab** views.
- **Customizable Aesthetics**: Choose between Compact or Expanded list views. Set tab action buttons to be "Always Visible" or "On Hover" to reduce visual clutter.
- **Modern Tech Stack**: Engineered for speed with React 18, TypeScript, and Tailwind CSS.

---

## 🛠 Tech Stack

- **Core**: [React](https://reactjs.org/) & [TypeScript](https://www.typescriptlang.org/)
- **UI Architecture**: [Ant Design](https://ant.design/) & [Tailwind CSS](https://tailwindcss.com/)
- **State Engine**: [Redux Toolkit](https://redux-toolkit.js.org/)
- **Build & Runtime**: [Plasmo Framework](https://docs.plasmo.com/) & [Bun](https://bun.sh/)

---

## 🔒 Privacy & Security

Data sovereignty is at the heart of Excited Gem.
- **Local-By-Default**: Your tabs, sessions, and chat history never leave your browser unless YOU trigger a sync.
- **Secure Auth**: Authentication for sync is handled directly by Google Identity Services; the extension never sees your password.
- **Open Transparency**: Read our full **[Privacy Policy](https://picwellwisher12pk.github.io/excited-gem/privacy.html)** for a detailed breakdown of how we use every permission.

---

## 🚀 Getting Started

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   bun install
   ```

### Development
Start the development server with hot-reloading:
```bash
bun dev
```

### Build
Generate a production-ready package for Chrome:
```bash
bun build
```
The output will be located in the `build/chrome-mv3-prod` directory.

---

## 📜 License

MIT License - feel free to use, modify, and contribute!

---
*Built with ❤️ for productive minds.*
