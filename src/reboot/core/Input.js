/* Reboot input: keyboard + phone touch controls.
 *
 * Keyboard: WASD / arrows to move+steer, E enter/exit vehicle, M mute,
 * Space brake / handbrake.
 * Touch: left-half virtual joystick (created divs #rb-stick > #rb-knob),
 * right-side buttons in #rb-touch with data-action attributes.
 *
 * Module top-level touches NO DOM (node-safe for tests). All DOM access
 * lives inside init()/attach()/destroy(). Pure key mapping is exported
 * as mapKeys(heldSet) for unit tests.
 */

export function mapKeys(held) {
  const has = (...codes) => {
    for (const c of codes) if (held.has(c)) return true;
    return false;
  };
  return {
    forward: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
    steer: (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0),
    brake: has('Space'),
    enter: has('KeyE'),
    mute: has('KeyM'),
  };
}

const clamp1 = (v) => Math.max(-1, Math.min(1, Number(v) || 0));
const STICK_R = 48; // px travel radius for the virtual joystick

export class Input {
  constructor() {
    this.held = new Set();
    this.touchForward = 0;
    this.touchSteer = 0;
    this.touchBrake = false;
    this.touchEnter = false;
    this._prevEnter = false;
    this._prevMute = false;
    this._attached = false;
    // DOM handles, created in attach()
    this._target = null;
    this._stick = null;
    this._knob = null;
    this._touchBox = null;
    this._stickPointerId = null;
    this._stickCX = 0;
    this._stickCY = 0;
  }

  init(opts) {
    return this.attach(opts);
  }

  attach({ target, container } = {}) {
    if (this._attached) return this;
    if (typeof document === 'undefined') return this; // node / test env: stay keyboard-state only
    const tgt = target || (typeof window !== 'undefined' ? window : null);
    const root = container || document.body;
    this._target = tgt;

    if (tgt && tgt.addEventListener) {
      tgt.addEventListener('keydown', this._onKeyDown);
      tgt.addEventListener('keyup', this._onKeyUp);
      tgt.addEventListener('blur', this._onBlur);
      document.addEventListener('visibilitychange', this._onVis);
    }

    // --- left-half virtual joystick ---
    const stick = document.createElement('div');
    stick.id = 'rb-stick';
    stick.setAttribute('aria-label', 'Move joystick');
    Object.assign(stick.style, {
      position: 'fixed', left: '18px', bottom: '18px', width: '120px', height: '120px',
      borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.25)', zIndex: '30', touchAction: 'none',
    });
    const knob = document.createElement('div');
    knob.id = 'rb-knob';
    Object.assign(knob.style, {
      position: 'absolute', left: '50%', top: '50%', width: '52px', height: '52px',
      borderRadius: '50%', background: 'rgba(255,255,255,0.35)',
      transform: 'translate(-50%,-50%)', pointerEvents: 'none',
    });
    stick.appendChild(knob);
    root.appendChild(stick);
    this._stick = stick;
    this._knob = knob;
    stick.addEventListener('pointerdown', this._onStickDown);
    stick.addEventListener('pointermove', this._onStickMove);
    stick.addEventListener('pointerup', this._onStickUp);
    stick.addEventListener('pointercancel', this._onStickUp);

    // --- right-side action buttons ---
    const box = document.createElement('div');
    box.id = 'rb-touch';
    Object.assign(box.style, {
      position: 'fixed', right: '18px', bottom: '18px', display: 'flex',
      flexDirection: 'column', gap: '10px', zIndex: '30',
    });
    for (const action of ['enter', 'brake']) {
      const b = document.createElement('button');
      b.dataset.action = action;
      b.textContent = action === 'enter' ? 'ENTER' : 'BRAKE';
      Object.assign(b.style, {
        width: '84px', height: '56px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)',
        background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', fontWeight: '700',
        touchAction: 'none',
      });
      b.addEventListener('pointerdown', this._onBtnDown);
      b.addEventListener('pointerup', this._onBtnUp);
      b.addEventListener('pointerleave', this._onBtnUp);
      b.addEventListener('pointercancel', this._onBtnUp);
      box.appendChild(b);
    }
    root.appendChild(box);
    this._touchBox = box;

    // Deterministic touch gating: capability APIs only. (Some headless/
    // embedded browsers misreport the pointer:coarse media query, so it
    // is deliberately NOT consulted here.)
    try {
      const touchPoints = typeof navigator !== 'undefined' ? Number(navigator.maxTouchPoints) || 0 : 0;
      const hasTouch = touchPoints > 0 || ('ontouchstart' in (typeof window !== 'undefined' ? window : {}));
      if (!hasTouch) {
        if (this._stick) this._stick.style.display = 'none';
        if (this._touchBox) this._touchBox.style.display = 'none';
      }
    } catch { /* touch UI stays visible; harmless */ }

    this._attached = true;
    return this;
  }

  sample() {
    const k = mapKeys(this.held);
    const forward = clamp1(k.forward + this.touchForward);
    const steer = clamp1(k.steer + this.touchSteer);
    const brake = Boolean(k.brake || this.touchBrake);
    const enterHeld = Boolean(k.enter || this.touchEnter);
    const muteHeld = Boolean(k.mute);
    const enterPressed = enterHeld && !this._prevEnter;
    const mutePressed = muteHeld && !this._prevMute;
    this._prevEnter = enterHeld;
    this._prevMute = muteHeld;
    return { forward, steer, brake, enterPressed, mutePressed };
  }

  destroy() {
    if (this._target && this._target.removeEventListener) {
      this._target.removeEventListener('keydown', this._onKeyDown);
      this._target.removeEventListener('keyup', this._onKeyUp);
      this._target.removeEventListener('blur', this._onBlur);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._onVis);
    }
    if (this._stick) {
      this._stick.removeEventListener('pointerdown', this._onStickDown);
      this._stick.removeEventListener('pointermove', this._onStickMove);
      this._stick.removeEventListener('pointerup', this._onStickUp);
      this._stick.removeEventListener('pointercancel', this._onStickUp);
      this._stick.remove();
      this._stick = null;
      this._knob = null;
    }
    if (this._touchBox) {
      for (const b of this._touchBox.querySelectorAll('button')) {
        b.removeEventListener('pointerdown', this._onBtnDown);
        b.removeEventListener('pointerup', this._onBtnUp);
        b.removeEventListener('pointerleave', this._onBtnUp);
        b.removeEventListener('pointercancel', this._onBtnUp);
      }
      this._touchBox.remove();
      this._touchBox = null;
    }
    this.held.clear();
    this.touchForward = 0;
    this.touchSteer = 0;
    this.touchBrake = false;
    this.touchEnter = false;
    this._attached = false;
  }

  // --- private handlers (arrow fns so removeEventListener works) ---
  _onKeyDown = (e) => {
    if (e && !e.repeat && e.code) this.held.add(e.code);
    if (e && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      if (e.cancelable) e.preventDefault();
    }
  };

  _onKeyUp = (e) => {
    if (e && e.code) this.held.delete(e.code);
  };

  _onBlur = () => {
    this.held.clear();
  };

  _onVis = () => {
    if (typeof document !== 'undefined' && document.hidden) this.held.clear();
  };

  _onStickDown = (e) => {
    if (this._stickPointerId !== null) return;
    this._stickPointerId = e.pointerId;
    const r = this._stick.getBoundingClientRect();
    this._stickCX = r.left + r.width / 2;
    this._stickCY = r.top + r.height / 2;
    if (this._stick.setPointerCapture) {
      try { this._stick.setPointerCapture(e.pointerId); } catch { /* noop */ }
    }
    this._moveStick(e.clientX, e.clientY);
  };

  _onStickMove = (e) => {
    if (e.pointerId !== this._stickPointerId) return;
    this._moveStick(e.clientX, e.clientY);
  };

  _onStickUp = (e) => {
    if (e.pointerId !== undefined && e.pointerId !== this._stickPointerId) return;
    this._stickPointerId = null;
    this.touchForward = 0;
    this.touchSteer = 0;
    if (this._knob) this._knob.style.transform = 'translate(-50%,-50%)';
  };

  _moveStick(px, py) {
    let dx = (px - this._stickCX) / STICK_R;
    let dy = (py - this._stickCY) / STICK_R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    this.touchSteer = clamp1(dx);
    this.touchForward = clamp1(-dy); // up on screen = forward
    if (this._knob) {
      this._knob.style.transform =
        `translate(calc(-50% + ${dx * STICK_R}px), calc(-50% + ${dy * STICK_R}px))`;
    }
  }

  _onBtnDown = (e) => {
    const a = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.action;
    if (a === 'enter') this.touchEnter = true;
    if (a === 'brake') this.touchBrake = true;
    if (e.cancelable) e.preventDefault();
  };

  _onBtnUp = (e) => {
    const a = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.action;
    if (a === 'enter') this.touchEnter = false;
    if (a === 'brake') this.touchBrake = false;
  };
}
