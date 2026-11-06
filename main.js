import './style.css';
import { Game } from './game.js';
import { Input } from './input.js';
import { UI, Ads, showModal } from './ui.js';
import * as store from './store.js';
import { SKINS } from './config.js';
import { unlockAudio, sfx } from './audio.js';

const canvas = document.getElementById('game');

const lowEnd = (navigator.deviceMemory || 4) <= 3;

const ui = new UI();
const game = new Game(canvas, {
  bloom: !lowEnd,
  onDeath: (res) => handleDeath(res),
  onCoin: (n) => {
    ui.setHud(game.distance, n);
    ui.coinBurst();
  },
});
const input = new Input(canvas);

let gender = store.get().gender;
let lastResult = null;
let doubled = false;
let runToken = 0;

function applyLook() {
  const d = store.get();
  game.applySkin(SKINS.find((s) => s.id === d.skin) || SKINS[0]);
  game.player.setGender(gender);
}

applyLook();

ui.onPlay = () => {
  unlockAudio();
  sfx.ui();
  runToken++;
  doubled = false;
  ui.hideAll();
  ui.showHud(true);
  ui.setHud(0, 0);
  game.start();
};

ui.onRestart = () => {
  sfx.ui();
  ui.onPlay();
};

ui.onMenu = () => {
  sfx.ui();
  runToken++;
  game.state = 'menu';
  game.world.reset();
  game.player.reset();
  game.distance = 0;
  ui.showMenu();
};

ui.onRevive = async () => {
  sfx.ui();
  const btn = document.getElementById('btn-revive');
  btn.disabled = true;
  const ok = await Ads.showRewarded();
  if (!ok) {
    btn.disabled = false;
    return;
  }
  ui.hideAll();
  ui.showHud(true);
  game.revive();
};

ui.onDouble = async () => {
  sfx.ui();
  const btn = document.getElementById('btn-double');
  btn.disabled = true;
  const ok = await Ads.showRewarded();
  if (!ok) {
    btn.disabled = false;
    return;
  }
  if (!doubled && lastResult) {
    store.addCoins(lastResult.coins);
    doubled = true;
  }
  document.getElementById('btn-double').textContent = 'Награда получена ×2';
};

ui.onSkin = () => applyLook();

ui.onGender = (g) => {
  gender = g;
  game.player.setGender(g);
};

document.getElementById('pause-btn').onclick = () => {
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

input
  .on('swipeLeft', () => game.moveLane(-1))
  .on('swipeRight', () => game.moveLane(1))
  .on('swipeUp', () => game.jump())
  .on('swipeDown', () => game.slide())
  .on('holdStart', () => game.grappleStart())
  .on('holdEnd', () => game.grappleEnd())
  .on('tap', () => game.jump());

function handleDeath(res) {
  lastResult = { ...res };
  store.addCoins(res.coins);
  const isBest = store.setBest(res.distance);
  store.get().runs += 1;
  store.save();

  const token = runToken;
  setTimeout(() => {
    if (token !== runToken) return;
    if (game.state !== 'dead') return;
    if (game.deathId !== res.deathId) return;
    ui.showGameover({ distance: res.distance, coins: res.coins, isBest });
  }, 750);
}

setInterval(() => {
  if (game.state === 'running') {
    ui.setHud(game.distance, game.coinsRun);
  }
}, 100);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'running') game.pause();
});

game.onFrame();
ui.showMenu();

window.__game = game;
