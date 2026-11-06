const MIN_DIST = 26;
const MAX_TIME = 600;
const HOLD_MS = 240;

export class Input {
  constructor(target) {
    this.handlers = {};
    this.startX = 0;
    this.startY = 0;
    this.startT = 0;
    this.holding = false;
    this.holdTimer = null;
    this.enabled = true;

    target.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      this.onDown(t.clientX, t.clientY);
    }, { passive: true });

    target.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      this.onUp(t.clientX, t.clientY);
    }, { passive: true });

    target.addEventListener('touchcancel', () => this.cancel(), { passive: true });

    target.addEventListener('mousedown', (e) => this.onDown(e.clientX, e.clientY));
    target.addEventListener('mouseup', (e) => this.onUp(e.clientX, e.clientY));

    window.addEventListener('keydown', (e) => {
      if (!this.enabled || e.repeat) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') this.fire('up');
      if (e.key === 'ArrowDown' || e.key === 's') this.fire('down');
      if (e.key === 'ArrowLeft' || e.key === 'a') this.fire('left');
      if (e.key === 'ArrowRight' || e.key === 'd') this.fire('right');
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
      this.fire('hold');
    }, HOLD_MS);
  }

  onUp(x, y) {
    if (!this.enabled) {
      this.cancel();
      return;
    }
    clearTimeout(this.holdTimer);
    this.holding = false;

    const dx = x - this.startX;
    const dy = y - this.startY;
    const dt = performance.now() - this.startT;
    if (dt > MAX_TIME) return;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN_DIST) {
      this.fire('up');
      return;
    }
    if (Math.abs(dy) > Math.abs(dx)) {
      this.fire(dy > 0 ? 'down' : 'up');
    } else {
      this.fire(dx > 0 ? 'right' : 'left');
    }
  }

  cancel() {
    clearTimeout(this.holdTimer);
    this.holding = false;
  }
}
