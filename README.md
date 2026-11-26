# Chroms Engine v1.1.1

A small, dependency-free 2D game engine for the browser. It renders with Canvas 2D, ships as one file, and is designed for two audiences: people who want a readable Phaser-like API, and AI agents that need a predictable, documented surface.

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

## What is in 1.1

v1.0 was a four-class proof of concept. v1.1 is a complete small engine:

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
- [Migrating from 1.0](docs/en/migration.md)

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

## Design notes

- Canvas 2D, one file, no runtime dependencies, no build step required at runtime.
- Gameplay coordinates are pixels with the origin at the top-left and `y` growing down.
- API angles are degrees; math helpers use radians. Durations are milliseconds.
- Physics is axis-aligned (AABB); rotated sprites use their unrotated box.
- Everything is single-threaded and deterministic apart from `Math.random` / the seeded `Random`.
- Scene switches destroy scene objects and scene-scoped timers/tweens; use game-level managers for persistence across scenes.

## License

No license file is included in this repository. Add one before distributing.
