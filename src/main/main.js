const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const Store = require('electron-store');

const store = new Store();
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 680,
    minWidth: 920,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#1a1c23',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── Window controls ────────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => win.minimize());
ipcMain.on('window-maximize', () => { if (win.isMaximized()) win.unmaximize(); else win.maximize(); });
ipcMain.on('window-close', () => win.close());
ipcMain.on('open-external', (_e, url) => shell.openExternal(url));

// ── Store ──────────────────────────────────────────────────────────────────────
ipcMain.handle('store-get', (_e, key, def) => store.get(key, def));
ipcMain.handle('store-set', (_e, key, val) => { store.set(key, val); return true; });

// ── File picker ───────────────────────────────────────────────────────────────
ipcMain.handle('pick-java', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Выберите Java (javaw.exe)',
    filters: process.platform === 'win32'
      ? [{ name: 'Java', extensions: ['exe'] }]
      : [{ name: 'All Files', extensions: ['*'] }],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ── Minecraft dir ──────────────────────────────────────────────────────────────
function getMcDir() {
  const custom = store.get('mc_dir', null);
  if (custom) return custom;
  if (process.platform === 'win32') return path.join(process.env.APPDATA || '', '.minecraft');
  if (process.platform === 'darwin') return path.join(process.env.HOME || '', 'Library/Application Support/minecraft');
  return path.join(process.env.HOME || '', '.minecraft');
}

ipcMain.handle('get-mc-dir', () => getMcDir());

ipcMain.handle('pick-mc-dir', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Выберите папку Minecraft',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled) return null;
  store.set('mc_dir', result.filePaths[0]);
  return result.filePaths[0];
});

// ── Fetch Mojang version list ─────────────────────────────────────────────────
ipcMain.handle('mc-versions', async () => {
  return new Promise((resolve) => {
    https.get('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const versions = json.versions
            .filter(v => v.type === 'release' || v.type === 'snapshot')
            .slice(0, 80)
            .map(v => ({ id: v.id, type: v.type, url: v.url }));
          resolve({ ok: true, versions, latest: json.latest });
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      });
    }).on('error', e => resolve({ ok: false, error: e.message }));
  });
});

// ── Check installed versions ───────────────────────────────────────────────────
ipcMain.handle('installed-versions', () => {
  const versionsDir = path.join(getMcDir(), 'versions');
  if (!fs.existsSync(versionsDir)) return [];
  return fs.readdirSync(versionsDir).filter(d => {
    const jsonPath = path.join(versionsDir, d, `${d}.json`);
    const jarPath  = path.join(versionsDir, d, `${d}.jar`);
    return fs.existsSync(jsonPath) && fs.existsSync(jarPath);
  });
});

// ── Download helper ────────────────────────────────────────────────────────────
function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https : http;
    get.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      res.on('data', chunk => {
        received += chunk.length;
        if (total > 0) {
          win.webContents.send('download-progress', { percent: Math.round(received / total * 100) });
        }
        file.write(chunk);
      });
      res.on('end', () => { file.close(); resolve(); });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Install Minecraft version ─────────────────────────────────────────────────
ipcMain.handle('install-version', async (_e, versionId) => {
  const mcDir = getMcDir();
  const verDir = path.join(mcDir, 'versions', versionId);
  fs.mkdirSync(verDir, { recursive: true });

  win.webContents.send('install-status', `Загрузка манифеста ${versionId}...`);

  // Get version manifest
  const manifest = await new Promise((resolve, reject) => {
    https.get(`https://launchermeta.mojang.com/mc/game/version_manifest_v2.json`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const ver = json.versions.find(v => v.id === versionId);
          if (!ver) return reject(new Error('Версия не найдена'));
          resolve(ver);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  // Download version JSON
  const jsonPath = path.join(verDir, `${versionId}.json`);
  win.webContents.send('install-status', 'Получение данных версии...');
  const verJson = await new Promise((resolve, reject) => {
    https.get(manifest.url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
  fs.writeFileSync(jsonPath, JSON.stringify(verJson, null, 2));

  // Download client JAR
  const jarUrl = verJson.downloads?.client?.url;
  if (!jarUrl) return { ok: false, error: 'Нет ссылки на client JAR' };

  const jarPath = path.join(verDir, `${versionId}.jar`);
  win.webContents.send('install-status', `Скачивание клиента (~30 MB)...`);
  await download(jarUrl, jarPath);

  // Download libraries
  const libs = verJson.libraries || [];
  let libsDone = 0;
  for (const lib of libs) {
    const artifact = lib.downloads?.artifact;
    if (!artifact) continue;
    const libPath = path.join(mcDir, 'libraries', artifact.path);
    if (fs.existsSync(libPath)) { libsDone++; continue; }
    win.webContents.send('install-status', `Библиотеки: ${libsDone}/${libs.length}...`);
    win.webContents.send('download-progress', { percent: Math.round(libsDone / libs.length * 100) });
    try { await download(artifact.url, libPath); } catch (_) {}
    libsDone++;
  }

  // Download assets index
  const assetIndex = verJson.assetIndex;
  if (assetIndex) {
    const indexDir = path.join(mcDir, 'assets', 'indexes');
    fs.mkdirSync(indexDir, { recursive: true });
    const indexPath = path.join(indexDir, `${assetIndex.id}.json`);
    if (!fs.existsSync(indexPath)) {
      win.webContents.send('install-status', 'Загрузка индекса ресурсов...');
      await download(assetIndex.url, indexPath);
    }
  }

  win.webContents.send('install-status', 'Установка завершена!');
  win.webContents.send('download-progress', { percent: 100 });
  return { ok: true };
});

// ── Launch Minecraft ───────────────────────────────────────────────────────────
ipcMain.handle('launch-mc', async (_e, opts) => {
  const { versionId, username, ram, server, javaPath, jvmArgs } = opts;
  const mcDir = getMcDir();
  const verDir = path.join(mcDir, 'versions', versionId);
  const jsonPath = path.join(verDir, `${versionId}.json`);

  if (!fs.existsSync(jsonPath)) return { ok: false, error: 'Версия не установлена' };

  const verJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Build classpath
  const libs = (verJson.libraries || [])
    .filter(l => {
      if (!l.downloads?.artifact) return false;
      const rules = l.rules;
      if (!rules) return true;
      return rules.some(r => {
        if (r.action === 'allow' && !r.os) return true;
        if (r.action === 'allow' && r.os?.name) {
          const osMap = { windows: 'win32', osx: 'darwin', linux: 'linux' };
          return osMap[r.os.name] === process.platform;
        }
        return false;
      });
    })
    .map(l => path.join(mcDir, 'libraries', l.downloads.artifact.path));

  const jarPath = path.join(verDir, `${versionId}.jar`);
  const sep = process.platform === 'win32' ? ';' : ':';
  const cp = [...libs, jarPath].join(sep);

  const nativesDir = path.join(verDir, 'natives');
  fs.mkdirSync(nativesDir, { recursive: true });

  const uuid = generateOfflineUUID(username);
  const accessToken = 'offline';
  const mainClass = verJson.mainClass || 'net.minecraft.client.main.Main';

  const mcArgs = [
    `--username`, username,
    `--version`, versionId,
    `--gameDir`, mcDir,
    `--assetsDir`, path.join(mcDir, 'assets'),
    `--assetIndex`, verJson.assetIndex?.id || versionId,
    `--uuid`, uuid,
    `--accessToken`, accessToken,
    `--userType`, 'legacy',
  ];

  if (server) {
    const parts = server.split(':');
    mcArgs.push('--server', parts[0]);
    mcArgs.push('--port', parts[1] || '25565');
  }

  const jvmExtraArgs = (jvmArgs || '').split(' ').filter(Boolean);
  const javaArgs = [
    `-Xmx${ram || 4}G`,
    `-Xms512M`,
    ...jvmExtraArgs,
    `-Djava.library.path=${nativesDir}`,
    `-cp`, cp,
    mainClass,
    ...mcArgs,
  ];

  const java = javaPath || (process.platform === 'win32' ? 'javaw' : 'java');

  try {
    const proc = spawn(java, javaArgs, {
      cwd: mcDir,
      detached: true,
      stdio: 'ignore',
    });
    proc.unref();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

function generateOfflineUUID(username) {
  const data = 'OfflinePlayer:' + username;
  let hash = 0;
  for (let i = 0; i < data.length; i++) hash = ((hash << 5) - hash) + data.charCodeAt(i);
  const h = Math.abs(hash).toString(16).padStart(12, '0');
  return `00000000-0000-3000-${h.slice(0,4)}-${h.slice(4,16)}`;
}
