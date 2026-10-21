<div align="center">

  <img src="assets/icon.png" alt="TubeCourier" width="80" height="80">

  <h1>TubeCourier</h1>

  <p><strong>A dedicated, lightweight browser companion extension designed specifically for self-hosted <a href="https://github.com/alexta69/metube">MeTube</a> instances.</strong></p>

  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
    <a href="#-installation"><img src="https://img.shields.io/badge/Platforms-Firefox%20%7C%20Waterfox%20%7C%20Chrome%20%7C%20Brave-purple.svg" alt="Platforms"></a>
    <a href="PRIVACY.md"><img src="https://img.shields.io/badge/Privacy-Zero%20Telemetry-brightgreen.svg" alt="Privacy"></a>
    <a href="https://github.com/covarianttensor/TubeCourier/releases/latest"><img src="https://img.shields.io/github/v/release/covarianttensor/TubeCourier" alt="Latest Release"></a>
  </p>

</div>

**TubeCourier** lets you relay video and audio downloads directly to your MeTube server with instant subfolder selection across vast directory trees, real-time WebSocket progress tracking, native desktop/mobile notifications, and automated YouTube/Google session cookie synchronization to download age-restricted and member-only videos.

Available for both **Waterfox / Firefox** (Manifest V2) and **Chrome / Chromium / Brave / Edge** (Manifest V3).

---

## ✨ Features

- **📁 Instant Subfolder Selection & Rapid Autocomplete**:
  - Automatically queries and indexes your MeTube server's entire directory hierarchy over WebSockets (handles 1,000+ folders effortlessly).
  - Quick Category Chips for top-level directories (e.g. `Music`, `Videos`, `Podcasts`, `Default`) that filter your subfolder choices with one click.
  - Searchable `<datalist>` autocomplete to quickly jump to any subfolder.
  - Freeform folder entry: type any new folder name on the fly and MeTube creates it automatically.

- **📊 Live Real-Time Progress Tracker**:
  - Real-time animated progress bars showing percentage complete (`0%` - `100%`).
  - Live download speed (`MB/s`) and dynamic ETA countdown.
  - Status indicators (`Queued`, `Downloading`, `Finished`, `Error`).

- **🔔 Desktop & Mobile Completion Notifications**:
  - Background service monitors MeTube download events.
  - Dispatches native system notifications when downloads finish or encounter errors.

- **🍪 Automatic YouTube Session Cookie Sync**:
  - Silently extracts your active YouTube and Google session cookies and pushes them to your MeTube server right before dispatching the download request (`POST /upload-cookies`).
  - Completely eliminates YouTube bot-detection blocks (`Sign in to confirm you're not a bot`) and unlocks age-restricted or subscriber-only videos without manual cookie exporting.

- **🏷️ Dynamic Toolbar Badge**:
  - Displays a live badge counter directly on the browser icon showing how many downloads are currently in flight.

- **🖱️ Right-Click Context Menu**:
  - Right-click any video or link on YouTube ➔ **"Download with TubeCourier"** to queue immediately in the background.

- **🎛️ Queue Management**:
  - Cancel in-progress downloads with a single click.
  - Clear completed items from recent history.

- **📱 Full Mobile & Android Support**:
  - Responsive popup UI designed to work cleanly on desktop and mobile browsers (e.g. Waterfox for Android).

---

## 🔒 Privacy First: Zero Telemetry

TubeCourier is designed with absolute privacy in mind:
- **No Remote Telemetry:** The developer runs no servers, tracking endpoints, or analytics services.
- **Direct Local Communication:** All requests and cookies travel **strictly** between your browser and the self-hosted MeTube server address you configure (e.g., `http://localhost:8081` or `http://192.168.1.100:8081`).
- See [PRIVACY.md](PRIVACY.md) for full permission justifications and details.

---

## 📥 Installation

Packages for each browser are automatically built and published with every release on [GitHub Releases](https://github.com/covarianttensor/TubeCourier/releases).

---

### 🦊 Waterfox & Firefox (Desktop & Android)

> [!IMPORTANT]
> **Extension Verification Policy:**
> - **Waterfox (Desktop & Android):** By design, Waterfox allows installing unsigned `.xpi` packages directly from a file.
> - **Standard Firefox Release:** Enforces mandatory signature checks. Attempting to install an unsigned `.xpi` will show: *"This add-on could not be installed because it has not been verified."* Standard Firefox users must either:
>   1. Load temporarily via `about:debugging` (see Option C below), or
>   2. Use **Firefox Developer Edition**, **Nightly**, or **ESR** with `xpinstall.signatures.required` set to `false` in `about:config`, or
>   3. Install the officially signed version once published on Mozilla Add-ons (AMO).

#### Option A: Direct `.xpi` Install (Waterfox & Firefox Dev Edition)
1. Download `tubecourier-firefox.xpi` from the [Latest Release](https://github.com/covarianttensor/TubeCourier/releases/latest).
2. In Waterfox or Firefox Developer Edition, navigate to `about:addons`.
3. Click the **gear icon** (⚙️) in the upper-right corner.
4. Select **Install Add-on From File...**.
5. Select the downloaded `tubecourier-firefox.xpi` and confirm permissions.
6. The TubeCourier icon will appear in your toolbar!

#### Option B: Waterfox for Android
1. Download `tubecourier-firefox.xpi` onto your Android device.
2. In Waterfox Mobile, open the menu (⋮) and tap **Add-ons** (or go to `about:addons`).
3. Tap the gear icon or **Install Add-on From File** and select `tubecourier-firefox.xpi`.

#### Option C: Temporary Developer Install (Standard Firefox)
1. Clone the repository: `git clone https://github.com/covarianttensor/TubeCourier.git`
2. In standard Firefox, navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...**.
4. Select `firefox/manifest.json`.

---

### 🌐 Google Chrome, Chromium, Brave & Microsoft Edge

> [!NOTE]
> **Chrome Extension Policy:**  
> Chrome blocks installing `.crx` files directly from outside the Chrome Web Store. However, Chromium-based browsers officially allow running unpacked extensions permanently in **Developer Mode** (`chrome://extensions` ➔ "Load unpacked"). Once loaded, the extension remains active across browser restarts.


The Chrome version is built using **Manifest V3** and is distributed as an unpacked extension package.

1. Download `tubecourier-chrome.zip` from the [Latest Release](https://github.com/covarianttensor/TubeCourier/releases/latest).
2. Extract the ZIP file into a folder on your computer.
3. Open your Chromium-based browser and navigate to the extensions page:
   - Chrome / Chromium: `chrome://extensions`
   - Brave: `brave://extensions`
   - Microsoft Edge: `edge://extensions`
4. Toggle on **Developer mode** in the top-right corner of the extensions page.
5. Click the **Load unpacked** button in the top-left menu.
6. Select the extracted `chrome` folder containing `manifest.json`.
7. TubeCourier is now installed! Click the puzzle icon in your toolbar to pin TubeCourier.

---

## ⚙️ Configuration

1. Click the **TubeCourier** icon in your browser toolbar.
2. Click the **Settings** gear icon (⚙️) in the top-right corner of the popup.
3. Configure your server:
   - **Backend Server URL:** Enter your MeTube instance address (e.g., `http://localhost:8081` or `http://192.168.1.100:8081`).
   - **Default Format:** Choose `Any (Best)`, `MP4 Video`, or `MP3 Audio`.
   - **Auto-Sync Cookies:** Keep checked to automatically forward your session cookies when queuing YouTube videos.
   - **Custom Category Chips:** Add comma-separated names of your favorite top-level directories for quick one-tap filtering.
4. Click **Test**, then **Save Settings**. The status indicator will turn green (**Connected**)!

---

## 🖥️ Recommended MeTube Server Configuration

Here is a recommended `docker-compose.yml` for running MeTube with custom folder support, metadata embedding, and cookie upload compatibility:

```yaml
services:
  metube:
    image: ghcr.io/alexta69/metube:latest
    container_name: metube
    restart: always
    ports:
      - "8081:8081"
    environment:
      - PUID=1000
      - PGID=1000
      - DOWNLOAD_DIR=/downloads
      - TEMP_DIR=/temp_dir
      - STATE_DIR=/state_dir
      - CREATE_CUSTOM_DIRS=true
      - 'YTDL_OPTIONS={"writethumbnail":true,"writeinfojson":true,"postprocessors":[{"key":"FFmpegMetadata","add_metadata":true,"add_chapters":true}]}'
      - OUTPUT_TEMPLATE=%(uploader).50s [%(uploader_id)s]/Season %(upload_date>%Y)s/%(upload_date>%Y-%m-%d)s - %(title).50s [%(id)s].%(ext)s
    volumes:
      # Change /path/to/your/downloads to your local media folder, shared drive, or NAS mount
      - /path/to/your/downloads:/downloads
      # Change /path/to/your/config to your host directory for MeTube temporary files and state cache
      - /path/to/your/config/temp_dir:/temp_dir
      - /path/to/your/config/state_dir:/state_dir
```

> [!NOTE]
> In the `volumes` section above, customize the host paths on the left side of the colon (`:`):
> - Replace `/path/to/your/downloads` with your target storage directory (such as your NAS mount point or local media drive).
> - Replace `/path/to/your/config` with a directory on your host to store MeTube cache and states.

> [!TIP]
> Ensure `CREATE_CUSTOM_DIRS=true` is set on your MeTube container so subdirectories selected or created in TubeCourier are automatically created on your server.

---

## 🏗️ Building from Source

To build packages for both Firefox and Chrome:

```bash
python3 package.py
```

This compiles:
- `dist/tubecourier-firefox.xpi`: Direct install file for Firefox & Waterfox.
- `dist/tubecourier-firefox.zip`: Mozilla Add-on Store (AMO) review package.
- `dist/tubecourier-chrome.zip`: Chrome / Chromium MV3 package.

---

## 📁 Repository Structure

```
TubeCourier/
├── .github/workflows/
│   └── release.yml        # Automated release workflow on tag push
├── firefox/               # Firefox / Waterfox extension (Manifest V2)
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── lib/
│   └── icons/
├── chrome/                # Chrome / Chromium extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── lib/
│   └── icons/
├── dist/                  # Built extension packages
├── package.py             # Multi-platform build script
├── PRIVACY.md             # Privacy policy & permissions breakdown
├── THIRD_PARTY_LICENSES.md# Bundled library disclosures (Socket.IO client)
├── CONTRIBUTING.md        # Development & contribution guide
├── LICENSE                # MIT License
└── README.md
```

---

## 📄 License

TubeCourier is open-source software licensed under the [MIT License](LICENSE).
MeTube is an independent open-source project by [alexta69](https://github.com/alexta69/metube). TubeCourier is an unofficial companion extension and is not affiliated with the MeTube project.
