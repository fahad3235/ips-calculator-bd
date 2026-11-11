/* Headless-Chrome smoke test (raw CDP) for ips-calculator-bd.
 * Run: node tests/smoke.mjs
 * Loads file://index.html, drives the UI, counts real assertions. */
import { spawn } from 'node:child_process';

const CHROME = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
const PAGE = 'file:///home/hatch/workspace/muse-project-factory/builds/ips-calculator-bd/index.html';

let pass = 0, fail = 0;
const failures = [];
function check(cond, label) {
  if (cond) { pass++; }
  else { fail++; failures.push(label); console.log('FAIL - ' + label); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=0', '--user-data-dir=/tmp/ips-chrome-profile',
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let wsUrl = null, httpPort = null;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('no DevTools URL in stderr')), 15000);
    chrome.stderr.on('data', d => {
      const m = String(d).match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        wsUrl = m[1];
        httpPort = new URL(wsUrl.replace(/^ws:\/\//, 'http://')).port;
        clearTimeout(t); resolve();
      }
    });
    chrome.on('error', reject);
  });

  const res = await fetch(`http://127.0.0.1:${httpPort}/json/new?${encodeURIComponent(PAGE)}`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res2, rej) => { ws.onopen = res2; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [], pageErrors = [];
  function onConsole(p) {
    if (p.type === 'error') {
      const txt = (p.args || []).map(a => a.value ?? a.description ?? '').join(' ');
      consoleErrors.push(txt);
    }
  }
  function onException(p) { pageErrors.push(p.exceptionDetails.text || JSON.stringify(p.exceptionDetails)); }
  function onLog(p) { if (p.entry.level === 'error') pageErrors.push(p.entry.text); }

  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method === 'Runtime.consoleAPICalled') onConsole(m.params);
    else if (m.method === 'Runtime.exceptionThrown') onException(m.params);
    else if (m.method === 'Log.entryAdded') onLog(m.params);
    else if (m.method === 'Page.loadEventFired' && loadResolve) { loadResolve(); loadResolve = null; }
  };
  function send(method, params = {}) {
    return new Promise(resolve => {
      const myId = ++id;
      pending.set(myId, resolve);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  }
  let loadResolve = null;
  const waitLoad = () => new Promise(r => { loadResolve = r; setTimeout(r, 8000); });

  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
    if (r.result && r.result.result) return r.result.result.value;
    return undefined;
  }
  const text = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent`);
  const visible = sel => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});return e&&!e.hidden;})()`);

  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  const loaded = waitLoad();
  await send('Page.navigate', { url: PAGE });
  await loaded; await sleep(400);

  // 0. clean slate: localStorage from any earlier run would pollute totals
  await ev('localStorage.clear()');
  const rl0 = waitLoad();
  await send('Page.reload');
  await rl0; await sleep(400);

  // 1. loads clean
  check(await ev('document.title') === 'IPS Calculator BD', 'title is IPS Calculator BD');
  check(consoleErrors.length === 0, 'zero console errors on load (got ' + consoleErrors.length + ')');
  check(pageErrors.length === 0, 'zero page errors on load (got ' + pageErrors.length + ')');
  check(await ev("performance.getEntriesByType('resource').every(r=>r.name.indexOf('file://')===0)"), 'zero network requests (all file://)');
  check(await ev("document.querySelector('h1').textContent") === 'IPS & Battery Backup Sizer', 'H1 present');
  check(await visible('#emptyLoad') === true, 'empty state visible at start');
  check(await text('#totalWatts') === '0 W', "empty load shows '0 W' (got " + await text('#totalWatts') + ')');
  check(await text('#energyWh') === '\u2014', 'sizing shows dash with empty load');
  check(await ev('document.documentElement.scrollWidth') <= await ev('window.innerWidth'), 'no horizontal overflow on desktop load');

  // 2. add one preset: ceiling fan 75W
  await ev(`(function(){var s=document.getElementById('presetSel');s.value='fan';document.getElementById('addPresetBtn').click();})()`);
  await sleep(150);
  check(await ev("document.querySelectorAll('#appList li').length") === 1, '1 appliance row after preset add');
  check(await visible('#emptyLoad') === false, 'empty state hidden after add');
  check(await text('#totalWatts') === '75 W', "total '75 W' (got " + await text('#totalWatts') + ')');
  // sizing @ 75W, 4h, 12V, lead, 85%: Wh=352.9, Ah=58.9, VA=600
  check(await text('#energyWh') === '352.9 Wh', "energy '352.9 Wh' (got " + await text('#energyWh') + ')');
  check(await text('#batteryAh') === '58.9 Ah @ 12V', "battery '58.9 Ah @ 12V' (got " + await text('#batteryAh') + ')');
  check(await text('#inverterVA') === '600 VA', "inverter '600 VA'");
  check(String(await text('#explainerText')).includes('58.9'), 'explainer shows substituted 58.9 Ah');

  // 3. qty stepper: +1 fan -> 150W
  await ev(`(function(){document.querySelectorAll('#appList .stepper button')[1].click();})()`);
  await sleep(150);
  check(await text('#totalWatts') === '150 W', "stepper +1 -> '150 W'");
  check(await text('#energyWh') === '705.9 Wh', "energy '705.9 Wh' after stepper");

  // 4. quick setup "Full home": 1382W, 3h
  await ev(`(function(){document.querySelector('[data-quick="full"]').click();})()`);
  await sleep(200);
  check(await ev("document.querySelectorAll('#appList li').length") === 6, '6 rows after Full home quick setup');
  check(await text('#totalWatts') === '1,382 W', "full-home total '1,382 W' (got " + await text('#totalWatts') + ')');
  check(await text('#energyWh') === '4,877.6 Wh', "energy '4,877.6 Wh' (got " + await text('#energyWh') + ')');
  check(await text('#batteryAh') === '813.0 Ah @ 12V', "battery '813.0 Ah @ 12V' (got " + await text('#batteryAh') + ')');
  check(await text('#inverterVA') === '3,000 VA', "inverter '3,000 VA' (got " + await text('#inverterVA') + ')');
  check(String(await text('#explainerText')).includes('813.0'), 'explainer shows 813.0 Ah');

  // 5. runtime estimator: 200Ah 12V lead 85% @1382W = 0.7h
  check(await text('#runtimeOut') === '0.7 h', "runtime '0.7 h' (got " + await text('#runtimeOut') + ')');
  // lithium -> 0.8 DoD: 200*12*0.8*0.85/1382 = 1.2h
  await ev(`(function(){var b=document.getElementById('battTypeSel');b.value='lithium';b.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(150);
  check(await text('#runtimeOut') === '1.2 h', "runtime lithium '1.2 h' (got " + await text('#runtimeOut') + ')');
  check(await text('#batteryAh') === '508.1 Ah @ 12V', "battery lithium '508.1 Ah @ 12V' (got " + await text('#batteryAh') + ')');
  await ev(`(function(){var b=document.getElementById('battTypeSel');b.value='lead';b.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(150);

  // 6. cost estimator: 250 BDT/Ah + 12 BDT/VA -> 203,250 + 36,000 = 239,250
  check(await visible('#costResults') === false, 'cost results hidden while prices blank');
  await ev(`(function(){
    var a=document.getElementById('priceAh'); a.value='250'; a.dispatchEvent(new Event('input',{bubbles:true}));
    var v=document.getElementById('priceVa'); v.value='12'; v.dispatchEvent(new Event('input',{bubbles:true}));
  })()`);
  await sleep(150);
  check(await visible('#costResults') === true, 'cost results shown after prices entered');
  check(await text('#costBattOut') === '203,250 BDT', "battery cost '203,250 BDT' (got " + await text('#costBattOut') + ')');
  check(await text('#costInvOut') === '36,000 BDT', "inverter cost '36,000 BDT' (got " + await text('#costInvOut') + ')');
  check(await text('#costTotalOut') === '239,250 BDT', "total cost '239,250 BDT' (got " + await text('#costTotalOut') + ')');

  // 7. validation: custom watts 0 rejected, no row added
  await ev(`(function(){
    document.getElementById('customName').value='Bad Heater';
    document.getElementById('customWatts').value='0';
    document.getElementById('customQty').value='1';
    document.getElementById('addCustomBtn').click();
  })()`);
  await sleep(150);
  check(await visible('#customErr') === true, 'inline error visible for watts 0');
  check(await ev("document.querySelectorAll('#appList li').length") === 6, 'invalid appliance not added');

  // 8. custom appliance add: 500W Test Heater -> total 1882W
  await ev(`(function(){
    document.getElementById('customName').value='Test Heater';
    document.getElementById('customWatts').value='500';
    document.getElementById('customQty').value='1';
    document.getElementById('addCustomBtn').click();
  })()`);
  await sleep(150);
  check(await ev("document.querySelectorAll('#appList li').length") === 7, 'custom appliance row added');
  check(await text('#totalWatts') === '1,882 W', "total '1,882 W' after custom add");

  // 9. delete one row (the heater) -> back to 1382W
  await ev(`(function(){document.querySelectorAll('#appList .icon-btn')[6].click();})()`);
  await sleep(150);
  check(await ev("document.querySelectorAll('#appList li').length") === 6, 'delete removes the row');
  check(await text('#totalWatts') === '1,382 W', 'total back to 1,382 W after delete');

  // 10. save setup + malformed import rejected with data intact
  await ev(`(function(){document.getElementById('saveName').value='Smoke Test Setup';document.getElementById('saveBtn').click();})()`);
  await sleep(150);
  check(await ev("document.querySelectorAll('#savedList li').length") === 1, '1 saved setup after save');
  await ev(`(function(){
    var f = new File(['{not json'], 'bad.json', {type:'application/json'});
    var dt = new DataTransfer(); dt.items.add(f);
    var inp = document.getElementById('importFile'); inp.files = dt.files;
    inp.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await sleep(300);
  const dm = String(await text('#dataMsg'));
  check(/not a valid|failed/i.test(dm), 'malformed import shows rejection (got "' + dm.slice(0, 50) + '")');
  check(await ev("document.querySelectorAll('#savedList li').length") === 1, 'saved data intact after bad import');

  // 11. erase-all requires typed DELETE
  await ev(`(function(){document.getElementById('eraseConfirm').value='delete';document.getElementById('eraseBtn').click();})()`);
  await sleep(150);
  check(await visible('#eraseErr') === true, 'wrong erase confirmation shows error');
  check(await ev("document.querySelectorAll('#savedList li').length") === 1, 'nothing erased on wrong confirmation');
  await ev(`(function(){document.getElementById('eraseConfirm').value='DELETE';document.getElementById('eraseBtn').click();})()`);
  await sleep(150);
  check(await ev("document.querySelectorAll('#savedList li').length") === 0, 'DELETE erases all saved setups');

  // 12. BN toggle: Bengali strings + digits + persistence
  await ev(`document.getElementById('langBtn').click()`);
  await sleep(200);
  check(await ev('document.documentElement.lang') === 'bn', 'html lang switches to bn');
  check(await ev("document.querySelector('h1').textContent") === '\u0986\u0987\u09aa\u09bf\u098f\u09b8 \u0993 \u09ac\u09cd\u09af\u09be\u099f\u09be\u09b0\u09bf \u09ac\u09cd\u09af\u09be\u0995\u0986\u09aa \u09b8\u09be\u0987\u099c\u09be\u09b0', 'BN H1');
  const bnTotal = String(await text('#totalWatts'));
  check(/[\u09E6-\u09EF]/.test(bnTotal), 'BN mode total uses Bengali digits (got ' + bnTotal + ')');
  const rl = waitLoad();
  await send('Page.reload');
  await rl; await sleep(500);
  check(await ev('document.documentElement.lang') === 'bn', 'BN mode restored after reload');
  check(await ev("document.querySelectorAll('#appList li').length") === 6, 'appliances persist after reload');
  check(String(await text('#totalWatts')).includes('\u09e7,\u09e9\u09ee\u09e8'), 'BN total persists as \u09e7,\u09e9\u09ee\u09e8 W after reload');

  // 13. 390px viewport: no horizontal overflow
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const rl2 = waitLoad();
  await send('Page.reload');
  await rl2; await sleep(500);
  const sw = await ev('document.documentElement.scrollWidth');
  const iw = await ev('window.innerWidth');
  check(sw <= iw, 'mobile viewport: no horizontal overflow (scrollWidth=' + sw + ' innerWidth=' + iw + ')');
  check(await ev("document.querySelectorAll('.result').length") === 7, '7 result cards render at 390px');

  // final error sweep
  check(consoleErrors.length === 0, 'zero console errors overall (got ' + consoleErrors.length + ': ' + consoleErrors.slice(0, 2).join(' | ') + ')');
  check(pageErrors.length === 0, 'zero page errors overall (got ' + pageErrors.length + ')');

  console.log(`\nsmoke: ${pass} passed, ${fail} failed`);
  if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log(' - ' + f)); }
  ws.close(); chrome.kill();
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('smoke harness error:', e.message); process.exit(2); });
