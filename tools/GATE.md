# tools/gate.mjs: bot regression gate

`tools/smoke.mjs` answers "does the page load with 0 errors". `tools/gate.mjs` answers "does the game still play as
well as before, and can a phone reach its buttons". It exists because on 9 Nov an unreviewed commit made arrows do
0 damage to armoured enemies: the bot fell from wave 15 to wave 8 and smoke stayed green.

## What it checks

1. **sim**: loads the build in headless Chromium with `?auto&debug`, holds `requestAnimationFrame` so wall-clock
   frames cannot advance the game, calls the game's own fast-forward hook (`hisarSim(1260)`) and reads the metrics.
   The candidate runs twice; different numbers mean the sim is not deterministic and the gate fails (a comparison
   would be meaningless). The base runs once (skipped when it is byte-identical to the candidate). Each metric is
   compared with its tolerance (`abs` units or `rel` fraction it may drop, `max` ceiling, `info` not gated).
2. **layout**: at 390×844, 360×740 and 412×915 with `isMobile` + `hasTouch`, every visible element matching
   `GAME.layout.selectors` must be inside the viewport and be what `elementFromPoint` returns at its centre.
3. **console**: every run (sim and layout) must have 0 page errors, 0 console errors and 0 failed requests.
   Analytics and Google Fonts are answered with an empty 200, as in smoke.

Output: `ok` / `FAIL` / `KNOWN` / `note` lines, then `RESULT OK|FAIL`, exit 1 on FAIL. `GATE_JSON=<file>` also writes
a JSON report.

## Running

```sh
node tools/gate.mjs                       # base = origin/main:index.html, candidate = working tree
node tools/gate.mjs --base <ref>          # any git ref
node tools/gate.mjs --baseline            # base = tools/gate-baseline.json (no git base needed)
node tools/gate.mjs --record              # write tools/gate-baseline.json from the working tree (main only)
node tools/gate.mjs --candidate x.html    # test a scratch build without touching index.html
node tools/gate.mjs --only sim|layout
node tools/gate.mjs --strict-layout       # KNOWN layout offenders fail too
SMOKE_CDN_DIR=<npm package dir> ...       # serve three.js from a local copy (no CDN access)
```

Assets (models, images) always come from the working tree; only the entry HTML differs between base and candidate.
Runtime here (4 cores, shared, load average 25-35): 40-80 s per sim run; a full gate is about 4.5 min when the base is
identical (2 sim runs) and up to 9 min with a different base (3 sim runs); `--baseline --only sim` about 3 min.
Timeouts are generous and print as `infra: … timed out` (still a FAIL, never a pass); a whole-run watchdog stops at
15 min. CI runs it as the `gate` job in `.github/workflows/smoke.yml` (PR: base = `HEAD^1`, the base
branch; manual run: `--baseline`).

## This game (karagoz)

Ported from kale-savunmasi's `tools/gate.mjs`: the `GAME` block, plus one optional hook in the core,
`GAME.browserArgs` (extra Chromium flags; a config without it launches exactly as kale's). The timing paragraph above
is kale's.

Sim runtime: the bot scores every candidate move with `matchOf()`, which draws the puppet sprites into an 80x52
`willReadFrequently` (CPU) canvas and reads it back with `getImageData`. The sprites themselves sit on GPU-accelerated
canvases, so under SwiftShader each draw is a GPU readback: a CPU profile put 97 % of a run in `getImageData`
(234 of 241 s here; CI measured ~295 s a run, 11m12s for a gate with 2 runs, and a PR needing 3 runs would pass
`timeout-minutes: 15`). `browserArgs: ['--disable-accelerated-2d-canvas']` keeps every 2D canvas on the CPU: a run
takes ~10 s, with the same 24 scenes, the same metrics (64 stars, perScene 332233323313323331333333) and no change
to the game. `sim.timeoutMs` is back to kale's 240 s.

- **sim**: `?auto&noassets`. The bot goes title → map → scene → result → next for all 24 scenes, reading the same
  match % a player sees; saves are off under `?auto`. `window.karagozSim(60)` runs `update()` at 1/30 s and is
  repeated until `bot.done` (at most 6000 s). No `Math.random` in the rules or the bot (only in sound and the
  paper texture); `performance.now` only in rendering.
- **metrics**: `scenes` (solved, must stay 24), `stars` (sum: 1 solve + 1 par + 1 no hint per scene, may drop 1),
  `gameErrors` (max 0); `overPar`, `hints`, `moves`, `perScene` are info.
  Main 992adf1: scenes 24 · stars 64 · overPar 5 · hints 24 · moves 120 · perScene 332233323313323331333333,
  the same 24/24 and 64 stars as the full run in 76426a9's commit message.
- **Proof it fails**: the par star never awarded (`G.sc.par * 0` in `starsNow`) gives stars 64 → 45: `RESULT FAIL`.
- **layout**: `?scene=4&noassets` (a size-beat scene opened directly: the widest top bar, tray up), selectors
  `#hud button:not(:disabled)` and `#tray button:not(:disabled)`: 14 buttons, all inside and on top on main.
  Disabled buttons are skipped because they have `pointer-events: none` (undo before the first move), so
  `elementFromPoint` returns their parent. No known offenders. Not covered: the top bar's `.stats` overflow on
  phones (moves and stars cut off in scenes 4 and 16, faz-3 report 3.4) is text, not a button, and this check
  does not see it; it is still there on main (screenshot at 390×844, scene 4).

## Porting to another game

Copy `tools/gate.mjs` and edit only the `GAME` block at the top:

- `entry`, `cdn.match` / `cdn.pkg` (import-map CDN URL and the part before the path inside the npm package),
  `ignored` (requests answered empty).
- `sim.query`: URL flags that start the bot and expose the hook (`?auto&debug`, `?auto&sim`, …).
- `sim.ready` / `sim.run` / `sim.metrics`: in-page functions. `run` must be synchronous (or return a promise) and
  deterministic: fixed time step, seeded RNG, bot on. If the game only has a `?sim=N` URL flag that runs before the
  first frame, put it in `query` and make `run` a no-op. If the core runs in Node, a Node runner is cheaper, but keep
  the same output format.
- `sim.tolerance`: which metrics gate and how much they may drop. Prefer the bot's progress measure (wave, level,
  stars, day), a volume measure (kills, score) and an economy measure (gold, cash). Add the game's own error count
  with `max: 0`.
- `sim.holdFrames`: keep `true` unless the hook needs the render loop.
- `layout.query` / `layout.selectors`: a URL that shows the in-game HUD with no overlay, and the HUD's buttons.
- `layout.known`: only real, already-reported offenders, with the commit and the reason. Never add one to make a
  run green.

Checklist per game:

1. Find the hook (`grep -n "Sim\b\|?sim\|?auto\|selftest" index.html`) and check in the code that it uses a fixed step
   and a seeded RNG (no `Math.random`/`Date.now` in the update path).
2. Run `--only sim` twice on main: the determinism line must say `identical`.
3. Check the numbers against the game's README/report claims; if they differ, write down which is right.
4. `--record` on main and commit `tools/gate-baseline.json`.
5. Prove it fails: a scratch `--candidate` with a known regression (e.g. a revert of a bad relay commit, or damage × 0)
   must give `RESULT FAIL` on a sim metric. Keep the scratch file out of git.
6. Run the layout part; list existing offenders in `layout.known` with their source commit, or fix them first.
7. Add the `gate` job to the game's workflow (chromium only, `timeout-minutes`, `permissions: contents: read`,
   the already pinned `actions/checkout` and `actions/setup-node` SHAs, `fetch-depth: 2`).
