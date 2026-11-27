# Game objects

All drawable objects extend `GameObject`. Objects are created through the scene factories, which also add them to the scene.

## GameObject

```js
const box = this.add.rect(100, 100, 40, 40, '#89b4fa');
box.setPosition(200, 150)
   .setScale(1.2)
   .setOrigin(0.5)
   .setAngle(15)
   .setDepth(10)
   .setName('box');
```

### Transform and display fields

| Field | Default | Notes |
| --- | --- | --- |
| `x`, `y` | factory args | Top-left-origin position in world pixels |
| `width`, `height` | factory args | Untransformed size |
| `originX`, `originY` | `0, 0` | Transform pivot |
| `scaleX`, `scaleY` | `1` | Negative values mirror |
| `angle` | `0` | Degrees |
| `alpha` | `1` | `0..1` |
| `visible`, `active` | `true` | Inactive objects skip updates and collisions; invisible skip drawing |
| `depth` | `0` | Higher draws later within the same pass |
| `blendMode` | `'source-over'` | Any canvas composite operation |
| `scrollFactorX/Y` | `1` | `0` on both axes = HUD/screen space |
| `body` | `null` | Assigned by `enablePhysics()` |
| `name`, `data` | `''`, `{}` | Lookup label and free-form data |
| `displayWidth`, `displayHeight` | computed | Size after scale |
| `centerX`, `centerY`, `right`, `bottom` | computed | Origin-aware bounds |
| `worldX`, `worldY` | computed | Position including parent container |
| `inScreenSpace()` | method | `true` when this object or an ancestor has scroll factor `0` |
| `toLocal(x, y)` | method | Scene point → this object's space (parents, rotation, scale, origin applied) |

### Methods

| Method | Description |
| --- | --- |
| `setPosition(x, y?)`, `setX`, `setY` | Position |
| `setSize(w, h?)` | Change dimensions without re-measuring text |
| `setScale(sx, sy?)`, `setOrigin(ox, oy?)`, `setAngle(deg)`, `setRotation(rad)` | Transform |
| `setAlpha(a)`, `setVisible(bool)`, `setActive(bool)`, `setDepth(n)`, `setBlendMode(mode)` | Display |
| `setScrollFactor(x, y?)` | `0` pins to screen; use both axes as 0 |
| `setName(name)`, `setData(key, value)`, `setData(object)`, `getData(key)`, `hasData`, `incData` | Metadata |
| `addTo(scene)` | Move to a scene |
| `enablePhysics(config?)` → `Body` | Attach a body (replaces an existing one) |
| `disablePhysics()` | Remove the body |
| `setVelocity`, `setVelocityX/Y`, `setAcceleration`, `setDrag`, `setBounce`, `setGravityY`, `setImmovable`, `setMaxVelocity`, `setCollideWorldBounds` | Physics shortcuts; create a body on demand |
| `setDraggable(bool, options?)` | Pointer drag |
| `setInteractive(options?)`, `disableInteractive()` | Emit pointer events on this object; `isHovered` stays in sync |
| `getBounds()` | Display AABB |
| `distanceTo(target)`, `angleTo(target)` | Helpers (accept object or `[x, y]`) |
| `destroy()` | Remove from scene/parent/group, destroy body, emit `destroy` |

Object events: `destroy`, `collide` (other), `overlap` (other), `tile-collide` (tilemap, count), `animationstart`, `animationframe`, `animationcomplete`, `typecomplete`, `pointerover`, `pointerout`, `pointerdown`, `pointerup`, `click` (the last five only after `setInteractive`).

## Sprite

A colored rectangle or a texture. Sprites also play animations.

```js
const hero = this.add.sprite(120, 300, 32, 48, 'hero-sheet');
hero.setFrame(2);
hero.play('run', { ignoreIfPlaying: true });

const placeholder = this.add.sprite(200, 200, 40, 40, '#a6e3a1');
placeholder.setTexture('hero');       // switch to a loaded image
placeholder.setFlip(true, false);
```

| Member | Description |
| --- | --- |
| `texture` | Texture key or CSS color |
| `frame` | Frame index/name for sheets and atlases |
| `setTexture(key, frame?)`, `setFrame(frame)` | Change source |
| `flipX`, `flipY`, `setFlip(x, y?)` | Mirror drawing |
| `play(key, { ignoreIfPlaying })` | Play a registered animation |
| `stop()`, `pause()`, `resume()`, `isPlaying(key?)` | Animation control |
| `setTint(color)`, `clearTint()` | Flat color tint, cached per texture frame |
| `tint` | Current tint color or `null` |

A texture key is resolved as: sprite-sheet frame → atlas frame → plain image → CSS color fallback. If no image is loaded, the engine fills a rectangle with the texture string as its color, which keeps prototypes runnable without assets.

## Animations

Animations live on `game.anims` (shared by all scenes) and are exposed as `scene.anims`.

```js
this.anims.create({
  key: 'run',
  spritesheet: 'hero-sheet', // optional; switches the sprite texture
  frames: [0, 1, 2, 3],
  frameRate: 12,
  repeat: -1,                // -1 = forever, 0 = play once (default)
  yoyo: false
});

// Equivalent frame range:
this.anims.create({
  key: 'idle',
  spritesheet: 'hero-sheet',
  start: 4,
  end: 7,
  frameRate: 6,
  repeat: -1
});

this.hero.play('run');
```

`repeat` counts **additional** loops (0 plays once, 1 plays twice or until yoyo returns). `frameRate` is frames per second. Frame numbers are indices into the loaded sprite sheet (`gid - firstgid` for atlases). Each sprite has independent animation state, so many sprites can play the same animation.

Methods: `create`, `exists`, `get`, `getAll`, `remove`, `play(sprite, key, options)`, `stop(sprite)`, `pauseAll`, `resumeAll`, `stopAll`. Events: `create`, `start`, `stop`.

Sprites leave the registry when they are destroyed, when `stop()` is called (on the sprite or through `anims.stop()`), and when a finite animation finishes. `anims.pauseAll()`/`resumeAll()` therefore only walk animations that are actually playing, which keeps pooled sprites from accumulating.

## Text

```js
const title = this.add.text(400, 60, 'Chroms', {
  font: 'bold 48px sans-serif',     // raw CSS font (overrides fontSize/family)
  color: '#89b4fa',
  align: 'center',
  baseline: 'top',
  stroke: '#11111b',
  strokeThickness: 4,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  lineSpacing: 6,
  wordWrapWidth: 300,
  padding: 4,
  backgroundColor: 'rgba(0,0,0,0.25)'
});

title.setOrigin(0.5, 0.5);
title.setText('Chroms v1.2.2');
```

| Style key | Default |
| --- | --- |
| `font` | `null` (raw CSS font) |
| `fontFamily`, `fontSize`, `fontWeight`, `fontStyle` | `sans-serif`, `20`, `normal`, `normal` |
| `color` | `'#ffffff'` |
| `align` | `'left'` (`left`, `center`, `right`) |
| `baseline` | `'top'` |
| `stroke`, `strokeThickness` | `null`, `0` |
| `shadowColor`, `shadowBlur`, `shadowOffsetX/Y` | `null`, `0`, `0`, `0` |
| `backgroundColor`, `padding` | `null`, `0` |
| `lineSpacing` | `4` |
| `wordWrapWidth` | `0` (no wrapping) |
| `fixedWidth` | `0` |

Text measures itself on creation and whenever `setText`, `setStyle`, `setFontSize` or `setWordWrapWidth` is called. The measured size drives `width`/`height`, origin and `align`. Use `measure()` to re-measure manually.

Useful methods: `setText`, `setStyle(partial)`, `setColor`, `setFontSize`, `setWordWrapWidth`, `measure`, `typeText(text, charsPerSecond)`.

```js
dialog.typeText('The engine is ready.', 40); // uses scene.time
```

`typeText` removes any previous typewriter timer. The `typecomplete` event fires when done.

## Shapes

### Rect

```js
const panel = this.add.rect(40, 40, 300, 180, '#313244', 12);
panel.setColor('#45475a');
panel.setRadius(8);
panel.setStroke('#89b4fa', 2);
```

### Circle

`x, y` is the **top-left of the bounding box**; `width = height = 2 * radius`.

```js
const ball = this.add.circle(200, 200, 24, '#f9e2af');
ball.setRadius(30).setStroke('#11111b', 2);
```

### Line

Coordinates stay absolute; the object's `x/y` is the minimum corner, and `setPoints` recalculates it.

```js
const line = this.add.line(20, 20, 220, 120, '#89b4fa', 3);
line.setPoints(20, 20, 220, 220);
```

### Polygon

An arbitrary closed or open shape. Points are local and normalized so the object's top-left is `(0, 0)`; `width`/`height` come from the points' bounding box.

```js
const star = this.add.polygon(300, 200, [
  [0, -40], [12, -12], [42, -12], [18, 6], [26, 36],
  [0, 18], [-26, 36], [-18, 6], [-42, -12], [-12, -12]
], { color: '#f9e2af', stroke: '#11111b', strokeWidth: 2 });

star.containsPoint(300, 200);   // local coordinates
star.getArea();
star.setPoints(next);
```

A polygon can be made interactive with a `hitArea` function of your own, or tested directly with `containsPoint()` in a `pointerdown` handler.

## TileSprite

A clipped, repeating texture:

```js
const water = this.add.tileSprite(0, 480, 800, 120, 'water');
water.tilePositionX = 12; // scroll

update(dt) {
  water.tilePositionX += 40 * dt;
}
```

Properties: `texture`, `tilePositionX/Y`, `tileScaleX/Y`, methods `setTexture`, `setTilePosition(x, y)`. If the texture is missing it draws a dark placeholder.

## Container

A parent transform. Children use local coordinates and inherit position, rotation, scale and alpha. Container children are updated by the container and are **not** in `scene.children`.

```js
const ship = this.add.container(400, 300);
const body = this.add.rect(-30, -12, 60, 24, '#89b4fa', 6);
const flame = this.add.circle(-42, -6, 8, '#fab387');

ship.add(body);
ship.add(flame);
ship.setAngle(-10);
ship.setScale(1.4);

this.tweens.add({ targets: ship, angle: 10, duration: 900, yoyo: true, repeat: -1 });
```

Methods: `add`, `addMultiple`, `remove(child, destroyChild?)`, `removeAll(destroyChildren?)`, `getChildren`, `getFirst`, `getByName`, `length`. Container physics is not supported; use a group or independent bodies instead.

## Group

A flat collection in world coordinates, ideal for pooling and collisions.

```js
const bullets = this.add.group({
  runChildUpdate: true,
  maxSize: 100,
  classType: Chroms.Sprite,
  defaults: { setup: (bullet) => { bullet.setDepth(5); } }
});

const bullet = bullets.create(400, 300, 6, 14, '#f9e2af');
bullet.enablePhysics().setVelocity(0, -500);

this.physics.overlapPair(bullets, enemies, (bullet, enemy) => {
  bullet.destroy();
  enemy.destroy();
});
```

Methods: `create(x, y, w, h, texture)`, `add`, `addMultiple`, `remove(child, destroyChild?)`, `clear(destroyChildren?)`, `getChildren`, `getFirst(aliveOnly?)`, `getLast`, `getRandom`, `countActive(value?)`, `contains`, `forEach`, `filter`, `find`, `length`.

Group children are removed from `scene.children` when added to the group. Set up bodies per child with `enablePhysics()`.

## UI widgets

### Slider

```js
const volume = this.add.slider(300, 500, 220, {
  min: 0,
  max: 1,
  value: 0.6,
  step: 0.05,
  fillColor: '#a6e3a1',
  onChange: (value, slider) => this.sound.setMasterVolume(value)
}).setScrollFactor(0);

volume.setValue(0.3);          // silent: true skips onChange
volume.setRange(0, 2);
volume.setEnabled(false);
```

`width` is the track length, `height` defaults to 20. Drag the knob or click anywhere on the track. `step: 0` means continuous. `vertical: true` turns the track upright; `knobRadius` overrides the knob size.

### ProgressBar

A read-only 0..1 bar — health, loading, cooldowns.

```js
const hp = this.add.progressBar(20, 660, 240, 14, {
  value: 1,
  fillColor: '#f38ba8',
  trackColor: 'rgba(255,255,255,0.12)',
  radius: 7
}).setScrollFactor(0);

hp.setValue(0.45);      // clamped to 0..1
hp.setColors('#a6e3a1');
hp.setProgress(0.8);    // alias
```

### Toggle

A two-state switch whose knob animates on change.

```js
const music = this.add.toggle(300, 540, {
  value: true,
  onColor: '#a6e3a1',
  onChange: (on) => (on ? this.sound.musicResume() : this.sound.musicPause())
}).setScrollFactor(0);

music.toggle();
music.setValue(false);   // silent: true skips onChange
music.getValue();
```

`width`/`height` default to `54`/`28`. Disabled widgets still render but ignore input.

## Button

A canvas-space UI button with hover/press states.

```js
const button = this.add.button(320, 380, 160, 48, 'PLAY', {
  color: '#313244',
  hoverColor: '#45475a',
  pressColor: '#1e1e2e',
  textColor: '#cdd6f4',
  radius: 8,
  fontSize: 18,
  disabled: false,
  onClick: (button) => this.scene.start('Play'),
  onDown: (button) => {},
  onUp: (button) => {}
});

button.setScrollFactor(0); // if the camera moves
button.setText('RETRY');
button.setEnabled(false);
```

Events: `down`, `click`. Scene event `button-click`. `disabled` buttons ignore input but still render.

## Joystick

```js
this.stick = this.add.joystick(120, 480, {
  radius: 60,
  knobRadius: 24,
  baseColor: 'rgba(205,214,244,0.18)',
  knobColor: 'rgba(137,180,250,0.85)',
  onChange: (value, stick) => {}
}).setScrollFactor(0).setDepth(50);

update() {
  this.player.setVelocity(this.stick.value.x * 250, this.stick.value.y * 250);
}
```

`x, y` is the **center** of the base. `value` is a normalized `Vec2` clamped to length 1, `magnitude` is `0..1`, `angle` is radians. It uses the primary pointer and works over other world objects.

## Screen-space HUD

`setScrollFactor(0)` renders an object after the camera transform, in screen pixels. Buttons and joysticks use screen pointer coordinates automatically in that mode.

```js
this.add.text(16, 16, 'HP', { fontSize: 16 }).setScrollFactor(0).setDepth(100);
```

Only `0`/`1` factors are supported, and both axes should be set to `0` to enter HUD space.
