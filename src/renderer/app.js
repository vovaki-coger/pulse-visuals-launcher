// ── Window controls ────────────────────────────────────────────────────────
document.getElementById('btn-min').onclick   = () => window.launcher.minimize();
document.getElementById('btn-max').onclick   = () => window.launcher.maximize();
document.getElementById('btn-close').onclick = () => window.launcher.close();

// ── Helpers ────────────────────────────────────────────────────────────────
const get  = (k, d) => window.launcher.get(k, d);
const save = (k, v) => window.launcher.set(k, v);

// ── ACCOUNT SCREEN ─────────────────────────────────────────────────────────
const screenAccount  = document.getElementById('screen-account');
const screenLauncher = document.getElementById('screen-launcher');

let accountType = 'offline'; // 'offline' | 'microsoft'
let msAccount   = null;      // { name, email } if logged in

async function initApp() {
  const saved = await get('account', null);
  if (saved && saved.username) {
    showLauncher(saved);
  } else {
    showAccountScreen();
  }
}

function showAccountScreen() {
  screenLauncher.classList.add('hidden');
  screenAccount.classList.remove('hidden');
  initAccountScreen();
}

function initAccountScreen() {
  // Restore last used nick
  get('last_nick', '').then(nick => {
    if (nick) document.getElementById('offline-nick').value = nick;
  });

  // Restore MS account if any
  get('ms_account', null).then(ms => {
    if (ms) {
      msAccount = ms;
      showMsLogged(ms);
    }
  });

  // Restore selected type
  get('account', null).then(acc => {
    if (acc?.type === 'microsoft') selectAccountType('microsoft');
    else selectAccountType('offline');
  });

  // Tab toggles
  document.getElementById('acc-toggle-offline').onclick = () => selectAccountType('offline');
  document.getElementById('acc-toggle-ms').onclick      = () => selectAccountType('microsoft');

  // Nickname validation
  const nickInput = document.getElementById('offline-nick');
  const nickHint  = document.getElementById('nick-hint');
  nickInput.oninput = () => {
    const v = nickInput.value.trim();
    if (!v) { nickHint.textContent = ''; nickHint.className = 'nick-hint'; return; }
    if (v.length < 3) { nickHint.textContent = 'Минимум 3 символа'; nickHint.className = 'nick-hint bad'; return; }
    if (v.length > 16) { nickHint.textContent = 'Максимум 16 символов'; nickHint.className = 'nick-hint bad'; return; }
    if (!/^[a-zA-Z0-9_]+$/.test(v)) { nickHint.textContent = 'Только a-z, 0-9, _'; nickHint.className = 'nick-hint bad'; return; }
    nickHint.textContent = '✓ Допустимый никнейм'; nickHint.className = 'nick-hint ok';
  };

  // Microsoft login
  document.getElementById('btn-ms-login').onclick = () => doMsLogin();
  document.getElementById('btn-ms-logout').onclick = () => doMsLogout();

  // Enter button
  document.getElementById('btn-enter').onclick = () => doEnter();
  document.getElementById('offline-nick').addEventListener('keydown', e => { if (e.key === 'Enter') doEnter(); });
}

function selectAccountType(type) {
  accountType = type;
  document.getElementById('acc-block-offline').classList.toggle('active', type === 'offline');
  document.getElementById('acc-block-ms').classList.toggle('active', type === 'microsoft');
  document.getElementById('acc-body-offline').classList.toggle('hidden', type !== 'offline');
  document.getElementById('acc-body-ms').classList.toggle('hidden', type !== 'microsoft');
  if (type === 'offline') {
    setTimeout(() => document.getElementById('offline-nick').focus(), 50);
  }
}

function showMsLogged(ms) {
  const logged  = document.getElementById('ms-logged');
  const loginBtn = document.getElementById('btn-ms-login');
  const hint     = document.getElementById('ms-hint');
  logged.style.display = 'flex';
  loginBtn.style.display = 'none';
  hint.style.display = 'none';
  document.getElementById('ms-avatar').textContent = ms.name.charAt(0).toUpperCase();
  document.getElementById('ms-name').textContent   = ms.name;
  document.getElementById('ms-email').textContent  = ms.email || 'Microsoft аккаунт';
}

function hideMsLogged() {
  document.getElementById('ms-logged').style.display = 'none';
  document.getElementById('btn-ms-login').style.display = 'flex';
  document.getElementById('ms-hint').style.display = 'block';
}

function doMsLogin() {
  // Open Microsoft OAuth in browser — device code flow
  // In a real implementation you'd use MSAL / msmc. Here we open the Microsoft login page.
  window.launcher.openUrl('https://login.live.com/oauth20_authorize.srf?client_id=00000000402b5328&response_type=code&scope=service::user.auth.xboxlive.com::MBI_SSL&redirect_uri=https://login.live.com/oauth20_desktop.srf&display=touch&locale=ru');
  // Simulate a logged in state for the UI (user will actually auth externally)
  const ms = { name: 'MCPlayer', email: 'player@live.com' };
  msAccount = ms;
  save('ms_account', ms);
  showMsLogged(ms);
}

function doMsLogout() {
  msAccount = null;
  save('ms_account', null);
  hideMsLogged();
}

async function doEnter() {
  const errEl = document.getElementById('acc-error');
  errEl.textContent = '';

  if (accountType === 'offline') {
    const nick = document.getElementById('offline-nick').value.trim();
    if (!nick) { errEl.textContent = 'Введите никнейм'; return; }
    if (nick.length < 3) { errEl.textContent = 'Никнейм слишком короткий'; return; }
    if (!/^[a-zA-Z0-9_]+$/.test(nick)) { errEl.textContent = 'Только a-z, 0-9, _'; return; }
    const acc = { type: 'offline', username: nick };
    await save('account', acc);
    await save('last_nick', nick);
    showLauncher(acc);
  } else {
    if (!msAccount) { errEl.textContent = 'Войдите в Microsoft аккаунт'; return; }
    const acc = { type: 'microsoft', username: msAccount.name, email: msAccount.email };
    await save('account', acc);
    showLauncher(acc);
  }
}

// ── LAUNCHER MAIN ──────────────────────────────────────────────────────────
async function showLauncher(acc) {
  screenAccount.classList.add('hidden');
  screenLauncher.classList.remove('hidden');
  screenLauncher.style.opacity = '0';
  screenLauncher.style.transition = 'opacity .35s ease';
  setTimeout(() => { screenLauncher.style.opacity = '1'; }, 20);

  document.getElementById('user-name').textContent  = acc.username;
  document.getElementById('user-avatar').textContent = acc.username.charAt(0).toUpperCase();
  document.getElementById('user-type').textContent  = acc.type === 'microsoft' ? 'Microsoft' : 'Offline';

  document.getElementById('btn-change-acc').onclick = showAccountScreen;

  initTabs();
  await initHome();
  initVersionsTab();
  initServers();
  initModules();
  initSettings(acc);
}

// ── TABS ───────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    };
  });
}

// ── HOME ───────────────────────────────────────────────────────────────────
async function initHome() {
  const ramSlider = document.getElementById('ram-slider');
  const ramLabel  = document.getElementById('ram-label');
  const saved = await get('ram', '4');
  ramSlider.value = saved; ramLabel.textContent = saved + ' GB';
  ramSlider.oninput = () => { ramLabel.textContent = ramSlider.value + ' GB'; save('ram', ramSlider.value); };

  // Populate version selector with installed versions
  await refreshVersionSelect();

  // Restore last selected version
  const lastVer = await get('last_version', '');

  document.getElementById('btn-play').onclick = () => launchOrInstall();

  // Fav servers
  renderFavServers();
}

async function refreshVersionSelect() {
  const sel = document.getElementById('mc-version');
  const installed = await window.launcher.installedVersions();
  const lastVer   = await get('last_version', '');
  const current   = sel.value || lastVer;

  sel.innerHTML = '';
  if (installed.length === 0) {
    sel.innerHTML = '<option value="">— скачайте версию —</option>';
  } else {
    installed.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      if (v === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }
  sel.onchange = () => save('last_version', sel.value);
}

async function launchOrInstall() {
  const versionId = document.getElementById('mc-version').value;
  if (!versionId) {
    // Redirect to versions tab
    document.querySelector('.nav-item[data-tab="versions"]').click();
    return;
  }

  const acc = await get('account', {});
  const ram = document.getElementById('ram-slider').value;
  const settings = await get('game_settings', {});
  const installed = await window.launcher.installedVersions();

  if (!installed.includes(versionId)) {
    // Need to install first
    await doInstallVersion(versionId);
    return;
  }

  // Launch
  setPlayBtn('launching');
  const wrap   = document.getElementById('launch-bar-wrap');
  const fill   = document.getElementById('launch-fill');
  const status = document.getElementById('launch-status');
  wrap.style.display = 'block';

  const steps = [
    [20, 'Проверка файлов...'],
    [50, 'Запуск Java...'],
    [80, 'Загрузка Minecraft...'],
    [100, 'Запущено!'],
  ];

  const result = await window.launcher.launchMc({
    versionId, username: acc.username, ram: parseInt(ram),
    javaPath: settings.java || '', jvmArgs: settings.jvm || '',
  });

  if (!result.ok) {
    status.textContent = '⚠ ' + result.error;
    setPlayBtn('idle');
    return;
  }

  let i = 0;
  const iv = setInterval(() => {
    if (i >= steps.length) { clearInterval(iv); setTimeout(() => { wrap.style.display = 'none'; fill.style.width = '0'; setPlayBtn('idle'); }, 2000); return; }
    fill.style.width   = steps[i][0] + '%';
    status.textContent = steps[i][1];
    i++;
  }, 500);
}

function setPlayBtn(state) {
  const btn  = document.getElementById('btn-play');
  const icon = document.getElementById('play-icon');
  const text = document.getElementById('play-text');
  btn.disabled = state !== 'idle';
  if (state === 'idle')       { icon.textContent = '▶'; text.textContent = 'ИГРАТЬ'; btn.className = 'btn-play'; }
  if (state === 'launching')  { icon.textContent = '⏳'; text.textContent = 'ЗАПУСК...'; }
  if (state === 'installing') { icon.textContent = '⬇'; text.textContent = 'УСТАНОВКА...'; btn.classList.add('installing'); }
}

function renderFavServers() {
  get('servers', DEFAULT_SERVERS).then(servers => {
    const fav  = servers.filter(s => s.fav);
    const list = document.getElementById('fav-servers-list');
    if (!fav.length) { list.innerHTML = '<div style="color:var(--muted);font-size:13px">Нет избранных серверов</div>'; return; }
    list.innerHTML = fav.map(s => {
      const c = s.ping < 50 ? 'green' : s.ping < 100 ? 'yellow' : 'red';
      return `<div class="fav-server">
        <div class="server-icon" style="background:rgba(0,229,255,.1);color:var(--accent)">${s.name.charAt(0).toUpperCase()}</div>
        <div class="server-details">
          <div class="server-name">${s.name}</div>
          <div class="server-desc">${s.players.toLocaleString()} / ${s.max.toLocaleString()} игроков</div>
        </div>
        <div class="server-ping ${c}">${s.ping} мс</div>
        <button class="btn-play-small" data-server="${s.name}">Играть</button>
      </div>`;
    }).join('');
    list.querySelectorAll('.btn-play-small').forEach(btn => {
      btn.onclick = () => launchToServer(btn.dataset.server);
    });
  });
}

async function launchToServer(server) {
  const versionId = document.getElementById('mc-version').value;
  if (!versionId) { document.querySelector('.nav-item[data-tab="versions"]').click(); return; }
  const acc = await get('account', {});
  const ram = document.getElementById('ram-slider').value;
  const settings = await get('game_settings', {});
  setPlayBtn('launching');
  await window.launcher.launchMc({ versionId, username: acc.username, ram: parseInt(ram), server, javaPath: settings.java || '', jvmArgs: settings.jvm || '' });
  setTimeout(() => setPlayBtn('idle'), 3000);
}

// ── VERSIONS TAB ───────────────────────────────────────────────────────────
async function initVersionsTab() {
  const status  = document.getElementById('versions-status');
  const grid    = document.getElementById('versions-grid');
  const search  = document.getElementById('ver-search');
  const fRel    = document.getElementById('filter-release');
  const fSnap   = document.getElementById('filter-snapshot');

  let allVersions  = [];
  let installedSet = new Set();

  async function refresh() {
    installedSet = new Set(await window.launcher.installedVersions());
    renderVersions();
    await refreshVersionSelect();
  }

  function renderVersions() {
    const q      = search.value.toLowerCase();
    const showRel  = fRel.checked;
    const showSnap = fSnap.checked;

    const filtered = allVersions.filter(v => {
      if (v.type === 'release' && !showRel)   return false;
      if (v.type === 'snapshot' && !showSnap) return false;
      if (q && !v.id.toLowerCase().includes(q)) return false;
      return true;
    });

    if (!filtered.length) { grid.innerHTML = '<div style="color:var(--muted)">Ничего не найдено</div>'; return; }

    grid.innerHTML = filtered.map(v => {
      const inst = installedSet.has(v.id);
      const icon = v.type === 'release' ? '⛏️' : '🔬';
      return `<div class="version-card ${inst ? 'installed' : ''}" data-id="${v.id}">
        <div class="ver-icon">${icon}</div>
        <div class="ver-info">
          <div class="ver-id">${v.id}</div>
          <div class="ver-type">${v.type === 'release' ? 'Релиз' : 'Снапшот'}</div>
        </div>
        <button class="btn-install ${inst ? 'installed' : ''}" data-id="${v.id}" ${inst ? 'disabled' : ''}>
          ${inst ? '✓' : '⬇'}
        </button>
      </div>`;
    }).join('');

    grid.querySelectorAll('.btn-install:not(.installed)').forEach(btn => {
      btn.onclick = () => doInstallVersion(btn.dataset.id).then(() => refresh());
    });
  }

  search.oninput = renderVersions;
  fRel.onchange  = renderVersions;
  fSnap.onchange = renderVersions;

  // Load versions list
  status.textContent = 'Загрузка списка версий...';
  const result = await window.launcher.mcVersions();
  if (!result.ok) {
    status.textContent = '⚠ Ошибка: ' + result.error + ' (нет интернета?)';
    // Show installed-only view
    installedSet = new Set(await window.launcher.installedVersions());
    allVersions  = [...installedSet].map(id => ({ id, type: 'release', url: '' }));
    status.textContent = `Офлайн — ${installedSet.size} установленных версий`;
    renderVersions();
    return;
  }

  allVersions = result.versions;
  installedSet = new Set(await window.launcher.installedVersions());
  const latest = result.latest?.release || '';
  status.textContent = `${allVersions.length} версий, актуальная: ${latest}`;
  renderVersions();
}

// ── INSTALL VERSION ────────────────────────────────────────────────────────
async function doInstallVersion(versionId) {
  // Show overlay
  const overlay = document.createElement('div');
  overlay.className = 'install-overlay';
  overlay.innerHTML = `<div class="install-box">
    <div class="install-title">⬇ Установка ${versionId}</div>
    <div class="install-status" id="iov-status">Подготовка...</div>
    <div class="install-track"><div class="install-fill" id="iov-fill"></div></div>
    <div style="font-size:11px;color:var(--muted);margin-top:4px">Это займёт 1–3 минуты</div>
  </div>`;
  document.body.appendChild(overlay);

  const ovStatus = document.getElementById('iov-status');
  const ovFill   = document.getElementById('iov-fill');

  window.launcher.removeInstallListeners();
  window.launcher.onInstallStatus(msg => { if (ovStatus) ovStatus.textContent = msg; });
  window.launcher.onDownloadProgress(d  => { if (ovFill) ovFill.style.width = d.percent + '%'; });

  setPlayBtn('installing');
  const result = await window.launcher.installVersion(versionId);
  window.launcher.removeInstallListeners();

  document.body.removeChild(overlay);
  setPlayBtn('idle');

  if (!result.ok) {
    alert('Ошибка установки: ' + result.error);
    return;
  }

  await save('last_version', versionId);
  await refreshVersionSelect();
  document.getElementById('mc-version').value = versionId;
}

// ── SERVERS ────────────────────────────────────────────────────────────────
const DEFAULT_SERVERS = [
  { name:'ugame.ru',       desc:'Главный сервер Pulse Visuals', players:1247, max:2000,  ping:23,  ver:'1.21.4', fav:true  },
  { name:'funtime.ru',     desc:'FunTime PvP Сервер',           players:891,  max:1500,  ping:31,  ver:'1.21.4', fav:true  },
  { name:'mc.hypixel.net', desc:'Hypixel Network',              players:60000,max:100000,ping:115, ver:'1.21',   fav:false },
  { name:'2b2t.org',       desc:'Анархия — без правил',         players:198,  max:200,   ping:145, ver:'1.12.2', fav:false },
];

async function initServers() {
  let servers = await get('servers', DEFAULT_SERVERS);
  renderServers(servers);

  document.getElementById('btn-add-server').onclick = () => document.getElementById('add-server-form').classList.toggle('hidden');
  document.getElementById('btn-cancel-server').onclick = () => document.getElementById('add-server-form').classList.add('hidden');
  document.getElementById('btn-save-server').onclick = async () => {
    const name = document.getElementById('new-server-name').value.trim();
    const ip   = document.getElementById('new-server-ip').value.trim();
    if (!name || !ip) return;
    servers = await get('servers', DEFAULT_SERVERS);
    servers.push({ name: ip, desc: name, players: 0, max: 100, ping: 999, ver: '?', fav: false });
    await save('servers', servers);
    renderServers(servers);
    document.getElementById('new-server-name').value = '';
    document.getElementById('new-server-ip').value   = '';
    document.getElementById('add-server-form').classList.add('hidden');
  };
}

function renderServers(servers) {
  const list = document.getElementById('servers-list');
  list.innerHTML = servers.map((s, i) => {
    const fill = Math.round((s.players / s.max) * 100);
    const pingClass = s.ping < 50 ? 'green' : s.ping < 100 ? 'yellow' : 'red';
    return `<div class="server-row">
      <div class="server-icon" style="background:rgba(0,229,255,.1);color:var(--accent);width:38px;height:38px;border-radius:8px;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center">${s.name.charAt(0).toUpperCase()}</div>
      <div class="server-details">
        <div class="server-name">${s.name}</div>
        <div style="font-size:11px;color:var(--muted)">${s.desc} · ${s.ver}</div>
      </div>
      <div class="player-bar-wrap">
        <div class="player-bar-bg"><div class="player-bar-fill" style="width:${fill}%"></div></div>
        <div class="player-count">${s.players.toLocaleString()} / ${s.max.toLocaleString()}</div>
      </div>
      <div class="server-ping ${pingClass}">${s.ping} мс</div>
      <button class="btn-fav ${s.fav ? 'active' : ''}" data-idx="${i}">${s.fav ? '★' : '☆'}</button>
      <button class="btn-play-small" data-server="${s.name}">Играть</button>
    </div>`;
  }).join('');

  list.querySelectorAll('.btn-fav').forEach(btn => {
    btn.onclick = async () => {
      let srvs = await get('servers', DEFAULT_SERVERS);
      srvs[parseInt(btn.dataset.idx)].fav ^= true;
      await save('servers', srvs);
      renderServers(srvs);
      renderFavServers();
    };
  });
  list.querySelectorAll('.btn-play-small').forEach(btn => {
    btn.onclick = () => {
      document.querySelector('.nav-item[data-tab="home"]').click();
      launchToServer(btn.dataset.server);
    };
  });
}

// ── MODULES ────────────────────────────────────────────────────────────────
const MODULES = {
  visuals: [
    { id:'aspect_ratio', name:'Aspect Ratio',   desc:'Кастомное соотношение сторон', settings:[{id:'ratio',type:'select',label:'Соотношение',opts:['4:3','5:4','16:10','16:9']}] },
    { id:'hitbox',       name:'Hitbox',          desc:'Хитбоксы противников',         settings:[{id:'color',type:'color',label:'Цвет',def:'#00e5ff'},{id:'thick',type:'slider',label:'Толщина',min:1,max:5,step:.5,def:1}] },
    { id:'hit_bubble',   name:'Hit Bubble',      desc:'Индикатор регистрации удара',  settings:[{id:'size',type:'slider',label:'Размер',min:.5,max:3,step:.1,def:1},{id:'color',type:'color',label:'Цвет',def:'#fff'}] },
    { id:'jump_circles', name:'Jump Circles',    desc:'Эффект при прыжке',            settings:[{id:'color',type:'color',label:'Цвет',def:'#00e5ff'},{id:'radius',type:'slider',label:'Радиус',min:1,max:5,step:.5,def:2}] },
    { id:'target_hud',   name:'Target HUD',      desc:'HP цели на экране',            settings:[] },
    { id:'damage_nums',  name:'Damage Numbers',  desc:'Урон цифрами над целью',       settings:[{id:'scale',type:'slider',label:'Размер',min:.5,max:3,step:.1,def:1}] },
    { id:'hit_particles',name:'Hit Particles',   desc:'Частицы при ударе',            settings:[{id:'scale',type:'slider',label:'Размер',min:.5,max:3,step:.1,def:1},{id:'crit',type:'color',label:'Крит',def:'#ff4444'}] },
    { id:'trajectory',   name:'Trajectory',      desc:'Траектория стрелы',            settings:[{id:'color',type:'color',label:'Цвет',def:'#00e5ff'}] },
  ],
  utilities: [
    { id:'auto_eat',      name:'Auto Eat',        desc:'Авто-еда при голоде',          settings:[{id:'thresh',type:'slider',label:'Порог',min:1,max:10,step:1,def:6}] },
    { id:'auto_leave',    name:'Auto Leave',      desc:'Выход при приближении игрока', settings:[{id:'dist',type:'slider',label:'Дистанция',min:50,max:200,step:10,def:100}] },
    { id:'auto_potion',   name:'Auto Potion',     desc:'Авто-зелье',                   settings:[{id:'potion',type:'select',label:'Зелье',opts:['Speed II','Strength II','Fire Resistance']}] },
    { id:'auto_reconnect',name:'Auto Reconnect',  desc:'Авто-перезаход на сервер',     settings:[{id:'delay',type:'slider',label:'Задержка (с)',min:1,max:30,step:1,def:5}] },
    { id:'auto_respawn',  name:'Auto Respawn',    desc:'Авто-респавн',                 settings:[{id:'cmd',type:'text',label:'Команда',def:'/hub'}] },
  ],
  hud: [
    { id:'armor_hud',   name:'Armor HUD',        desc:'Полоска брони',                settings:[{id:'pos',type:'select',label:'Позиция',opts:['Снизу-слева','Снизу-справа','Сверху-слева']}] },
    { id:'crosshair',   name:'Custom Crosshair', desc:'Кастомный прицел',             settings:[{id:'style',type:'select',label:'Стиль',opts:['Cross','Dot','Circle','T-Shape']},{id:'color',type:'color',label:'Цвет',def:'#fff'},{id:'size',type:'slider',label:'Размер',min:4,max:30,step:1,def:10}] },
    { id:'fps_counter', name:'FPS Counter',      desc:'Счётчик кадров',               settings:[] },
    { id:'coordinates', name:'Coordinates',      desc:'Координаты X Y Z',             settings:[] },
    { id:'player_info', name:'Player Info',      desc:'Никнейм над игроком',          settings:[] },
  ],
};

let moduleStates = {}, moduleSettings = {}, currentCat = 'visuals';

async function initModules() {
  moduleStates   = await get('mod_states', {});
  moduleSettings = await get('mod_settings', {});
  renderModules(currentCat);
  document.querySelectorAll('.modules-cat').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modules-cat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderModules(currentCat);
    };
  });
}

function renderModules(cat) {
  const list = document.getElementById('modules-list');
  list.innerHTML = '';
  (MODULES[cat] || []).forEach(mod => {
    const on   = !!moduleStates[mod.id];
    const card = document.createElement('div');
    card.className = 'module-card' + (on ? ' on' : '');
    card.innerHTML = `<div class="module-header">
      ${mod.settings.length ? `<button class="module-expand" data-id="${mod.id}">▼</button>` : '<div style="width:18px"></div>'}
      <div class="module-header-left">
        <div class="module-title">${mod.name}</div>
        <div class="module-desc">${mod.desc}</div>
      </div>
      <label class="module-toggle">
        <input type="checkbox" ${on ? 'checked' : ''} data-id="${mod.id}">
        <div class="toggle-track"></div>
        <div class="toggle-thumb"></div>
      </label>
    </div>
    ${mod.settings.length ? `<div class="module-settings" id="ms-${mod.id}">${renderModSettings(mod)}</div>` : ''}`;

    card.querySelector('input[type=checkbox]').onchange = async (e) => {
      moduleStates[mod.id] = e.target.checked;
      await save('mod_states', moduleStates);
      card.classList.toggle('on', e.target.checked);
    };
    if (mod.settings.length) {
      card.querySelector('.module-expand').onclick = () => {
        const panel = card.querySelector('.module-settings');
        const btn   = card.querySelector('.module-expand');
        panel.classList.toggle('open');
        btn.classList.toggle('open', panel.classList.contains('open'));
      };
      wireModSettings(card, mod);
    }
    list.appendChild(card);
  });
}

function renderModSettings(mod) {
  return mod.settings.map(s => {
    const cur = moduleSettings[mod.id]?.[s.id];
    if (s.type === 'select') return `<div class="setting-field"><label>${s.label}</label><select class="input small" data-mod="${mod.id}" data-sid="${s.id}">${s.opts.map(o => `<option ${cur===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
    if (s.type === 'slider') { const v = cur ?? s.def ?? s.min; return `<div class="setting-field"><label>${s.label}: <span id="sv-${mod.id}-${s.id}">${v}</span></label><input type="range" class="slider" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}" data-mod="${mod.id}" data-sid="${s.id}"></div>`; }
    if (s.type === 'color')  return `<div class="setting-field"><label>${s.label}</label><input type="color" value="${cur||s.def||'#00e5ff'}" class="input" style="padding:2px;height:34px;cursor:pointer" data-mod="${mod.id}" data-sid="${s.id}"></div>`;
    if (s.type === 'text')   return `<div class="setting-field full"><label>${s.label}</label><input type="text" class="input" value="${cur||s.def||''}" data-mod="${mod.id}" data-sid="${s.id}"></div>`;
    return '';
  }).join('');
}

function wireModSettings(card, mod) {
  card.querySelectorAll('input[type=range]').forEach(el => {
    el.oninput = async () => {
      document.getElementById(`sv-${el.dataset.mod}-${el.dataset.sid}`).textContent = el.value;
      if (!moduleSettings[el.dataset.mod]) moduleSettings[el.dataset.mod] = {};
      moduleSettings[el.dataset.mod][el.dataset.sid] = parseFloat(el.value);
      await save('mod_settings', moduleSettings);
    };
  });
  card.querySelectorAll('select, input[type=color], input[type=text]').forEach(el => {
    el.onchange = async () => {
      if (!moduleSettings[el.dataset.mod]) moduleSettings[el.dataset.mod] = {};
      moduleSettings[el.dataset.mod][el.dataset.sid] = el.value;
      await save('mod_settings', moduleSettings);
    };
  });
}

// ── SETTINGS ───────────────────────────────────────────────────────────────
async function initSettings(acc) {
  const ram = document.getElementById('set-ram');
  const ramLbl = document.getElementById('set-ram-label');
  const savedRam = await get('ram', '4');
  ram.value = savedRam; ramLbl.textContent = savedRam + ' GB';
  ram.oninput = () => { ramLbl.textContent = ram.value + ' GB'; };

  const fsBtn = document.getElementById('set-fullscreen');
  fsBtn.onclick = () => { const on = fsBtn.dataset.state === 'on'; fsBtn.dataset.state = on ? 'off' : 'on'; fsBtn.textContent = on ? 'ВЫКЛ' : 'ВКЛ'; };

  document.getElementById('set-nickname').value = acc.username;
  document.getElementById('set-acc-type').textContent = acc.type === 'microsoft' ? 'Microsoft' : 'Offline';
  document.getElementById('btn-change-acc-settings').onclick = showAccountScreen;

  const savedSettings = await get('game_settings', {});
  if (savedSettings.jvm)  document.getElementById('set-jvm').value = savedSettings.jvm;
  if (savedSettings.res)  document.getElementById('set-resolution').value = savedSettings.res;
  if (savedSettings.java) document.getElementById('set-java-path').value = savedSettings.java;
  const mcDir = await window.launcher.getMcDir();
  document.getElementById('set-mc-dir').value = mcDir;

  document.getElementById('btn-pick-java').onclick = async () => {
    const p = await window.launcher.pickJava();
    if (p) document.getElementById('set-java-path').value = p;
  };

  document.getElementById('btn-pick-mc-dir').onclick = async () => {
    const p = await window.launcher.pickMcDir();
    if (p) {
      document.getElementById('set-mc-dir').value = p;
      await refreshVersionSelect();
    }
  };

  document.getElementById('btn-save-settings').onclick = async () => {
    const nick = document.getElementById('set-nickname').value.trim();
    await save('ram', ram.value);
    if (nick) {
      const a = await get('account', {});
      a.username = nick;
      await save('account', a);
      document.getElementById('user-name').textContent   = nick;
      document.getElementById('user-avatar').textContent = nick.charAt(0).toUpperCase();
    }
    await save('game_settings', {
      jvm:  document.getElementById('set-jvm').value,
      res:  document.getElementById('set-resolution').value,
      java: document.getElementById('set-java-path').value,
    });
    const ok = document.getElementById('save-ok');
    ok.classList.add('show');
    setTimeout(() => ok.classList.remove('show'), 2000);
  };
}

// ── INIT ───────────────────────────────────────────────────────────────────
initApp();
