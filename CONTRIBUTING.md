# Contributing to TubeCourier

Thank you for your interest in contributing to TubeCourier! We welcome bug reports, feature suggestions, and code contributions for both the Firefox and Chrome editions.

---

## 🛠️ Multi-Platform Development Setup

TubeCourier supports two browser targets:
1. **`firefox/`**: Manifest V2 (compatible with Waterfox, Firefox Developer Edition, and standard Firefox).
2. **`chrome/`**: Manifest V3 (compatible with Chromium, Google Chrome, Brave, and Microsoft Edge).

### Prerequisites:
- Python 3.8+ (for running the packaging script `package.py`)
- Waterfox / Firefox or any Chromium browser.

---

### Testing on Firefox / Waterfox:
1. Open Firefox or Waterfox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `firefox/manifest.json`.
4. The extension icon will appear in your toolbar. After editing files, click **Reload** in `about:debugging`.

---

### Testing on Chrome / Chromium / Brave / Edge:
1. Open your browser and navigate to `chrome://extensions` (or `brave://extensions`).
2. Enable the **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** and select the `chrome` directory.
4. After editing files, click the circular reload arrow on the TubeCourier card.

---

## 📦 Building All Distribution Packages

Run the unified packager:

```bash
python3 package.py
```

This compiles:
- `dist/tubecourier-firefox.xpi`: Direct install package for Waterfox / Firefox.
- `dist/tubecourier-firefox.zip`: Source archive for Mozilla AMO review.
- `dist/tubecourier-chrome.zip`: Packaged archive for Chrome/Chromium.

---

## 📋 Code Guidelines

- **Zero Telemetry:** Never introduce external network calls, analytics, or third-party cloud services. All communication must remain strictly between the user's browser and their self-hosted MeTube server.
- **Unminified Source:** Keep code clean, readable, and well-commented.
- **Responsive Popup UI:** Ensure the popup works cleanly across both desktop dimensions (480x560px) and mobile browsers (e.g. Waterfox Android).

---

## 🚀 Releasing with Git Tags

When you are ready to publish a new release:
1. Update `"version"` in both `firefox/manifest.json` and `chrome/manifest.json`.
2. Commit your changes: `git commit -am "Prepare release vX.Y.Z"`.
3. Create a git tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.
4. Push the branch and tag to GitHub: `git push origin main && git push origin --tags`.
5. GitHub Actions will automatically run `package.py` and publish the release with all packages attached!
