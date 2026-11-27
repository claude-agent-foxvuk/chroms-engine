# Input and physics

## Keyboard

Input is read from `scene.input`, which is the shared `game.input`.

```js
this.input.isDown('ArrowLeft');   // held
this.input.isJustDown('Space');   // pressed this frame only
this.input.isJustUp('KeyR');      // released this frame only
this.input.isAnyDown(['KeyA', 'ArrowLeft']);
this.input.areDown(['ShiftLeft', 'KeyW']);
```

Keys are `KeyboardEvent.code` values (`KeyA`, `Digit1`, `ArrowUp`, `Space`, `Escape`, `ShiftLeft`, `F1`, ...). The frame edges are cleared at the end of every game loop.

```js
update() {
  if (this.input.isJustDown('Escape')) this.game.togglePause();
  if (this.input.isJustDown('Space')) this.jump();
}
```

### Actions

Map semantic names to key combinations:

```js
this.input.addAction('left', ['ArrowLeft', 'KeyA']);
this.input.addAction('right', ['ArrowRight', 'KeyD']);
this.input.addAction('jump', ['Space', 'ArrowUp', 'KeyW']);
this.input.addAction('dash', ['ShiftLeft']);

update() {
  if (this.input.actionDown('jump')) this.jump();
  if (this.input.actionJustDown('dash')) this.dash();
}
```

Methods: `addAction(name, codes)`, `setKeybinding(name, codes)`, `actionDown`, `actionJustDown`, `actionJustUp`. The input manager and the game emit `action-down` / `action-up` with `(name, code)`.

### Key chords

Actions are OR-lists (any listed key presses the action). Chords are AND-lists (every key must be held):

```js
this.input.addKeyCombo('dash', ['ShiftLeft', 'KeyD']);
this.input.addKeyCombo('screenshot', ['ControlLeft', 'ShiftLeft', 'KeyS']);

update() {
  if (this.input.keyComboDown('dash')) this.dash();
  if (this.input.keyComboJustDown('screenshot')) this.saveShot();
}
```

`keyComboDown` is level-triggered; `keyComboJustDown` is true on the frame the chord becomes complete (or when an already-held chord gains a key).

### Capturing keys

Browsers scroll with arrows and space. Capture what your game uses:

```js
this.input.capture(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
this.input.releaseCapture('Space');
```

## Pointer and touch

```js
const p = this.input.pointer;
p.x, p.y;             // canvas/logical coordinates (screen space)
p.worldX, p.worldY;   // converted through scene.camera
p.isDown;
p.justDown;           // pressed this frame
p.justUp;             // released this frame
p.downTime;           // performance.now() at press
p.button;             // 0 left, 1 middle, 2 right (last pointerdown)
this.input.wheelDelta;
this.input.pointers;  // Map<pointerId, {x, y, isDown}>
```

`worldX/worldY` are refreshed at the start of each scene update, so they are current inside `update()` and in button/joystick updates. Pointer events use `pointerdown`, `pointermove`, `pointerup` on the canvas, so mouse, pen and touch share one API. A second finger appears in `input.pointers` but the primary pointer tracks the first active press.

```js
update() {
  if (this.input.pointer.justDown) {
    const { x, y } = this.camera.screenToWorld(
      this.input.pointer.x,
      this.input.pointer.y
    );
    this.spawnAt(x, y);
  }
}
```

### Drag and drop

```js
this.input.enableDrag(this.card, {
  dragX: true,          // false locks the axis
  dragY: true,
  onDragStart: (object) => object.setDepth(999),
  onDrag: (object, pointer) => {},
  onDragEnd: (object) => object.setDepth(1)
});

this.input.disableDrag(this.card);
// or: this.card.setDraggable(true, { onDragEnd: ... });
```

Dragging uses screen coordinates for HUD objects and world coordinates for camera-space objects. It does not use physics constraints; the object is positioned directly.

### Interactive objects

Any game object can emit pointer events without a `Button` wrapper:

```js
const card = this.add.rect(200, 160, 120, 160, '#313244', 10)
  .setScrollFactor(0)
  .setInteractive({
    onClick: (object, pointer) => this.playCard(object),
    onHover: (object) => object.setScale(1.05),
    onOut: (object) => object.setScale(1),
    onDown: (object) => object.setAlpha(0.85),
    onUp: (object) => object.setAlpha(1),
    hitArea: (x, y) => x >= 0 && y >= 0 && x <= 120 && y <= 160   // local px
  });

card.isHovered;          // kept in sync by the input manager
card.disableInteractive();
```

Events: `pointerover`, `pointerout`, `pointerdown`, `pointerup`, `click`, emitted on the object with `(object, pointer)`. Hit testing uses the object's own box unless `hitArea` is supplied (`offsetX`/`offsetY` shift the box). `destroy()` unregisters automatically. Objects inside a `Container` are tested with their local coordinates, so give them an explicit `hitArea` or keep them at the container origin.

## Gamepad

Gamepads are polled every frame by the game:

```js
const pad = this.input.gamepad(0);      // Gamepad or null
this.input.gamepadDown(0, 0);           // A / cross, pad index optional
this.input.gamepadAxis(0, 1);           // left stick Y
```

`this.input.gamepads` is refreshed each frame. Buttons are read as pressed objects or numeric values.

## Physics overview

`scene.physics` is a shared `PhysicsWorld`. Bodies are axis-aligned bounding boxes. The world steps with a fixed accumulator (`physics.fixedStep`, default 1/120 s, `maxSubSteps` default 6) after `scene.update()`.

```js
const player = this.add.rect(100, 100, 32, 48, '#89b4fa');
player.enablePhysics({
  gravityY: 0,
  bounce: 0.2,
  dragX: 600,
  maxVelocityX: 300,
  collideWorldBounds: true
});
```

### Body config

| Key | Default | Meaning |
| --- | --- | --- |
| `width`, `height` | object size | Body size (independent of the sprite size) |
| `offsetX`, `offsetY` | `0` | Body offset from the object's top-left |
| `velocityX/Y` | `0` | Initial velocity |
| `accelerationX/Y` | `0` | Constant acceleration |
| `dragX/Y` | `0` | Deceleration toward zero |
| `maxVelocityX/Y` | `Infinity` | Speed caps |
| `gravityX/Y` | `0` | Extra gravity on top of the world value |
| `bounce` | `0` | `0..1` restitution |
| `allowGravity` | `true` | Disable world/own gravity |
| `immovable` | `false` | Static platform; not integrated |
| `collideWorldBounds` | `false` | Clamp against `physics.bounds` |
| `isSensor` | `false` | Reports overlaps, never separates or blocks |
| `isCircle` | `false` | Stored flag only; **collision is still AABB** |
| `collisionGroup` | `null` | Layer name used by masks and the collision matrix |
| `collidesWith` | `null` | Array, `Set` or `'*'` of groups this body may hit |
| `enabled` | `true` | Disable physics temporarily |

### Body API

```js
const body = player.body;
body.setVelocity(120, 0);
body.setVelocityX(0);
body.setAcceleration(0, 900);
body.setDrag(400, 0);
body.setMaxVelocity(250, 900);
body.setGravityY(600);
body.setBounce(0.4);
body.setImmovable(true);
body.setCollideWorldBounds(true);
body.setSensor(false);
body.setEnabled(false);
body.setSize(28, 46).setOffset(2, 2);

body.setCollisionGroup('player');
body.setCollidesWith(['enemy']);      // array, Set or '*'
body.setVelocityFromAngle(-90, 300);  // degrees, speed
body.scene;                           // owning scene; follows object.addTo()

body.speed;                   // velocity length
body.centerX, body.centerY;
body.blocked.up/down/left/right;
body.collisionCount;
body.onCollide = (other, selfBody) => {};
body.onWorldBounds = (selfBody) => {};
body.destroy();
```

`blocked` is reset at the start of each physics integration and set by separation. In `update()` it reflects the previous step, which is what jumping checks use.

### World configuration

```js
this.physics.setGravity(0, 1200);
this.physics.setBounds(0, 0, 3200, 600);
this.physics.clearBounds();
this.physics.timeScale = 0.5;
this.physics.enabled = false;
this.physics.debug = true;
```

Collision layers and steering:

```js
this.physics.setCollisionMatrix({
  player: ['enemy', 'wall'],
  enemy: ['player', 'wall'],
  bullet: ['enemy'],
  wall: '*'
});

this.physics.moveTo(this.enemy, this.player.x, this.player.y, 180);
this.enemy.body.setVelocityFromAngle(45, 240);
```

`setCollisionMatrix(null)` clears the mask. Bodies without a group count as `'default'`; a body with `collidesWith` ignores groups that are not listed. When a scene is paused or sleeping, `physics.step()` skips its bodies automatically.

Properties: `gravity` (Vec2), `bounds`, `bodies`, `colliders`, `fixedStep`, `maxSubSteps`, `enabled`, `timeScale`, `stats { steps, pairs, time }`. Events: `collision`, `world-bounds`.

### Colliders

Register a pair **once**. The world checks it every step; colliders persist until removed or the scene is cleaned up.

```js
const handle = this.physics.collide(this.player, this.platforms, (player, platform) => {
  // called on every contacting step (after separation)
});

this.physics.overlapPair(this.player, this.coins, (player, coin) => {
  coin.destroy();
});

handle.pause();
handle.resume();
handle.remove();
```

- `collide(a, b, callback?)` — persistent, separates bodies.
- `overlapPair(a, b, callback?)` — persistent, reports only.
- `addCollider(a, b, callback?, { overlapOnly })` — low-level registration.
- `removeCollider(handleOrCollider)`.
- `collideNow(a, b, callback?)` — one-shot separation, returns `true` if any pair hit.
- `overlap(a, b)` — one-shot boolean query.

`a` and `b` may be a game object, a `Body`, a `Group`, an array, or a plain object with `x/y/width/height` (treated as a static proxy for queries). For persistent colliders, give objects real bodies.

Callbacks receive `(objectA, objectB)`. `world.events` also emits `collision(objectA, objectB)` for every contact. Object-level events:

```js
player.events.on('collide', (other) => {});
player.events.on('overlap', (other) => {});
```

The same contact can be reported on several consecutive steps while bodies remain in contact. Use sensors/overlap callbacks with care in one-shot logic (destroy, flags, cooldowns).

### Raycasts

```js
const hit = this.physics.raycast(0, 300, 800, 300, {
  targets: this.enemies,     // optional: object/group/array/body
  includeSensors: false
});

if (hit) {
  hit.object;      // game object
  hit.body;
  hit.x, hit.y;    // world point
  hit.distance;
  hit.normalX, hit.normalY;
}
```

Without `targets`, every body is tested. The nearest hit wins.

### Queries

```js
const bodies = this.physics.queryRect(100, 100, 200, 200);
const underPointer = this.physics.queryPoint(pointer.worldX, pointer.worldY);
```

Both return `Body[]`; read `.object` for the game object. Only registered bodies are returned (plain objects are not in the world).

### Tilemap collision

```js
update() {
  this.physics.collideTilemap(this.player, this.map);
  // or register once:
  // this.physics.addTilemapCollider(this.player, this.map, (player, tile) => {});
}
```

`collideTilemap` resolves the object against solid tiles and returns the number of hit tiles. It needs `map.getSolidTilesInRect` (provided by `Tilemap`). See [tilemaps.md](tilemaps.md).

## Patterns

### Top-down movement

```js
update() {
  let x = 0;
  let y = 0;
  if (this.input.isDown('KeyA')) x -= 1;
  if (this.input.isDown('KeyD')) x += 1;
  if (this.input.isDown('KeyW')) y -= 1;
  if (this.input.isDown('KeyS')) y += 1;
  if (x || y) {
    const len = Math.hypot(x, y);
    x = (x / len) * 260;
    y = (y / len) * 260;
  }
  this.player.setVelocity(x, y);
}
```

### Platformer jump

```js
if (this.input.isJustDown('Space') && this.player.body.blocked.down) {
  this.player.setVelocityY(-520);
}
```

### Moving platform caveat

Immovable bodies do not carry riders automatically. Move the platform manually and add the player's position by the same delta, or make the player a child of the platform conceptually. There is no built-in platform-riding constraint.

### Limits

- AABB only, no rotated bodies, no convex polygons, no joints/constraints.
- No continuous collision detection; very fast objects can tunnel. Use smaller steps (`physics.fixedStep`), shorter bodies, or raycasts.
- Sensors do not participate in separation but still need a registered collider to report.
- `isCircle` does not change collision shape.
