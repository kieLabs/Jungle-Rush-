export const SAVE_KEY = 'gamerkie_jungle_rush_save_v1';

export const CHARACTERS = [
  { id: 'trailblazer', name: 'Kai', title: 'Temple Scout', price: 0, currency: 'coins', ability: 'Balanced runner', color: '#d9a16d', outfit: '#1f9b79' },
  { id: 'mira', name: 'Mira', title: 'Jungle Guardian', price: 900, currency: 'coins', ability: '+8% gem attraction', color: '#efb58b', outfit: '#e64d82' },
  { id: 'ravi', name: 'Ravi', title: 'Relic Hunter', price: 1500, currency: 'coins', ability: '+1 bonus coin every fifth coin', color: '#a96f4b', outfit: '#e4a52c' },
  { id: 'nyx', name: 'Nyx', title: 'Shadow Runner', price: 35, currency: 'gems', ability: 'Longer shield', color: '#d1a27c', outfit: '#6556b8' },
  { id: 'tala', name: 'Tala', title: 'River Nomad', price: 2200, currency: 'coins', ability: '+10% magnet duration', color: '#8c5f43', outfit: '#25a9b3' },
  { id: 'leo', name: 'Leo', title: 'Sun Chaser', price: 55, currency: 'gems', ability: '+10% score', color: '#e8b18b', outfit: '#cf6734' },
  { id: 'zara', name: 'Zara', title: 'Mystic Scholar', price: 3600, currency: 'coins', ability: '+1 starting gem bonus', color: '#d9aa91', outfit: '#a63db3' },
  { id: 'atlas', name: 'Atlas', title: 'Ancient Champion', price: 100, currency: 'gems', ability: 'One free shield per run', color: '#a87555', outfit: '#526d83' }
];

export const POWERUPS = {
  magnet: { name: 'Coin Magnet', icon: '🧲', duration: 9, description: 'Attract nearby coins.' },
  speed: { name: 'Speed Boost', icon: '⚡', duration: 5, description: 'Burst forward with a score bonus.' },
  shield: { name: 'Shield', icon: '🛡️', duration: 12, description: 'Absorb one collision.' },
  megaJump: { name: 'Mega Jump', icon: '🪽', duration: 8, description: 'Jump higher and clear hazards.' },
  multiplier: { name: 'Coin Multiplier', icon: '✖️2', duration: 10, description: 'Double coin rewards.' },
  gemBonus: { name: 'Gem Bonus', icon: '💎', duration: 12, description: 'Rare gems appear more often.' },
  invincible: { name: 'Invincibility', icon: '✨', duration: 6, description: 'Ignore collisions temporarily.' },
  score: { name: 'Score Booster', icon: '🏆', duration: 12, description: 'Increase score gain.' },
  headStart: { name: 'Head Start', icon: '🚀', duration: 0, description: 'Start the next run farther ahead.' },
  resurrection: { name: 'Resurrection', icon: '💫', duration: 0, description: 'Stores a one-use revive.' }
};

export const UPGRADE_DEFS = {
  magnetDuration: { name: 'Coin Magnet', max: 6, currency: 'coins', base: 350, growth: 1.58, description: 'Longer coin attraction.' },
  shieldDuration: { name: 'Shield', max: 6, currency: 'coins', base: 450, growth: 1.62, description: 'Longer protection window.' },
  speedDuration: { name: 'Speed Boost', max: 6, currency: 'coins', base: 500, growth: 1.62, description: 'Longer speed burst.' },
  multiplierDuration: { name: 'Coin Multiplier', max: 6, currency: 'coins', base: 550, growth: 1.65, description: 'Double coins for longer.' },
  megaJumpDuration: { name: 'Mega Jump', max: 6, currency: 'coins', base: 400, growth: 1.58, description: 'Extended mega-jump effect.' },
  startingBoost: { name: 'Starting Boost', max: 5, currency: 'coins', base: 650, growth: 1.75, description: 'Start each run with extra distance.' },
  gemBonus: { name: 'Gem Bonus', max: 5, currency: 'gems', base: 5, growth: 1.8, description: 'Improve rare gem chances.' },
  specialAbility: { name: 'Relic Mastery', max: 5, currency: 'gems', base: 8, growth: 1.85, description: 'Improve your selected hero ability.' }
};

export const DAILY_REWARD_CYCLE = [
  { label: '120 Coins', type: 'coins', amount: 120, icon: '🪙' },
  { label: '180 Coins', type: 'coins', amount: 180, icon: '🪙' },
  { label: '3 Gems', type: 'gems', amount: 3, icon: '💎' },
  { label: 'Magnet Booster', type: 'booster', amount: 'magnet', icon: '🧲' },
  { label: '250 Coins', type: 'coins', amount: 250, icon: '🪙' },
  { label: '2 Ancient Tokens', type: 'tokens', amount: 2, icon: '🏵️' },
  { label: 'Treasure Chest', type: 'chest', amount: 1, icon: '🎁' }
];

const DEFAULT_UPGRADES = Object.fromEntries(Object.keys(UPGRADE_DEFS).map(key => [key, 1]));

export const DEFAULT_SAVE = {
  version: 1,
  coins: 0,
  gems: 0,
  tokens: 0,
  reviveTokens: 0,
  boosters: { magnet: 0, shield: 0, speed: 0, megaJump: 0, multiplier: 0, gemBonus: 0, invincible: 0, score: 0, headStart: 0, resurrection: 0 },
  bestScore: 0,
  bestDistance: 0,
  totalRuns: 0,
  totalDistance: 0,
  totalCoinsCollected: 0,
  totalGemsCollected: 0,
  totalTokensCollected: 0,
  totalChestsOpened: 0,
  totalJumps: 0,
  totalSlides: 0,
  totalPowerUps: 0,
  unlockedCharacters: ['trailblazer'],
  selectedCharacter: 'trailblazer',
  selectedOutfit: 'default',
  unlockedOutfits: ['default'],
  upgrades: DEFAULT_UPGRADES,
  purchasedItems: [],
  dailyClaimDate: '',
  dailyStreak: 0,
  lastLoginDate: '',
  dailyMissionDate: '',
  dailyMissionProgress: {},
  weeklyMissionWeek: '',
  weeklyMissionProgress: {},
  claimedMissionRewards: [],
  achievements: {},
  settings: {
    music: true,
    sound: true,
    musicVolume: 0.45,
    soundVolume: 0.7,
    quality: 'high',
    sensitivity: 1,
    language: 'en',
    vibration: true,
    performanceMode: false
  }
};

const asNumber = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);

export function sanitizeSave(raw) {
  const source = isRecord(raw) ? raw : {};
  const out = structuredClone(DEFAULT_SAVE);
  for (const key of ['coins', 'gems', 'tokens', 'reviveTokens', 'bestScore', 'bestDistance', 'totalRuns', 'totalDistance', 'totalCoinsCollected', 'totalGemsCollected', 'totalTokensCollected', 'totalChestsOpened', 'totalJumps', 'totalSlides', 'totalPowerUps', 'dailyStreak']) {
    out[key] = asNumber(source[key], out[key]);
  }
  for (const key of ['dailyClaimDate', 'lastLoginDate', 'dailyMissionDate', 'weeklyMissionWeek', 'selectedOutfit']) {
    out[key] = typeof source[key] === 'string' ? source[key].slice(0, 32) : out[key];
  }
  out.unlockedCharacters = Array.isArray(source.unlockedCharacters)
    ? [...new Set(source.unlockedCharacters.filter(id => CHARACTERS.some(c => c.id === id)))]
    : [...DEFAULT_SAVE.unlockedCharacters];
  if (!out.unlockedCharacters.includes('trailblazer')) out.unlockedCharacters.unshift('trailblazer');
  out.selectedCharacter = out.unlockedCharacters.includes(source.selectedCharacter) ? source.selectedCharacter : 'trailblazer';
  out.unlockedOutfits = Array.isArray(source.unlockedOutfits) ? [...new Set(source.unlockedOutfits.filter(v => typeof v === 'string').slice(0, 50))] : ['default'];
  if (!out.unlockedOutfits.includes('default')) out.unlockedOutfits.unshift('default');
  out.upgrades = { ...DEFAULT_UPGRADES };
  if (isRecord(source.upgrades)) {
    for (const [key, def] of Object.entries(UPGRADE_DEFS)) out.upgrades[key] = Math.floor(asNumber(source.upgrades[key], 1, 1, def.max));
  }
  out.boosters = { ...DEFAULT_SAVE.boosters };
  if (isRecord(source.boosters)) {
    for (const key of Object.keys(out.boosters)) out.boosters[key] = Math.floor(asNumber(source.boosters[key], 0, 0, 999));
  }
  out.purchasedItems = Array.isArray(source.purchasedItems) ? [...new Set(source.purchasedItems.filter(v => typeof v === 'string').slice(0, 200))] : [];
  out.claimedMissionRewards = Array.isArray(source.claimedMissionRewards) ? [...new Set(source.claimedMissionRewards.filter(v => typeof v === 'string').slice(-200))] : [];
  out.achievements = isRecord(source.achievements) ? source.achievements : {};
  out.dailyMissionProgress = isRecord(source.dailyMissionProgress) ? source.dailyMissionProgress : {};
  out.weeklyMissionProgress = isRecord(source.weeklyMissionProgress) ? source.weeklyMissionProgress : {};
  if (isRecord(source.settings)) {
    out.settings = {
      ...out.settings,
      music: source.settings.music !== false,
      sound: source.settings.sound !== false,
      musicVolume: asNumber(source.settings.musicVolume, out.settings.musicVolume, 0, 1),
      soundVolume: asNumber(source.settings.soundVolume, out.settings.soundVolume, 0, 1),
      quality: ['low', 'medium', 'high'].includes(source.settings.quality) ? source.settings.quality : out.settings.quality,
      sensitivity: asNumber(source.settings.sensitivity, 1, 0.5, 2),
      language: typeof source.settings.language === 'string' ? source.settings.language.slice(0, 8) : 'en',
      vibration: source.settings.vibration !== false,
      performanceMode: source.settings.performanceMode === true
    };
  }
  return out;
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    return sanitizeSave(raw ? JSON.parse(raw) : DEFAULT_SAVE);
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function persistSave(save, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(sanitizeSave(save)));
    return true;
  } catch {
    return false;
  }
}

export function createRun(mode = 'classic') {
  return {
    mode,
    distance: 0,
    score: 0,
    coins: 0,
    gems: 0,
    tokens: 0,
    jumps: 0,
    slides: 0,
    powerUps: 0,
    obstaclesAvoided: 0,
    revives: 0,
    startedAt: Date.now(),
    elapsed: 0,
    activePowerUps: {},
    shieldHits: 0,
    nearMisses: 0,
    objective: null,
    finished: false
  };
}

export function scoreRun({ distance = 0, coins = 0, gems = 0, tokens = 0, multiplier = 1, bonus = 0 }) {
  return Math.max(0, Math.floor((distance * 1.2 + coins * 8 + gems * 80 + tokens * 35 + bonus) * Math.max(1, multiplier)));
}

export function applyCollection(save, run, type, amount = 1, effects = {}) {
  const quantity = Math.max(1, Math.floor(asNumber(amount, 1, 1, 100)));
  let reward = quantity;
  if (type === 'coin') {
    reward *= effects.coinMultiplier ? 2 : 1;
    run.coins += quantity;
    save.coins += reward;
    save.totalCoinsCollected += quantity;
  } else if (type === 'gem') {
    run.gems += quantity;
    save.gems += reward;
    save.totalGemsCollected += quantity;
  } else if (type === 'token') {
    run.tokens += quantity;
    save.tokens += reward;
    save.totalTokensCollected += quantity;
  } else if (type === 'revive') {
    save.reviveTokens += quantity;
  } else {
    return { reward: 0, type: 'unknown' };
  }
  return { reward, type };
}

export function getRunSpeed(distance) {
  return Math.min(39, 18 + Math.sqrt(Math.max(0, distance)) * 0.33);
}

export function getUpgradeCost(id, level) {
  const def = UPGRADE_DEFS[id];
  if (!def || level >= def.max) return null;
  return Math.floor(def.base * Math.pow(def.growth, Math.max(0, level - 1)));
}

export function buyUpgrade(save, id) {
  const def = UPGRADE_DEFS[id];
  if (!def) return { ok: false, reason: 'unknown' };
  const level = save.upgrades[id] || 1;
  const cost = getUpgradeCost(id, level);
  if (cost === null) return { ok: false, reason: 'max' };
  if (save[def.currency] < cost) return { ok: false, reason: 'funds', cost };
  save[def.currency] -= cost;
  save.upgrades[id] = level + 1;
  return { ok: true, level: level + 1, cost };
}

export function buyCharacter(save, id) {
  const character = CHARACTERS.find(c => c.id === id);
  if (!character || save.unlockedCharacters.includes(id)) return { ok: false, reason: 'unavailable' };
  if (save[character.currency] < character.price) return { ok: false, reason: 'funds', cost: character.price };
  save[character.currency] -= character.price;
  save.unlockedCharacters.push(id);
  return { ok: true, character };
}

export function selectCharacter(save, id) {
  if (!save.unlockedCharacters.includes(id)) return false;
  if (!CHARACTERS.some(c => c.id === id)) return false;
  save.selectedCharacter = id;
  return true;
}

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function claimDailyReward(save, dateKey = localDateKey()) {
  if (save.dailyClaimDate === dateKey) return { ok: false, reason: 'claimed' };
  const prior = save.lastLoginDate;
  if (prior) {
    const [py, pm, pd] = prior.split('-').map(Number);
    const [ny, nm, nd] = dateKey.split('-').map(Number);
    const gap = Math.round((Date.UTC(ny, nm - 1, nd) - Date.UTC(py, pm - 1, pd)) / 86400000);
    save.dailyStreak = gap === 1 ? save.dailyStreak + 1 : 1;
  } else save.dailyStreak = 1;
  save.lastLoginDate = dateKey;
  save.dailyClaimDate = dateKey;
  const index = (save.dailyStreak - 1) % DAILY_REWARD_CYCLE.length;
  const reward = DAILY_REWARD_CYCLE[index];
  if (reward.type === 'coins' || reward.type === 'gems' || reward.type === 'tokens') save[reward.type] += reward.amount;
  if (reward.type === 'booster') save.boosters[reward.amount] = (save.boosters[reward.amount] || 0) + 1;
  if (reward.type === 'chest') {
    save.coins += 400;
    save.gems += 2;
  }
  return { ok: true, reward, streak: save.dailyStreak };
}

const DAILY_POOL = [
  { id: 'daily-coins', title: 'Coin Trail', description: 'Collect coins in any run.', type: 'coins', target: 35, reward: { coins: 180 } },
  { id: 'daily-distance', title: 'Jungle Miles', description: 'Run a total distance.', type: 'distance', target: 900, reward: { coins: 220 } },
  { id: 'daily-jumps', title: 'Leap of Faith', description: 'Jump over the ancient traps.', type: 'jumps', target: 12, reward: { gems: 2 } },
  { id: 'daily-slides', title: 'Low Profile', description: 'Slide beneath jungle hazards.', type: 'slides', target: 10, reward: { coins: 160 } },
  { id: 'daily-gems', title: 'Gem Seeker', description: 'Find rare magic gems.', type: 'gems', target: 2, reward: { tokens: 1 } },
  { id: 'daily-powerups', title: 'Power Surge', description: 'Activate power-ups.', type: 'powerUps', target: 3, reward: { coins: 200 } },
  { id: 'daily-run-coins', title: 'Golden Run', description: 'Collect coins in one run.', type: 'singleRunCoins', target: 80, reward: { gems: 3 } },
  { id: 'daily-survivor', title: 'Survivor', description: 'Reach the target distance in a run.', type: 'singleRunDistance', target: 1400, reward: { tokens: 2 } },
  { id: 'daily-tokens', title: 'Ancient Sign', description: 'Collect ancient tokens.', type: 'tokens', target: 1, reward: { coins: 250 } }
];

export function getDailyMissions(dateKey = localDateKey()) {
  const seed = dateKey.split('-').reduce((sum, n) => sum + Number(n), 0);
  return [0, 1, 2].map(offset => ({ ...DAILY_POOL[(seed + offset * 3) % DAILY_POOL.length], reward: { ...DAILY_POOL[(seed + offset * 3) % DAILY_POOL.length].reward } }));
}

export function getRunObjectiveProgress(run, objectiveType) {
  const field = ({ singleRunCoins: 'coins', singleRunDistance: 'distance' })[objectiveType] || objectiveType;
  const supported = ['distance', 'coins', 'gems', 'jumps', 'slides', 'powerUps', 'tokens'];
  if (!supported.includes(field)) return null;
  const value = Number(run?.[field]);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function updateMissionProgress(mission, delta) {
  const next = { ...mission };
  next.progress = Math.min(next.target, Math.max(0, (Number(next.progress) || 0) + Math.max(0, Number(delta) || 0)));
  next.done = next.progress >= next.target;
  return next;
}

export function getWeeklyMissions(date = new Date()) {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  const week = localDateKey(start);
  return {
    week,
    missions: [
      { id: 'weekly-distance', title: 'Pathfinder', description: 'Travel a total of 12,000 m.', type: 'distance', target: 12000, reward: { gems: 8 } },
      { id: 'weekly-coins', title: 'Golden Hoard', description: 'Collect 1,500 coins.', type: 'coins', target: 1500, reward: { coins: 1800 } },
      { id: 'weekly-runs', title: 'Never Give Up', description: 'Complete 12 runs.', type: 'runs', target: 12, reward: { tokens: 8 } }
    ]
  };
}

export function canRevive(run, limit = 1) {
  return Boolean(run && run.revives < limit && !run.finished);
}

export function activatePowerUp(run, id, now = Date.now(), upgrades = {}) {
  const def = POWERUPS[id];
  if (!def) return null;
  if (id === 'headStart' || id === 'resurrection') return { id, until: now, duration: 0 };
  const upgradeKey = ({ magnet: 'magnetDuration', shield: 'shieldDuration', speed: 'speedDuration', multiplier: 'multiplierDuration', megaJump: 'megaJumpDuration', gemBonus: 'gemBonus' })[id];
  const level = upgradeKey ? (upgrades[upgradeKey] || 1) : 1;
  const characterBonus = 1;
  const duration = def.duration * (1 + (level - 1) * 0.12) * characterBonus;
  const until = now + duration * 1000;
  run.activePowerUps[id] = until;
  return { id, until, duration };
}

export function isPowerUpActive(run, id, now = Date.now()) {
  return (run?.activePowerUps?.[id] || 0) > now;
}

export function updateDailyLogin(save, dateKey = localDateKey()) {
  if (save.lastLoginDate === dateKey) return { claimed: false, streak: save.dailyStreak };
  return claimDailyReward(save, dateKey);
}

export function randomChestReward(save, random = Math.random) {
  const roll = random();
  if (roll < 0.68) {
    const amount = 220 + Math.floor(random() * 181);
    save.coins += amount;
    return { type: 'coins', amount };
  }
  if (roll < 0.88) {
    const amount = 2 + Math.floor(random() * 3);
    save.gems += amount;
    return { type: 'gems', amount };
  }
  if (roll < 0.96) {
    save.tokens += 2;
    return { type: 'tokens', amount: 2 };
  }
  save.reviveTokens += 1;
  return { type: 'revive', amount: 1 };
}
