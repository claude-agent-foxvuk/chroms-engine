# Core concepts

## The frame

The game runs a single `requestAnimationFrame` loop. Each frame:

1. Input frame edges are collected (`justDown` / `justUp`).
2. `dt` is clamped to `maxDelta` (default `0.1` s) and multiplied by `game.timeScale`.
3. Scene tweens and scene timers update.
4. The scene's `fixedUpdate(step)` runs zero or more times in fixed chunks (`game.fixedStep`, default 1/60 s, max 8 chunks per frame).
5. `scene.update(dt)` runs once.
6. Every active child object updates (`Sprite` animations, particles, buttons, joystick, group children).
7. The camera follow/shake logic updates.
8. The physics world advances with its own fixed accumulator (`physics.fixedStep`, default 1/120 s) and resolves registered colliders.
9. Global tweens/timers update.
10. The scene renders and input frame edges are cleared.

Because physics runs after `scene.update`, velocities set in `update()` are applied in the same frame's physics step and are visible in the render that follows. Collision callbacks also fire after `update()`.

## Units and coordinates

| Thing | Unit |
| --- | --- |
| Positions, sizes, velocities | pixels, pixels/second |
| Gravity, acceleration, drag | pixels/second² |
| `dt` | seconds |
| Tween and timer durations | milliseconds |
| Camera shake/flash/fade durations | milliseconds |
| `object.angle`, `setAngle`, particle angles, `Camera` rotation-like APIs | degrees |
| `Math` helpers (`angleBetween`, `distance`, vectors) | radians |
| Physics stepping | seconds (`1/120` internally) |

Coordinates start at the top-left of the game with `y` growing downwards. The canvas has a logical size (`game.width`, `game.height`); the browser may scale it via CSS, and input is converted back into logical coordinates.

## Origins and transforms

Every game object has `x`, `y`, `width`, `height`, `originX`, `originY`, `scaleX`, `scaleY`, `angle`, `alpha`, `visible`, `active`, `depth` and `blendMode`.

- The default origin is the **top-left** corner (`0, 0`), matching v1.0.
- `setOrigin(0.5)` centers the object visually around its `x, y`. It does not move the physics body.
- `angle` is in degrees and rotates around the origin.
- Negative `scaleX`/`scaleY` mirror the object.
- `displayWidth = width * abs(scaleX)`, `centerX = x + displayWidth * originX`.
- Physics bodies use `object.x` / `object.y` plus `body.offsetX` / `offsetY`; scale, angle and origin do **not** resize or rotate the body.

```js
const label = this.add.text(400, 40, 'Centered', { fontSize: 24 });
label.setOrigin(0.5, 0.5);
```

## Rendering order

Scene children are sorted by ascending `depth` (default `0`). Equal depths keep insertion order.

```js
this.background.setDepth(-100);
this.player.setDepth(10);
this.hud.setDepth(1000).setScrollFactor(0);
```

Objects with `scrollFactorX === 0` and `scrollFactorY === 0` are rendered in a second, screen-space pass **after** all world objects. This is the HUD layer: it ignores camera position, zoom and shake. Depth sorting is done separately inside the world pass and the HUD pass, so a depth of `-5` HUD object still draws above a depth-`9999` world object.

Containers and groups sort their own children by depth. A container's transform applies to its children; a group is a flat world-space collection.

## The object/body split

A `GameObject` exists without physics. `enablePhysics()` creates a `Body` and registers it in the shared `PhysicsWorld`.

```js
const box = this.add.rect(100, 100, 40, 40, '#89b4fa');
box.setVelocity(120, 0);       // creates a body automatically
box.body.bounce = 0.6;         // direct access is fine
box.enablePhysics({ immovable: true }); // replaces the auto-created body
```

Convenience methods (`setVelocity`, `setGravityY`, `setBounce`, `setImmovable`, `setCollideWorldBounds`, ...) create a body on first use. That keeps v1.0 code working.

## Lifecycle and cleanup

```js
class Level extends Chroms.Scene {
  init(data) {}      // data is whatever startScene/start received
  preload() {}       // queue assets
  create() {}        // runs after loading
  update(dt) {}
  fixedUpdate(step) {}
  shutdown() {}      // run before the scene is destroyed
}
```

- `create()` runs once per activation, after `preload()` assets finish (or synchronously if none were queued).
- `shutdown()` runs before the scene's objects are destroyed on switch/stop. Remove DOM listeners or external subscriptions here.
- Scene switching **destroys** all scene children, bodies, scene tweens and scene timers. Nothing in the scene survives a restart.
- `game.tweens`, `game.time`, `game.anims`, `game.storage`, `game.sound`, `game.load` and the physics world are game-level and survive.
- The physics world keeps its gravity, bounds and collider list until changed; scene bodies and scene colliders are removed automatically.

## Time

`dt` is already affected by `game.timeScale`. Additional scales exist independently:

```js
game.setTimeScale(0.5);   // slow motion for everything
game.tweens.timeScale = 2; // double-speed tween animations
scene.time.timeScale = 0.5; // half-speed timers
physics.timeScale = 0.25;   // slow physics only
```

`scene.time` is a per-scene `TimerManager`; `game.time` is a global one. Same for `scene.tweens` and `game.tweens`.

## Events

The game, each scene, each game object, the input manager and the sound manager expose an event emitter with `on`, `once`, `off`, `emit`.

```js
this.events.on('update', (dt) => {});
this.player.events.on('destroy', (object) => {});
this.player.events.on('collide', (other) => {});
this.game.events.on('scene-create', (scene) => {});
this.game.events.once('ready', (game) => {});
```

See the event tables in [game-and-scenes.md](game-and-scenes.md), [input-and-physics.md](input-and-physics.md) and [assets-audio-storage.md](assets-audio-storage.md).

## Pausing

- `game.pause()` freezes simulation, tweens, timers and physics for every scene, but keeps rendering. Input frame edges are still cleared each frame.
- `scene.pause()` freezes only that scene's `_update` and physics stepping; rendering continues.
- `scene.sleep()` also skips rendering via `camera.visible = false`; `wake()` restores it.
- `game.pauseOnHidden` (default `true`) skips simulation when `document.hidden` is true.

To pause from a key press while the game paused, use a DOM listener (the engine still renders while paused, but `scene.update` does not run):

```js
this._pauseKey = (e) => {
  if (e.code === 'Escape') game.togglePause();
};
window.addEventListener('keydown', this._pauseKey);
// remove it in shutdown()
```

## Determinism

The loop timing is not deterministic, but gameplay randomness can be:

```js
const rng = new Chroms.Random(1234); // or game.random with config.seed
rng.int(1, 6);
rng.pick(['a', 'b']);
rng.shuffle(array);
```

`Chroms.Math` uses `Math.random`; use a `Random` instance when sequences must be reproducible.
