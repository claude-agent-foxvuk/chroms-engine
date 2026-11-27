# Chroms Engine v1.2.1 — documentation

Chroms is a dependency-free 2D engine for the browser. It draws with Canvas 2D, ships as a single `chroms.js`, and keeps gameplay code in `Scene` subclasses.

The API is inspired by **Phaser 3**: scenes with `preload`/`create`/`update`, an `add` factory, groups, tweens, timers and a camera. It is an independent Canvas 2D implementation — Phaser is not bundled, imported or required, and none of its code is used.

The API is documented for humans first, and the repository also ships machine-readable material for AI agents: [`llms.txt`](../llms.txt), [`api.json`](../api.json) and the runtime `Chroms.describe()` manifest.

## Install

```html
<script src="chroms.js"></script>
```

No package manager, bundler or transpiler is required. The engine is an IIFE that exposes `window.Chroms` and, when loaded through CommonJS, `module.exports`.

For JSON, text and audio assets, serve the folder over HTTP (browsers block `fetch` on `file://`):

```bash
python -m http.server 8080
# http://localhost:8080
```

## 60-second example

```html
<script src="chroms.js"></script>
<body style="margin:0;background:#11111b"></body>
<script>
  class Play extends Chroms.Scene {
    constructor() {
      super('Play');
    }

    preload() {
      // this.load.image('hero', 'assets/hero.png');
    }

    create() {
      this.physics.setBounds(0, 0, 800, 600);
      this.player = this.add.rect(380, 280, 36, 36, '#89b4fa', 8);
      this.player.enablePhysics({ collideWorldBounds: true });

      this.orbs = this.add.group();
      this.score = 0;
      this.scoreText = this.add
        .text(16, 16, 'Score 0', { fontSize: 20, color: '#cdd6f4' })
        .setScrollFactor(0);

      for (let i = 0; i < 5; i += 1) {
        this.orbs.create(
          Chroms.Math.randomInt(40, 740),
          Chroms.Math.randomInt(60, 540),
          16,
          16,
          '#f9e2af'
        );
      }

      this.physics.overlapPair(this.player, this.orbs, (player, orb) => {
        orb.destroy();
        this.score += 10;
        this.scoreText.setText('Score ' + this.score);
        this.camera.shake(120, 4);
        this.sound.beep({ frequency: 620, slideTo: 880, duration: 0.08 });
      });
    }

    update() {
      let vx = 0;
      let vy = 0;
      if (this.input.isDown('ArrowLeft') || this.input.isDown('KeyA')) vx -= 260;
      if (this.input.isDown('ArrowRight') || this.input.isDown('KeyD')) vx += 260;
      if (this.input.isDown('ArrowUp') || this.input.isDown('KeyW')) vy -= 260;
      if (this.input.isDown('ArrowDown') || this.input.isDown('KeyS')) vy += 260;
      this.player.setVelocity(vx, vy);
    }
  }

  const game = new Chroms.Game({
    width: 800,
    height: 600,
    backgroundColor: '#181825',
    scene: [Play]
  });
</script>
```

## Documentation map

| Document | What it covers |
| --- | --- |
| [Getting started](getting-started.md) | Files, scene skeleton, first platformer, assets, UI |
| [Core concepts](core-concepts.md) | Lifecycle, loop, coordinates, origin, depth, screen space, units |
| [Game & scenes](game-and-scenes.md) | `Game` config/methods/events, loading, scaling, scene manager, groups |
| [Game objects](game-objects.md) | Sprite, Text, shapes (incl. Polygon), TileSprite, Container, Group, Button, Joystick, slider/progress/toggle, animations |
| [Input & physics](input-and-physics.md) | Keyboard/chords/pointer/gamepad, interactive objects, bodies, collision layers, colliders, raycasts, tile collision |
| [Effects & camera](effects-and-camera.md) | Tweens, easings, timelines, timers, particles, camera follow/shake/fade |
| [Assets, audio, storage](assets-audio-storage.md) | Loader queues, progress, sheets/atlases, music/SFX, `game.storage` |
| [Tilemaps](tilemaps.md) | Map format, layers, rendering, solid tiles, dynamic edits |
| [AI agents](ai-agents.md) | Recommended reading order, invariants, code recipes, validation loop |
| [Migration and upgrades](migration.md) | 1.0 → 1.1 behavior changes and 1.1 → 1.2 notes |

Russian translation: [`../ru/index.md`](../ru/index.md).

## Feature map

**Core** — `Chroms.Game`, fixed physics stepping, `requestAnimationFrame` loop, scene registry, fade transition, loading overlay, scale modes (`fit`, `letterbox`, `stretch`, `none`), pause/resume, speed control, screenshot, plugins, event bus, debug overlay.

**Scenes** — `init`, `preload`, `create`, `update`, `fixedUpdate`, `shutdown`; pause/resume/sleep/wake/restart; factory API; groups and containers; per-scene tweens/timers cleared on switch; `setScrollFactor(0)` HUD layer.

**Rendering** — colored rectangles (rounded), circles, lines, text (wrap, align, stroke, shadow, background, typewriter, multi-line), images, sprite sheets, atlases, tile sprites, depth sorting, alpha, blend modes, rotation, scale, origin, camera transform, sprite flipping, particles.

**Physics** — AABB bodies with gravity, acceleration, drag, max velocity, bounce, immovable/static, sensors, world bounds, scripts; fixed-step world; persistent collider registration; overlap queries; nearest-hit raycasts; rectangle/point queries; tilemap collision; collision events.

**Input** — key state and frame edges, action binding, key capture, multiple pointers, touch via pointer events, wheel, gamepad polling, draggable objects, virtual joystick.

**Audio** — queue-loaded audio, SFX/music channels, per-playback volume and rate, fades, mute, master/music/SFX volumes, WebAudio tone generator.

**Data** — localStorage save manager with memory fallback, seeded RNG, vectors, math helpers, easing library, scene/object `data` bags.

**Tooling** — `Chroms.describe()`, `docs/llms.txt`, `docs/api.json`, a headless smoke test, a browser showcase.

**1.2.0 additions** — multiple active scenes (`scene.launch`, `bringToTop`, `isActive`, `game.getActiveScenes`), collision groups/masks (`setCollisionGroup`, `setCollidesWith`, `setCollisionMatrix`), UI widgets (`add.slider`, `add.progressBar`, `add.toggle`), `add.polygon`, `sprite.setTint`, `object.setInteractive` with pointer events, key chords, `repeatDelay` and color tweens, `storage.export/import`, `musicPause/musicResume`, tilemap object layers, `physics.moveTo`.

**1.2.1 fixes** — a slept scene renders again after a restart, `camera.panTo()` outranks an active `follow()`, the music-paused flag no longer sticks to a stopped track, `body.scene` follows `object.addTo()` and stopped or finished animations leave the animation registry.

**1.1.3 additions** — `game.step(dt?)` for manual frames, a runtime error overlay (`game.lastError`, `game.clearError()`, `game.events.on('error')`, `catchErrors: false`), plus zoom clamping in `camera.zoomTo()` and `pointercancel` handling.

**1.1.2 additions** — `camera.panTo(x, y, ms, ease?)`, `game.setPixelArt(bool)`, `game.toggleFullscreen()`, `group.getByName(name)`, `group.getClosest(x, y, aliveOnly?)`, `anims.pauseAll/resumeAll/stopAll`, ranged particle `size`.

## Compatibility and limits

Chroms targets current evergreen browsers. It deliberately stays small:

- Canvas 2D only (no WebGL, shaders, sprite batching or render textures).
- AABB physics only; object rotation does not rotate the body and circles collide as boxes.
- One camera per scene (`scene.camera`; `scene.cameras` is an array of length 1).
- No built-in text input, scroll views or layout engine.
- No TMX/Tiled file parser; tilemaps use the JSON format in [tilemaps.md](tilemaps.md).
- Rendering and logic share one thread; no workers.
- Scene switching destroys the previous scene's objects, tweens and timers.
- All active scenes share one physics world and one input pointer; `input.pointer.worldX/worldY` belongs to the last scene updated in the frame.

## Version

Current version: **1.2.1**. `Chroms.version` and `Chroms.VERSION` expose it at runtime.
