# Changelog

All notable changes to Chroms. The project follows semantic versioning.

## [1.1.0] — 2026-11-26

This release turns the v1.0 prototype into a complete small engine. The v1.0 API (`Game`, `Scene`, `add.sprite`, `add.text`, `physics.overlap`) continues to work.

### Added — core

- Fixed-step scene updates (`fixedUpdate`) and a fixed-step physics accumulator.
- Scene registry with `addScene`, `getScene`, `removeScene`, `startScene`, `stopScene`, `pauseScene`, `resumeScene`, `sleepScene`, `wakeScene`.
- Scene transitions with `{ fade, fadeColor }`.
- Automatic loading screen with progress bar and configurable style.
- Scaling modes `fit`, `letterbox`, `stretch`, `none`, pixel-ratio handling and pointer remapping.
- Game pause/resume, time scaling, screenshot, plugins, `destroy()`.
- Debug overlay (FPS, objects, bodies, scene, body boxes, pointer) toggled by a key.
- `Chroms.describe()` AI manifest, `docs/api.json`, `docs/llms.txt`.

### Added — objects and rendering

- `GameObject` transform system: origin, scale, rotation, alpha, depth, blend modes, visibility, active state, names, data bags, events, destruction.
- Screen-space HUD objects with `setScrollFactor(0)`.
- `Rect` with rounded corners and strokes, `Circle`, `Line`, `TileSprite`.
- `Text` with alignment, wrapping, fixed width, line spacing, stroke, shadow, background, padding and typewriter effect.
- `Container` parent transforms and `Group` collections with pooling helpers.
- `Button` with hover/press/disabled states and `Joystick` for touch controls.
- Sprite sheets, texture atlases, frame selection, flipping and animation playback.
- `AnimationManager` with frame ranges, frame rate, repeat, yoyo and callbacks.
- Depth sorting and camera-culled tilemap rendering.

### Added — physics

- `Body` with velocity, acceleration, gravity, drag, max velocity, bounce, immovable/static, sensors, world bounds, blocked flags and callbacks.
- `PhysicsWorld` with fixed stepping, persistent colliders, overlap pairs, one-shot queries, raycasts, rectangle/point queries, stats and debug flag.
- Group/array/object/body targets for colliders and queries.
- Tilemap collision resolution and `addTilemapCollider`.
- Collision events on the world, body and object level.

### Added — input

- Action bindings, key capture/release, multiple pointers, wheel delta.
- World-space pointer coordinates through the camera.
- Drag-and-drop for game objects.
- Gamepad polling helpers.
- Virtual joystick object.

### Added — effects and camera

- `TweenManager`/`Tween`: delays, yoyo, repeat, hold, dotted property paths, `{ from, to }`, 30+ easings, counters, sequential chains, per-tween and global time scales.
- `TimerManager`/`Timer`: delays, loops, repeats, named timers, pause/resume, progress.
- Particle emitters: speed/angle/lifespan ranges, colors, alpha/scale curves, gravity, zones, follow, textures, blend modes, bursts.
- Camera: follow with lerp, deadzone, offsets, bounds, zoom, zoom tweens, shake, fade in/out, flash, background color, world/screen conversion.

### Added — assets, audio, data

- Loader queues for images, audio, JSON, text, sprite sheets and atlases; progress and error reporting.
- Sound manager: SFX/music channels, per-play volume/rate, music fades, master/music/SFX volume, mute, WebAudio beeps, gesture unlock.
- `SaveManager` with localStorage, namespace and in-memory fallback.
- Seeded `Random`, `Vec2`, math helpers and easings.

### Added — content and tooling

- New arena demo (`index.html`) and multi-scene showcase (`examples/showcase.html`).
- English and Russian documentation, migration guide, AI agent guide, API manifest.
- `build.js` bundler from `src/` and a headless smoke test (`test/smoke.js`).

### Changed

- The game loop clamps and time-scales `dt`; physics runs after `scene.update()`.
- Scene switching destroys previous scene objects, bodies, tweens and timers.
- Text now defaults to `textBaseline: 'top'`.
- `scene.camera` is a `Camera` instance instead of a plain object.
- Custom `draw(ctx)` implementations receive local coordinates.
- `sound.play` returns a handle and accepts options (numeric volume still supported).
- Asset queue is drained after loading; failed assets are recorded and do not block `create()`.

### Fixed

- Loader no longer re-runs stale queue items after completion.
- Sound playback is tracked and can be stopped.
- Canvas resizing preserves aspect ratio and maps pointer coordinates correctly.
- Old scene objects/timers no longer leak across scene switches.
- Collision velocity response on the X axis and tile collision velocity response.

### Compatibility

- v1.0 scenes (`super('Key')`), factories, sprites, texts, `setVelocity`, `setGravityY`, `physics.overlap` and `load.start(callback)` remain supported.
- See `docs/en/migration.md` and `docs/ru/migration.md`.

### Known limitations

- Canvas 2D only; no WebGL, shaders or batching.
- AABB physics only; no rotated bodies, circles, joints or continuous collision detection.
- One camera per scene; no split-screen.
- No TMX/Tiled import, object layers or tile properties.
- No built-in text inputs, sliders, layouts or scroll views.
