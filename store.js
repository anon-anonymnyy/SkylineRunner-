const KEY = 'skyline_runner_save_v1';

const DEFAULT = {
  coins: 0,
  best: 0,
  owned: ['default'],
  skin: 'default',
  trail: 'none',
  ownedTrails: ['none'],
  gender: 'f',
  sound: true,
  runs: 0,
  totalCoins: 0,
};

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* приватный режим — играем без сохранения */
  }
}

export function get() {
  return data;
}

export function addCoins(n) {
  data.coins += n;
  data.totalCoins += Math.max(0, n);
  save();
}

export function spendCoins(n) {
  if (data.coins < n) return false;
  data.coins -= n;
  save();
  return true;
}

export function setBest(dist) {
  if (dist > data.best) {
    data.best = Math.floor(dist);
    save();
    return true;
  }
  return false;
}

export function buySkin(id, price) {
  if (data.owned.includes(id)) return true;
  if (!spendCoins(price)) return false;
  data.owned.push(id);
  save();
  return true;
}

export function buyTrail(id, price) {
  if (data.ownedTrails.includes(id)) return true;
  if (!spendCoins(price)) return false;
  data.ownedTrails.push(id);
  save();
  return true;
}

export function equipSkin(id) {
  data.skin = id;
  save();
}

export function equipTrail(id) {
  data.trail = id;
  save();
}

export function setGender(g) {
  data.gender = g;
  save();
}

export function resetProgress() {
  data = { ...DEFAULT };
  save();
}
