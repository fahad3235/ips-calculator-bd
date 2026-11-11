# IPS Calculator BD — আইপিএস ও ব্যাটারি ব্যাকআপ সাইজার

Size the right IPS, battery and inverter for a home in Bangladesh — before
buying anything. Add your appliances, pick how many backup hours you need,
and the app tells you the energy, battery size and inverter size, with every
formula shown using your own numbers.

## Problem

Load shedding is a daily fact of life in Bangladesh, and IPS (Instant Power
Supply) shopping is mostly guesswork: shops sell whatever inverter and
battery they have in stock, and buyers discover too late that the battery
dies after 45 minutes or the inverter trips on the water pump. This tool
turns the sizing into honest arithmetic anyone can check.

## Features

1. **Appliance load builder** — 12 preset appliances with typical watts
   (ceiling fan 75 W, LED bulb 12 W, tube light 20 W, Wi-Fi router 10 W,
   LED TV 100 W, laptop 65 W, desktop PC 200 W, refrigerator 150 W,
   table fan 50 W, mobile charger 10 W, water pump 750 W, air cooler 150 W),
   each with quantity steppers and remove. Add custom appliances
   (name + 1–5000 W + qty 1–20). Live total load. Preset watts are labelled
   "typical — check your appliance label".
2. **Backup sizing** — backup hours (0.5–24), system voltage (12 V / 24 V),
   battery type (lead-acid 50% usable / lithium 80% usable), inverter
   efficiency (70–95%, default 85%). Outputs: energy needed (Wh), required
   battery (Ah, rounded up to 1 decimal), recommended inverter (VA, rounded
   up to the next standard size from 600 / 800 / 1000 / 1200 / 1500 / 2000 /
   3000 / 5000), plus a formula explainer showing your actual numbers
   substituted into each formula.
3. **Runtime estimator (reverse mode)** — enter battery Ah + voltage and see
   the estimated runtime for the current load, using the same DoD and
   efficiency settings.
4. **Cost estimator** — enter your local battery price per Ah and inverter
   price per VA (BDT). No prices are fabricated: blank prices show nothing,
   with an "enter local market prices" hint.
5. **Quick setups** — one tap: Basic home (2 fans + 3 LED bulbs + router,
   4 h), Home office (laptop + router + 2 lights + fan, 6 h), Full home
   (4 fans + 6 lights + TV + fridge + router + pump, 3 h).
6. **Saved setups** — save / load / delete named setups in localStorage,
   JSON export, strict import (bad files rejected with an error, data kept
   intact), and typed-`DELETE` erase-all.
7. **EN / বাংলা toggle** persisted in localStorage, with Bengali digits in
   Bengali mode. Responsive at 390 px mobile. Inline validation errors,
   empty / loading / error states throughout.

## Stack

Vanilla HTML + CSS + JavaScript. No build step, no framework, no network
requests — works from `file://` and from GitHub Pages.

## Prerequisites

Any modern browser. Node.js 18+ only if you want to run the unit tests.

## How to run

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## How to test

```sh
node --test tests/test.js   # unit tests for the sizing math
node tests/smoke.mjs        # headless-Chrome UI smoke test (CDP)
```

See `TEST_RESULTS.md` for the real outputs and hand-verified numbers.

## Formulas (with the hand-computed example)

Example load: 300 W, 4 h backup, 12 V, lead-acid, 85% efficiency.

- **Energy:** `Wh = totalW × hours ÷ (efficiency ÷ 100)`
  `300 × 4 ÷ 0.85 = 1,411.8 Wh`
- **Battery:** `Ah = Wh ÷ (voltage × DoD)`, DoD = 0.5 lead-acid, 0.8 lithium
  `1,411.8 ÷ (12 × 0.5) = 235.3 Ah` (rounded up to 1 decimal)
- **Inverter:** `raw VA = totalW × 1.25 ÷ 0.8`, then up to the next standard size
  `300 × 1.25 ÷ 0.8 = 468.8 VA → 600 VA`
- **Runtime:** `hours = (Ah × voltage × DoD × efficiency ÷ 100) ÷ totalW`
  `(235.3 × 12 × 0.5 × 0.85) ÷ 300 = 4.0 h` (reverse check of the example)

## Deployment

Static site — publish the folder on GitHub Pages (or any static host). No
server, no environment variables, no secrets.

## Limitations

- Preset wattages are typical values, not measurements — always check the
  label on your own appliance.
- Battery prices and inverter prices are entered by you; the app ships with
  no market prices and invents none.
- The sizing assumes a steady load; motor starting surges (e.g. pumps,
  fridges) are covered only by the 1.25× headroom factor.
- This tool is not a substitute for an electrician's advice, especially for
  wiring, earthing and battery ventilation.

## Status

MUSE Project Factory run #304 (12:00 slot, 2026-11-11). Built, tested and
verified locally; not yet published to GitHub (no repo created by this run).
