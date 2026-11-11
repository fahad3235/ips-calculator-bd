# TEST_RESULTS.md — IPS Calculator BD (run #304)

Date: 2026-11-11 (12:00 slot, Asia/Dhaka). All results below are real
outputs from commands run in this build directory.

## 1. ASCII check (all app sources must be pure ASCII)

```sh
grep -rP '[^\x00-\x7F]' index.html styles.css app.js
# -> no matches (ALL ASCII OK)
# 1,848 Bengali characters in app.js were converted to \uXXXX escapes
# with a Python one-liner before this check. README.md may contain
# Bengali and is excluded from this check.
node --check app.js   # JS SYNTAX OK
```

## 2. Node unit tests — 24/24 pass

```sh
node --test tests/test.js
# tests 24, pass 24, fail 0
```

Coverage: totalWatts (empty, 186 W, all three quick-setup totals),
canonical hand-computed case, DoD lead vs lithium, full-home sizing,
24 V halving, inverter standard-size boundaries, runtime estimator,
roundUp1, validation rejects, math throws on invalid input.

## 3. Hand-verified numbers (independent re-check)

Canonical case — 300 W, 4 h, 12 V, lead-acid, 85% efficiency:

| Quantity | Hand arithmetic | App / test |
|---|---|---|
| Energy | 300 × 4 ÷ 0.85 = 1,411.7647 | 1,411.8 Wh |
| Battery | 1,411.7647 ÷ (12 × 0.5) = 235.2941 | 235.3 Ah (round up) |
| Inverter raw | 300 × 1.25 ÷ 0.8 = 468.75 | → 600 VA |
| Runtime reverse | (235.3 × 12 × 0.5 × 0.85) ÷ 300 = 4.0001 | 4.0 h |

Full home — 1,382 W (4×75 + 6×12 + 100 + 150 + 10 + 750), 3 h, 12 V, lead, 85%:

| Quantity | Hand arithmetic | App / test |
|---|---|---|
| Energy | 1,382 × 3 ÷ 0.85 = 4,877.647 | 4,877.6 Wh |
| Battery | 4,877.647 ÷ 6 = 812.941 | 813.0 Ah |
| Inverter raw | 1,382 × 1.5625 = 2,159.375 | → 3,000 VA |

Lithium same canonical case: 1,411.7647 ÷ (12 × 0.8) = 147.06 → 147.1 Ah.
24 V same canonical case: 235.3 ÷ 2 = 117.7 Ah.
Runtime: 200 Ah, 12 V, lead, 85% @ 196 W → 1,020 ÷ 196 = 5.204 h.
Cost: 813.0 Ah × 250 BDT/Ah = 203,250 BDT; 3,000 VA × 12 BDT/VA = 36,000 BDT;
total 239,250 BDT.

## 4. Headless-Chrome smoke test — 54/54 pass, 0 console errors, 0 page errors

```sh
node tests/smoke.mjs
# smoke: 54 passed, 0 failed
```

Harness: raw CDP over the cached headless_shell binary
(`~/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell`),
`file://` URL. Note: `/opt/meta-chromium/chrome` could NOT be used here —
it exits immediately with "Hatch WebGL domain policy is required for
browser startup", so the harness was pointed at headless_shell instead.

Checks that ran: clean load (title, H1, zero console/page errors, zero
non-file:// resource requests, empty state, `0 W`, sizing dashes, no
desktop horizontal overflow); preset add (75 W → 352.9 Wh / 58.9 Ah @ 12V /
600 VA, explainer shows 58.9); qty stepper (150 W → 705.9 Wh); Full-home
quick setup (1,382 W → 4,877.6 Wh / 813.0 Ah @ 12V / 3,000 VA); runtime
0.7 h lead, 1.2 h lithium, battery 508.1 Ah lithium; cost hidden while
prices blank, then 203,250 + 36,000 = 239,250 BDT; watts-0 validation
rejected with no row added; custom 500 W appliance (1,882 W); delete row
back to 1,382 W; save setup (1 row); malformed JSON import rejected with
data intact; erase-all blocked on wrong confirmation, works on `DELETE`;
BN toggle (H1 in Bengali, Bengali digits, persisted across reload,
appliances persist, total ১,৩৮২ W after reload); 390 px viewport, no
horizontal overflow, 7 result cards render.

## 5. Repairs made

1. **Float precision (unit test, 1 failure):** `batteryAh(1200, 12, 0.8)`
   returned `124.99999999999999` instead of `125` — a float artefact, not a
   logic bug. Test changed to approximate comparison. 24/24 after fix.
2. **Thousands grouping (smoke test, 5 failures):** totals and inverter VA
   rendered ungrouped (`1382 W`, `3000 VA`) while the test expected grouped
   (`1,382 W`, `3,000 VA`). Fixed the app (not the test): totals, inverter
   VA, per-row watts, saved-setup meta and explainer now use the grouped
   `fmt(n, 0)` formatter. 54/54 after fix.
3. **Chrome binary (harness):** `/opt/meta-chromium/chrome` refused to
   start in this VM (WebGL domain policy error); switched the harness to
   the cached headless_shell binary. No app change needed.
