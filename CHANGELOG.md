# Changelog

All notable changes to Chroms. The project follows semantic versioning.

## [1.2.2] — 2026-11-27

A bug-fix release that closes the remaining known issues from the 1.2 review. The API only grows: `scene.blockInput`, `scene.setBlockInput()`, `object.toLocal()`, `object.inScreenSpace()` and the tween `onStop` hook.

### Fixed

- Pointer input ignored scene state: hidden or paused scenes still received `setInteractive` clicks, buttons, sliders, toggles and joysticks, and `game.pause()` did not stop them. Input is now filtered by `scene.status === 'running'`, by `game.paused` and by `scene.blockInput` on any scene above.
- Hit tests used raw `x`/`y`, so interactive objects inside a `Container` were clickable at the wrong place (or not at all). `toLocal()` now walks the parent chain (position, rotation, scale, origin), and drag offsets are stored in the parent's space.
- Disabling input or emptying the interactive list dropped hover state without emitting `pointerout`, leaving `object.isHovered` stuck at `true`. The manager now emits `pointerout` for each object it forgets.
- `wake()` always resumed a sleeping scene as `running`, so a scene paused before `sleep()` silently restarted. `sleep()` remembers the status and `wake()` restores it.
- `camera.fadeOut()` / `fadeIn()` kept `_fadeTween` after the tween was stopped, and stopping a fade still ran `onComplete`. Stopped fades now clear the reference, and `Tween.stop()` calls an optional `onStop` instead of `onComplete`. `panTo()` / `zoomTo()` clear their references on stop as well.
- Starting a scene while another scene's assets were loading reset the shared loader queue, losing the new scene's queued assets. Starts are now queued (`scene-queued`) and drained when the load finishes.
- `Scene._render()` left the camera transform and a `save()` on the canvas stack when a child threw during the world pass. The pass is wrapped in `try/finally`.
- The error overlay drew under whatever transform was active when the exception happened. It now resets `setTransform`, `globalAlpha` and `globalCompositeOperation` before drawing.
- `_simulate` could step physics for a scene that had stopped itself inside `update()`. Running scenes are collected before updates and re-filtered afterwards.

### Changed

- `Sprite` caches its resolved frame per texture/frame key instead of calling `loader.getFrame()` on every draw.
- `ParticleEmitter.draw()` computes alpha/scale ranges and the flat color once per draw, not once per particle.
- `PhysicsWorld.step()` reuses one cache map (`_cacheStore`) instead of allocating a `Map` per step.

### Tests

- Regressions for scene-status and `blockInput` input gating, `game.pause()`, container hit tests, `onStop`, cancelled fades, the error-overlay transform reset, queued scene starts, reused physics cache and cached sprite frames.

### Docs

- Version bumped to 1.2.2 across the README, docs (en/ru), API manifest, `llms.txt`, demo pages and bundle header.
- Documented input gating, `blockInput`, the parent-aware hit tests, `onStop` and the scene-start queue.
- Documented the versioning and tag policy in the README: annotated tags only on release commits, and no version-like tag names for non-release commits.

## [1.2.1] — 2026-11-27

A patch release with five runtime fixes. No API changes.

### Fixed

- A scene put to `sleep()` stayed invisible after it was restarted, because scene cleanup never restored `camera.visible`.
- `camera.panTo()` was overwritten by `follow()` every frame: the follow lerp ran after the pan tween and reset the position. Following is now suspended while a pan is running and resumes when the pan ends.
- `sound.musicPause()` left the paused flag set after the track was stopped, so a new track reported `isMusicPlaying() === false` and `musicResume()` acted on a stale state. `musicPlay()` and `stopMusic()` reset it.
- `body.scene` was captured when the body was created, so `object.addTo(otherScene)` left the body tied to the old scene and scene-aware physics froze or simulated it incorrectly. The body now reads the owning scene from its object.
- The animation registry only dropped destroyed sprites. `anims.stop()`, `sprite.stop()` and a finished animation now unregister as well, so pooled sprites no longer accumulate; `anims.stopAll()` iterates a copy so it does not skip entries while unregistering.

### Tests

- Regressions for the slept-scene restart, `panTo` versus `follow`, the stale music-paused flag, reparented bodies and animation registry cleanup.

### Docs

- Version bumped to 1.2.1 across the README, docs (en/ru), API manifest, `llms.txt`, demo pages and the bundle header.
- The compatibility notes no longer claim that sliders are missing.

## [1.2.0] — 2026-11-26

A feature release: layered scenes, collision layers, UI widgets and richer input. Every 1.1.x API keeps working.

### Added — scenes

- Multiple active scenes: `game.launchScene(key)`, `scene.launch(key)`, `game.getActiveScenes()`, `game.sceneStack`, `bringToTop()` / `sendToBack()`, `scene.isActive()`, and the events `scene-launch`, `scene-bring-to-top`, `scene-sent-to-back`.
- All running scenes update and render in stack order (bottom to top); `game.currentScene` is the topmost one.
- Physics is scene-aware: bodies of paused or sleeping scenes are skipped while other scenes keep simulating.

### Added — physics

- Collision layers and masks: `body.collisionGroup`, `body.collidesWith`, `setCollisionGroup()`, `setCollidesWith()`, plus `world.setCollisionMatrix({ player: ['enemy'] })`. Honoured by colliders, `overlap()` and `collideNow()`.
- `world.moveTo(object, x, y, speed)` and `body.setVelocityFromAngle(degrees, speed)`.
- A per-step cache for body lists, so collider checks stop rebuilding arrays for every pair.

### Added — UI and rendering

- `add.slider`, `add.progressBar` and `add.toggle` with change callbacks, ranges, steps, disabled states and an animated toggle knob.
- `add.polygon(x, y, points, { color, stroke, closed })` with `containsPoint()` and `getArea()`.
- `sprite.setTint(color)` / `clearTint()`, cached per texture frame through an offscreen canvas.
- `tilemap.getObjects(layer)` and `tilemap.getObjectByName(name)` for object layers.

### Added — input

- `object.setInteractive({ onClick, onHover, onOut, onDown, onUp, hitArea, offsetX, offsetY })` emits `pointerover`, `pointerout`, `pointerdown`, `pointerup` and `click`, keeps `object.isHovered` in sync and unregisters on destroy.
- Key chords: `input.addKeyCombo(name, codes)`, `keyComboDown()`, `keyComboJustDown()`.
- `input.pointer.button` and pointer pressure.

### Added — effects, data, audio

- Tween `repeatDelay`.
- Color tweens now interpolate `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` values instead of flipping at 50%.
- `storage.export()` and `storage.import(snapshot, replace?)`.
- `sound.musicPause()`, `sound.musicResume()` and `sound.isMusicPlaying()`.

### Changed

- `removeScene(key)` stops and cleans the scene through the same path as `stopScene()`.
- `game.destroy()` shuts down every active scene, not only the current one.

### Docs

- README, English and Russian docs, `docs/api.json` and `docs/llms.txt` describe the 1.2.0 API.

### Tests

- Coverage for multi-scene launch/pause/reorder/stop, collision layers and matrix, steering helpers, slider/progress/toggle widgets, polygon geometry, sprite tinting, interactive pointer events, key chords, color tweens, `repeatDelay`, storage snapshots, music pause and tilemap object layers.

### Known limitations

- All active scenes share one physics world and one pointer; `input.pointer.worldX/Y` belongs to the last updated scene, so HUD scenes should use `setScrollFactor(0)`.
- Scenes load one at a time. A start requested while another scene was mid-load was not supported in 1.2.1; **resolved in 1.2.2**, where such starts are queued (`scene-queued`) and drained when the loader finishes.

## [1.1.3] — 2026-11-26

Small bug-fix release with manual stepping and a runtime error overlay.

### Added

- `game.step(dt?)` advances one frame (default `game.fixedStep`) outside `requestAnimationFrame`, so tests, replays, turn-based games and headless harnesses can drive the loop deterministically. `dt` is not clamped by `maxDelta`.
- Runtime error overlay: an exception thrown from `update()` or `render()` is caught, logged once, emitted as `game.events.on('error', (error, phase))`, drawn over the canvas and pauses the game. `game.lastError` holds message, stack, phase, frame and time; `game.clearError()` dismisses the overlay. Configure with `errorOverlay` (`{ show, title }`) or disable catching with `catchErrors: false`.

### Fixed

- `camera.zoomTo()` tweened `zoom` without its limits, so a small or negative target produced an infinite `worldView`. Zoom is now clamped to 0.05–20 while tweening and on completion, and a running zoom tween is stopped before a new one starts.
- `physics.stats.time` measured with `Date.now()` instead of `performance.now()`.
- `tween.complete()` on a yoyo tween started the return leg instead of finishing: it now applies the end value, fires `onComplete` and unregisters itself.
- A `pointercancel` (touch interrupted by the system, finger leaving the surface) left `input.pointer.isDown` stuck and kept drag state alive; `pointerup` and `pointercancel` now share one release path.

### Docs

- Version 1.1.3 across the README, API manifest, llms.txt, changelog and demos.
- Documented `game.step`, the error overlay, `errorOverlay` and `catchErrors`.

### Tests

- Regression coverage for `game.step`, zoom clamping, yoyo `complete()`, `pointercancel` and the paused error overlay.

## [1.1.2] — 2026-11-26

A bug-fix release with a small set of additions. Nothing in 1.1.1 is removed.

### Added

- `camera.panTo(x, y, duration, ease?)` glides the camera to a world position with a tween.
- `game.setPixelArt(true)` switches to crisp pixel-art rendering (no smoothing, one device pixel per game pixel); `setPixelArt(false)` restores the defaults.
- `game.toggleFullscreen()` requests or exits document fullscreen and resolves quietly when the browser blocks it.
- `group.getByName(name)` and `group.getClosest(x, y, aliveOnly?)` on `Group`.
- `anims.pauseAll()`, `anims.resumeAll()` and `anims.stopAll()` now drive every sprite that played an animation; previously `pauseAll` was a no-op.
- Particle `size` accepts `{ min, max }` and is sampled per particle.

### Fixed

- `TileSprite` applied its scroll offset twice on browsers without `CanvasPattern.setTransform`, shifting the tiles.
- Tween `hold` had no visible effect: yoyo and repeating tweens jumped back to their start value immediately instead of holding the end value.
- Physics colliders built from plain objects survived a scene switch and kept colliding in the next scene; colliders are now scoped to the current scene.
- `physics.stats.pairs` accumulated for the whole session instead of reporting pairs per step.
- Starting a second `camera.fadeIn()`/`fadeOut()` while one was running tweened the same alpha twice.
- `Body.setAllowGravity` was defined twice.
- `AnimationManager` kept a reference to every sprite that ever played an animation, including destroyed ones. A sprite now removes itself from the registry in `destroy()`, so long-running games no longer grow an unbounded sprite list.

### Docs

- Version 1.1.2 across the README, API manifest, changelog and demos.
- The README, docs and `Chroms.describe()` now state explicitly that the API is inspired by Phaser 3 (independent Canvas 2D implementation).

### Tests

- Regression coverage for tween hold, ranged particle size, animation manager control, group lookup, `panTo`, `setPixelArt`, the fullscreen guard and collider scene scoping.

## [1.1.1] — 2026-11-26

### Fixed

- Yoyo animations now finish after the return leg instead of looping forever, so `repeat: 0` completes and repeat counts work.
- The audio loader no longer reports progress twice when both `loadeddata` and `canplaythrough` fire for the same asset.
- Scene event listeners are removed when a scene is cleaned up, preventing duplicate handlers after `restart()` or repeated `startScene()` calls.
- Plugins from the game config are installed before the first scene is created, so `create()` can use them.

### Tests

- Added regression coverage for yoyo animation completion, plugin install order and scene-listener cleanup.

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
