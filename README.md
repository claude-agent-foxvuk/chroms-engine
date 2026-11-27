# Chroms Engine v1.2.2

A small, dependency-free 2D game engine for the browser. It renders with Canvas 2D, ships as one file, and is designed for two audiences: people who want a readable API, and AI agents that need a predictable, documented surface.

The API is **inspired by Phaser 3** — `Scene` subclasses with `preload`/`create`/`update`, an `add` factory, groups, tweens, timers, a camera and AABB physics. The implementation is independent: Phaser is not bundled, required or imported, and Chroms stays Canvas 2D only.

```html
<script src="chroms.js"></script>
<script>
  class GameScene extends Chroms.Scene {
    constructor() {
      super('GameScene');
    }
    create() {
      this.physics.setBounds(0, 0, 800, 600);
      this.player = this.add.circle(400, 300, 20, '#89b4fa');
      this.player.enablePhysics({ collideWorldBounds: true });
      this.add.text(20, 20, 'Hello, Chroms', { fontSize: 24, color: '#cdd6f4' });
    }
    update() {
      let vx = 0;
      let vy = 0;
      if (this.input.isDown('ArrowLeft')) vx -= 200;
      if (this.input.isDown('ArrowRight')) vx += 200;
      if (this.input.isDown('ArrowUp')) vy -= 200;
      if (this.input.isDown('ArrowDown')) vy += 200;
      this.player.setVelocity(vx, vy);
    }
  }

  new Chroms.Game({
    width: 800,
    height: 600,
    scene: [GameScene],
    backgroundColor: '#181825'
  });
</script>
```

## Feature overview

Chroms started in v1.0 as a four-class proof of concept. The current release covers:

- **Game core** — fixed-step loop, scene registry, fade transitions, loading screen, scaling modes, pause/resume, screenshot, plugins, debug overlay, event bus.
- **Scenes** — `init → preload → create → update → fixedUpdate → shutdown`, pause/sleep/wake, restart, object factories, groups and containers.
- **Game objects** — sprites, images, sprite sheets, atlases, text (wrap/stroke/shadow/typewriter), rectangles with rounded corners, circles, lines, tile sprites, buttons, virtual joystick, animated sprites, HUD `setScrollFactor(0)`.
- **Physics** — AABB bodies with gravity, acceleration, drag, bounce, sensors, world bounds, persistent colliders, overlap checks, raycasts, spatial queries, tilemap collision, collision events.
- **Camera** — follow with lerp and deadzone, bounds, zoom, shake, fade-in/out, flash, world/screen conversion.
- **Effects** — property tweens with 30+ easings, yoyo/repeat/delay/hold, timelines, counters, timers, particle emitters with zones/colors/gravity/blend modes.
- **Input** — keyboard state, action bindings, pointer/touch with world coordinates, wheel, drag-and-drop, gamepad polling.
- **Assets & audio** — images, audio, JSON, text, sprite sheets, texture atlases, progress/errors; music/SFX channels, fades, mute, WebAudio beeps.
- **Tilemaps** — JSON maps, layers, tinted color tiles or sprite-sheet tiles, per-layer collision, dynamic tile edits.
- **Persistence & math** — localStorage save manager, seeded RNG, vectors, angle/distance helpers, 30+ easings.
- **AI support** — `Chroms.describe()` runtime manifest plus [`docs/llms.txt`](docs/llms.txt) and [`docs/api.json`](docs/api.json).

## What changed in 1.2.2

A bug-fix release. The API only grows: `scene.blockInput` / `scene.setBlockInput()` and a tween `onStop` hook.

- **Input is scene-aware.** Paused and sleeping scenes no longer react to clicks, `game.pause()` stops widget and `setInteractive` input, and `scene.setBlockInput(true)` lets a modal scene swallow pointer input for the scenes below it. Objects that lose hover while input is disabled now get `pointerout`.
- **Hit tests follow containers.** `setInteractive`, buttons, toggles, sliders and joysticks inside a `Container` (including rotated and scaled parents) use the same transform as rendering, and a drag keeps the offset in the parent's space instead of jumping.
- **Transforms are exact.** `object.toLocal(x, y)` and `object.inScreenSpace()` convert scene points into an object's own space through the whole parent chain.
- **Fades and pans clean up.** `wake()` restores a scene that was paused before `sleep()`; stopped pan, zoom and fade tweens clear their references, and a cancelled fade tween no longer calls `onComplete` — use the new `onStop` config instead.
- **Scene starts wait for the loader.** `startScene()` / `launchScene()` during an asset load are queued (event `scene-queued`) instead of resetting the loader, then drained when the load completes.
- **Errors cannot corrupt the frame.** A throwing world pass restores the canvas state (`try/finally`), the error overlay resets the transform, alpha and composite mode before drawing, and the overlay survives a camera transform.
- **Frame order and cost.** `_simulate` collects running scenes before updating, so a scene stopped inside `update()` gets no physics step; sprite frame lookups are cached, particle draw hoists emitter ranges and colors out of the particle loop, and the physics step reuses its cache map instead of allocating one per step.

## What changed in 1.2.1

A patch release with five runtime fixes and no API changes:

- A scene that was `sleep()`-ed stayed invisible after a restart; scene cleanup now restores `camera.visible`.
- `camera.panTo()` is no longer overwritten every frame by `follow()`; following pauses for the pan and resumes after it.
- `sound.musicPause()` no longer leaves the paused flag set on a stopped track, so `isMusicPlaying()` and `musicResume()` stay correct.
- `body.scene` now follows the object, so `object.addTo(otherScene)` keeps scene-aware physics in the right scene.
- Stopped and finished animations unregister from the animation registry, so pooled sprites no longer accumulate there.

## What is new in 1.2.0

- **Multiple active scenes** — `scene.launch(key)` starts an overlay or HUD over a running scene, `game.getActiveScenes()` returns the stack in render order, `bringToTop()` / `sendToBack()` reorder it, `scene.isActive()` checks membership. Paused or sleeping scenes keep their bodies frozen automatically.
- **Collision layers** — `body.setCollisionGroup('player')`, `body.setCollidesWith(['enemy'])` and `world.setCollisionMatrix({ player: ['enemy'], enemy: ['player'] })`.
- **UI widgets** — `add.slider`, `add.progressBar`, `add.toggle` with change callbacks, values, steps and disabled states.
- **Rendering** — `add.polygon(points, { color, stroke })` with `containsPoint()` and `getArea()`, and `sprite.setTint(color)` / `clearTint()` (cached per frame).
- **Pointer events on any object** — `object.setInteractive({ onClick, onHover, onOut, onDown, onUp })` emits `pointerover`/`pointerout`/`pointerdown`/`pointerup`/`click`; `input.pointer.button` reports the mouse button.
- **Key chords** — `input.addKeyCombo('dash', ['ShiftLeft', 'KeyD'])` with `keyComboDown()` / `keyComboJustDown()`.
- **Tweens** — `repeatDelay`, plus real color interpolation for `'#rrggbb'` / `rgb()` strings.
- **Data and audio** — `storage.export()` / `storage.import(snapshot)`, `sound.musicPause()` / `musicResume()` / `isMusicPlaying()`.
- **Tilemaps** — object layers via `tilemap.getObjects(layer)` and `getObjectByName(name)`.
- **Physics** — `physics.moveTo(object, x, y, speed)`, `body.setVelocityFromAngle(deg, speed)`, per-frame body caching for collider checks.

See [CHANGELOG.md](CHANGELOG.md) for details.

## What changed in 1.1.3

- `game.step(dt?)` advances one frame by hand, outside `requestAnimationFrame` — for tests, replays and turn-based play.
- Runtime error overlay: an exception in `update()`/`render()` is caught, logged once, emitted as `game.events.on('error')`, drawn over the canvas and pauses the game. `game.clearError()` dismisses it; `catchErrors: false` rethrows.
- Fixes: `camera.zoomTo()` clamps the zoom, `tween.complete()` finishes yoyo tweens, `physics.stats.time` uses `performance.now()`, `pointercancel` releases the pointer and any drag.

See [CHANGELOG.md](CHANGELOG.md) for details.

## What changed in 1.1.2

- Fixes: `TileSprite` scroll offset, tween `hold`, colliders leaking across scene switches, per-step collision stats, double camera fades, a duplicated `Body` method.
- Additions: `camera.panTo()`, `game.setPixelArt()`, `game.toggleFullscreen()`, `group.getByName()`/`getClosest()`, working `anims.pauseAll()`/`resumeAll()`/`stopAll()`, ranged particle `size`.

See [CHANGELOG.md](CHANGELOG.md) for details.

The demo [`index.html`](index.html) and [`examples/showcase.html`](examples/showcase.html) use shapes only, so they run offline.

## Docs

English (primary):

- [Documentation home](docs/en/index.md)
- [Getting started](docs/en/getting-started.md)
- [Core concepts](docs/en/core-concepts.md)
- [Game & scenes](docs/en/game-and-scenes.md)
- [Game objects](docs/en/game-objects.md)
- [Input & physics](docs/en/input-and-physics.md)
- [Effects & camera](docs/en/effects-and-camera.md)
- [Assets, audio, storage](docs/en/assets-audio-storage.md)
- [Tilemaps](docs/en/tilemaps.md)
- [Guide for AI agents](docs/en/ai-agents.md)
- [Migration and upgrades](docs/en/migration.md)

Русская документация: [docs/ru/index.md](docs/ru/index.md).

## Project layout

```
chroms.js          built single-file engine (do not edit by hand)
src/*.js           source modules, concatenated in filename order
build.js           node build.js -> chroms.js
index.html         arena demo (repository entry point / landing page)
examples/          focused multi-scene mini-games
test/smoke.js      headless smoke test with DOM/canvas stubs
docs/              English + Russian docs, llms.txt, api.json
```

`index.html` stays at the repository root on purpose: it is the default landing demo and the natural entry point for GitHub Pages or a static host. `examples/` holds smaller scenes that each focus on one subsystem (physics, particles, tilemaps).

## Build, run, test

```bash
node build.js       # rebuild chroms.js
node --check chroms.js
node test/smoke.js  # headless smoke test (physics, tweens, UI, tilemaps)
```

Serve the folder with any static server for JSON/audio assets:

```bash
python -m http.server 8080
# or: npx serve .
```

## Releases, versions and tags

- The version lives in `package.json`, `src/00-core.js` (`VERSION`), the generated banner of `chroms.js`, the README and docs headers, `docs/api.json`, `docs/llms.txt` and both demo pages. Bump all of them in the same commit, then run `node build.js`.
- A release is one commit that bumps the version, fills in `CHANGELOG.md` and ships the rebuilt bundle. That commit gets a single annotated tag `vMAJOR.MINOR.PATCH`.
- Only releases are tagged. A commit that does not change the version — a docs refresh, or a fix that lands after a release was already tagged — gets no tag of its own: it is inside the history of the next release tag, so `git log v1.1.3` and release diffs already contain it. Avoid version-like names such as `v1.2.1+docs.1`, which readers and tooling take for a release that never existed.
- Use annotated tags (`git tag -a v1.2.2 -m "Chroms 1.2.2: ..."`), not lightweight ones, so `git describe` and GitHub Releases have a message and a tagger date.
- Checklist: bump the version everywhere → `node build.js` → `node --check chroms.js` → `node test/smoke.js` → update `CHANGELOG.md` and the README's "What changed" section → commit → tag → `git push origin main --tags`.

## Design notes

- Canvas 2D, one file, no runtime dependencies, no build step required at runtime.
- Gameplay coordinates are pixels with the origin at the top-left and `y` growing down.
- API angles are degrees; math helpers use radians. Durations are milliseconds.
- Physics is axis-aligned (AABB); rotated sprites use their unrotated box.
- Everything is single-threaded and deterministic apart from `Math.random` / the seeded `Random`.
- Scene switches destroy scene objects and scene-scoped timers/tweens; use game-level managers for persistence across scenes.

## License

No license file is included in this repository. Add one before distributing.
