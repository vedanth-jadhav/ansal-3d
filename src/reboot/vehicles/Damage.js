/* Pure damage model. No three.js. body: 1 = intact -> 0 = wrecked.
 * Cars stay drivable at any damage; top speed is scaled by the consumer via
 * damageAmount() (0..1), wired into CarPhysics step() opts.damage. */

export const SMOKE_BELOW = 0.4; // body < 0.4 -> smoke flag

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function createDamage() {
  return { body: 1 };
}

/* Impact bands by closing speed (m/s). Returns the mutated record. */
export function addImpact(dmg, speedMps) {
  const v = Math.abs(speedMps ?? 0);
  let harm = 0;
  if (v < 3) harm = 0;
  else if (v < 6) harm = 0.05; // parking scrape
  else if (v < 10) harm = 0.12; // street bump
  else if (v < 15) harm = 0.22; // hard crash
  else harm = 0.35; // highway wreck
  dmg.body = clamp01((dmg.body ?? 1) - harm);
  return dmg;
}

export function isSmoking(dmg) {
  return (dmg.body ?? 1) < SMOKE_BELOW;
}

/* 0..1 drive-damage for CarPhysics opts.damage. */
export function damageAmount(dmg) {
  return clamp01(1 - (dmg.body ?? 1));
}

export function isWrecked(dmg) {
  return (dmg.body ?? 1) <= 0;
}
