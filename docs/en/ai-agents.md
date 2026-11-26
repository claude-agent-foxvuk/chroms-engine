# Guide for AI agents

Chroms is designed to be written by LLMs without guesswork. This page is the shortest path from a prompt to working code, plus the invariants that are easy to get wrong.

## Read order

1. This file.
2. [`../llms.txt`](../llms.txt) — compact API map.
3. [`../api.json`](../api.json) — machine-readable classes and methods.
4. At runtime: `console.log(Chroms.describe())` returns the same manifest the engine ships.

The engine is a classic script. Do not use `import`/`require` in browser code. All APIs are on `window.Chroms`. There is no JSX, no TypeScript and no bundler.

## Canonical skeleton

```html
<script src="chroms.js"></script>
<script>
  class MainScene extends Chroms.Scene {
    constructor() {
      super('MainScene');
    }

    preload() {
      // queue assets only
    }

    create() {
      // build objects once
    }

    update(dt) {
      // read input, set velocities, spawn, UI
    }
  }

  new Chroms.Game({
    width: 800,
    height: 600,
    backgroundColor: '#181825',
    scene: [MainScene]
  });
</script>
```

If the prompt does not provide assets, build everything from `add.rect`, `add.circle`, `add.line` and `add.text`. Never reference a texture key without loading it in `preload`.

## Invariants

- Coordinates: pixels, top-left origin, `y` down.
- `object.angle` and `setAngle()` are degrees. `Math.atan2` and `Math.angleBetween` return radians.
- Tween/timer/camera-effect durations are milliseconds. `update(dt)` receives seconds.
- Physics is AABB. Rotation and `setOrigin` do not affect the body. `isCircle` is cosmetic.
- Physics steps **after** `update()`. Collision events and `body.blocked` appear after the step.
- Register persistent colliders once in `create`, never inside `update`.
- `physics.collide(a, b, cb)` separates; `physics.overlapPair(a, b, cb)` only reports. `physics.overlap(a, b)` is a boolean one-shot.
- Scene switch/restart destroys all scene objects, bodies, scene tweens and scene timers.
- Scene tweens/timers are on `scene.tweens` / `scene.time`; global ones are `game.tweens` / `game.time`.
- Text origin is top-left by default; call `setOrigin(0.5)` to center. HUD needs `setScrollFactor(0)`.
- Input frame edges (`justDown`, `justUp`) are only reliable inside `update()` or object `update()` methods.
- Assets must be queued in `preload`; `create` runs after loading.
- `load.json` and `load.text` use `fetch` and need HTTP; images/audio do not.

## API quick map

```js
// Setup
const game = new Chroms.Game({ width, height, backgroundColor, scene: [S], gravity, debug });

// Scene
this.add.sprite(x, y, w, h, textureOrColor);
this.add.image(x, y, key, { width, height });
this.add.rect(x, y, w, h, color, radius);
this.add.circle(x, y, radius, color);
this.add.line(x1, y1, x2, y2, color, lineWidth);
this.add.text(x, y, string, { font, fontSize, color, wordWrapWidth, align });
this.add.container(x, y);
this.add.group({ runChildUpdate, maxSize, classType });
this.add.particles(x, y, config);
this.add.tilemap(dataOrKey, x, y);
this.add.button(x, y, w, h, label, { onClick });
this.add.joystick(x, y, { radius });
this.add.existing(object);

// Bodies and colliders
player.enablePhysics({ gravityY, immovable, bounce, collideWorldBounds, isSensor });
player.setVelocity(vx, vy); player.setVelocityX(vx);
player.setGravityY(900); player.setBounce(0.3); player.setImmovable(true);
this.physics.setGravity(0, 1200);
this.physics.setBounds(0, 0, worldW, worldH);
this.physics.addCollider(player, platforms);
this.physics.overlapPair(player, coins, (player, coin) => {});
this.physics.collideTilemap(player, map);
this.physics.raycast(x1, y1, x2, y2, { targets });

// Input
this.input.isDown('KeyA');
this.input.isJustDown('Space');
this.input.pointer.x, .y, .worldX, .worldY, .isDown, .justDown;
this.input.addAction('jump', ['Space', 'KeyW']);
this.input.actionDown('jump');

// Effects
this.tweens.add({ targets, x, y, alpha, scaleX, scaleY, angle, duration, ease, yoyo, repeat, onComplete });
this.tweens.addCounter({ from, to, duration, onUpdate });
this.time.delayedCall(ms, fn);
this.time.loop(ms, fn);
this.add.particles(x, y, config).explode(n);

// Camera
this.camera.follow(player, { lerpX, lerpY, offsetX, offsetY });
this.camera.setBounds(0, 0, w, h);
this.camera.shake(ms, pixels);
this.camera.flash(color, ms);
this.camera.zoomTo(zoom, ms);

// Persistence / audio
game.storage.save('best', score);
game.storage.load('best', 0);
this.sound.play('jump', { volume, rate });
this.sound.beep({ frequency: 440, duration: 0.1 });
```

## Recipes

### Top-down arena

```js
create() {
  this.physics.setGravity(0, 0);
  this.physics.setBounds(0, 0, 800, 600);
  this.player = this.add.rect(380, 280, 36, 36, '#89b4fa', 8);
  this.player.enablePhysics({ collideWorldBounds: true });
  this.enemies = this.add.group();
  this.physics.addCollider(this.player, this.enemies, (p, e) => this.hit(e));
  this.time.loop(1200, () => this.spawnEnemy());
}

update() {
  let x = 0;
  let y = 0;
  if (this.input.isDown('KeyA')) x -= 1;
  if (this.input.isDown('KeyD')) x += 1;
  if (this.input.isDown('KeyW')) y -= 1;
  if (this.input.isDown('KeyS')) y += 1;
  if (x || y) {
    const l = Math.hypot(x, y);
    x = (x / l) * 280;
    y = (y / l) * 280;
  }
  this.player.setVelocity(x, y);
}
```

### Platformer

```js
create() {
  this.physics.setGravity(0, 1200);
  this.player = this.add.rect(100, 400, 32, 44, '#89b4fa', 6);
  this.player.enablePhysics().setMaxVelocity(240, 900);

  this.platforms = this.add.group();
  [[0, 540, 1600, 60], [300, 420, 180, 24]].forEach(([x, y, w, h]) => {
    const p = this.add.rect(x, y, w, h, '#45475a', 4);
    p.enablePhysics({ immovable: true });
    this.platforms.add(p);
  });

  this.physics.addCollider(this.player, this.platforms);
  this.camera.follow(this.player, { lerpX: 0.12, lerpY: 0.12 });
  this.camera.setBounds(0, 0, 1600, 600);
}

update() {
  let vx = 0;
  if (this.input.isDown('ArrowLeft')) vx = -240;
  if (this.input.isDown('ArrowRight')) vx = 240;
  this.player.setVelocityX(vx);
  if (this.input.isJustDown('Space') && this.player.body.blocked.down) {
    this.player.setVelocityY(-500);
  }
}
```

### HUD

```js
create() {
  this.hud = this.add.text(16, 16, 'Score 0', { fontSize: 20, color: '#cdd6f4' })
    .setScrollFactor(0)
    .setDepth(1000);
}
```

### Particles and feedback

```js
pickup(x, y) {
  const burst = this.add.particles(x, y, {
    speed: { min: 80, max: 220 },
    lifespan: { min: 250, max: 600 },
    frequency: -1,
    size: 4,
    colors: ['#f9e2af', '#fab387'],
    blendMode: 'lighter'
  });
  burst.explode(16);
  this.time.delayedCall(700, () => burst.destroy());
  this.camera.shake(100, 3);
}
```

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `this.physics.addCollider(...)` inside `update` | Register once in `create`; remove in `shutdown` if needed |
| Moving objects by changing `x` while a body exists | Use `setVelocity`/`body.velocity` (the body syncs from `x` but does not follow `x` with velocity) |
| Expecting `blocked.down` immediately after `setVelocityY` | Check it in the next `update` after the physics step |
| Using `overlap` for collectibles and expecting separation | Use `overlapPair`; separation is for `collide` |
| Adding a HUD text without `setScrollFactor(0)` | It scrolls/zooms with the camera |
| Referencing a texture key that is not preloaded | The sprite falls back to a plain color; load it or use colors |
| Starting music before a click | Browsers block autoplay; call from a button/click handler |
| Loading JSON from `file://` | Serve over HTTP |
| Keeping state in scene objects across `startScene` | It is destroyed; use `game.storage` or globals |
| Reusing a scene's `scene.time` timer after restart | Timers are cleared; create new ones in `create` |

## Validation loop for generated games

1. Run `node --check chroms.js` after rebuilding if you edited sources (`node build.js`).
2. Run `node test/smoke.js`; it exercises rendering, physics, tweens, timers, particles, groups, tilemaps, input and storage.
3. Open `index.html` in a browser or serve the folder, and check the console for runtime errors.
4. If no assets are available, verify every texture key has a color/shape fallback.
5. Check the four numbers: canvas size, player spawn, world bounds and camera bounds.

## Prompting Chroms

Useful constraints to give an agent:

```text
Write a single HTML file using chroms.js (classic script, no imports).
Use Chroms.Scene with preload/create/update. Use shapes only (no external assets).
Top-down movement with WASD, collectibles via physics.overlapPair, HUD via
setScrollFactor(0), score persisted with game.storage. Keep the whole game in one file.
```

If the output needs assets, ask for a `preload()` queue and exact file paths; otherwise the engine will render placeholder colors and the game will still run.
