'use strict';
/* IPS & Battery Backup Sizer for Bangladesh \u2014 vanilla JS, zero network.
 * Pure sizing math is exported for node tests (see tests/test.js).
 * All app sources are pure ASCII: Bengali strings below are written as
 * \uXXXX escapes (generated from real Bengali, never hand-typed escapes).
 */

var STANDARD_VA = [600, 800, 1000, 1200, 1500, 2000, 3000, 5000];
var DOD = { lead: 0.5, lithium: 0.8 };
var HEADROOM = 1.25;   /* inverter headroom factor */
var POWER_FACTOR = 0.8; /* assumed power factor for VA conversion */

function totalWatts(items) {
  return items.reduce(function (s, it) { return s + it.watts * it.qty; }, 0);
}
/* Energy the battery must deliver, compensating inverter losses. */
function energyWh(totalW, hours, effPct) {
  if (!(totalW > 0)) throw new Error('totalW must be > 0');
  if (!(hours >= 0.5 && hours <= 24)) throw new Error('hours must be 0.5-24');
  if (!(effPct >= 70 && effPct <= 95)) throw new Error('efficiency must be 70-95');
  return totalW * hours / (effPct / 100);
}
/* Battery capacity needed at a given depth of discharge. */
function batteryAh(wh, voltage, dod) {
  if (!(wh > 0)) throw new Error('energy Wh must be > 0');
  if (!(voltage === 12 || voltage === 24)) throw new Error('voltage must be 12 or 24');
  if (!(dod > 0 && dod <= 1)) throw new Error('DoD must be (0, 1]');
  return wh / (voltage * dod);
}
/* Round a value UP to 1 decimal place (never under-size a battery). */
function roundUp1(x) { return Math.ceil(x * 10) / 10; }
/* Smallest standard inverter size that covers raw VA; above 5000 VA step by 1000. */
function inverterVA(totalW) {
  if (!(totalW > 0)) throw new Error('totalW must be > 0');
  var raw = totalW * HEADROOM / POWER_FACTOR;
  for (var i = 0; i < STANDARD_VA.length; i++) {
    if (STANDARD_VA[i] >= raw) return STANDARD_VA[i];
  }
  return Math.ceil(raw / 1000) * 1000;
}
/* Raw VA before standard-size rounding (shown in the explainer). */
function inverterRawVA(totalW) { return totalW * HEADROOM / POWER_FACTOR; }
/* Reverse mode: how long will this battery run the current load? */
function runtimeHours(ah, voltage, dod, effPct, totalW) {
  if (!(ah > 0)) throw new Error('Ah must be > 0');
  if (!(voltage === 12 || voltage === 24)) throw new Error('voltage must be 12 or 24');
  if (!(dod > 0 && dod <= 1)) throw new Error('DoD must be (0, 1]');
  if (!(effPct >= 70 && effPct <= 95)) throw new Error('efficiency must be 70-95');
  if (!(totalW > 0)) return 0;
  return (ah * voltage * dod * (effPct / 100)) / totalW;
}
/* Validation helpers (true = valid). */
function isValidWatts(w) { return Number.isFinite(w) && w >= 1 && w <= 5000; }
function isValidQty(q) { return Number.isInteger(q) && q >= 1 && q <= 20; }
function isValidHours(h) { return Number.isFinite(h) && h >= 0.5 && h <= 24; }
function isValidEff(e) { return Number.isFinite(e) && e >= 70 && e <= 95; }
function isValidAh(a) { return Number.isFinite(a) && a > 0 && a <= 10000; }
function isValidPrice(p) { return p === '' || (Number.isFinite(p) && p >= 0); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STANDARD_VA: STANDARD_VA, DOD: DOD, totalWatts: totalWatts,
    energyWh: energyWh, batteryAh: batteryAh, roundUp1: roundUp1,
    inverterVA: inverterVA, inverterRawVA: inverterRawVA,
    runtimeHours: runtimeHours, isValidWatts: isValidWatts,
    isValidQty: isValidQty, isValidHours: isValidHours,
    isValidEff: isValidEff, isValidAh: isValidAh, isValidPrice: isValidPrice
  };
}

/* ------------------------------------------------------------------ */
/* i18n \u2014 Bengali strings are stored as \uXXXX escapes (ASCII file).  */
/* ------------------------------------------------------------------ */
var I18N = {
  en: {
    brandName: 'IPS Calculator BD',
    appTitle: 'IPS & Battery Backup Sizer',
    appSubtitle: 'Size the right IPS, battery and inverter for your home in Bangladesh.',
    secLoad: '1. Your appliances',
    secLoadDesc: 'Add the appliances you want to run on backup power.',
    presetLabel: 'Preset appliance',
    addPresetBtn: 'Add',
    customNamePh: 'Appliance name (e.g. Table fan)',
    customWattsPh: 'Watts',
    addCustomBtn: 'Add custom',
    wattsNote: 'Preset watts are typical values \u2014 check your appliance label.',
    emptyLoad: 'No appliances yet. Add one above to start sizing your IPS.',
    totalLoad: 'Total load',
    secSize: '2. Backup sizing',
    hoursLabel: 'Backup hours',
    voltageLabel: 'System voltage',
    battTypeLabel: 'Battery type',
    leadAcid: 'Lead-acid (50% usable)',
    lithium: 'Lithium (80% usable)',
    effLabel: 'Inverter efficiency (%)',
    energyLabel: 'Energy needed',
    batteryLabel: 'Battery required',
    inverterLabel: 'Inverter size',
    explainerTitle: 'How this is calculated',
    explEmpty: 'Add appliances above to see the calculation.',
    explEnergy: 'Energy',
    explBattery: 'Battery',
    explInverter: 'Inverter',
    secRuntime: '3. Runtime estimator',
    secRuntimeDesc: 'How long will a battery last with your current load?',
    runtimeAhLabel: 'Battery capacity (Ah)',
    runtimeVoltLabel: 'Battery voltage (V)',
    runtimeResult: 'Estimated runtime',
    secCost: '4. Cost estimator',
    priceAhLabel: 'Battery price per Ah (BDT)',
    priceVaLabel: 'Inverter price per VA (BDT)',
    costHint: 'Enter local market prices to see an estimated total cost.',
    costBattery: 'Battery cost',
    costInverter: 'Inverter cost',
    costTotal: 'Estimated total cost',
    secQuick: 'Quick setups',
    quickBasic: 'Basic home',
    quickBasicDesc: '2 fans + 3 LED bulbs + router \u00b7 4 h',
    quickOffice: 'Home office',
    quickOfficeDesc: 'Laptop + router + 2 lights + fan \u00b7 6 h',
    quickFull: 'Full home',
    quickFullDesc: '4 fans + 6 lights + TV + fridge + router + pump \u00b7 3 h',
    secSaved: 'Saved setups',
    saveNamePh: 'Setup name',
    saveBtn: 'Save current setup',
    exportBtn: 'Export JSON',
    importBtn: 'Import JSON',
    eraseBtn: 'Erase all saved setups',
    eraseConfirmPh: 'Type DELETE to confirm',
    eraseConfirmBtn: 'Erase everything',
    emptySaved: 'No saved setups yet.',
    footerNote: 'Typical wattages are estimates. Prices are entered by you. This tool is not a substitute for an electrician\u2019s advice.',
    errName: 'Enter an appliance name.',
    errWatts: 'Watts must be a number from 1 to 5000.',
    errQty: 'Quantity must be a whole number from 1 to 20.',
    errHours: 'Backup hours must be from 0.5 to 24.',
    errEff: 'Efficiency must be from 70 to 95.',
    errRtAh: 'Battery capacity must be more than 0 Ah.',
    errPrice: 'Prices must be 0 or more.',
    errSaveName: 'Give the setup a name first.',
    errSaveEmpty: 'Add at least one appliance before saving.',
    errErase: 'Type DELETE exactly to erase everything.',
    msgSaved: 'Setup saved.',
    msgLoaded: 'Setup loaded.',
    msgDeleted: 'Setup deleted.',
    msgErased: 'All saved setups erased.',
    msgExported: 'Setups exported.',
    msgImported: 'Setups imported.',
    errImport: 'Import failed: file is not a valid IPS Calculator setup file.',
    errImportShape: 'Import failed: setup data has the wrong shape.',
    typical: 'typical',
    preset_fan: 'Ceiling fan',
    preset_led: 'LED bulb',
    preset_tube: 'Tube light',
    preset_router: 'Wi-Fi router',
    preset_tv: 'LED TV',
    preset_laptop: 'Laptop',
    preset_desktop: 'Desktop PC',
    preset_fridge: 'Refrigerator',
    preset_tablefan: 'Table fan',
    preset_charger: 'Mobile charger',
    preset_pump: 'Water pump',
    preset_cooler: 'Air cooler',
    unitW: 'W',
    unitWh: 'Wh',
    unitAh: 'Ah',
    unitVA: 'VA',
    unitH: 'h',
    unitBDT: 'BDT',
    loadBtn: 'Load',
    delBtn: 'Delete'
  },
  bn: {
    brandName: '\u0986\u0987\u09aa\u09bf\u098f\u09b8 \u0995\u09cd\u09af\u09be\u09b2\u0995\u09c1\u09b2\u09c7\u099f\u09b0 \u09ac\u09bf\u09a1\u09bf',
    appTitle: '\u0986\u0987\u09aa\u09bf\u098f\u09b8 \u0993 \u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf \u09ac\u09cd\u09af\u09be\u0995\u0986\u09aa \u09b8\u09be\u0987\u099c\u09be\u09b0',
    appSubtitle: '\u09ac\u09be\u0982\u09b2\u09be\u09a6\u09c7\u09b6\u09c7 \u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09be\u09a1\u09bc\u09bf\u09b0 \u099c\u09a8\u09cd\u09af \u09b8\u09a0\u09bf\u0995 \u0986\u0987\u09aa\u09bf\u098f\u09b8, \u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf \u0993 \u0987\u09a8\u09ad\u09be\u09b0\u09cd\u099f\u09be\u09b0 \u09ac\u09be\u099b\u09c1\u09a8\u0964',
    secLoad: '\u09e7. \u0986\u09aa\u09a8\u09be\u09b0 \u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09aa\u09be\u09a4\u09bf',
    secLoadDesc: '\u09ac\u09cd\u09af\u09be\u0995\u0986\u09aa\u09c7 \u099a\u09be\u09b2\u09be\u09a4\u09c7 \u099a\u09be\u09a8 \u098f\u09ae\u09a8 \u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09aa\u09be\u09a4\u09bf \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964',
    presetLabel: '\u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4 \u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09aa\u09be\u09a4\u09bf',
    addPresetBtn: '\u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8',
    customNamePh: '\u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09c7\u09b0 \u09a8\u09be\u09ae (\u09af\u09c7\u09ae\u09a8: \u099f\u09c7\u09ac\u09bf\u09b2 \u09ab\u09cd\u09af\u09be\u09a8)',
    customWattsPh: '\u0993\u09af\u09bc\u09be\u099f',
    addCustomBtn: '\u09a8\u09a4\u09c1\u09a8 \u09af\u09a8\u09cd\u09a4\u09cd\u09b0 \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8',
    wattsNote: '\u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4 \u0993\u09af\u09bc\u09be\u099f \u09ae\u09be\u09a8 \u09b8\u09be\u09a7\u09be\u09b0\u09a3 \u09ae\u09be\u09a8 \u2014 \u0986\u09aa\u09a8\u09be\u09b0 \u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09c7\u09b0 \u09b2\u09c7\u09ac\u09c7\u09b2 \u09a6\u09c7\u0996\u09c7 \u09a8\u09bf\u09a8\u0964',
    emptyLoad: '\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09af\u09a8\u09cd\u09a4\u09cd\u09b0 \u09af\u09cb\u0997 \u0995\u09b0\u09be \u09b9\u09af\u09bc\u09a8\u09bf\u0964 \u0986\u0987\u09aa\u09bf\u098f\u09b8 \u09b8\u09be\u0987\u099c \u0995\u09b0\u09a4\u09c7 \u0989\u09aa\u09b0\u09c7 \u09af\u09a8\u09cd\u09a4\u09cd\u09b0 \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964',
    totalLoad: '\u09ae\u09cb\u099f \u09b2\u09cb\u09a1',
    secSize: '\u09e8. \u09ac\u09cd\u09af\u09be\u0995\u0986\u09aa \u09b8\u09be\u0987\u099c\u09bf\u0982',
    hoursLabel: '\u09ac\u09cd\u09af\u09be\u0995\u0986\u09aa \u09b8\u09ae\u09af\u09bc (\u0998\u09a3\u09cd\u099f\u09be)',
    voltageLabel: '\u09b8\u09bf\u09b8\u09cd\u099f\u09c7\u09ae \u09ad\u09cb\u09b2\u09cd\u099f\u09c7\u099c',
    battTypeLabel: '\u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf\u09b0 \u09a7\u09b0\u09a8',
    leadAcid: '\u09b2\u09c7\u09a1-\u0985\u09cd\u09af\u09be\u09b8\u09bf\u09a1 (\u09eb\u09e6% \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0\u09af\u09cb\u0997\u09cd\u09af)',
    lithium: '\u09b2\u09bf\u09a5\u09bf\u09af\u09bc\u09be\u09ae (\u09ee\u09e6% \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0\u09af\u09cb\u0997\u09cd\u09af)',
    effLabel: '\u0987\u09a8\u09ad\u09be\u09b0\u09cd\u099f\u09be\u09b0 \u09a6\u0995\u09cd\u09b7\u09a4\u09be (%)',
    energyLabel: '\u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c0\u09af\u09bc \u09b6\u0995\u09cd\u09a4\u09bf',
    batteryLabel: '\u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c0\u09af\u09bc \u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf',
    inverterLabel: '\u0987\u09a8\u09ad\u09be\u09b0\u09cd\u099f\u09be\u09b0 \u09b8\u09be\u0987\u099c',
    explainerTitle: '\u098f\u0987 \u09b9\u09bf\u09b8\u09be\u09ac \u0995\u09c0\u09ad\u09be\u09ac\u09c7 \u0995\u09b0\u09be \u09b9\u09af\u09bc',
    explEmpty: '\u09b9\u09bf\u09b8\u09be\u09ac \u09a6\u09c7\u0996\u09a4\u09c7 \u0989\u09aa\u09b0\u09c7 \u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09aa\u09be\u09a4\u09bf \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964',
    explEnergy: '\u09b6\u0995\u09cd\u09a4\u09bf',
    explBattery: '\u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf',
    explInverter: '\u0987\u09a8\u09ad\u09be\u09b0\u09cd\u099f\u09be\u09b0',
    secRuntime: '\u09e9. \u09b0\u09be\u09a8\u099f\u09be\u0987\u09ae \u09b9\u09bf\u09b8\u09be\u09ac',
    secRuntimeDesc: '\u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u09b2\u09cb\u09a1\u09c7 \u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf \u0995\u09a4\u0995\u09cd\u09b7\u09a3 \u099a\u09b2\u09ac\u09c7?',
    runtimeAhLabel: '\u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf\u09b0 \u0995\u09cd\u09b7\u09ae\u09a4\u09be (Ah)',
    runtimeVoltLabel: '\u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf\u09b0 \u09ad\u09cb\u09b2\u09cd\u099f\u09c7\u099c (V)',
    runtimeResult: '\u0986\u09a8\u09c1\u09ae\u09be\u09a8\u09bf\u0995 \u09b0\u09be\u09a8\u099f\u09be\u0987\u09ae',
    secCost: '\u09ea. \u0996\u09b0\u099a\u09c7\u09b0 \u09b9\u09bf\u09b8\u09be\u09ac',
    priceAhLabel: '\u09aa\u09cd\u09b0\u09a4\u09bf Ah \u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf\u09b0 \u09a6\u09be\u09ae (\u099f\u09be\u0995\u09be)',
    priceVaLabel: '\u09aa\u09cd\u09b0\u09a4\u09bf VA \u0987\u09a8\u09ad\u09be\u09b0\u09cd\u099f\u09be\u09b0\u09c7\u09b0 \u09a6\u09be\u09ae (\u099f\u09be\u0995\u09be)',
    costHint: '\u0986\u09a8\u09c1\u09ae\u09be\u09a8\u09bf\u0995 \u09ae\u09cb\u099f \u0996\u09b0\u099a \u09a6\u09c7\u0996\u09a4\u09c7 \u09b8\u09cd\u09a5\u09be\u09a8\u09c0\u09af\u09bc \u09ac\u09be\u099c\u09be\u09b0\u09c7\u09b0 \u09a6\u09be\u09ae \u09b2\u09bf\u0996\u09c1\u09a8\u0964',
    costBattery: '\u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf\u09b0 \u0996\u09b0\u099a',
    costInverter: '\u0987\u09a8\u09ad\u09be\u09b0\u09cd\u099f\u09be\u09b0\u09c7\u09b0 \u0996\u09b0\u099a',
    costTotal: '\u0986\u09a8\u09c1\u09ae\u09be\u09a8\u09bf\u0995 \u09ae\u09cb\u099f \u0996\u09b0\u099a',
    secQuick: '\u09a6\u09cd\u09b0\u09c1\u09a4 \u09b8\u09c7\u099f\u0986\u09aa',
    quickBasic: '\u09b8\u09be\u09a7\u09be\u09b0\u09a3 \u09ac\u09be\u09a1\u09bc\u09bf',
    quickBasicDesc: '\u09e8\u099f\u09bf \u09ab\u09cd\u09af\u09be\u09a8 + \u09e9\u099f\u09bf \u098f\u09b2\u0987\u09a1\u09bf \u09ac\u09be\u09b2\u09cd\u09ac + \u09b0\u09be\u0989\u099f\u09be\u09b0 \u00b7 \u09ea \u0998\u09a3\u09cd\u099f\u09be',
    quickOffice: '\u09b9\u09cb\u09ae \u0985\u09ab\u09bf\u09b8',
    quickOfficeDesc: '\u09b2\u09cd\u09af\u09be\u09aa\u099f\u09aa + \u09b0\u09be\u0989\u099f\u09be\u09b0 + \u09e8\u099f\u09bf \u09b2\u09be\u0987\u099f + \u09ab\u09cd\u09af\u09be\u09a8 \u00b7 \u09ec \u0998\u09a3\u09cd\u099f\u09be',
    quickFull: '\u09aa\u09c2\u09b0\u09cd\u09a3 \u09ac\u09be\u09a1\u09bc\u09bf',
    quickFullDesc: '\u09ea\u099f\u09bf \u09ab\u09cd\u09af\u09be\u09a8 + \u09ec\u099f\u09bf \u09b2\u09be\u0987\u099f + \u099f\u09bf\u09ad\u09bf + \u09ab\u09cd\u09b0\u09bf\u099c + \u09b0\u09be\u0989\u099f\u09be\u09b0 + \u09aa\u09be\u09ae\u09cd\u09aa \u00b7 \u09e9 \u0998\u09a3\u09cd\u099f\u09be',
    secSaved: '\u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b8\u09c7\u099f\u0986\u09aa',
    saveNamePh: '\u09b8\u09c7\u099f\u0986\u09aa\u09c7\u09b0 \u09a8\u09be\u09ae',
    saveBtn: '\u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u09b8\u09c7\u099f\u0986\u09aa \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09c1\u09a8',
    exportBtn: 'JSON \u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f',
    importBtn: 'JSON \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f',
    eraseBtn: '\u09b8\u09ac \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b8\u09c7\u099f\u0986\u09aa \u09ae\u09c1\u099b\u09c1\u09a8',
    eraseConfirmPh: '\u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09a4\u09c7 DELETE \u09b2\u09bf\u0996\u09c1\u09a8',
    eraseConfirmBtn: '\u09b8\u09ac \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09c1\u09a8',
    emptySaved: '\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09b8\u09c7\u099f\u0986\u09aa \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3 \u0995\u09b0\u09be \u09b9\u09af\u09bc\u09a8\u09bf\u0964',
    footerNote: '\u09b8\u09be\u09a7\u09be\u09b0\u09a3 \u0993\u09af\u09bc\u09be\u099f \u09ae\u09be\u09a8 \u0986\u09a8\u09c1\u09ae\u09be\u09a8\u09bf\u0995\u0964 \u09a6\u09be\u09ae \u0986\u09aa\u09a8\u09bf \u09b2\u09bf\u0996\u09ac\u09c7\u09a8\u0964 \u098f\u0987 \u099f\u09c1\u09b2\u099f\u09bf \u0987\u09b2\u09c7\u0995\u099f\u09cd\u09b0\u09bf\u09b6\u09bf\u09af\u09bc\u09be\u09a8\u09c7\u09b0 \u09aa\u09b0\u09be\u09ae\u09b0\u09cd\u09b6\u09c7\u09b0 \u09ac\u09bf\u0995\u09b2\u09cd\u09aa \u09a8\u09af\u09bc\u0964',
    errName: '\u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09c7\u09b0 \u09a8\u09be\u09ae \u09b2\u09bf\u0996\u09c1\u09a8\u0964',
    errWatts: '\u0993\u09af\u09bc\u09be\u099f \u09e7 \u09a5\u09c7\u0995\u09c7 \u09eb\u09e6\u09e6\u09e6 \u098f\u09b0 \u09ae\u09a7\u09cd\u09af\u09c7 \u09b8\u0982\u0996\u09cd\u09af\u09be \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    errQty: '\u09b8\u0982\u0996\u09cd\u09af\u09be \u09e7 \u09a5\u09c7\u0995\u09c7 \u09e8\u09e6 \u098f\u09b0 \u09ae\u09a7\u09cd\u09af\u09c7 \u09aa\u09c2\u09b0\u09cd\u09a3\u09b8\u0982\u0996\u09cd\u09af\u09be \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    errHours: '\u09ac\u09cd\u09af\u09be\u0995\u0986\u09aa \u09b8\u09ae\u09af\u09bc \u09e6.\u09eb \u09a5\u09c7\u0995\u09c7 \u09e8\u09ea \u0998\u09a3\u09cd\u099f\u09be\u09b0 \u09ae\u09a7\u09cd\u09af\u09c7 \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    errEff: '\u09a6\u0995\u09cd\u09b7\u09a4\u09be \u09ed\u09e6 \u09a5\u09c7\u0995\u09c7 \u09ef\u09eb \u098f\u09b0 \u09ae\u09a7\u09cd\u09af\u09c7 \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    errRtAh: '\u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf\u09b0 \u0995\u09cd\u09b7\u09ae\u09a4\u09be \u09e6 Ah \u098f\u09b0 \u09ac\u09c7\u09b6\u09bf \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    errPrice: '\u09a6\u09be\u09ae \u09e6 \u09ac\u09be \u09a4\u09be\u09b0 \u09ac\u09c7\u09b6\u09bf \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
    errSaveName: '\u09aa\u09cd\u09b0\u09a5\u09ae\u09c7 \u09b8\u09c7\u099f\u0986\u09aa\u09c7\u09b0 \u09a8\u09be\u09ae \u09a6\u09bf\u09a8\u0964',
    errSaveEmpty: '\u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3\u09c7\u09b0 \u0986\u0997\u09c7 \u0985\u09a8\u09cd\u09a4\u09a4 \u098f\u0995\u099f\u09bf \u09af\u09a8\u09cd\u09a4\u09cd\u09b0 \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964',
    errErase: '\u09b8\u09ac \u09ae\u09c1\u099b\u09a4\u09c7 \u09b9\u09c1\u09ac\u09b9\u09c1 DELETE \u09b2\u09bf\u0996\u09c1\u09a8\u0964',
    msgSaved: '\u09b8\u09c7\u099f\u0986\u09aa \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
    msgLoaded: '\u09b8\u09c7\u099f\u0986\u09aa \u09b2\u09cb\u09a1 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
    msgDeleted: '\u09b8\u09c7\u099f\u0986\u09aa \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
    msgErased: '\u09b8\u09ac \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b8\u09c7\u099f\u0986\u09aa \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
    msgExported: '\u09b8\u09c7\u099f\u0986\u09aa \u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
    msgImported: '\u09b8\u09c7\u099f\u0986\u09aa \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
    errImport: '\u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u09ac\u09cd\u09af\u09b0\u09cd\u09a5: \u09ab\u09be\u0987\u09b2\u099f\u09bf \u09ac\u09c8\u09a7 \u0986\u0987\u09aa\u09bf\u098f\u09b8 \u0995\u09cd\u09af\u09be\u09b2\u0995\u09c1\u09b2\u09c7\u099f\u09b0 \u09b8\u09c7\u099f\u0986\u09aa \u09ab\u09be\u0987\u09b2 \u09a8\u09af\u09bc\u0964',
    errImportShape: '\u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u09ac\u09cd\u09af\u09b0\u09cd\u09a5: \u09b8\u09c7\u099f\u0986\u09aa \u09a1\u09c7\u099f\u09be\u09b0 \u0997\u09a0\u09a8 \u09ad\u09c1\u09b2\u0964',
    typical: '\u09b8\u09be\u09a7\u09be\u09b0\u09a3 \u09ae\u09be\u09a8',
    preset_fan: '\u09b8\u09bf\u09b2\u09bf\u0982 \u09ab\u09cd\u09af\u09be\u09a8',
    preset_led: '\u098f\u09b2\u0987\u09a1\u09bf \u09ac\u09be\u09b2\u09cd\u09ac',
    preset_tube: '\u099f\u09bf\u0989\u09ac \u09b2\u09be\u0987\u099f',
    preset_router: '\u0993\u09af\u09bc\u09be\u0987-\u09ab\u09be\u0987 \u09b0\u09be\u0989\u099f\u09be\u09b0',
    preset_tv: '\u098f\u09b2\u0987\u09a1\u09bf \u099f\u09bf\u09ad\u09bf',
    preset_laptop: '\u09b2\u09cd\u09af\u09be\u09aa\u099f\u09aa',
    preset_desktop: '\u09a1\u09c7\u09b8\u09cd\u0995\u099f\u09aa \u09aa\u09bf\u09b8\u09bf',
    preset_fridge: '\u09ab\u09cd\u09b0\u09bf\u099c',
    preset_tablefan: '\u099f\u09c7\u09ac\u09bf\u09b2 \u09ab\u09cd\u09af\u09be\u09a8',
    preset_charger: '\u09ae\u09cb\u09ac\u09be\u0987\u09b2 \u099a\u09be\u09b0\u09cd\u099c\u09be\u09b0',
    preset_pump: '\u09aa\u09be\u09a8\u09bf\u09b0 \u09aa\u09be\u09ae\u09cd\u09aa',
    preset_cooler: '\u098f\u09af\u09bc\u09be\u09b0 \u0995\u09c1\u09b2\u09be\u09b0',
    unitW: 'W',
    unitWh: 'Wh',
    unitAh: 'Ah',
    unitVA: 'VA',
    unitH: '\u0998\u09a3\u09cd\u099f\u09be',
    unitBDT: '\u099f\u09be\u0995\u09be',
    loadBtn: '\u09b2\u09cb\u09a1',
    delBtn: '\u09ae\u09c1\u099b\u09c1\u09a8'
  }
};

/* ------------------------------------------------------------------ */
/* Presets, state, persistence                                        */
/* ------------------------------------------------------------------ */
var PRESETS = [
  { id: 'fan', key: 'preset_fan', watts: 75 },
  { id: 'led', key: 'preset_led', watts: 12 },
  { id: 'tube', key: 'preset_tube', watts: 20 },
  { id: 'router', key: 'preset_router', watts: 10 },
  { id: 'tv', key: 'preset_tv', watts: 100 },
  { id: 'laptop', key: 'preset_laptop', watts: 65 },
  { id: 'desktop', key: 'preset_desktop', watts: 200 },
  { id: 'fridge', key: 'preset_fridge', watts: 150 },
  { id: 'tablefan', key: 'preset_tablefan', watts: 50 },
  { id: 'charger', key: 'preset_charger', watts: 10 },
  { id: 'pump', key: 'preset_pump', watts: 750 },
  { id: 'cooler', key: 'preset_cooler', watts: 150 }
];
var QUICK_SETUPS = {
  basic: { items: [{ p: 'fan', q: 2 }, { p: 'led', q: 3 }, { p: 'router', q: 1 }], hours: 4 },
  office: { items: [{ p: 'laptop', q: 1 }, { p: 'router', q: 1 }, { p: 'led', q: 2 }, { p: 'fan', q: 1 }], hours: 6 },
  full: { items: [{ p: 'fan', q: 4 }, { p: 'led', q: 6 }, { p: 'tv', q: 1 }, { p: 'fridge', q: 1 }, { p: 'router', q: 1 }, { p: 'pump', q: 1 }], hours: 3 }
};
var LS_STATE = 'ips-calculator-bd:state';
var LS_SAVED = 'ips-calculator-bd:saved';
var LS_LANG = 'ips-calculator-bd:lang';
var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];

var lang = 'en';
var state = { items: [], hours: 4, voltage: 12, battType: 'lead', eff: 85, rtAh: 200, rtVolt: 12, priceAh: '', priceVa: '' };
var saved = [];

function presetById(id) {
  for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i];
  return null;
}
function t(key) { return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; }
function bnDigits(s) {
  if (lang !== 'bn') return String(s);
  return String(s).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
}
function fmt(n, dec) {
  var s = Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return bnDigits(s);
}
function itemName(it) {
  if (it.presetId) { var p = presetById(it.presetId); return p ? t(p.key) : it.presetId; }
  return it.name;
}
function cloneState() { return JSON.parse(JSON.stringify(state)); }

function loadPersisted() {
  try {
    var l = localStorage.getItem(LS_LANG);
    if (l === 'bn' || l === 'en') lang = l;
    var s = localStorage.getItem(LS_STATE);
    if (s) {
      var p = JSON.parse(s);
      if (p && Array.isArray(p.items)) {
        state.items = p.items.filter(function (it) {
          return it && isValidWatts(it.watts) && isValidQty(it.qty) && (it.presetId || it.name);
        });
        if (isValidHours(p.hours)) state.hours = p.hours;
        if (p.voltage === 12 || p.voltage === 24) state.voltage = p.voltage;
        if (p.battType === 'lead' || p.battType === 'lithium') state.battType = p.battType;
        if (isValidEff(p.eff)) state.eff = p.eff;
        if (isValidAh(p.rtAh)) state.rtAh = p.rtAh;
        if (p.rtVolt === 12 || p.rtVolt === 24) state.rtVolt = p.rtVolt;
        if (isValidPrice(p.priceAh)) state.priceAh = p.priceAh;
        if (isValidPrice(p.priceVa)) state.priceVa = p.priceVa;
      }
    }
    var sv = localStorage.getItem(LS_SAVED);
    if (sv) { var arr = JSON.parse(sv); if (Array.isArray(arr)) saved = arr; }
  } catch (e) { /* corrupted storage: start clean, never crash */ }
}
function persist() {
  try {
    localStorage.setItem(LS_STATE, JSON.stringify(state));
    localStorage.setItem(LS_SAVED, JSON.stringify(saved));
    localStorage.setItem(LS_LANG, lang);
  } catch (e) { /* storage full/blocked: app still works in-memory */ }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                          */
/* ------------------------------------------------------------------ */
var $ = function (id) { return document.getElementById(id); };
function show(el, msg) { el.textContent = msg; el.hidden = false; }
function hide(el) { el.hidden = true; el.textContent = ''; }

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  $('brandName').textContent = t('brandName');
  $('appTitle').textContent = t('appTitle');
  $('appSubtitle').textContent = t('appSubtitle');
  $('secLoad').textContent = t('secLoad');
  $('secLoadDesc').textContent = t('secLoadDesc');
  $('secSize').textContent = t('secSize');
  $('secRuntime').textContent = t('secRuntime');
  $('secRuntimeDesc').textContent = t('secRuntimeDesc');
  $('secCost').textContent = t('secCost');
  $('secQuick').textContent = t('secQuick');
  $('secSaved').textContent = t('secSaved');
  $('footerNote').textContent = t('footerNote');
  $('emptyLoad').textContent = t('emptyLoad');
  $('emptySaved').textContent = t('emptySaved');
  $('wattsNote').textContent = t('wattsNote');
  $('costHint').textContent = t('costHint');
  $('quickBasicDesc').textContent = t('quickBasicDesc');
  $('quickOfficeDesc').textContent = t('quickOfficeDesc');
  $('quickFullDesc').textContent = t('quickFullDesc');
  $('langBtn').textContent = lang === 'en' ? '\u09ac\u09be\u0982\u09b2\u09be' : 'English';
  document.title = t('brandName');
  renderPresetOptions();
}

function renderPresetOptions() {
  var sel = $('presetSel');
  var cur = sel.value;
  sel.innerHTML = '';
  PRESETS.forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.id;
    o.textContent = t(p.key) + ' \u2014 ' + bnDigits(p.watts) + ' ' + t('unitW') + ' (' + t('typical') + ')';
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

function renderList() {
  var ul = $('appList');
  ul.innerHTML = '';
  state.items.forEach(function (it, idx) {
    var li = document.createElement('li');
    var name = document.createElement('div');
    name.className = 'app-name';
    var strong = document.createElement('strong');
    strong.textContent = itemName(it);
    var small = document.createElement('small');
    small.textContent = bnDigits(it.watts) + ' ' + t('unitW') + (it.presetId ? ' (' + t('typical') + ')' : '');
    name.appendChild(strong); name.appendChild(small);
    var stepper = document.createElement('div');
    stepper.className = 'stepper';
    var minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '\u2212'; minus.setAttribute('aria-label', 'Decrease quantity');
    minus.addEventListener('click', function () { changeQty(idx, -1); });
    var out = document.createElement('output');
    out.textContent = bnDigits(it.qty);
    var plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Increase quantity');
    plus.addEventListener('click', function () { changeQty(idx, 1); });
    stepper.appendChild(minus); stepper.appendChild(out); stepper.appendChild(plus);
    var watts = document.createElement('span');
    watts.className = 'app-watts';
    watts.textContent = fmt(it.watts * it.qty, 0) + ' ' + t('unitW');
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'icon-btn'; del.textContent = '\u2715';
    del.setAttribute('aria-label', 'Remove ' + itemName(it));
    del.addEventListener('click', function () { removeItem(idx); });
    li.appendChild(name); li.appendChild(stepper); li.appendChild(watts); li.appendChild(del);
    ul.appendChild(li);
  });
  $('emptyLoad').hidden = state.items.length > 0;
}

function renderSaved() {
  var ul = $('savedList');
  ul.innerHTML = '';
  saved.forEach(function (sv, idx) {
    var li = document.createElement('li');
    var name = document.createElement('span');
    name.className = 's-name'; name.textContent = sv.name;
    var meta = document.createElement('span');
    meta.className = 's-meta';
    meta.textContent = fmt(totalWatts(sv.items), 0) + ' ' + t('unitW') + ' \u00b7 ' + bnDigits(sv.hours) + ' ' + t('unitH');
    var load = document.createElement('button');
    load.type = 'button'; load.className = 'btn'; load.textContent = t('loadBtn');
    load.addEventListener('click', function () { loadSetup(idx); });
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'icon-btn'; del.textContent = '\u2715';
    del.setAttribute('aria-label', 'Delete ' + sv.name);
    del.addEventListener('click', function () { deleteSetup(idx); });
    li.appendChild(name); li.appendChild(meta); li.appendChild(load); li.appendChild(del);
    ul.appendChild(li);
  });
  $('emptySaved').hidden = saved.length > 0;
}

function renderAll() {
  renderList();
  renderSaved();
  var total = totalWatts(state.items);
  $('totalWatts').textContent = fmt(total, 0) + ' ' + t('unitW');

  /* --- sizing --- */
  var sizeErr = $('sizeErr');
  var hoursOk = isValidHours(state.hours);
  var effOk = isValidEff(state.eff);
  if (!hoursOk) show(sizeErr, t('errHours'));
  else if (!effOk) show(sizeErr, t('errEff'));
  else hide(sizeErr);

  if (total > 0 && hoursOk && effOk) {
    var dod = DOD[state.battType];
    var wh = energyWh(total, state.hours, state.eff);
    var ah = roundUp1(batteryAh(wh, state.voltage, dod));
    var va = inverterVA(total);
    var rawVa = inverterRawVA(total);
    $('energyWh').textContent = fmt(wh, 1) + ' ' + t('unitWh');
    $('batteryAh').textContent = fmt(ah, 1) + ' ' + t('unitAh') + ' @ ' + bnDigits(state.voltage) + 'V';
    $('inverterVA').textContent = fmt(va, 0) + ' ' + t('unitVA');
    $('explainerText').textContent =
      t('explEnergy') + ' = ' + fmt(total, 0) + ' ' + t('unitW') + ' \u00d7 ' + bnDigits(state.hours) + ' ' + t('unitH') +
      ' \u00f7 ' + bnDigits(state.eff / 100) + ' = ' + fmt(wh, 1) + ' ' + t('unitWh') + '\n' +
      t('explBattery') + ' = ' + fmt(wh, 1) + ' ' + t('unitWh') + ' \u00f7 (' + bnDigits(state.voltage) + ' V \u00d7 ' +
      bnDigits(dod) + ') = ' + fmt(ah, 1) + ' ' + t('unitAh') + '\n' +
      t('explInverter') + ' = ' + fmt(total, 0) + ' ' + t('unitW') + ' \u00d7 1.25 \u00f7 0.8 = ' + fmt(rawVa, 1) + ' ' +
      t('unitVA') + ' \u2192 ' + fmt(va, 0) + ' ' + t('unitVA');
  } else {
    $('energyWh').textContent = '\u2014';
    $('batteryAh').textContent = '\u2014';
    $('inverterVA').textContent = '\u2014';
    $('explainerText').textContent = t('explEmpty');
  }

  /* --- runtime estimator --- */
  var rtErr = $('rtErr');
  if (!isValidAh(state.rtAh)) { show(rtErr, t('errRtAh')); $('runtimeOut').textContent = '\u2014'; }
  else {
    hide(rtErr);
    if (total > 0) {
      var rt = runtimeHours(state.rtAh, state.rtVolt, DOD[state.battType], state.eff, total);
      $('runtimeOut').textContent = fmt(rt, 1) + ' ' + t('unitH');
    } else $('runtimeOut').textContent = '\u2014';
  }

  /* --- cost estimator --- */
  var costErr = $('costErr');
  var pAh = state.priceAh, pVa = state.priceVa;
  if (!isValidPrice(pAh) || !isValidPrice(pVa)) { show(costErr, t('errPrice')); $('costResults').hidden = true; }
  else {
    hide(costErr);
    if (pAh === '' && pVa === '') { $('costResults').hidden = true; }
    else {
      $('costResults').hidden = false;
      var battCost = null, invCost = null;
      if (total > 0 && hoursOk && effOk && pAh !== '') {
        var ah2 = roundUp1(batteryAh(energyWh(total, state.hours, state.eff), state.voltage, DOD[state.battType]));
        battCost = ah2 * pAh;
        $('costBattOut').textContent = bnDigits(Math.round(battCost).toLocaleString('en-US')) + ' ' + t('unitBDT');
      } else $('costBattOut').textContent = '\u2014';
      if (total > 0 && pVa !== '') {
        invCost = inverterVA(total) * pVa;
        $('costInvOut').textContent = bnDigits(Math.round(invCost).toLocaleString('en-US')) + ' ' + t('unitBDT');
      } else $('costInvOut').textContent = '\u2014';
      var tot = (battCost || 0) + (invCost || 0);
      $('costTotalOut').textContent = bnDigits(Math.round(tot).toLocaleString('en-US')) + ' ' + t('unitBDT');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Actions                                                            */
/* ------------------------------------------------------------------ */
function addPreset() {
  var p = presetById($('presetSel').value);
  if (!p) return;
  var existing = state.items.find(function (it) { return it.presetId === p.id; });
  if (existing) { if (existing.qty < 20) existing.qty++; }
  else state.items.push({ presetId: p.id, watts: p.watts, qty: 1 });
  persist(); renderAll();
}
function addCustom() {
  var err = $('customErr');
  var name = $('customName').value.trim();
  var watts = Number($('customWatts').value);
  var qty = Number($('customQty').value);
  if (!name) { show(err, t('errName')); return; }
  if (!isValidWatts(watts)) { show(err, t('errWatts')); return; }
  if (!isValidQty(qty)) { show(err, t('errQty')); return; }
  hide(err);
  state.items.push({ name: name, watts: watts, qty: qty });
  $('customName').value = ''; $('customWatts').value = ''; $('customQty').value = '1';
  persist(); renderAll();
}
function changeQty(idx, delta) {
  var it = state.items[idx];
  if (!it) return;
  it.qty += delta;
  if (it.qty < 1) it.qty = 1;
  if (it.qty > 20) it.qty = 20;
  persist(); renderAll();
}
function removeItem(idx) { state.items.splice(idx, 1); persist(); renderAll(); }
function applyQuick(key) {
  var q = QUICK_SETUPS[key];
  if (!q) return;
  state.items = q.items.map(function (qi) {
    var p = presetById(qi.p);
    return { presetId: p.id, watts: p.watts, qty: qi.q };
  });
  state.hours = q.hours;
  $('hoursInput').value = String(q.hours);
  persist(); renderAll();
}
function saveSetup() {
  var err = $('saveErr');
  var name = $('saveName').value.trim();
  if (!name) { show(err, t('errSaveName')); return; }
  if (state.items.length === 0) { show(err, t('errSaveEmpty')); return; }
  hide(err);
  saved.push({ name: name, items: JSON.parse(JSON.stringify(state.items)), hours: state.hours, voltage: state.voltage, battType: state.battType, eff: state.eff });
  $('saveName').value = '';
  persist(); renderSaved();
  show($('dataMsg'), t('msgSaved'));
}
function loadSetup(idx) {
  var sv = saved[idx];
  if (!sv) return;
  state.items = JSON.parse(JSON.stringify(sv.items));
  state.hours = sv.hours; state.voltage = sv.voltage; state.battType = sv.battType; state.eff = sv.eff;
  syncInputs(); persist(); renderAll();
  show($('dataMsg'), t('msgLoaded'));
}
function deleteSetup(idx) {
  saved.splice(idx, 1);
  persist(); renderSaved();
  show($('dataMsg'), t('msgDeleted'));
}
function syncInputs() {
  $('hoursInput').value = String(state.hours);
  $('voltageSel').value = String(state.voltage);
  $('battTypeSel').value = state.battType;
  $('effInput').value = String(state.eff);
  $('rtAh').value = String(state.rtAh);
  $('rtVolt').value = String(state.rtVolt);
  $('priceAh').value = state.priceAh === '' ? '' : String(state.priceAh);
  $('priceVa').value = state.priceVa === '' ? '' : String(state.priceVa);
}
function exportSetups() {
  var payload = { app: 'ips-calculator-bd', version: 1, exportedAt: new Date().toISOString(), setups: saved };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ips-calculator-bd-setups.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  show($('dataMsg'), t('msgExported'));
}
/* Strict import validation: returns {ok, setups} or {ok:false, error}. */
function validateImport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'errImport' };
  if (data.app !== 'ips-calculator-bd' || data.version !== 1) return { ok: false, error: 'errImport' };
  if (!Array.isArray(data.setups)) return { ok: false, error: 'errImportShape' };
  for (var i = 0; i < data.setups.length; i++) {
    var sv = data.setups[i];
    if (!sv || typeof sv.name !== 'string' || !sv.name.trim()) return { ok: false, error: 'errImportShape' };
    if (!Array.isArray(sv.items) || sv.items.length === 0) return { ok: false, error: 'errImportShape' };
    if (!isValidHours(sv.hours) || !(sv.voltage === 12 || sv.voltage === 24)) return { ok: false, error: 'errImportShape' };
    if (!(sv.battType === 'lead' || sv.battType === 'lithium') || !isValidEff(sv.eff)) return { ok: false, error: 'errImportShape' };
    for (var j = 0; j < sv.items.length; j++) {
      var it = sv.items[j];
      if (!it || !isValidWatts(it.watts) || !isValidQty(it.qty)) return { ok: false, error: 'errImportShape' };
      if (!it.presetId && typeof it.name !== 'string') return { ok: false, error: 'errImportShape' };
      if (it.presetId && !presetById(it.presetId)) return { ok: false, error: 'errImportShape' };
    }
  }
  return { ok: true, setups: data.setups };
}
function importSetups(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var parsed;
    try { parsed = JSON.parse(String(reader.result)); }
    catch (e) { show($('dataMsg'), t('errImport')); return; }
    var res = validateImport(parsed);
    if (!res.ok) { show($('dataMsg'), t(res.error)); return; }
    saved = res.setups;
    persist(); renderSaved();
    show($('dataMsg'), t('msgImported'));
  };
  reader.onerror = function () { show($('dataMsg'), t('errImport')); };
  reader.readAsText(file);
}
function eraseAll() {
  var err = $('eraseErr');
  if ($('eraseConfirm').value !== 'DELETE') { show(err, t('errErase')); return; }
  hide(err);
  saved = [];
  $('eraseConfirm').value = '';
  persist(); renderSaved();
  show($('dataMsg'), t('msgErased'));
}

/* ------------------------------------------------------------------ */
/* Init                                                               */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  loadPersisted();
  applyI18n();
  syncInputs();
  renderAll();

  $('langBtn').addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    persist(); applyI18n(); renderAll();
  });
  $('addPresetBtn').addEventListener('click', addPreset);
  $('addCustomBtn').addEventListener('click', addCustom);
  $('customWatts').addEventListener('keydown', function (e) { if (e.key === 'Enter') addCustom(); });
  $('hoursInput').addEventListener('input', function () { state.hours = Number(this.value); persist(); renderAll(); });
  $('voltageSel').addEventListener('change', function () { state.voltage = Number(this.value); persist(); renderAll(); });
  $('battTypeSel').addEventListener('change', function () { state.battType = this.value; persist(); renderAll(); });
  $('effInput').addEventListener('input', function () { state.eff = Number(this.value); persist(); renderAll(); });
  $('rtAh').addEventListener('input', function () { state.rtAh = Number(this.value); persist(); renderAll(); });
  $('rtVolt').addEventListener('change', function () { state.rtVolt = Number(this.value); persist(); renderAll(); });
  $('priceAh').addEventListener('input', function () { state.priceAh = this.value === '' ? '' : Number(this.value); persist(); renderAll(); });
  $('priceVa').addEventListener('input', function () { state.priceVa = this.value === '' ? '' : Number(this.value); persist(); renderAll(); });
  document.querySelectorAll('[data-quick]').forEach(function (b) {
    b.addEventListener('click', function () { applyQuick(b.getAttribute('data-quick')); });
  });
  $('saveBtn').addEventListener('click', saveSetup);
  $('exportBtn').addEventListener('click', exportSetups);
  $('importBtn').addEventListener('click', function () { $('importFile').click(); });
  $('importFile').addEventListener('change', function () {
    if (this.files && this.files[0]) importSetups(this.files[0]);
    this.value = '';
  });
  $('eraseBtn').addEventListener('click', eraseAll);
}
