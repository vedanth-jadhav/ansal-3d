/* Reboot game clock — pure logic, no DOM / no three.js.
 * Convention: hour in [0, 24). 1 game-hour elapses per 300 real seconds. */

export const SECONDS_PER_GAME_HOUR = 300;

export class Clock {
  constructor(hour = 8) {
    this.hour = 0;
    this.setHour(hour);
  }

  setHour(h) {
    const n = Number(h);
    if (!Number.isFinite(n)) throw new Error('Clock.setHour expects a finite number');
    this.hour = ((n % 24) + 24) % 24;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.hour = (this.hour + dt / SECONDS_PER_GAME_HOUR) % 24;
  }
}
