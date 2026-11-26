# Migrating from v1.0 to v1.1

v1.1 keeps the four public v1.0 concepts (`Chroms.Game`, `Chroms.Scene`, `Chroms.Sprite`, `Chroms.Text`) and the shape of `this.add` / `this.physics`, so most small games run unchanged. This page lists the behavioral differences that can still surprise you.

## Running v1.0 code

```js
class PlayScene extends Chroms.Scene {
  constructor() {
    super('PlayScene');
  }

  create() {
    this.player = this.add.sprite(380, 280, 40, 40, '#89b4fa');
    this.target = this.add.sprite(200, 150, 25, 25, '#f9e2af');
    this.scoreText = this.add.text(20, 35, 'Score: 0', {
      font: 'bold 22px sans-serif',
      color: '#cdd6f4'
    });
  }

  update(dt) {
    this.player.setVelocity(320, 0);
    if (this.physics.overlap(this.player, this.target)) {
      this.scoreText.setText('Score: 10');
    }
  }
}

new Chroms.Game({
  width: 800,
  height: 600,
  backgroundColor: '#1e1e2e',
  scene: [PlayScene]
});
```

This still works. `Sprite` objects without bodies are accepted by `physics.overlap` as static AABB proxies.

## What changed

### Scene lifecycle and cleanup

- `create()` now runs after `preload()` assets finish, not before a manual loader callback.
- Switching or restarting a scene **destroys** its objects and bodies, and clears `scene.tweens` / `scene.time`.
- A new `shutdown()` hook runs before destruction.
- `game.startScene` can take `{ fade }`.
- `scene.pause()`, `resume()`, `sleep()`, `wake()` exist.

If v1.0 code relied on scene objects surviving a switch, move that state to `game.storage`, a global, or the game-level managers.

### Physics

- Bodies now integrate in a fixed-step world **after** `scene.update()`. v1.0 moved sprites during rendering.
- Global/body gravity, acceleration, drag, max velocity, bounce, sensors, world bounds and tile collision are new.
- `physics.overlap(a, b)` is still a boolean query and still accepts body-less objects, but colliders that move objects must use real bodies.
- Persistent collisions use `physics.addCollider` / `physics.collide`; register them once.
- `sprite.setGravityY()` creates a body on demand. `updatePhysics()` (v1.0 internal) no longer exists.
- Rotation, origin and scale do not change the body; AABB only.

### Rendering and objects

- `draw(ctx)` overrides now receive local coordinates with `(0, 0)` at the object's top-left box (origin-adjusted), not absolute world coordinates.
- Text now defaults to `textBaseline = 'top'`. v1.0 used the canvas default (`alphabetic`), so text drawn at the same `y` sits roughly one line height lower/higher depending on font. Adjust `y` or set `style.baseline: 'alphabetic'`.
- `Sprite.x/y` are still top-left. `setOrigin()` is new and default is still `0, 0`.
- `depth`, `blendMode`, `scrollFactor`, animations, shapes, tilemaps, particles and UI objects are new.
- Scene children are sorted by depth; v1.0 drew insertion order.

### Scene manager

- v1.0 had a constructor patch that created scenes with no arguments. v1.1 calls `new SceneClass()` normally; `super('Key')` and `super({ key })` are both supported.
- Multiple scenes can be registered without immediately starting all of them; `startScene` is explicit.
- `scene.camera` is now a `Camera` instance instead of `{ x, y, zoom }`. Setting `camera.x/y/zoom` still works as world scroll/zoom, but use the methods for follow, bounds, shake and fades.

### Loader

- `load.start(onComplete)` still works; `load.start(onProgress, onComplete)` is new.
- The queue is drained after loading, and failures are collected in `loader.errors` instead of being silent.
- `spritesheet`, `atlas`, `json` and `text` were added.
- JSON/text loading uses `fetch` and therefore requires HTTP.

### Audio

- `sound.play(key, volume)` (numeric second argument) is still accepted.
- The preferred form is `sound.play(key, { volume, rate, loop, channel })`.
- `musicPlay`, `stopMusic`, volume controls and `beep` were added.
- `sound.play` now returns a handle (or `null`).

### Game loop

- `dt` is clamped and time-scaled.
- Physics uses its own accumulator; `scene.fixedUpdate(step)` runs deterministic fixed steps before `update`.
- `game.pause()` stops simulation but keeps rendering.
- `game.timeScale`, `game.time`, `game.tweens`, plugins, debug overlay, scaling modes and `screenshot()` are new.

## Version checks

```js
if (Chroms.version.startsWith('1.1')) {
  // use v1.1 APIs
}
```

`Chroms.VERSION` is also available.

## Known 1.0 quirks that are now fixed

- Loader no longer leaves a completed queue in place, so `start()` cannot re-run stale items.
- Sound handles are tracked and can be stopped.
- Failed images still fall back to colored rectangles but no longer stall the queue.
- Scene switching no longer leaves old objects and timers running.
- Canvas resizing keeps the aspect ratio and maps pointer coordinates correctly.
