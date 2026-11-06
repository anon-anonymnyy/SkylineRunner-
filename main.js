import './style.css';
import { Game } from './game.js';
import { Input } from './input.js';
import { UI, Ads, showModal } from './ui.js';
import * as store from './store.js';
import { SKINS } from './config.js';
import { unlockAudio, sfx } from './audio.js';

const canvas = document.getElementById('game');

const ui = new UI();
const game = new Game(canvas, {
  onDeath: (res) => handleDeath(res),
  onCoin: (n) => ui.setHud(game.distance, n, game.combo),
});
const input = new Input(canvas);

let lastResult = null;
let doubled = false;
let runToken = 0;

function applySkin() {
  const d = store.get();
  game.setSkin(SKINS.find((s) => s.id === d.skin) || SKINS[0]);
}

applySkin();

ui.onPlay = () => {
  unlockAudio();
  sfx.ui();
  runToken++;
  doubled = false;
  ui.hideAll();
  ui.showHud(true);
  ui.setHud(0, 0, 0);
  game.start();
};

ui.onRestart = () => { sfx.ui(); ui.onPlay(); };

ui.onMenu = () => {
  sfx.ui();
  runToken++;
  game.state = 'menu';
  game.world.reset();
  game.player.reset(120, 470);
  game.camX = 0;
  game.distance = 0;
  ui.showMenu();
};

ui.onPause = () => {
  if (game.state === 'running') {
    game.pause();
    showModal({
      title: 'Пауза',
      text: 'Продолжим?',
      ok: 'Продолжить',
      onOk: () => game.resume(),
    });
  }
};

ui.onRevive = async () => {
  sfx.ui();
  const btn = document.getElementById('btn-revive');
  btn.disabled = true;
  const ok = await Ads.showRewarded();
  if (!ok) { btn.disabled = false; return; }
  ui.hideAll();
  ui.showHud(true);
  game.player.dead = false;
  game.player.vy = 0;
  game.player.y = 470;
  game.player.sliding = 0;
  game.player.slideLock = 0;
  game.state = 'running';
  game.last = performance.now();
  for (const o of game.world.obstacles) {
    if (o.x > game.player.x - 100 && o.x < game.player.x + 700) {
      o.x += 900;
    }
  }
};

ui.onDouble = async () => {
  sfx.ui();
  const btn = document.getElementById('btn-double');
  btn.disabled = true;
  const ok = await Ads.showRewarded();
  if (!ok) { btn.disabled = false; return; }
  if (!doubled && lastResult) {
    store.addCoins(lastResult.coins);
    doubled = true;
  }
  btn.textContent = 'Награда получена ×2';
};

ui.onSkin = () => applySkin();

input
  .on('up', () => game.jump())
  .on('down', () => game.slide())
  .on('hold', () => game.jump());

function handleDeath(res) {
  lastResult = { ...res };
  store.addCoins(res.coins);
  const isBest = store.setBest(res.distance);
  store.setBestCombo(game.combo);
  store.get().runs += 1;
  store.save();

  const token = runToken;
  setTimeout(() => {
    if (token !== runToken) return;
    if (game.state !== 'dead') return;
    if (game.deathId !== res.deathId) return;
    ui.showGameover({ distance: res.distance, coins: res.coins, combo: game.combo, isBest });
  }, 700);
}

setInterval(() => {
  if (game.state === 'running') {
    ui.setHud(game.distance, game.coinsRun, game.combo);
  }
}, 100);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'running') game.pause();
});

game.last = performance.now();
game.loop(performance.now());
ui.showMenu();

window.__game = game;
