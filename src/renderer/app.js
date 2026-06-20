// ── Window controls ──────────────────────────────────────────────────────────
document.getElementById('btn-min').onclick   = () => window.launcher.minimize();
document.getElementById('btn-max').onclick   = () => window.launcher.maximize();
document.getElementById('btn-close').onclick = () => window.launcher.close();

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8);
    return v.toString(16);
  });
}
async function store(key, def) { return window.launcher.get(key, def); }
async function save(key, val)  { return window.launcher.set(key, val); }

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const screenLogin    = document.getElementById('screen-login');
const screenLauncher = document.getElementById('screen-launcher');
const loginError     = document.getElementById('login-error');

async function init() {
  const saved = await store('username', null);
  const rem   = await store('remember', false);
  if (saved && rem) {
    showLauncher(saved);
  } else {
    initParticles();
    screenLogin.classList.remove('hidden');
  }
}

document.getElementById('btn-login').onclick = async () => {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  if (!u) { loginError.textContent = 'Введи никнейм'; return; }
  if (!p) { loginError.textContent = 'Введи пароль'; return; }
  loginError.textContent = '';
  const rem = document.getElementById('login-remember').checked;
  await save('username', u);
  await save('remember', rem);
  screenLogin.style.opacity = '0';
  screenLogin.style.transform = 'scale(1.04)';
  screenLogin.style.transition = 'opacity .4s ease, transform .4s ease';
  setTimeout(() => { screenLogin.classList.add('hidden'); showLauncher(u); }, 400);
};
document.getElementById('login-user').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('btn-login').click(); });
document.getElementById('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('btn-login').click(); });

// ── PARTICLES ─────────────────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize(); window.addEventListener('resize', resize);
  for (let i=0; i<80; i++) particles.push({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height,
    vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4,
    r: Math.random()*2+.5, a: Math.random()*.6+.2
  });
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x<0) p.x=canvas.width; if (p.x>canvas.width) p.x=0;
      if (p.y<0) p.y=canvas.height; if (p.y>canvas.height) p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(0,229,255,${p.a})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── LAUNCHER ──────────────────────────────────────────────────────────────────
function showLauncher(username) {
  document.getElementById('user-name').textContent = username;
  document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();
  screenLauncher.classList.remove('hidden');
  screenLauncher.style.opacity = '0'; screenLauncher.style.transition = 'opacity .4s ease';
  setTimeout(() => { screenLauncher.style.opacity = '1'; }, 10);
  initLauncher(username);
}

document.getElementById('btn-logout').onclick = async () => {
  await save('remember', false);
  screenLauncher.classList.add('hidden');
  screenLogin.style.opacity = '1'; screenLogin.style.transform = 'scale(1)';
  screenLogin.classList.remove('hidden');
};

// ── TABS ──────────────────────────────────────────────────────────────────────
function initLauncher(username) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-'+tab).classList.add('active');
    };
  });
  initHome(); initServers(); initModules(); initSettings(username);
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function initHome() {
  const ramSlider = document.getElementById('ram-slider');
  const ramLabel  = document.getElementById('ram-label');
  ramSlider.oninput = () => { ramLabel.textContent = ramSlider.value+' GB'; save('ram', ramSlider.value); };
  store('ram','4').then(v => { ramSlider.value=v; ramLabel.textContent=v+' GB'; });

  document.querySelectorAll('.btn-play-small').forEach(btn => {
    btn.onclick = () => launchGame(btn.dataset.server);
  });
  document.getElementById('btn-play').onclick = () => launchGame(null);
}

function launchGame(server) {
  const bar    = document.getElementById('launch-bar');
  const status = document.getElementById('launch-status');
  const prog   = document.getElementById('launch-progress');
  const btn    = document.getElementById('btn-play');
  btn.disabled = true;
  prog.classList.remove('hidden');
  const steps = [
    [10,'Проверка файлов...'], [30,'Загрузка библиотек...'],
    [55,'Запуск Fabric...'],   [75,'Применение модулей Pulse Visuals...'],
    [90,'Подключение к серверу...'], [100, server ? 'Подключено к '+server : 'Minecraft запущен!']
  ];
  let i=0;
  const interval = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(interval);
      setTimeout(() => {
        prog.classList.add('hidden');
        bar.style.width='0';
        btn.disabled=false;
      }, 1500);
      return;
    }
    bar.style.width = steps[i][0]+'%';
    status.textContent = steps[i][1];
    i++;
  }, 500);
}

// ── SERVERS ───────────────────────────────────────────────────────────────────
const DEFAULT_SERVERS = [
  { name:'ugame.ru',    desc:'Главный сервер Pulse Visuals', players:1247, max:2000, ping:23,  ver:'1.21.4', fav:true  },
  { name:'funtime.ru',  desc:'FunTime PvP Сервер',           players:891,  max:1500, ping:31,  ver:'1.21.4', fav:true  },
  { name:'HiveMC',      desc:'Mini-games сервер',            players:4521, max:10000,ping:87,  ver:'1.20',   fav:false },
  { name:'2b2t.org',    desc:'Анархия',                      players:198,  max:200,  ping:145, ver:'1.12.2', fav:false },
  { name:'mc.hypixel.net', desc:'Hypixel Network',           players:60000,max:100000,ping:115,ver:'1.21',  fav:false },
];

async function initServers() {
  let servers = await store('servers', DEFAULT_SERVERS);
  renderServers(servers);

  document.getElementById('btn-add-server').onclick = () => {
    document.getElementById('add-server-form').classList.toggle('hidden');
  };
  document.getElementById('btn-cancel-server').onclick = () => {
    document.getElementById('add-server-form').classList.add('hidden');
  };
  document.getElementById('btn-save-server').onclick = async () => {
    const name = document.getElementById('new-server-name').value.trim();
    const ip   = document.getElementById('new-server-ip').value.trim();
    if (!name || !ip) return;
    servers = await store('servers', DEFAULT_SERVERS);
    servers.push({ name:ip, desc:name, players:0, max:100, ping:999, ver:'?', fav:false, custom:true });
    await save('servers', servers);
    renderServers(servers);
    document.getElementById('new-server-name').value='';
    document.getElementById('new-server-ip').value='';
    document.getElementById('add-server-form').classList.add('hidden');
  };
}

function renderServers(servers) {
  const list = document.getElementById('servers-list');
  list.innerHTML = servers.map((s,i) => {
    const fill = Math.round((s.players/s.max)*100);
    const pingClass = s.ping<50?'green':s.ping<100?'yellow':'red';
    return `<div class="server-row" data-idx="${i}">
      <div class="server-icon" style="background:rgba(0,229,255,.1);color:var(--accent);font-weight:700;font-size:16px;width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;">${s.name.charAt(0).toUpperCase()}</div>
      <div class="server-details">
        <div class="server-name">${s.name}</div>
        <div class="server-desc" style="font-size:11px;color:var(--muted)">${s.desc} &bull; ${s.ver}</div>
      </div>
      <div class="player-bar-wrap">
        <div class="player-bar-bg"><div class="player-bar-fill" style="width:${fill}%"></div></div>
        <div class="player-count">${s.players.toLocaleString()} / ${s.max.toLocaleString()}</div>
      </div>
      <div class="server-ping ${pingClass}">${s.ping} мс</div>
      <button class="btn-fav ${s.fav?'active':''}" data-idx="${i}">${s.fav?'★':'☆'}</button>
      <button class="btn-play-small" data-server="${s.name}">Играть</button>
    </div>`;
  }).join('');

  list.querySelectorAll('.btn-fav').forEach(btn => {
    btn.onclick = async () => {
      let srvs = await store('servers', DEFAULT_SERVERS);
      const idx = parseInt(btn.dataset.idx);
      srvs[idx].fav = !srvs[idx].fav;
      await save('servers', srvs);
      renderServers(srvs);
    };
  });
  list.querySelectorAll('.btn-play-small').forEach(btn => {
    btn.onclick = () => {
      document.querySelector('.nav-item[data-tab="home"]').click();
      launchGame(btn.dataset.server);
    };
  });
}

// ── MODULES ───────────────────────────────────────────────────────────────────
const MODULES = {
  visuals: [
    { id:'aspect_ratio', name:'Aspect Ratio', desc:'Изменение соотношения сторон',
      settings:[{id:'ratio',type:'select',label:'Соотношение',opts:['4:3','5:4','16:10','16:9']}] },
    { id:'hitbox', name:'Hitbox Customizer', desc:'Хитбоксы противников',
      settings:[{id:'color',type:'color',label:'Цвет хитбокса',def:'#00e5ff'},{id:'thick',type:'slider',label:'Толщина',min:1,max:5,step:.5,def:1}] },
    { id:'hit_bubble', name:'Hit Bubble', desc:'Индикатор регистрации удара',
      settings:[{id:'size',type:'slider',label:'Размер',min:.5,max:3,step:.1,def:1},{id:'color',type:'color',label:'Цвет',def:'#ffffff'}] },
    { id:'jump_circles', name:'Jump Circles', desc:'Эффект при прыжке',
      settings:[{id:'color',type:'color',label:'Цвет',def:'#00e5ff'},{id:'radius',type:'slider',label:'Радиус',min:1,max:5,step:.5,def:2}] },
    { id:'target_hud', name:'Target HUD', desc:'HP цели на экране',
      settings:[] },
    { id:'damage_nums', name:'Damage Numbers', desc:'Урон в виде цифр над целью',
      settings:[{id:'scale',type:'slider',label:'Размер',min:.5,max:3,step:.1,def:1},{id:'life',type:'slider',label:'Время (тики)',min:10,max:80,step:5,def:40}] },
    { id:'hit_particles', name:'Hit Particles', desc:'Частицы при ударе',
      settings:[{id:'scale',type:'slider',label:'Размер',min:.5,max:3,step:.1,def:1},{id:'color_norm',type:'color',label:'Обычный удар',def:'#ffd700'},{id:'color_crit',type:'color',label:'Крит',def:'#ff4444'}] },
    { id:'trajectory', name:'Trajectory Prediction', desc:'Траектория стрелы',
      settings:[{id:'color',type:'color',label:'Цвет линии',def:'#00e5ff'}] },
  ],
  utilities: [
    { id:'auto_eat', name:'Auto Eat', desc:'Автоматически ест при голоде',
      settings:[{id:'thresh',type:'slider',label:'Порог голода',min:1,max:10,step:1,def:6}] },
    { id:'auto_invest', name:'Auto Invest', desc:'Инвестирует в клан при достижении суммы',
      settings:[{id:'coins',type:'text',label:'Минимум монет',def:'10000'}] },
    { id:'auto_leave', name:'Auto Leave', desc:'Выходит при приближении игрока',
      settings:[{id:'dist',type:'slider',label:'Дистанция /near',min:50,max:200,step:10,def:100},{id:'any',type:'toggle',label:'Любой игрок',def:false}] },
    { id:'auto_potion', name:'Auto Potion', desc:'Выпивает зелье по окончании',
      settings:[{id:'potion',type:'select',label:'Зелье',opts:['Speed II','Strength II','Fire Resistance','Invisibility']}] },
    { id:'auto_reconnect', name:'Auto Reconnect', desc:'Авто-перезаход на сервер',
      settings:[{id:'delay',type:'slider',label:'Задержка (с)',min:1,max:30,step:1,def:5}] },
    { id:'auto_respawn', name:'Auto Respawn', desc:'Авто-респавн с командой',
      settings:[{id:'cmd',type:'text',label:'Команда после смерти',def:'/hub'}] },
    { id:'exp_bottle', name:'Exp Bottle Filling', desc:'Наполнение опыта / отправка',
      settings:[{id:'target',type:'text',label:'Никнейм игрока',def:''},{id:'send',type:'toggle',label:'Отправить игроку',def:false}] },
  ],
  hud: [
    { id:'armor_hud', name:'Armor HUD', desc:'Полоска брони',
      settings:[{id:'pos',type:'select',label:'Позиция',opts:['Снизу-слева','Снизу-справа','Сверху-слева','Сверху-справа']}] },
    { id:'hotkeys', name:'Hotkeys Display', desc:'Активные горячие клавиши', settings:[] },
    { id:'crosshair', name:'Custom Crosshair', desc:'Кастомный прицел',
      settings:[{id:'style',type:'select',label:'Стиль',opts:['Cross','Dot','Circle','T-Shape']},{id:'color',type:'color',label:'Цвет',def:'#ffffff'},{id:'size',type:'slider',label:'Размер',min:4,max:30,step:1,def:10}] },
    { id:'fps_counter', name:'FPS Counter', desc:'Счётчик кадров', settings:[] },
    { id:'coordinates', name:'Coordinates', desc:'Координаты X Y Z', settings:[] },
    { id:'player_info', name:'Player Info', desc:'Никнейм и пинг над игроком', settings:[] },
    { id:'friends', name:'Friend System', desc:'Список друзей',
      settings:[{id:'friend_add',type:'friend_list',label:''}] },
  ],
};

let moduleStates = {};
let moduleSettings = {};
let currentCat = 'visuals';

async function initModules() {
  moduleStates   = await store('mod_states', {});
  moduleSettings = await store('mod_settings', {});
  renderModules(currentCat);

  document.querySelectorAll('.modules-cat').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modules-cat').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderModules(currentCat);
    };
  });
}

function renderModules(cat) {
  const list = document.getElementById('modules-list');
  const mods = MODULES[cat] || [];
  list.innerHTML = '';
  mods.forEach(mod => {
    const on = !!moduleStates[mod.id];
    const card = document.createElement('div');
    card.className = 'module-card' + (on?' on':'');
    card.innerHTML = `
      <div class="module-header">
        ${mod.settings.length ? `<button class="module-expand" data-id="${mod.id}">▼</button>` : '<div style="width:20px"></div>'}
        <div class="module-header-left">
          <div class="module-title">${mod.name}</div>
          <div class="module-desc">${mod.desc}</div>
        </div>
        <label class="module-toggle">
          <input type="checkbox" ${on?'checked':''} data-id="${mod.id}">
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      </div>
      ${mod.settings.length ? `<div class="module-settings" id="ms-${mod.id}">${renderSettings(mod)}</div>` : ''}`;

    card.querySelector('input[type=checkbox]').onchange = async (e) => {
      moduleStates[mod.id] = e.target.checked;
      await save('mod_states', moduleStates);
      card.classList.toggle('on', e.target.checked);
    };

    if (mod.settings.length) {
      card.querySelector('.module-expand').onclick = () => {
        const panel = card.querySelector('.module-settings');
        const btn   = card.querySelector('.module-expand');
        const open  = panel.classList.toggle('open');
        btn.classList.toggle('open', open);
      };
      wireSettings(card, mod);
    }
    list.appendChild(card);
  });
}

function renderSettings(mod) {
  return mod.settings.map(s => {
    const cur = moduleSettings[mod.id]?.[s.id];
    if (s.type==='select') {
      const opts = s.opts.map(o=>`<option ${cur===o?'selected':''}>${o}</option>`).join('');
      return `<div class="setting-field"><label>${s.label}</label><select class="input small" data-mod="${mod.id}" data-sid="${s.id}">${opts}</select></div>`;
    }
    if (s.type==='slider') {
      const val = cur??s.def??s.min;
      return `<div class="setting-field"><label>${s.label}: <span id="sv-${mod.id}-${s.id}">${val}</span></label><input type="range" class="slider" min="${s.min}" max="${s.max}" step="${s.step}" value="${val}" data-mod="${mod.id}" data-sid="${s.id}"></div>`;
    }
    if (s.type==='color') {
      return `<div class="setting-field"><label>${s.label}</label><input type="color" value="${cur||s.def||'#00e5ff'}" class="input" style="padding:2px;height:34px;cursor:pointer" data-mod="${mod.id}" data-sid="${s.id}"></div>`;
    }
    if (s.type==='text') {
      return `<div class="setting-field full"><label>${s.label}</label><input type="text" class="input" value="${cur||s.def||''}" data-mod="${mod.id}" data-sid="${s.id}"></div>`;
    }
    if (s.type==='toggle') {
      return `<div class="setting-field"><label>${s.label}</label><input type="checkbox" ${cur||s.def?'checked':''} data-mod="${mod.id}" data-sid="${s.id}" style="width:18px;height:18px;cursor:pointer;accent-color:var(--accent)"></div>`;
    }
    if (s.type==='friend_list') {
      return `<div class="setting-field full" id="friend-panel-${mod.id}"><div id="friends-list-el" style="margin-bottom:8px"></div><div style="display:flex;gap:8px"><input class="input" id="friend-input" placeholder="Добавить никнейм..."><button class="btn-secondary small" id="btn-add-friend">Добавить</button></div></div>`;
    }
    return '';
  }).join('');
}

function wireSettings(card, mod) {
  card.querySelectorAll('input[type=range]').forEach(el => {
    el.oninput = async () => {
      document.getElementById(`sv-${el.dataset.mod}-${el.dataset.sid}`).textContent = el.value;
      if (!moduleSettings[el.dataset.mod]) moduleSettings[el.dataset.mod]={};
      moduleSettings[el.dataset.mod][el.dataset.sid] = parseFloat(el.value);
      await save('mod_settings', moduleSettings);
    };
  });
  card.querySelectorAll('select, input[type=color], input[type=text]').forEach(el => {
    el.onchange = async () => {
      if (!moduleSettings[el.dataset.mod]) moduleSettings[el.dataset.mod]={};
      moduleSettings[el.dataset.mod][el.dataset.sid] = el.value;
      await save('mod_settings', moduleSettings);
    };
  });
  card.querySelectorAll('input[type=checkbox][data-sid]').forEach(el => {
    el.onchange = async () => {
      if (!moduleSettings[el.dataset.mod]) moduleSettings[el.dataset.mod]={};
      moduleSettings[el.dataset.mod][el.dataset.sid] = el.checked;
      await save('mod_settings', moduleSettings);
    };
  });
  // Friend system
  const addFriendBtn = card.querySelector('#btn-add-friend');
  if (addFriendBtn) {
    renderFriends();
    addFriendBtn.onclick = async () => {
      const inp = card.querySelector('#friend-input');
      const name = inp.value.trim();
      if (!name) return;
      let friends = await store('friends', []);
      friends.push({ name, online: Math.random()>.5 });
      await save('friends', friends);
      inp.value = '';
      renderFriends();
    };
  }
}

async function renderFriends() {
  const el = document.getElementById('friends-list-el');
  if (!el) return;
  const friends = await store('friends', []);
  el.innerHTML = friends.length ? friends.map((f,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--card-border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${f.online?'var(--success)':'var(--muted)'}"></div>
      <span style="flex:1;font-size:13px">${f.name}</span>
      <span style="font-size:11px;color:${f.online?'var(--success)':'var(--muted)'}">${f.online?'Онлайн':'Офлайн'}</span>
      <button onclick="removeFriend(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px">×</button>
    </div>`).join('') : '<div style="color:var(--muted);font-size:12px">Список пуст</div>';
}

window.removeFriend = async (i) => {
  let friends = await store('friends', []);
  friends.splice(i,1);
  await save('friends', friends);
  renderFriends();
};

// ── SETTINGS ──────────────────────────────────────────────────────────────────
async function initSettings(username) {
  const ram = document.getElementById('set-ram');
  const ramLabel = document.getElementById('set-ram-label');
  ram.oninput = () => { ramLabel.textContent = ram.value+' GB'; };
  const savedRam = await store('ram','4');
  ram.value = savedRam; ramLabel.textContent = savedRam+' GB';

  const fsBtn = document.getElementById('set-fullscreen');
  fsBtn.onclick = () => {
    const on = fsBtn.dataset.state==='on';
    fsBtn.dataset.state = on?'off':'on';
    fsBtn.textContent = on?'ВЫКЛ':'ВКЛ';
  };

  const nick = document.getElementById('set-nickname');
  nick.value = username;
  document.getElementById('set-uuid').value = generateUUID();

  const jvm  = document.getElementById('set-jvm');
  const res  = document.getElementById('set-resolution');
  const java = document.getElementById('set-java-path');
  const savedSettings = await store('game_settings', {});
  if (savedSettings.jvm)  jvm.value  = savedSettings.jvm;
  if (savedSettings.res)  res.value  = savedSettings.res;
  if (savedSettings.java) java.value = savedSettings.java;

  document.getElementById('btn-save-settings').onclick = async () => {
    await save('ram', ram.value);
    await save('username', nick.value.trim()||username);
    await save('game_settings', { jvm:jvm.value, res:res.value, java:java.value });
    document.getElementById('user-name').textContent = nick.value||username;
    document.getElementById('user-avatar').textContent = (nick.value||username).charAt(0).toUpperCase();
    const btn = document.getElementById('btn-save-settings');
    btn.textContent = 'Сохранено!'; btn.style.background='var(--success)';
    setTimeout(()=>{ btn.textContent='Сохранить настройки'; btn.style.background=''; }, 2000);
  };
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
init();
