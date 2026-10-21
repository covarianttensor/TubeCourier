#!/usr/bin/env python3
"""
TubeCourier Multi-Platform Build & Packaging Script
Packages:
  - dist/tubecourier-firefox.xpi (Installable add-on for Waterfox & Firefox)
  - dist/tubecourier-firefox.zip (Mozilla AMO store submission archive)
  - dist/tubecourier-chrome.zip  (Unpacked / developer distribution for Chrome, Brave, Edge)
"""

import os
import zipfile
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")

FIREFOX_DIR = os.path.join(BASE_DIR, "firefox")
CHROME_DIR = os.path.join(BASE_DIR, "chrome")

FIREFOX_FILES = [
    "manifest.json",
    "background.js",
    "popup.html",
    "popup.css",
    "popup.js",
    "LICENSE",
    "lib/socket.io.min.js",
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
    "icons/icon-96.png",
    "icons/icon-128.png",
    "icons/icon-256.png",
]

CHROME_FILES = [
    "manifest.json",
    "background.js",
    "popup.html",
    "popup.css",
    "popup.js",
    "LICENSE",
    "lib/socket.io.min.js",
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
    "icons/icon-96.png",
    "icons/icon-128.png",
    "icons/icon-256.png",
]

def build_zip(source_dir, file_list, target_path):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with zipfile.ZipFile(target_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for rel_path in file_list:
            full_path = os.path.join(source_dir, rel_path)
            if os.path.exists(full_path):
                zf.write(full_path, arcname=rel_path)
            else:
                print(f"  ! Warning: {rel_path} not found in {source_dir}!")
    size_kb = os.path.getsize(target_path) / 1024
    print(f"  -> Generated: {os.path.basename(target_path)} ({size_kb:.1f} KB)")

def main():
    print("==================================================")
    print("       TubeCourier Multi-Platform Packager        ")
    print("==================================================")
    os.makedirs(DIST_DIR, exist_ok=True)

    print("\n[1/3] Packaging Firefox / Waterfox XPI:")
    firefox_xpi = os.path.join(DIST_DIR, "tubecourier-firefox.xpi")
    build_zip(FIREFOX_DIR, FIREFOX_FILES, firefox_xpi)

    print("\n[2/3] Packaging Firefox / Waterfox AMO ZIP:")
    firefox_zip = os.path.join(DIST_DIR, "tubecourier-firefox.zip")
    build_zip(FIREFOX_DIR, FIREFOX_FILES, firefox_zip)

    print("\n[3/3] Packaging Chrome / Chromium MV3 ZIP:")
    chrome_zip = os.path.join(DIST_DIR, "tubecourier-chrome.zip")
    build_zip(CHROME_DIR, CHROME_FILES, chrome_zip)

    # Also generate root compatibility copies for ease of access if needed
    shutil.copyfile(firefox_xpi, os.path.join(BASE_DIR, "tubecourier.xpi"))

    print("\n--------------------------------------------------")
    print(f"Build complete! Output directory: {DIST_DIR}")
    for item in sorted(os.listdir(DIST_DIR)):
        path = os.path.join(DIST_DIR, item)
        size = os.path.getsize(path) / 1024
        print(f"  • {item} ({size:.1f} KB)")
    print("==================================================")

if __name__ == "__main__":
    main()
