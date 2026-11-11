'use strict';
/* Node unit tests for ips-calculator-bd sizing math.
 * Run: node --test tests/test.js
 * All expected values are hand-computed; see TEST_RESULTS.md. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../app.js');

const approx = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

/* --- totalWatts --- */
test('totalWatts: empty load is 0', () => assert.equal(M.totalWatts([]), 0));
test('totalWatts: 2x75W fans + 3x12W bulbs = 186W', () => {
  assert.equal(M.totalWatts([{ watts: 75, qty: 2 }, { watts: 12, qty: 3 }]), 186);
});
test('totalWatts: quick setups (basic 196 / office 174 / full 1382)', () => {
  assert.equal(M.totalWatts([{ watts: 75, qty: 2 }, { watts: 12, qty: 3 }, { watts: 10, qty: 1 }]), 196);
  assert.equal(M.totalWatts([{ watts: 65, qty: 1 }, { watts: 10, qty: 1 }, { watts: 12, qty: 2 }, { watts: 75, qty: 1 }]), 174);
  assert.equal(M.totalWatts([
    { watts: 75, qty: 4 }, { watts: 12, qty: 6 }, { watts: 100, qty: 1 },
    { watts: 150, qty: 1 }, { watts: 10, qty: 1 }, { watts: 750, qty: 1 }
  ]), 1382);
});

/* --- canonical hand-computed case: 300W, 4h, 12V, lead-acid, 85% ---
 * Wh  = 300 x 4 / 0.85        = 1411.7647 -> 1411.8
 * Ah  = 1411.7647 / (12 x .5) = 235.2941  -> 235.3 (rounded UP)
 * VA  = 300 x 1.25 / 0.8      = 468.75    -> 600 (next standard size) */
test('canonical: energyWh(300, 4, 85) = 1411.7647 Wh', () => {
  assert.ok(approx(M.energyWh(300, 4, 85), 1411.7647058823529, 1e-6));
});
test('canonical: batteryAh lead-acid = 235.2941 Ah -> roundUp1 235.3', () => {
  const wh = M.energyWh(300, 4, 85);
  assert.ok(approx(M.batteryAh(wh, 12, 0.5), 235.2941176470588, 1e-6));
  assert.equal(M.roundUp1(M.batteryAh(wh, 12, 0.5)), 235.3);
});
test('canonical: inverterVA(300) = 600', () => assert.equal(M.inverterVA(300), 600));
test('canonical: runtime reverse check 235.3Ah -> 4.0h', () => {
  const rt = M.runtimeHours(235.3, 12, 0.5, 85, 300);
  assert.ok(approx(rt, 4.0001, 1e-3), 'got ' + rt);
  assert.equal(Math.round(rt * 10) / 10, 4.0);
});

/* --- DoD difference: same energy, lead vs lithium --- */
test('DoD: 1200Wh @12V lead = 200Ah, lithium = 125Ah', () => {
  assert.ok(approx(M.batteryAh(1200, 12, 0.5), 200));
  assert.ok(approx(M.batteryAh(1200, 12, 0.8), 125));
});
test('DoD: canonical case lithium needs 147.1Ah (vs 235.3 lead)', () => {
  const wh = M.energyWh(300, 4, 85);
  assert.equal(M.roundUp1(M.batteryAh(wh, 12, 0.8)), 147.1);
});

/* --- full-home sizing: 1382W, 3h, 12V, lead, 85% ---
 * Wh = 1382 x 3 / 0.85 = 4877.647 -> 4877.6
 * Ah = 4877.647 / 6    = 812.941 -> 813.0 (round up)
 * VA raw = 1382 x 1.5625 = 2159.375 -> 3000 */
test('full home: energyWh(1382, 3, 85) = 4877.647 Wh', () => {
  assert.ok(approx(M.energyWh(1382, 3, 85), 4877.647058823529, 1e-6));
});
test('full home: batteryAh -> 813.0 Ah, inverterVA -> 3000 VA', () => {
  const wh = M.energyWh(1382, 3, 85);
  assert.equal(M.roundUp1(M.batteryAh(wh, 12, 0.5)), 813.0);
  assert.equal(M.inverterVA(1382), 3000);
});

/* --- 24V halves the Ah --- */
test('24V: canonical case needs 117.7Ah (half of 235.3)', () => {
  const wh = M.energyWh(300, 4, 85);
  assert.equal(M.roundUp1(M.batteryAh(wh, 24, 0.5)), 117.7);
});

/* --- standard-size rounding boundaries (raw VA = W x 1.5625) --- */
test('inverterVA boundaries: exact hits stay, +1W steps up', () => {
  assert.equal(M.inverterVA(384), 600);   /* raw exactly 600 */
  assert.equal(M.inverterVA(385), 800);   /* raw 601.56 -> 800 */
  assert.equal(M.inverterVA(512), 800);   /* raw exactly 800 */
  assert.equal(M.inverterVA(513), 1000);  /* raw 801.56 -> 1000 */
  assert.equal(M.inverterVA(640), 1000);  /* raw exactly 1000 */
  assert.equal(M.inverterVA(3200), 5000); /* raw exactly 5000 */
  assert.equal(M.inverterVA(3201), 6000); /* above top size: next 1000 */
  assert.equal(M.inverterVA(1), 600);     /* smallest load still gets 600 VA */
});
test('inverterRawVA(300) = 468.75', () => assert.equal(M.inverterRawVA(300), 468.75));

/* --- runtime estimator --- */
test('runtimeHours: 200Ah 12V lead 85% @196W = 5.204h', () => {
  assert.ok(approx(M.runtimeHours(200, 12, 0.5, 85, 196), 5.204081632653061, 1e-9));
});
test('runtimeHours: empty load returns 0 (no division by zero)', () => {
  assert.equal(M.runtimeHours(200, 12, 0.5, 85, 0), 0);
});
test('runtimeHours: lithium outlasts lead on same battery', () => {
  const lead = M.runtimeHours(200, 12, 0.5, 85, 300);
  const lith = M.runtimeHours(200, 12, 0.8, 85, 300);
  assert.ok(lith > lead);
  assert.ok(approx(lith / lead, 1.6, 1e-9));
});

/* --- roundUp1 never under-sizes --- */
test('roundUp1: 235.29 -> 235.3; exact values unchanged', () => {
  assert.equal(M.roundUp1(235.29), 235.3);
  assert.equal(M.roundUp1(200), 200);
  assert.equal(M.roundUp1(100.01), 100.1);
});

/* --- validation rejects --- */
test('validation: watts 0 / 5001 / NaN rejected; 1 and 5000 accepted', () => {
  assert.equal(M.isValidWatts(0), false);
  assert.equal(M.isValidWatts(5001), false);
  assert.equal(M.isValidWatts(NaN), false);
  assert.equal(M.isValidWatts(1), true);
  assert.equal(M.isValidWatts(5000), true);
});
test('validation: qty 0 / 21 / 1.5 rejected; 1 and 20 accepted', () => {
  assert.equal(M.isValidQty(0), false);
  assert.equal(M.isValidQty(21), false);
  assert.equal(M.isValidQty(1.5), false);
  assert.equal(M.isValidQty(1), true);
  assert.equal(M.isValidQty(20), true);
});
test('validation: hours 0 / 24.5 rejected; 0.5 and 24 accepted', () => {
  assert.equal(M.isValidHours(0), false);
  assert.equal(M.isValidHours(24.5), false);
  assert.equal(M.isValidHours(0.5), true);
  assert.equal(M.isValidHours(24), true);
});
test('validation: efficiency 69 / 96 rejected; 70 and 95 accepted', () => {
  assert.equal(M.isValidEff(69), false);
  assert.equal(M.isValidEff(96), false);
  assert.equal(M.isValidEff(70), true);
  assert.equal(M.isValidEff(95), true);
});
test('validation: Ah 0 / negative rejected; price blank or >=0 accepted', () => {
  assert.equal(M.isValidAh(0), false);
  assert.equal(M.isValidAh(-5), false);
  assert.equal(M.isValidAh(200), true);
  assert.equal(M.isValidPrice(''), true);
  assert.equal(M.isValidPrice(0), true);
  assert.equal(M.isValidPrice(-1), false);
});

/* --- math functions throw on invalid input --- */
test('math throws: energyWh hours 0; batteryAh 48V; inverterVA 0W; runtimeHours Ah 0', () => {
  assert.throws(() => M.energyWh(300, 0, 85), /hours/);
  assert.throws(() => M.energyWh(300, 4, 60), /efficiency/);
  assert.throws(() => M.batteryAh(1200, 48, 0.5), /voltage/);
  assert.throws(() => M.inverterVA(0), /totalW/);
  assert.throws(() => M.runtimeHours(0, 12, 0.5, 85, 300), /Ah/);
  assert.throws(() => M.runtimeHours(200, 12, 1.5, 85, 300), /DoD/);
});
