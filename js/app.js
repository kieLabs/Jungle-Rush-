import { JungleScene } from './scene.js';
import { AudioManager } from './audio.js';
import {
  DEFAULT_SAVE, SAVE_KEY, CHARACTERS, POWERUPS, UPGRADE_DEFS, DAILY_REWARD_CYCLE,
  sanitizeSave, loadSave, persistSave, createRun, scoreRun, applyCollection, getRunSpeed,
  buyUpgrade, buyCharacter, selectCharacter, getUpgradeCost, claimDailyReward,
  getDailyMissions, getWeeklyMissions, updateMissionProgress, getRunObjectiveProgress, canRevive,
  activatePowerUp, isPowerUpActive, randomChestReward, localDateKey
} from './core.js';

const $ = id => document.getElementById(id);
const today = () => localDateKey(new Date());
const number = value => Math.floor(Number(value) || 0).toLocaleString('en-IN');
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const MODE_DEFS = [
  { id: 'classic', name: 'CLASSIC ENDLESS', icon: '🏃', desc: 'Run as far as you can. The jungle never ends.', badge: 'ENDLESS' },
  { id: 'challenge', name: 'CHALLENGE MODE', icon: '🎯', desc: 'Complete a rotating objective during your run.', badge: 'OBJECTIVE' },
  { id: 'treasure', name: 'TREASURE HUNT', icon: '🗝️', desc: 'More chests, gems and ancient rewards.', badge: 'LOOT BONUS' },
  { id: 'timeTrial', name: 'TIME TRIAL', icon: '⏱️', desc: 'Collect the highest score before 90 seconds run out.', badge: '90 SECONDS' },
  { id: 'daily', name: 'DAILY CHALLENGE', icon: '📅', desc: 'Take on today’s special jungle objective.', badge: 'DAILY' },
  { id: 'event', name: 'EVENT RUN', icon: '🏵️', desc: 'Explore changing biomes and earn extra tokens.', badge: 'TOKEN BONUS' }
];

const ACHIEVEMENTS = [
  { id: 'firstRun', title: 'First Run', icon: '👣', desc: 'Complete your first run.', type: 'runs', target: 1, reward: { coins: 100 } },
  { id: 'coinCollector', title: 'Coin Collector', icon: '🪙', desc: 'Collect 500 coins across all runs.', type: 'coins', target: 500, reward: { coins: 250 } },
  { id: 'treasureHunter', title: 'Treasure Hunter', icon: '🗝️', desc: 'Collect 10 magic gems.', type: 'gems', target: 10, reward: { tokens: 2 } },
  { id: 'distanceRunner', title: 'Long Distance Runner', icon: '🛣️', desc: 'Travel 5,000 metres in your best run.', type: 'bestDistance', target: 5000, reward: { gems: 5 } },
  { id: 'jumpMaster', title: 'Jump Master', icon: '🪽', desc: 'Jump 100 times.', type: 'jumps', target: 100, reward: { coins: 300 } },
  { id: 'slideMaster', title: 'Slide Master', icon: '🛝', desc: 'Slide 100 times.', type: 'slides', target: 100, reward: { coins: 300 } },
  { id: 'powerExpert', title: 'Power-Up Expert', icon: '⚡', desc: 'Activate 50 power-ups.', type: 'powerUps', target: 50, reward: { gems: 6 } },
  { id: 'gemCollector', title: 'Gem Collector', icon: '💎', desc: 'Collect 50 gems.', type: 'gems', target: 50, reward: { tokens: 5 } },
  { id: 'survivalExpert', title: 'Survival Expert', icon: '🛡️', desc: 'Reach 10,000 metres in one run.', type: 'bestDistance', target: 10000, reward: { gems: 12 } },
  { id: 'millionaire', title: 'Millionaire Collector', icon: '👑', desc: 'Collect 10,000 coins in total.', type: 'coins', target: 10000, reward: { tokens: 10 } }
];

const POWERUP_PRICES = {
  magnet: { currency: 'coins', price: 220 }, speed: { currency: 'coins', price: 260 },
  shield: { currency: 'coins', price: 300 }, megaJump: { currency: 'coins', price: 220 },
  multiplier: { currency: 'coins', price: 340 }, gemBonus: { currency: 'gems', price: 7 },
  invincible: { currency: 'gems', price: 12 }, score: { currency: 'coins', price: 300 },
  headStart: { currency: 'coins', price: 450 }, resurrection: { currency: 'gems', price: 18 }
};

let save = loadSave();
let run = null;
let scene = null;
let audio = new AudioManager(save.settings);
let paused = false;
let currentMode = 'classic';
let resumeAfterModal = false;
let toastTimer = null;
let lastFrame = 0;
let animationId = 0;
let lastTapAt = 0;
let pointerStart = null;
let shopTab = 'powerups';
let missionTab = 'daily';
let modalPurpose = '';
let sceneReady = false;

function normalizeMissionDates() {
  const day = today();
  if (save.dailyMissionDate !== day) {
    save.dailyMissionDate = day;
    save.dailyMissionProgress = {};
  }
  const week = getWeeklyMissions().week;
  if (save.weeklyMissionWeek !== week) {
    save.weeklyMissionWeek = week;
    save.weeklyMissionProgress = {};
  }
  save = sanitizeSave(save);
  save.dailyMissionDate = day;
  save.weeklyMissionWeek = week;
}

function persist() {
  const ok = persistSave(save);
  if (!ok) toast('Save unavailable — browser storage may be full.');
  updateWallet();
  return ok;
}

function updateWallet() {
  $('walletCoins').textContent = number(save.coins);
  $('walletGems').textContent = number(save.gems);
  $('walletTokens').textContent = number(save.tokens);
  $('homeBestDistance').textContent = `${number(save.bestDistance)} m`;
  $('homeBestScore').textContent = number(save.bestScore);
  $('homeTotalDistance').textContent = `${number(save.totalDistance)} m`;
  $('homeTotalRuns').textContent = number(save.totalRuns);
}

function vibrate(pattern = 10) {
  if (save.settings.vibration && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

function setHome() {
  run = null;
  paused = false;
  resumeAfterModal = false;
  modalPurpose = '';
  $('modalLayer').classList.add('hidden');
  $('homeScreen').classList.remove('hidden');
  $('gameHud').classList.add('hidden');
  $('mobileControls').classList.add('hidden');
  updateWallet();
  audio.applySettings(save.settings);
}

function showModal(content, purpose = '', pauseGameplay = true) {
  if (pauseGameplay && run && !run.gameOver && !paused) {
    paused = true;
    resumeAfterModal = true;
  }
  modalPurpose = purpose;
  $('modalContent').innerHTML = content;
  $('modalLayer').classList.remove('hidden');
}

function closeModal() {
  $('modalLayer').classList.add('hidden');
  if (resumeAfterModal && run && !run.gameOver) paused = false;
  resumeAfterModal = false;
  modalPurpose = '';
}

function heading(title, subtitle = '') {
  return `<div class="modal-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><div class="modal-balance"><span class="balance-chip">🪙 ${number(save.coins)}</span><span class="balance-chip">💎 ${number(save.gems)}</span><span class="balance-chip">🏵️ ${number(save.tokens)}</span></div></div>`;
}

function openModes() {
  const cards = MODE_DEFS.map(mode => `
    <div class="game-card ${mode.id === currentMode ? 'featured' : ''}">
      <div class="card-top"><span class="card-icon">${mode.icon}</span><span class="card-badge">${mode.badge}</span></div>
      <h3>${mode.name}</h3><p>${mode.desc}</p>
      <div class="card-bottom"><span class="card-price">${mode.id === 'classic' ? 'NO LIMIT' : mode.id === 'timeTrial' ? '01:30' : 'FREE PLAY'}</span><button class="small-btn" data-action="start-mode" data-mode="${mode.id}">PLAY</button></div>
    </div>`).join('');
  showModal(`${heading('CHOOSE YOUR <span>RUN</span>', 'Every run is different. Classic mode has no final level or distance cap.')}
    <div class="card-grid">${cards}</div>`, 'modes');
}

function characterEmoji(id) {
  return ({ trailblazer: '🧭', mira: '🌺', ravi: '🏹', nyx: '🌑', tala: '🌊', leo: '☀️', zara: '🔮', atlas: '🗿' })[id] || '🧑🏽‍🚀';
}

function openCharacters() {
  const cards = CHARACTERS.map(character => {
    const owned = save.unlockedCharacters.includes(character.id);
    const selected = save.selectedCharacter === character.id;
    const price = character.currency === 'gems' ? `💎 ${character.price}` : `🪙 ${number(character.price)}`;
    const action = owned ? 'select-character' : 'buy-character';
    const button = selected ? '<button class="small-btn ghost" disabled>SELECTED</button>' : owned ? `<button class="small-btn" data-action="${action}" data-id="${character.id}">SELECT</button>` : `<button class="small-btn" data-action="${action}" data-id="${character.id}">UNLOCK</button>`;
    return `<div class="game-card character-card ${selected ? 'featured' : ''}">
      <div class="character-art"><span class="person">${characterEmoji(character.id)}</span></div>
      <div class="character-info"><div class="card-top"><span class="card-badge">${owned ? selected ? 'ACTIVE HERO' : 'UNLOCKED' : 'LOCKED'}</span></div>
        <h3>${character.name} · ${character.title}</h3><p>${character.ability}</p>
        <div class="card-bottom"><span class="card-price">${owned ? 'OWNED' : price}</span>${button}</div>
      </div>
    </div>`;
  }).join('');
  showModal(`${heading('CHOOSE YOUR <span>HERO</span>', 'Eight original adventurers. Each brings a different look and passive perk.')}
    <div class="card-grid">${cards}</div>
    <div class="empty-note" style="margin-top:12px">Character perks are passive. Character progress and selection are saved on this device.</div>`, 'characters');
}

function openUpgrades() {
  const cards = Object.entries(UPGRADE_DEFS).map(([id, def]) => {
    const level = save.upgrades[id] || 1;
    const cost = getUpgradeCost(id, level);
    const maxed = cost === null;
    return `<div class="game-card ${maxed ? 'featured' : ''}">
      <div class="card-top"><span class="card-icon">${({ magnetDuration: '🧲', shieldDuration: '🛡️', speedDuration: '⚡', multiplierDuration: '✖️', megaJumpDuration: '🪽', startingBoost: '🚀', gemBonus: '💎', specialAbility: '✨' })[id]}</span><span class="card-badge">LEVEL ${level}/${def.max}</span></div>
      <h3>${def.name}</h3><p>${def.description}</p>
      <div class="progress-row"><div class="progress-track"><i style="width:${level / def.max * 100}%"></i></div><span class="progress-label">${level} / ${def.max}</span></div>
      <div class="card-bottom"><span class="card-price">${maxed ? 'MAX LEVEL' : `${def.currency === 'gems' ? '💎' : '🪙'} ${number(cost)}`}</span>
      <button class="small-btn" data-action="buy-upgrade" data-id="${id}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAXED' : 'UPGRADE'}</button></div>
    </div>`;
  }).join('');
  showModal(`${heading('ABILITY <span>UPGRADES</span>', 'Improve power-up duration, starting boost and your relic ability.')}
    <div class="card-grid">${cards}</div>`, 'upgrades');
}

function getShopItems(tab) {
  if (tab === 'powerups' || tab === 'all') {
    return Object.entries(POWERUPS).map(([id, item]) => ({ id, category: 'powerups', name: item.name, icon: item.icon, desc: item.description, price: POWERUP_PRICES[id].price, currency: POWERUP_PRICES[id].currency, owned: save.boosters[id], button: 'BUY BOOSTER' }));
  }
  if (tab === 'chests') return [{ id: 'treasureChest', category: 'chests', name: 'Ancient Treasure Chest', icon: '🎁', desc: 'Open instantly for a random coin, gem, token or revive reward.', price: 450, currency: 'coins', owned: 0, button: 'OPEN CHEST' }];
  if (tab === 'skins') return [
    { id: 'defaultOutfit', category: 'skins', name: 'Temple Scout Outfit', icon: '🧭', desc: 'The original adventurer look.', price: 0, currency: 'tokens', owned: true, button: 'EQUIP' },
    { id: 'fernOutfit', category: 'skins', name: 'Fern Guardian Outfit', icon: '🌿', desc: 'A moss-green explorer look for your selected hero.', price: 4, currency: 'tokens', owned: save.unlockedOutfits.includes('fern'), button: 'UNLOCK SKIN' },
    { id: 'sunsetOutfit', category: 'skins', name: 'Sunset Relic Outfit', icon: '🌅', desc: 'Warm sunset trim and a ceremonial sash.', price: 7, currency: 'tokens', owned: save.unlockedOutfits.includes('sunset'), button: 'UNLOCK SKIN' }
  ];
  if (tab === 'special') return [
    { id: 'reviveToken', category: 'special', name: 'Revive Token', icon: '💫', desc: 'Keep one extra chance to recover after a crash.', price: 12, currency: 'gems', owned: save.reviveTokens, button: 'BUY TOKEN' },
    { id: 'tokenBundle', category: 'special', name: 'Ancient Token Pair', icon: '🏵️', desc: 'Two event tokens for special rewards.', price: 10, currency: 'gems', owned: 0, button: 'BUY TOKENS' }
  ];
  return [];
}

function openShop(tab = shopTab) {
  shopTab = tab;
  const tabs = [['powerups', 'POWER-UPS'], ['chests', 'CHESTS'], ['skins', 'SKINS'], ['special', 'SPECIAL']]
    .map(([id, label]) => `<button class="${tab === id ? 'active' : ''}" data-action="shop-tab" data-tab="${id}">${label}</button>`).join('');
  const items = getShopItems(tab);
  const cards = items.map(item => {
    const priceIcon = item.currency === 'gems' ? '💎' : item.currency === 'tokens' ? '🏵️' : '🪙';
    const ownedText = tab === 'powerups' ? `IN STOCK: ${number(item.owned)}` : tab === 'skins' ? item.owned ? 'OWNED' : 'COSMETIC' : tab === 'special' && item.id === 'reviveToken' ? `OWNED: ${item.owned}` : 'IN-GAME ITEM';
    const selectedOutfit = item.id === 'defaultOutfit' ? save.selectedOutfit === 'default' : item.id === 'fernOutfit' ? save.selectedOutfit === 'fern' : item.id === 'sunsetOutfit' ? save.selectedOutfit === 'sunset' : false;
    const action = item.category === 'skins' && item.owned ? 'select-outfit' : 'shop-buy';
    const buttonLabel = item.category === 'skins' && item.owned ? (selectedOutfit ? 'EQUIPPED' : 'EQUIP') : item.button;
    return `<div class="game-card">
      <div class="card-top"><span class="card-icon">${item.icon}</span><span class="card-badge">${ownedText}</span></div>
      <h3>${item.name}</h3><p>${item.desc}</p>
      <div class="card-bottom"><span class="card-price">${priceIcon} ${number(item.price)}</span>
      <button class="small-btn" data-action="${action}" data-id="${item.id}" ${selectedOutfit ? 'disabled' : ''}>${buttonLabel}</button></div>
    </div>`;
  }).join('');
  showModal(`${heading('JUNGLE <span>SHOP</span>', 'Spend earned in-game currency. No real-money or fake payment transactions.')}
    <div class="modal-tabs">${tabs}</div><div class="card-grid">${cards}</div>
    <div class="empty-note" style="margin-top:12px">Power-up stock is consumed when a run starts. Collectible power-up orbs also appear during runs.</div>`, 'shop');
}

function openMissions(tab = missionTab) {
  missionTab = tab;
  normalizeMissionDates();
  const daily = getDailyMissions();
  const weeklyInfo = getWeeklyMissions();
  const tabs = `<button class="${tab === 'daily' ? 'active' : ''}" data-action="mission-tab" data-tab="daily">DAILY · 3</button><button class="${tab === 'weekly' ? 'active' : ''}" data-action="mission-tab" data-tab="weekly">WEEKLY · 3</button>`;
  const list = tab === 'daily' ? daily : weeklyInfo.missions;
  const progressMap = tab === 'daily' ? save.dailyMissionProgress : save.weeklyMissionProgress;
  const prefix = tab === 'daily' ? save.dailyMissionDate : save.weeklyMissionWeek;
  const items = list.map(mission => {
    const progress = Math.min(mission.target, progressMap[mission.id] || 0);
    const done = progress >= mission.target;
    const claimedKey = `${prefix}:${mission.id}`;
    const claimed = save.claimedMissionRewards.includes(claimedKey);
    const rewardText = Object.entries(mission.reward).map(([key, value]) => `${key === 'coins' ? '🪙' : key === 'gems' ? '💎' : '🏵️'} ${value}`).join(' ');
    return `<div class="mission-card">
      <div class="mission-icon">${({ coins: '🪙', distance: '🏃', jumps: '🪽', slides: '↘️', gems: '💎', powerUps: '⚡', singleRunCoins: '💰', singleRunDistance: '🛣️', tokens: '🏵️', runs: '🎮' })[mission.type] || '📜'}</div>
      <div class="mission-main"><h3>${mission.title}</h3><p>${mission.description}</p>
        <div class="progress-row"><div class="progress-track"><i style="width:${progress / mission.target * 100}%"></i></div><span class="progress-label">${number(progress)} / ${number(mission.target)}</span></div>
      </div><div class="mission-reward"><span>${rewardText}</span>${claimed ? '<small>CLAIMED ✓</small>' : done ? `<button class="small-btn" data-action="claim-mission" data-id="${mission.id}" data-period="${tab}">CLAIM</button>` : '<small>IN PROGRESS</small>'}</div>
    </div>`;
  }).join('');
  showModal(`${heading(tab === 'daily' ? 'DAILY <span>MISSIONS</span>' : 'WEEKLY <span>TRIALS</span>', tab === 'daily' ? 'Three new objectives rotate each local day.' : 'A fresh set of longer challenges begins every Monday.')}
    <div class="modal-tabs">${tabs}</div><div class="mission-list">${items}</div>`, 'missions');
}

function achievementProgress(def) {
  const map = {
    runs: save.totalRuns,
    coins: save.totalCoinsCollected,
    gems: save.totalGemsCollected,
    bestDistance: save.bestDistance,
    jumps: save.totalJumps,
    slides: save.totalSlides,
    powerUps: save.totalPowerUps
  };
  return Math.min(def.target, map[def.type] || 0);
}

function openAchievements() {
  const cards = ACHIEVEMENTS.map(item => {
    const progress = achievementProgress(item);
    const unlocked = progress >= item.target;
    const stored = save.achievements[item.id]?.unlocked;
    const claimed = Boolean(stored);
    const reward = Object.entries(item.reward).map(([key, value]) => `${key === 'coins' ? '🪙' : key === 'gems' ? '💎' : '🏵️'} ${value}`).join(' ');
    return `<div class="mission-card">
      <div class="mission-icon">${item.icon}</div><div class="mission-main"><h3>${item.title}</h3><p>${item.desc}</p>
      <div class="progress-row"><div class="progress-track"><i style="width:${progress / item.target * 100}%"></i></div><span class="progress-label">${number(progress)} / ${number(item.target)}</span></div></div>
      <div class="mission-reward"><span>${reward}</span><small>${claimed ? 'UNLOCKED ✓' : unlocked ? 'READY' : 'LOCKED'}</small></div>
    </div>`;
  }).join('');
  showModal(`${heading('HALL OF <span>LEGENDS</span>', 'Every achievement tracks real saved gameplay statistics.')}
    <div class="mission-list">${cards}</div>`, 'achievements');
}

function openRewards() {
  const claimedToday = save.dailyClaimDate === today();
  const days = DAILY_REWARD_CYCLE.map((reward, index) => {
    const current = (save.dailyStreak % 7) === index && !claimedToday;
    const already = claimedToday && ((save.dailyStreak - 1 + 7) % 7) === index;
    return `<div class="reward-day ${current ? 'today' : ''} ${already ? 'claimed' : ''}"><span>${reward.icon}</span><b>DAY ${index + 1}</b><small>${reward.label}</small>${already ? '<small>CLAIMED ✓</small>' : current ? '<small>YOUR NEXT REWARD</small>' : ''}</div>`;
  }).join('');
  const action = claimedToday ? '<button class="secondary-btn" disabled>COME BACK TOMORROW</button>' : '<button class="primary-btn" data-action="claim-daily">CLAIM TODAY’S REWARD</button>';
  showModal(`${heading('DAILY <span>TREASURE TRAIL</span>', `Login streak: ${save.dailyStreak} day${save.dailyStreak === 1 ? '' : 's'}. Claim once each local day.`)}
    <div class="rewards-calendar">${days}</div><div class="modal-actions">${action}</div>
    <div class="empty-note" style="margin-top:13px">The 7-day reward cycle repeats. Missing a day resets the consecutive streak.</div>`, 'rewards');
}

function settingSwitch(id, title, subtitle, value) {
  return `<div class="setting-row"><div><b>${title}</b><small>${subtitle}</small></div><button class="switch ${value ? 'on' : ''}" data-action="toggle-setting" data-setting="${id}" aria-label="Toggle ${title}"><i></i></button></div>`;
}

function openSettings() {
  const inRun = Boolean(run && !run.gameOver && !paused);
  if (inRun) { paused = true; resumeAfterModal = true; }
  const s = save.settings;
  showModal(`${heading('GAME <span>SETTINGS</span>', 'Tune sound, visuals and control feel for your device.')}
    <div class="settings-list">
      ${settingSwitch('music', 'Jungle Music', 'Original procedurally generated ambient music.', s.music)}
      <div class="setting-row"><div><b>Music Volume</b><small>Background ambience level</small></div><input type="range" min="0" max="1" step="0.05" value="${s.musicVolume}" data-setting="musicVolume"></div>
      ${settingSwitch('sound', 'Sound Effects', 'Coins, jumps, power-ups and collisions.', s.sound)}
      <div class="setting-row"><div><b>Sound Volume</b><small>Gameplay effect volume</small></div><input type="range" min="0" max="1" step="0.05" value="${s.soundVolume}" data-setting="soundVolume"></div>
      <div class="setting-row"><div><b>Graphics Quality</b><small>Lower quality improves performance on older phones.</small></div><select data-setting="quality"><option value="low" ${s.quality === 'low' ? 'selected' : ''}>Low</option><option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Medium</option><option value="high" ${s.quality === 'high' ? 'selected' : ''}>High</option></select></div>
      <div class="setting-row"><div><b>Camera Sensitivity</b><small>Swipe / lane response factor</small></div><input type="range" min="0.5" max="2" step="0.1" value="${s.sensitivity}" data-setting="sensitivity"></div>
      ${settingSwitch('vibration', 'Vibration', 'Short haptic feedback where supported.', s.vibration)}
      ${settingSwitch('performanceMode', 'Performance Mode', 'Reduce pixel density and visual effects.', s.performanceMode)}
      <div class="setting-row"><div><b>Language</b><small>English interface is included. Hindi translation pack is not included in this build.</small></div><select data-setting="language"><option value="en" selected>English</option><option value="hi" disabled>Hindi · unavailable</option></select></div>
      <div class="setting-row"><div><b>Reset Game Data</b><small>Delete local progress from this browser only.</small></div><button class="small-btn danger-btn" data-action="confirm-reset">RESET</button></div>
    </div>
    <div class="empty-note" style="margin-top:12px">Progress is saved in this browser’s local storage. There is no cloud sync. Clearing browser data or switching devices will not transfer your save.</div>`, 'settings', false);
}

function openResetConfirm() {
  showModal(`${heading('RESET <span>ALL DATA?</span>', 'This permanently deletes coins, gems, characters, upgrades and records saved on this device.')}
    <div class="empty-note">This action cannot be undone. Download or back up your progress yourself before continuing.</div>
    <div class="modal-actions"><button class="secondary-btn" data-action="close-modal">CANCEL</button><button class="primary-btn danger-btn" data-action="reset-data">DELETE LOCAL SAVE</button></div>`, 'reset', false);
}

function openHowTo() {
  showModal(`${heading('HOW TO <span>PLAY</span>', 'Run automatically. React quickly. A clear lane is your best friend.')}
    <div class="howto-grid">
      <div class="howto-item"><span class="howto-key">← / A</span><div><b>Move Left</b><small>Switch to the left lane.</small></div></div>
      <div class="howto-item"><span class="howto-key">→ / D</span><div><b>Move Right</b><small>Switch to the right lane.</small></div></div>
      <div class="howto-item"><span class="howto-key">↑ / W</span><div><b>Jump</b><small>Clear spikes, gaps and logs.</small></div></div>
      <div class="howto-item"><span class="howto-key">↓ / S</span><div><b>Slide</b><small>Duck under branches and blades.</small></div></div>
      <div class="howto-item"><span class="howto-key">Ⅱ</span><div><b>Pause</b><small>Pause or restart your run.</small></div></div>
      <div class="howto-item"><span class="howto-key">✦ ✦</span><div><b>Double Tap</b><small>Activate a charged Relic Dash.</small></div></div>
    </div>
    <div class="empty-note" style="margin-top:12px">Mobile: swipe left, right, up or down. Use the on-screen buttons as an alternative. The game prevents page scrolling while you play.</div>`, 'howto');
}

function openPause() {
  paused = true;
  resumeAfterModal = true;
  showModal(`${heading('RUN <span>PAUSED</span>', 'The guardian waits… but not forever.')}
    <div class="pause-options">
      <button class="primary-btn" data-action="resume">▶ RESUME RUN</button>
      <button class="secondary-btn" data-action="restart">↻ RESTART RUN</button>
      <button class="secondary-btn" data-action="settings">⚙ SETTINGS</button>
      <button class="secondary-btn" data-action="home">⌂ MAIN MENU</button>
    </div>`, 'pause', false);
}

function openGameOver(reason = 'The guardian caught up with you.') {
  if (!run) return;
  const score = scoreRun({ distance: run.distance, coins: run.coins, gems: run.gems, tokens: run.tokens, multiplier: run.scoreMultiplier || 1, bonus: run.bonusScore || 0 });
  const canTry = !run.noRevive && canRevive(run, 1);
  const tokenAvailable = save.reviveTokens > 0 || run.resurrectionBooster;
  const gemAvailable = save.gems >= 20;
  const reviveButtons = canTry ? `<div class="modal-actions">${tokenAvailable ? '<button class="primary-btn" data-action="revive-token">💫 USE REVIVE TOKEN</button>' : ''}${gemAvailable ? '<button class="secondary-btn" data-action="revive-gems">💎 REVIVE · 20 GEMS</button>' : ''}</div>` : '<div class="empty-note">No revives remaining in this run.</div>';
  showModal(`${heading('RUN <span>OVER</span>', escapeHTML(reason))}
    <div class="result-banner"><div class="result-emoji">🗿</div><h2>${number(score)}</h2><p>FINAL SCORE</p></div>
    <div class="result-stats">
      <div class="result-stat"><small>DISTANCE</small><b>${number(run.distance)} m</b></div>
      <div class="result-stat"><small>COINS</small><b>🪙 ${number(run.coins)}</b></div>
      <div class="result-stat"><small>GEMS</small><b>💎 ${number(run.gems)}</b></div>
      <div class="result-stat"><small>BEST DISTANCE</small><b>${number(save.bestDistance)} m</b></div>
      <div class="result-stat"><small>BEST SCORE</small><b>${number(save.bestScore)}</b></div>
      <div class="result-stat"><small>RUNS</small><b>${number(save.totalRuns)}</b></div>
    </div>
    <p class="result-best">${run.newDistanceRecord ? '✦ NEW DISTANCE RECORD ✦' : run.newScoreRecord ? '✦ NEW SCORE RECORD ✦' : 'MISSION PROGRESS SAVED'}</p>
    ${reviveButtons}
    <div class="modal-actions"><button class="primary-btn" data-action="restart">↻ PLAY AGAIN</button><button class="secondary-btn" data-action="home">⌂ MAIN MENU</button></div>`, 'gameover', false);
}

function renderHud() {
  if (!run) return;
  const score = scoreRun({ distance: run.distance, coins: run.coins, gems: run.gems, tokens: run.tokens, multiplier: run.scoreMultiplier || 1, bonus: run.bonusScore || 0 });
  run.score = score;
  $('hudScore').textContent = number(score);
  $('hudDistance').textContent = number(run.distance);
  $('runCoins').textContent = number(run.coins);
  $('runGems').textContent = number(run.gems);
  const charge = Math.round(run.specialCharge || 0);
  $('specialPercent').textContent = `${charge}%`;
  $('specialMeter').style.width = `${charge}%`;
  const active = Object.entries(run.activePowerUps || {}).filter(([id, until]) => until > Date.now() && POWERUPS[id]);
  $('activePowers').innerHTML = active.map(([id, until]) => `<span class="power-chip" title="${POWERUPS[id].name}: ${Math.ceil((until - Date.now()) / 1000)}s">${POWERUPS[id].icon}</span>`).join('');
  const objective = run.objective;
  $('modeObjective').textContent = objective ? `${objective.label} · ${objective.done ? 'COMPLETE ✓' : `${number(objective.progress || 0)} / ${number(objective.target)}`}` : currentMode === 'timeTrial' ? `TIME ${Math.max(0, 90 - Math.floor(run.elapsed))}s` : MODE_DEFS.find(m => m.id === currentMode)?.name || 'ENDLESS';
  $('monsterWarning').classList.toggle('show', Boolean(run.distance > 500 && run.distance % 1100 > 850));
}

function awardReward(reward) {
  for (const [key, amount] of Object.entries(reward || {})) {
    if (key === 'coins' || key === 'gems' || key === 'tokens') save[key] += amount;
  }
}

function updateMissionCounters() {
  if (!run) return;
  const dailyMissions = getDailyMissions();
  for (const mission of dailyMissions) {
    let delta = 0;
    if (mission.type === 'coins') delta = run.coins;
    else if (mission.type === 'distance') delta = run.distance;
    else if (mission.type === 'jumps') delta = run.jumps;
    else if (mission.type === 'slides') delta = run.slides;
    else if (mission.type === 'gems') delta = run.gems;
    else if (mission.type === 'powerUps') delta = run.powerUps;
    else if (mission.type === 'singleRunCoins') delta = run.coins;
    else if (mission.type === 'singleRunDistance') delta = run.distance;
    else if (mission.type === 'tokens') delta = run.tokens;
    const current = save.dailyMissionProgress[mission.id] || 0;
    if (mission.type === 'singleRunCoins' || mission.type === 'singleRunDistance') {
      save.dailyMissionProgress[mission.id] = Math.max(current, delta);
    } else {
      save.dailyMissionProgress[mission.id] = updateMissionProgress({ progress: current, target: mission.target }, delta).progress;
    }
  }
  const weekly = getWeeklyMissions();
  for (const mission of weekly.missions) {
    const delta = mission.type === 'distance' ? run.distance : mission.type === 'coins' ? run.coins : mission.type === 'runs' ? 1 : 0;
    const current = save.weeklyMissionProgress[mission.id] || 0;
    save.weeklyMissionProgress[mission.id] = updateMissionProgress({ progress: current, target: mission.target }, delta).progress;
  }
}

function checkAchievements() {
  for (const item of ACHIEVEMENTS) {
    const progress = achievementProgress(item);
    const wasUnlocked = save.achievements[item.id]?.unlocked === true;
    const unlocked = progress >= item.target;
    save.achievements[item.id] = { progress, unlocked: wasUnlocked || unlocked };
    if (unlocked && !wasUnlocked) {
      awardReward(item.reward);
      toast(`Achievement unlocked: ${item.title}`);
      audio.play('success');
    }
  }
}

function finalizeRun(reason) {
  if (!run || run.resultSaved) return;
  run.resultSaved = true;
  const score = scoreRun({ distance: run.distance, coins: run.coins, gems: run.gems, tokens: run.tokens, multiplier: run.scoreMultiplier || 1, bonus: run.bonusScore || 0 });
  run.score = score;
  save.totalRuns += 1;
  save.totalDistance += Math.floor(run.distance);
  run.newDistanceRecord = Math.floor(run.distance) > save.bestDistance;
  run.newScoreRecord = score > save.bestScore;
  save.bestDistance = Math.max(save.bestDistance, Math.floor(run.distance));
  save.bestScore = Math.max(save.bestScore, score);
  save.totalJumps += run.jumps;
  save.totalSlides += run.slides;
  save.totalPowerUps += run.powerUps;
  updateMissionCounters();
  checkAchievements();
  if (run.objective && run.objective.progress >= run.objective.target && !run.objective.rewarded) {
    run.objective.done = true;
    run.objective.rewarded = true;
    awardReward(run.objective.reward || { coins: 250 });
    toast('Challenge objective completed! Reward added.');
  }
  run.gameOver = true;
  run.gameOverReason = reason;
  persist();
}

function finishRun(reason) {
  if (!run || run.gameOver) return;
  audio.play('gameover');
  finalizeRun(reason);
  run.gameOver = true;
  run.gameOverReason = reason;
  paused = true;
  openGameOver(reason);
}

function updateObjective() {
  if (!run?.objective || run.objective.done) return;
  const progress = getRunObjectiveProgress(run, run.objective.type);
  if (progress !== null) run.objective.progress = progress;
  if (run.objective.progress >= run.objective.target && !run.objective.done) {
    run.objective.done = true;
    if (!run.objective.rewarded) {
      run.objective.rewarded = true;
      awardReward(run.objective.reward || { coins: 300 });
      persist();
      audio.play('success');
      toast('Objective complete! Bonus reward earned.');
    }
  }
}

function handleCollect(type, powerId) {
  if (!run || run.gameOver) return;
  const multiplier = isPowerUpActive(run, 'multiplier');
  let result;
  if (type === 'coin' || type === 'gem' || type === 'token') {
    result = applyCollection(save, run, type, 1, { coinMultiplier: multiplier });
    audio.play(type);
    if (type === 'coin' && save.selectedCharacter === 'ravi' && !multiplier && run.coins % 5 === 0) save.coins += 1;
    if (type === 'gem') toast('Magic gem collected!');
    if (type === 'token') toast('Ancient token collected!');
  } else if (type === 'chest') {
    save.totalChestsOpened += 1;
    result = randomChestReward(save);
    audio.play('chest');
    toast(`Treasure found: +${result.amount} ${result.type}!`);
  } else if (type === 'power') {
    const picked = powerId || 'magnet';
    const activated = activatePowerUp(run, picked, Date.now(), save.upgrades);
    if (activated && picked === 'magnet' && save.selectedCharacter === 'tala') run.activePowerUps.magnet += activated.duration * 100;
    if (activated && picked === 'shield' && save.selectedCharacter === 'nyx') run.activePowerUps.shield += activated.duration * 150;
    run.powerUps += 1;
    audio.play('power');
    toast(`${POWERUPS[picked]?.name || 'Power-up'} activated!`);
  }
  if (['coin', 'gem', 'token', 'chest', 'power'].includes(type)) persist();
  vibrate(type === 'gem' || type === 'chest' ? 18 : 8);
  renderHud();
}

function onCollision(obstacleId) {
  if (!run || run.gameOver) return;
  const now = Date.now();
  if (isPowerUpActive(run, 'invincible', now)) {
    run.obstaclesAvoided += 1;
    return;
  }
  if (isPowerUpActive(run, 'shield', now)) {
    delete run.activePowerUps.shield;
    run.shieldHits += 1;
    scene?.setDanger(0);
    audio.play('power');
    toast('Shield absorbed the hit!');
    return;
  }
  if (run.atlasShield) {
    run.atlasShield = false;
    scene?.setDanger(0);
    audio.play('power');
    toast('Atlas ability blocked the collision!');
    return;
  }
  audio.play('crash');
  vibrate([35, 25, 45]);
  if (!run.crashPending) {
    run.crashPending = true;
    const reason = `You hit a ${obstacleId.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`).toLowerCase()}.`;
    scene?.startFall();
    setTimeout(() => { if (run && run.crashPending && !run.gameOver) { run.crashPending = false; finishRun(reason); } }, 460);
  }
}

function handleSpecial() {
  if (!run || run.gameOver) return;
  if ((run.specialCharge || 0) < 100) {
    toast('Relic Dash is still charging.');
    return;
  }
  run.specialCharge = 0;
  activatePowerUp(run, 'invincible', Date.now(), save.upgrades);
  run.activePowerUps.score = Date.now() + 3500;
  audio.play('power');
  toast('RELIC DASH! Invincible for a moment.');
  renderHud();
}

function activateStartingBoosters() {
  const head = save.boosters.headStart || 0;
  if (head > 0) {
    save.boosters.headStart -= 1;
    run.distance += 120 + (save.upgrades.startingBoost - 1) * 80;
    toast('Head Start activated!');
  }
  if ((save.boosters.resurrection || 0) > 0) {
    save.boosters.resurrection -= 1;
    run.resurrectionBooster = true;
  }
  const starterIds = ['magnet', 'shield', 'multiplier', 'megaJump', 'speed', 'score'];
  for (const id of starterIds) {
    if ((save.boosters[id] || 0) > 0) {
      save.boosters[id] -= 1;
      const started = activatePowerUp(run, id, Date.now(), save.upgrades);
      if (started && id === 'magnet' && save.selectedCharacter === 'tala') run.activePowerUps.magnet += started.duration * 100;
      if (started && id === 'shield' && save.selectedCharacter === 'nyx') run.activePowerUps.shield += started.duration * 150;
      toast(`${POWERUPS[id].name} booster equipped!`);
      break;
    }
  }
}

function startRun(mode = 'classic') {
  if (!sceneReady || !scene) { toast('3D graphics need WebGL. Enable it in your browser to play.'); return; }
  currentMode = mode;
  audio.start();
  audio.play('success');
  run = createRun(mode);
  run.specialCharge = 0;
  run.scoreMultiplier = save.selectedCharacter === 'leo' ? 1.1 : 1;
  run.atlasShield = save.selectedCharacter === 'atlas';
  if (save.selectedCharacter === 'zara') { run.gems += 1; save.gems += 1; }
  run.objective = null;
  if (mode === 'challenge') run.objective = { type: 'distance', target: 1200, progress: 0, label: 'REACH 1,200 M', reward: { coins: 350, gems: 2 } };
  if (mode === 'timeTrial') run.noRevive = true;
  if (mode === 'daily') {
    const mission = getDailyMissions()[0];
    run.objective = { type: mission.type, target: mission.target, progress: 0, label: `DAILY: ${mission.title.toUpperCase()}`, reward: { tokens: 2, coins: 200 } };
  }
  if (mode === 'event') run.objective = { type: 'distance', target: 1800, progress: 0, label: 'EVENT TRAIL: REACH 1,800 M', reward: { tokens: 4, gems: 2 } };
  activateStartingBoosters();
  scene?.setMode(mode);
  scene?.resetRun();
  if (scene && run) scene.update(0, run, 'idle');
  $('homeScreen').classList.add('hidden');
  $('modalLayer').classList.add('hidden');
  $('gameHud').classList.remove('hidden');
  $('mobileControls').classList.remove('hidden');
  paused = false;
  resumeAfterModal = false;
  $('monsterWarning').classList.remove('show');
  renderHud();
  updateWallet();
  persist();
}

function revive(use) {
  if (!run || !run.gameOver || !canRevive(run, 1)) return;
  if (use === 'token') {
    if (run.resurrectionBooster) run.resurrectionBooster = false;
    else if (save.reviveTokens > 0) save.reviveTokens -= 1;
    else return toast('No revive tokens available.');
  } else if (use === 'gems') {
    if (save.gems < 20) return toast('You need 20 gems to revive.');
    save.gems -= 20;
  }
  run.revives += 1;
  run.gameOver = false;
  run.gameOverReason = '';
  run.activePowerUps.invincible = Date.now() + 5000;
  run.activePowerUps.shield = Date.now() + 3500;
  scene?.setDanger(0);
  scene?.stopFall();
  paused = false;
  $('modalLayer').classList.add('hidden');
  $('gameHud').classList.remove('hidden');
  $('mobileControls').classList.remove('hidden');
  audio.play('revive');
  toast('Revived! Temporary protection activated.');
  persist();
  renderHud();
}

function restartRun() { startRun(currentMode); }

function goHome() { setHome(); }

function buyBooster(id) {
  const item = POWERUP_PRICES[id];
  if (!item) return toast('This item is unavailable.');
  if (save[item.currency] < item.price) return toast(`Not enough ${item.currency}.`);
  save[item.currency] -= item.price;
  save.boosters[id] = (save.boosters[id] || 0) + 1;
  audio.play('success'); persist(); openShop(shopTab);
  toast(`${POWERUPS[id].name} added to your inventory.`);
}

function buyShopItem(id) {
  if (id in POWERUP_PRICES) return buyBooster(id);
  if (id === 'treasureChest') {
    if (save.coins < 450) return toast('Not enough coins.');
    save.coins -= 450;
    const reward = randomChestReward(save);
    persist(); openShop(shopTab); audio.play('chest'); toast(`Chest opened: +${reward.amount} ${reward.type}!`); return;
  }
  if (id === 'reviveToken') {
    if (save.gems < 12) return toast('Not enough gems.');
    save.gems -= 12; save.reviveTokens += 1; persist(); openShop(shopTab); toast('Revive token purchased.'); return;
  }
  if (id === 'tokenBundle') {
    if (save.gems < 10) return toast('Not enough gems.');
    save.gems -= 10; save.tokens += 2; persist(); openShop(shopTab); toast('Two ancient tokens added.'); return;
  }
  if (id === 'fernOutfit' || id === 'sunsetOutfit') {
    const outfit = id === 'fernOutfit' ? 'fern' : 'sunset';
    const cost = id === 'fernOutfit' ? 4 : 7;
    if (save.unlockedOutfits.includes(outfit)) return toast('This skin is already owned.');
    if (save.tokens < cost) return toast('Not enough ancient tokens.');
    save.tokens -= cost; save.unlockedOutfits.push(outfit); save.selectedOutfit = outfit; save.purchasedItems.push(id); scene?.setOutfit(outfit);
    persist(); openShop(shopTab); toast('Outfit unlocked!'); return;
  }
}

function claimMission(id, period) {
  normalizeMissionDates();
  const isDaily = period === 'daily';
  const list = isDaily ? getDailyMissions() : getWeeklyMissions().missions;
  const mission = list.find(item => item.id === id);
  if (!mission) return;
  const prefix = isDaily ? save.dailyMissionDate : save.weeklyMissionWeek;
  const key = `${prefix}:${mission.id}`;
  const map = isDaily ? save.dailyMissionProgress : save.weeklyMissionProgress;
  if ((map[mission.id] || 0) < mission.target) return toast('Mission is not complete yet.');
  if (save.claimedMissionRewards.includes(key)) return toast('Reward already claimed.');
  awardReward(mission.reward);
  save.claimedMissionRewards.push(key);
  audio.play('success'); persist(); openMissions(period); toast('Mission reward claimed!');
}

function handleAction(action, element) {
  switch (action) {
    case 'home': goHome(); break;
    case 'play': startRun(currentMode); break;
    case 'modes': openModes(); break;
    case 'characters': openCharacters(); break;
    case 'shop': openShop(); break;
    case 'upgrades': openUpgrades(); break;
    case 'missions': openMissions(); break;
    case 'achievements': openAchievements(); break;
    case 'rewards': openRewards(); break;
    case 'settings': if (run?.gameOver) openGameOver(run.gameOverReason || 'Run complete.'); else openSettings(); break;
    case 'howto': openHowTo(); break;
    case 'close-modal':
      if (run?.gameOver) goHome(); else closeModal();
      break;
    case 'start-mode': startRun(element.dataset.mode); break;
    case 'select-character':
      if (selectCharacter(save, element.dataset.id)) { scene?.setCharacter(save.selectedCharacter); scene?.setOutfit(save.selectedOutfit); persist(); openCharacters(); toast(`${CHARACTERS.find(c => c.id === save.selectedCharacter).name} selected.`); }
      break;
    case 'buy-character': {
      const result = buyCharacter(save, element.dataset.id);
      if (!result.ok) toast(result.reason === 'funds' ? 'Not enough currency.' : 'Character unavailable.');
      else { persist(); audio.play('success'); openCharacters(); toast(`${result.character.name} unlocked!`); }
      break;
    }
    case 'buy-upgrade': {
      const result = buyUpgrade(save, element.dataset.id);
      if (!result.ok) toast(result.reason === 'funds' ? 'Not enough currency.' : result.reason === 'max' ? 'Maximum level reached.' : 'Upgrade unavailable.');
      else { persist(); audio.play('success'); openUpgrades(); toast('Upgrade level increased!'); }
      break;
    }
    case 'shop-tab': openShop(element.dataset.tab); break;
    case 'shop-buy': buyShopItem(element.dataset.id); break;
    case 'select-outfit': {
      const outfit = element.dataset.id === 'defaultOutfit' ? 'default' : element.dataset.id === 'fernOutfit' ? 'fern' : 'sunset';
      if (save.unlockedOutfits.includes(outfit)) { save.selectedOutfit = outfit; scene?.setOutfit(outfit); persist(); openShop('skins'); toast('Outfit equipped.'); }
      break;
    }
    case 'mission-tab': openMissions(element.dataset.tab); break;
    case 'claim-mission': claimMission(element.dataset.id, element.dataset.period); break;
    case 'claim-daily': {
      const result = claimDailyReward(save, today());
      if (!result.ok) toast('Today’s reward has already been claimed.');
      else { persist(); audio.play('chest'); openRewards(); toast(`${result.reward.label} claimed!`); }
      break;
    }
    case 'toggle-setting': {
      const key = element.dataset.setting;
      save.settings[key] = !save.settings[key];
      audio.applySettings(save.settings); persist(); openSettings();
      break;
    }
    case 'confirm-reset': openResetConfirm(); break;
    case 'reset-data': {
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      save = structuredClone(DEFAULT_SAVE); normalizeMissionDates(); persist(); scene?.setCharacter(save.selectedCharacter); scene?.setOutfit(save.selectedOutfit);
      openSettings(); toast('Local game data reset.');
      break;
    }
    case 'resume': closeModal(); paused = false; break;
    case 'pause': openPause(); break;
    case 'restart': restartRun(); break;
    case 'revive-token': revive('token'); break;
    case 'revive-gems': revive('gems'); break;
    default: break;
  }
}

function handleControl(control) {
  if (!run || run.gameOver || paused) return;
  if (control === 'left') scene?.moveLane(-1);
  if (control === 'right') scene?.moveLane(1);
  if (control === 'jump') { if (scene?.jump()) audio.play('jump'); }
  if (control === 'slide') { if (scene?.slide()) audio.play('slide'); }
  if (control === 'special') handleSpecial();
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'escape'].includes(key)) event.preventDefault();
  if (key === 'escape') {
    if (!$('modalLayer').classList.contains('hidden')) {
      if (run?.gameOver) goHome(); else closeModal();
    } else if (run && !run.gameOver && !paused) openPause();
    return;
  }
  if (!run || paused || run.gameOver) return;
  if (key === 'arrowleft' || key === 'a') handleControl('left');
  else if (key === 'arrowright' || key === 'd') handleControl('right');
  else if (key === 'arrowup' || key === 'w' || key === ' ') handleControl('jump');
  else if (key === 'arrowdown' || key === 's') handleControl('slide');
}

function bindInput() {
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    audio.play('tap');
    handleAction(target.dataset.action, target);
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-control]');
    if (target) handleControl(target.dataset.control);
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (!target.matches('[data-setting]')) return;
    const key = target.dataset.setting;
    if (key === 'quality' || key === 'language') save.settings[key] = target.value;
    else save.settings[key] = Number(target.value);
    audio.applySettings(save.settings); persist();
    if (key === 'quality' || key === 'performanceMode') toast('Graphics changes apply fully after a reload.');
  });
  document.addEventListener('keydown', handleKeydown, { passive: false });
  $('fullscreenBtn').addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await $('gameShell').requestFullscreen();
      else await document.exitFullscreen();
    } catch { toast('Fullscreen is not available in this browser.'); }
  });
  const world = $('world');
  world.addEventListener('pointerdown', event => {
    if (!run || paused || run.gameOver) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId, time: performance.now() };
  }, { passive: true });
  world.addEventListener('pointerup', event => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    const distance = Math.hypot(dx, dy);
    const elapsed = performance.now() - pointerStart.time;
    pointerStart = null;
    const sensitivity = save.settings.sensitivity || 1;
    if (distance > 22 / sensitivity) {
      if (Math.abs(dx) > Math.abs(dy)) handleControl(dx > 0 ? 'right' : 'left');
      else handleControl(dy > 0 ? 'slide' : 'jump');
    } else {
      const now = performance.now();
      if (now - lastTapAt < 330 && elapsed < 240) { handleSpecial(); lastTapAt = 0; }
      else lastTapAt = now;
    }
  }, { passive: true });
  world.addEventListener('pointercancel', () => { pointerStart = null; }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && run && !run.gameOver && !paused) openPause();
  });
  window.addEventListener('pagehide', () => persist());
}

function updateFrame(time) {
  animationId = requestAnimationFrame(updateFrame);
  const dt = lastFrame ? Math.min(.05, (time - lastFrame) / 1000) : 0;
  lastFrame = time;
  if (run && !paused && !run.gameOver) {
    if (run.crashPending) { scene?.update(dt, run, 'falling'); return; }
    run.elapsed += dt;
    const base = getRunSpeed(run.distance);
    const speedBoost = isPowerUpActive(run, 'speed') ? 1.28 : 1;
    run.currentSpeed = base * speedBoost;
    run.distance += run.currentSpeed * dt;
    run.specialCharge = Math.min(100, (run.specialCharge || 0) + dt * 4.5);
    run.scoreMultiplier = (save.selectedCharacter === 'leo' ? 1.1 : 1) * (isPowerUpActive(run, 'score') ? 1.5 : 1);
    updateObjective();
    if (currentMode === 'timeTrial' && run.elapsed >= 90) {
      run.gameOver = true;
      run.resultSaved = false;
      finalizeRun('Time trial complete!');
      openGameOver('Time trial complete! Your 90-second run has ended.');
      paused = true;
    }
    if (scene) scene.update(dt, run, run.gameOver ? 'idle' : 'running');
    if (Math.floor(run.elapsed * 5) !== Math.floor((run.elapsed - dt) * 5)) renderHud();
  }
}

function initScene() {
  try {
    scene = new JungleScene($('world'), save, {
      onCollect: handleCollect,
      onCollision,
      onAvoid: () => { if (run) run.obstaclesAvoided += 1; },
      onAction: action => {
        if (!run) return;
        if (action === 'jump') run.jumps += 1;
        if (action === 'slide') run.slides += 1;
        audio.play(action);
      },
      onSpecial: handleSpecial,
      onZone: zone => { if (run && run.distance > 30) toast(zone); }
    });
    sceneReady = true;
    scene.setOutfit(save.selectedOutfit);
    scene.update(0, { distance: 0, currentSpeed: 18, activePowerUps: {} }, 'idle');
    $('loadingStatus').textContent = 'The jungle is ready.';
  } catch (error) {
    console.error('Jungle Rush 3D initialization failed:', error);
    $('loadingStatus').textContent = '3D graphics could not start. Try a browser with WebGL enabled.';
    $('world').style.background = 'radial-gradient(ellipse at 50% 40%, #315e3d, #071711 74%)';
    toast('3D graphics unavailable. Enable WebGL or try another browser.');
  }
  setTimeout(() => $('loadingScreen').classList.add('done'), 900);
}

function init() {
  normalizeMissionDates();
  updateWallet();
  bindInput();
  initScene();
  $('pauseBtn').addEventListener('click', openPause);
  animationId = requestAnimationFrame(updateFrame);
  persist();
}

init();
