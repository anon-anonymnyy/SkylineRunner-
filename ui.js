import * as store from './store.js';
import { SKINS, TRAILS } from './config.js';
import { sfx } from './audio.js';

export const Ads = {
  async showRewarded() {
    return await new Promise((resolve) => {
      showModal({
        title: 'Здесь будет реклама',
        text: 'В опубликованной версии тут откроется ролик с наградой. Нажимай «Получить награду», чтобы проверить механику.',
        ok: 'Получить награду',
        onOk: () => resolve(true),
        cancel: 'Пропустить',
        onCancel: () => resolve(false),
      });
    });
  },
};

let modalEl = null;

export function showModal({ title, text, ok = 'Ок', cancel, onOk, onCancel }) {
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.className = 'modal-backdrop';
    modalEl.innerHTML = `
      <div class="modal">
        <div class="modal-title"></div>
        <div class="modal-text"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost modal-cancel"></button>
          <button class="btn btn-primary modal-ok"></button>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
  }
  const okBtn = modalEl.querySelector('.modal-ok');
  const cancelBtn = modalEl.querySelector('.modal-cancel');

  modalEl.querySelector('.modal-title').textContent = title;
  modalEl.querySelector('.modal-text').textContent = text;
  okBtn.textContent = ok;
  cancelBtn.textContent = cancel || '';
  cancelBtn.style.display = cancel ? '' : 'none';

  const close = (fn) => {
    modalEl.classList.remove('show');
    okBtn.onclick = null;
    cancelBtn.onclick = null;
    if (fn) fn();
  };

  okBtn.onclick = () => {
    sfx.ui();
    close(onOk);
  };
  cancelBtn.onclick = () => {
    sfx.ui();
    close(onCancel);
  };

  requestAnimationFrame(() => modalEl.classList.add('show'));
}

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class UI {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      dist: document.getElementById('dist'),
      coins: document.getElementById('coins'),
      menu: document.getElementById('menu'),
      gameover: document.getElementById('gameover'),
      shop: document.getElementById('shop'),
      settings: document.getElementById('settings'),
      finalDist: document.getElementById('final-dist'),
      finalCoins: document.getElementById('final-coins'),
      bestLine: document.getElementById('best-line'),
      shopCoins: document.getElementById('shop-coins'),
      skinList: document.getElementById('skin-list'),
      trailList: document.getElementById('trail-list'),
      coinPop: document.getElementById('coin-pop'),
    };

    this.soundsEnabled = store.get().sound;

    document.getElementById('btn-play').onclick = () => this.onPlay && this.onPlay();
    document.getElementById('btn-shop').onclick = () => this.openShop();
    document.getElementById('btn-settings').onclick = () => this.openSettings();
    document.getElementById('btn-shop-back').onclick = () => this.closeShop();
    document.getElementById('btn-settings-back').onclick = () => this.closeSettings();

    document.getElementById('btn-revive').onclick = () => this.onRevive && this.onRevive();
    document.getElementById('btn-double').onclick = () => this.onDouble && this.onDouble();
    document.getElementById('btn-restart').onclick = () => this.onRestart && this.onRestart();
    document.getElementById('btn-menu').onclick = () => this.onMenu && this.onMenu();

    document.getElementById('gender-f').onclick = () => this.setGender('f');
    document.getElementById('gender-m').onclick = () => this.setGender('m');

    document.getElementById('btn-sound').onclick = () => {
      this.soundsEnabled = !this.soundsEnabled;
      store.get().sound = this.soundsEnabled;
      store.save();
      this.refreshSettings();
      sfx.ui();
    };
    document.getElementById('btn-reset').onclick = () => {
      showModal({
        title: 'Сбросить прогресс?',
        text: 'Монеты, рекорд и купленные скины удалятся.',
        ok: 'Сбросить',
        cancel: 'Отмена',
        onOk: () => {
          store.resetProgress();
          this.refreshMenu();
          this.renderShop();
          this.refreshSettings();
        },
      });
    };

    this.refreshMenu();
    this.refreshSettings();
    this.renderShop();
  }

  setGender(g) {
    store.setGender(g);
    this.refreshMenu();
    sfx.ui();
    if (this.onGender) this.onGender(g);
  }

  refreshMenu() {
    const d = store.get();
    document.getElementById('best-value').textContent = d.best;
    document.getElementById('wallet-value').textContent = d.coins;
    document.getElementById('gender-f').classList.toggle('active', d.gender === 'f');
    document.getElementById('gender-m').classList.toggle('active', d.gender === 'm');
  }

  refreshSettings() {
    document.getElementById('btn-sound').textContent = this.soundsEnabled ? 'Звук: вкл' : 'Звук: выкл';
  }

  setHud(dist, coins) {
    this.el.dist.textContent = Math.floor(dist);
    this.el.coins.textContent = coins;
  }

  showHud(show) {
    this.el.hud.classList.toggle('show', show);
  }

  showMenu() {
    this.hideAll();
    this.refreshMenu();
    this.el.menu.classList.add('show');
    this.showHud(false);
  }

  showGameover(result) {
    this.hideAll();
    this.el.gameover.classList.add('show');
    this.el.finalDist.textContent = result.distance;
    this.el.finalCoins.textContent = result.coins;
    this.el.bestLine.textContent = `Рекорд: ${store.get().best} м`;
    this.showHud(false);
    document.getElementById('btn-revive').disabled = false;
    const dbtn = document.getElementById('btn-double');
    dbtn.textContent = 'Удвоить за рекламу';
    dbtn.disabled = false;
  }

  hideAll() {
    for (const key of ['menu', 'gameover', 'shop', 'settings']) {
      this.el[key].classList.remove('show');
    }
  }

  openShop() {
    this.hideAll();
    this.renderShop();
    this.el.shop.classList.add('show');
    sfx.ui();
  }

  closeShop() {
    this.showMenu();
    sfx.ui();
  }

  openSettings() {
    this.hideAll();
    this.refreshSettings();
    this.el.settings.classList.add('show');
    sfx.ui();
  }

  closeSettings() {
    this.showMenu();
    sfx.ui();
  }

  renderShop() {
    const d = store.get();
    this.el.shopCoins.textContent = d.coins;

    this.el.skinList.innerHTML = '';
    for (const s of SKINS) {
      const owned = d.owned.includes(s.id);
      const active = d.skin === s.id;
      const card = document.createElement('button');
      card.className = 'item' + (active ? ' item-active' : '');
      card.innerHTML = `
        <div class="swatch" style="background:linear-gradient(135deg,${hex(s.suit)},${hex(s.trim)})"></div>
        <div class="item-name">${s.name}</div>
        <div class="item-price">${active ? 'Выбрано' : owned ? 'Надеть' : s.price + ' монет'}</div>
      `;
      card.onclick = () => {
        if (!owned && !store.buySkin(s.id, s.price)) {
          sfx.hit();
          this.toast('Не хватает монет');
          return;
        }
        store.equipSkin(s.id);
        if (this.onSkin) this.onSkin(s.id);
        sfx.ui();
        this.renderShop();
        this.refreshMenu();
      };
      this.el.skinList.appendChild(card);
    }

    this.el.trailList.innerHTML = '';
    for (const t of TRAILS) {
      const owned = d.ownedTrails.includes(t.id);
      const active = d.trail === t.id;
      const card = document.createElement('button');
      card.className = 'item' + (active ? ' item-active' : '');
      const swatch = t.id === 'rainbow' ? 'linear-gradient(90deg,#ff8fb1,#ffd27a,#4fc3c7)' : hex(t.color);
      card.innerHTML = `
        <div class="swatch" style="background:${swatch}"></div>
        <div class="item-name">${t.name}</div>
        <div class="item-price">${active ? 'Выбрано' : owned ? 'Надеть' : t.price + ' монет'}</div>
      `;
      card.onclick = () => {
        if (!owned && !store.buyTrail(t.id, t.price)) {
          sfx.hit();
          this.toast('Не хватает монет');
          return;
        }
        store.equipTrail(t.id);
        sfx.ui();
        this.renderShop();
        this.refreshMenu();
      };
      this.el.trailList.appendChild(card);
    }
  }

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
  }

  coinBurst() {
    const el = this.el.coinPop;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
}
