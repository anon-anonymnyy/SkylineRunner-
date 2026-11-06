const MIN_DIST = 26;
const MAX_TIME = 600;
const HOLD_MS = 130;

export class Input {
  constructor(target) {
    this.handlers = {};
    this.startX = 0;
    this.startY = 0;
    this.startT = 0;
    this.holding = false;
    this.holdTimer = null;
    this.enabled = true;

    target.addEventListener('touchstart', (e) => this.onDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    target.addEventListener('touchend', (e) => this.onUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY), { passive: true });
    target.addEventListener('touchcancel', () => this.cancel(), { passive: true });

    target.addEventListener('mousedown', (e) => this.onDown(e.clientX, e.clientY));
    target.addEventListener('mouseup', (e) => this.onUp(e.clientX, e.clientY));

    window.addEventListener('keydown', (e) => {
      if (!this.enabled || e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') this.fire('swipeLeft');
      if (e.key === 'ArrowRight' || e.key === 'd') this.fire('swipeRight');
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') this.fire('swipeUp');
      if (e.key === 'ArrowDown' || e.key === 's') this.fire('swipeDown');
      if (e.key === 'Shift') this.holdStart();
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.holdEnd();
    });
  }

  on(name, fn) {
    this.handlers[name] = fn;
    return this;
  }

  fire(name) {
    const fn = this.handlers[name];
    if (fn) fn();
  }

  onDown(x, y) {
    if (!this.enabled) return;
    this.startX = x;
    this.startY = y;
    this.startT = performance.now();
    this.holdTimer = setTimeout(() => {
      this.holding = true;
      this.fire('holdStart');
    }, HOLD_MS);
  }

  onUp(x, y) {
    if (!this.enabled) {
      this.cancel();
      return;
    }
    clearTimeout(this.holdTimer);
    if (this.holding) {
      this.holding = false;
      this.fire('holdEnd');
      return;
    }
    const dx = x - this.startX;
    const dy = y - this.startY;
    const dt = performance.now() - this.startT;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (dt > MAX_TIME) return;

    if (Math.max(adx, ady) < MIN_DIST) {
      this.fire('tap');
      return;
    }
    if (adx > ady) {
      this.fire(dx > 0 ? 'swipeRight' : 'swipeLeft');
    } else {
      this.fire(dy > 0 ? 'swipeDown' : 'swipeUp');
    }
  }

  cancel() {
    clearTimeout(this.holdTimer);
    if (this.holding) {
      this.holding = false;
      this.fire('holdEnd');
    }
  }

  holdStart() {
    this.holding = true;
    this.fire('holdStart');
  }

  holdEnd() {
    if (this.holding) {
      this.holding = false;
      this.fire('holdEnd');
    }
  }
}
