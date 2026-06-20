# Pulse Visuals Launcher

Minecraft launcher for ugame.ru / FunTime PvP servers with full Pulse Visuals mod configuration.

## Features
- Login screen with animated background
- Server browser (ugame.ru, FunTime, HiveMC, 2b2t, custom servers)
- Full Pulse Visuals module config (Visuals, Utilities, HUD)
- Game settings (RAM, resolution, Java path, JVM args)
- Friend system
- All settings saved locally

## Build & Run

### Requirements
- Node.js 20+
- npm

### Install dependencies
```bash
npm install
```

### Run in development
```bash
npm start
```

### Build .exe for Windows
```bash
npm run build:win
```
Output: `dist/Pulse Visuals Launcher Setup 1.0.0.exe`

### Build for Linux
```bash
npm run build:linux
```
Output: `dist/Pulse Visuals Launcher-1.0.0.AppImage`

## Download
See [Releases](../../releases) for pre-built binaries.
