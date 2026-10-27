# Karagöz

**Play online:** https://furkiozknn.github.io/karagoz/ (desktop and phone, no install)

![Karagöz gameplay: moving puppets and lamps behind the shadow screen](docs/gameplay.gif)

A 3D shadow-theatre light puzzle about Karagöz and Hacivat, the two heroes of traditional Turkish shadow theatre. A small
wooden booth stands in a dim Ottoman coffee house at night. Behind its white cloth screen (the *perde*) you place, slide
and turn translucent coloured leather puppets and move or dim the oil lamps. Their shadows land on the cloth for the
audience in front. Each scene draws a story moment on the screen as a gold outline. Match it to 90% and the puppets act
out a short TR / EN dialogue while the audience laughs and claps.

One `index.html`, Three.js r170 from a CDN, no build step. Every mesh, texture and sound is generated in code.

Part of the **Claude Game Arena** (round 4).

## Screenshots

| | |
|---|---|
| ![Title](docs/01-title.png) | ![Backstage](docs/02-backstage.png) |
| ![Audience view](docs/03-audience.png) | ![Coloured lamps](docs/04-colour-lamps.png) |
| ![Act map](docs/05-act-map.png) | ![Phone](docs/06-phone.png) |

## Play

Serve the folder over http (ES modules do not load from `file://`):

```
python -m http.server 8000
# then open http://localhost:8000/
```

Works on desktop and phones (portrait and landscape) with mouse, touch and keyboard.

## How to play

- **The goal:** the gold dashed outline on the screen is the target picture. The live match % in the top bar compares
  the cloth with the target. At 90% the scene is solved.
- **Optics:** a puppet near the lamp casts a big, soft shadow. Near the cloth it casts a small, sharp one. Two lamps
  make two shadows. Coloured leather multiplies the light, so overlapping pieces mix their colours. With red and blue
  glass lamps, each lamp's shadow shows in the other lamp's colour.
- **Backstage view** (where you work): drag a puppet on its rail. Pulling it towards or away from the screen changes its
  depth. Click a lamp to dim it or put it out, and drag it along its rail to move it. The small picture in the corner shows
  what the audience sees.
- **Audience view:** drag a shadow to slide its puppet. Dragging up or down changes the depth.
- **Tray:** pick a piece or a lamp. The buttons next to the tray move, turn, dim or remove the selected one. Faded pieces
  are off stage: tap one to put it up.
- **Timed scenes (act IV):** the donkey, the boat and the djinn move along their tracks by themselves. Shift their
  timing with Earlier / Later. Their shadows must be on the target when the cue marker passes.
- **Stars:** one for solving, one for par or fewer moves, one for using no hint. A hint snaps one piece into place and
  costs a star.

24 scenes in 4 acts: *Mukaddime* (the garden), *Muhavere* (the boat), *Fasıl* (the witches and the djinn) and *Bitiş*
(the donkey). Each act adds new puppets, lamp types and mechanics. The scenes are one data table in the code. Every target
is rendered from a reference arrangement, so every scene can be solved.

### Keys

| Key | Action |
|---|---|
| Arrow keys | Move the selected piece (← → slide, ↑ further from the screen, ↓ nearer). On a lamp: ← → move it, ↑ ↓ brighten or dim it |
| `Q` / `E`, mouse wheel, two-finger twist | Rotate |
| `1`-`9` | Select a piece or lamp (an off-stage piece is put up) |
| `Del` / `Backspace` | Take a piece off stage |
| `Tab` (from the stage) or `V` | Toggle backstage / audience view (`Shift+Tab` reaches the buttons) |
| `Z` | Undo |
| `H` | Hint (costs a star) |
| `R` | Reset the scene |
| `P` / `Esc` | Pause |
| `M` / `X` / `L` | Music / effects / language |

## Flags

| Flag | Effect |
|---|---|
| `?auto` | A bot plays all 24 scenes to the end. It reads the same match % a player sees and makes one move at a time |
| `?debug` | fps, draw calls, triangles, GPU name and JS errors on screen; exposes `window.karagozSim(seconds)` and `window.karagozDebug` |
| `?sim=N` | Fast-forward N seconds of simulation before the first frame |
| `?low` | Low quality: shadows off, pixel ratio 1, smaller screen texture, half the dust particles |
| `?scene=N` | Jump straight to scene N (1-24) |
| `?view=aud` | Start in the audience view |
| `?lang=en` / `?lang=tr` | Force the language (Turkish is the default) |
| `?nosave` | Do not write to `localStorage` |
| `?noassets` | Accepted for the arena test suite. The game ships no asset files, so it changes nothing |

Live state is on `window.karagoz`. Settings are saved under `arena.karagoz.settings`, progress (stars per scene and the
scene in progress) under `arena.karagoz.save`, and the best star total under `arena.karagoz.best`.

## How it works

- **Shadows:** each puppet is a set of 2D leather polygons with perforations. At startup every puppet is baked into a
  "transmission" sprite: white where light passes freely, the leather colour where it is filtered, dark at the outlines.
  For each lamp, a canvas layer is filled with the lamp colour and every puppet sprite is drawn on it with `multiply`. The
  sprite is scaled by the point-light projection `s = D / (D - p)` around the lamp and blurred by the penumbra of the
  flame (`r · p / (D - p)`). The lamp layers are then added together. The result is the cloth texture of the 3D screen.
- **Match:** the same renderer draws the current arrangement and the reference arrangement into an 80×52 offscreen
  canvas. The score is a weighted Jaccard index of per-pixel, per-channel darkness, times a brightness factor that
  catches wrongly dimmed lamps.
- **3D:** a flat-shaded, vertex-coloured coffee house merged into a few draw calls: instanced audience silhouettes, one
  directional light from the screen (1024 shadow map), lamp point lights backstage and soft-sprite dust motes.
- **Audio:** Web Audio only. A ney (breathy sine with vibrato and band-passed noise) plays a melody in makam Hicaz over a
  tef (frame drum with zils) in an 8-beat usul. There are also a drone, the nareke whistle, synthesised audience laughs
  (formant-filtered sawtooth syllables), applause grains, cloth rustles and lamp clinks.

## Performance

Targets 60 fps on an Intel UHD 620 at 1280×720. The pixel ratio is capped at 1.5, and there is one shadow-casting
directional light with a 1024 map over the audience area. The room is merged geometry, the audience is instanced and
there is no post-processing. The screen texture is redrawn only when something on it changes (every frame only in the
timed act IV scenes, capped near 30 Hz). Measured numbers are in the round report.

## How it was made

Built by Claude Opus 5.5 with Claude Code from one prompt: `prompts/karagoz.md`.

## License

MIT, see `LICENSE`.
