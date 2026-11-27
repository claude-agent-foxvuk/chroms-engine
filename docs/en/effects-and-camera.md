# Effects and camera

## Tweens

Tweens animate numeric (or two-state string) properties. Durations and delays are **milliseconds**. `scene.tweens` is cleared on scene switch; `game.tweens` survives.

```js
this.tweens.add({
  targets: this.player,
  x: 500,
  alpha: 0.4,
  scaleX: 1.2,
  scaleY: 1.2,
  angle: 90,
  duration: 600,
  delay: 100,
  ease: 'quad.out',
  yoyo: true,
  repeat: 2,
  hold: 150,
  onStart: (tween) => {},
  onUpdate: (tween, eased) => {},
  onYoyo: (tween) => {},
  onRepeat: (tween, count) => {},
  onComplete: (tween) => {}
});
```

### Config reference

| Key | Default | Meaning |
| --- | --- | --- |
| `targets` (or `target`) | — | Object or array of objects |
| any other key with a number/string | — | Property to animate |
| `{ from, to }` per property | current value | Explicit start and end |
| `from` | — | Object of starting values |
| `duration` | `1000` | Milliseconds |
| `delay` | `0` | Milliseconds before starting |
| `ease` / `easing` | `'linear'` | Name or function |
| `yoyo` | `false` | Play back to the start |
| `repeat` | `0` | Extra cycles; `-1` forever |
| `repeatDelay` | `0` | Pause between repeats, ms |
| `hold` | `0` | Pause at the extremes, ms |
| `paused` | `false` | Create paused |
| `persist` | `false` | Keep running if targets are destroyed/inactive |
| `onStart`, `onUpdate`, `onYoyo`, `onRepeat`, `onComplete` | — | Callbacks |

```js
this.tweens.add({
  targets: this.enemy,
  x: { from: 100, to: 700 },
  duration: 2000,
  ease: 'sine.inOut',
  yoyo: true,
  repeat: -1
});

// Dotted paths reach into bodies/components:
this.tweens.add({
  targets: this.player,
  'body.velocity.y': -300,
  duration: 300,
  ease: 'back.out'
});
```

String properties are tweened as colors when both values are colors — `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)` and `rgba(...)` are interpolated channel by channel, so `color` on shapes/text and `backgroundColor` fade smoothly. Other strings keep the two-state behavior (start value for the first half, end value after).

```js
this.tweens.add({
  targets: [this.panel, this.label],
  color: '#f38ba8',
  duration: 400,
  yoyo: true,
  repeat: -1,
  repeatDelay: 250
});
```

### Easings

`linear`, `sine.in/out/inOut`, `quad.*`, `cubic.*`, `quart.*`, `quint.*`, `expo.*`, `circ.*`, `back.*`, `elastic.*`, `bounce.*`. Names are case-insensitive; `inOut` and `inout` both work. Custom functions receive `t` in `0..1`:

```js
this.tweens.add({ targets: box, x: 600, duration: 500, ease: (t) => t * t });
```

`Chroms.Ease` exposes camelCase functions (`Chroms.Ease.quadOut`) and `Chroms.resolveEase('quad.out')`.

### Tween handles and manager

```js
const tween = this.tweens.add({ targets: box, x: 100, duration: 300 });

tween.pause();
tween.resume();
tween.stop();
tween.restart();
tween.complete();
tween.isPlaying();
tween.getProgress();
tween.setTimeScale(2);

this.tweens.killTweensOf(box);
this.tweens.pauseAll();
this.tweens.resumeAll();
this.tweens.removeAll();
this.tweens.timeScale = 0.5;
```

### Counters

```js
this.tweens.addCounter({
  from: 0,
  to: 100,
  duration: 800,
  ease: 'cubic.out',
  onUpdate: (value, tween) => this.scoreText.setText('Score ' + Math.round(value)),
  onComplete: (value) => console.log('final', value)
});
```

### Timelines

`chain` runs configs sequentially. Each config's own `onComplete` still runs.

```js
this.tweens.chain([
  { targets: box, x: 300, duration: 300, ease: 'quad.out' },
  { targets: box, y: 400, duration: 300, ease: 'bounce.out' },
  { targets: box, alpha: 0, duration: 200 }
]);
```

## Timers

```js
this.time.delayedCall(500, () => this.spawnWave());
this.time.addEvent({
  delay: 1000,
  loop: true,
  repeat: 5,             // optional extra repeats; -1 by default for loop
  name: 'spawner',
  callback: (arg) => {},
  args: ['wave']
});
this.time.loop(250, () => this.tick());
```

`Timer` methods: `remove()`, `pause()`, `resume()`, `reset(delay?)`, `getProgress()`, `getRemaining()`, `isRunning()`. Timer events: `complete`.

Manager methods: `addEvent(config)`, `delayedCall(ms, callback, args)`, `loop(ms, callback, args)`, `remove(timer)`, `clear()`/`removeAll()`, `removeByName(name)`, `pauseAll()`, `resumeAll()`, `timeScale`, `paused`.

Timers use `scene.time` (cleared with the scene) or `game.time` (global). `delay: 0` fires on the next update.

## Particles

```js
const sparks = this.add.particles(400, 300, {
  speed: { min: 60, max: 240 },
  angle: { min: 0, max: 360 },
  lifespan: { min: 400, max: 900 },
  quantity: 2,
  frequency: 40,          // ms between emissions; -1 stops auto-emission
  max: 400,
  size: 5,
  shape: 'circle',        // or 'square'
  color: '#89b4fa',
  colors: ['#89b4fa', '#cba6f7', '#f38ba8'], // interpolated over life
  alpha: { start: 1, end: 0 },
  scale: { start: 1, end: 0.2 },
  gravityX: 0,
  gravityY: 200,
  blendMode: 'lighter',
  emitting: true,
  emitZone: { type: 'circle', radius: 40 },
  follow: player,         // emitter follows an object each update
  texture: 'spark',       // optional image key, drawn as size × size
  rotate: false,
  rotateSpeed: 0,
  seed: 123,
  onParticle: (particle) => {}
});
```

`emitZone` may be `{ type: 'rect', x, y, width, height }` (offsets from the emitter) or `{ type: 'circle', radius }` (around the emitter).

### Emitter API

```js
sparks.explode(30);              // burst at the emitter
sparks.explode(30, x, y);        // burst at a world point
sparks.emitParticleAt(x, y, 5);
sparks.start();
sparks.stop();
sparks.isEmitting();
sparks.setFrequency(20);
sparks.setQuantity(4);
sparks.setSpeed({ min: 100, max: 200 });
sparks.setLifespan(500);
sparks.setGravity(400);
sparks.getParticleCount();
sparks.clear();
sparks.destroy();
```

Particles update in the emitter's own `update(dt)` (emitters are scene children) and are drawn relative to the emitter. Set `frequency: -1` for burst-only emitters. Emitters default to emitting immediately.

```js
// One-shot hit effect:
const burst = this.add.particles(x, y, {
  speed: { min: 80, max: 220 },
  lifespan: { min: 250, max: 600 },
  frequency: -1,
  colors: ['#f9e2af', '#fab387'],
  blendMode: 'lighter'
});
burst.explode(18);
this.time.delayedCall(800, () => burst.destroy());
```

## Camera

One camera per scene: `scene.camera` (also `scene.cameras[0]`).

```js
this.camera.setBounds(0, 0, 3200, 600);
this.camera.follow(this.player, {
  lerpX: 0.12,
  lerpY: 0.12,
  offsetX: 0,
  offsetY: 40,
  deadzoneWidth: 120,
  deadzoneHeight: 80
});
```

### Properties

| Property | Meaning |
| --- | --- |
| `x`, `y` | Top-left of the view in world coordinates |
| `width`, `height` | Viewport size in screen pixels |
| `zoom` | Scale factor (visible world = `width/zoom`) |
| `bounds` | Optional world rectangle |
| `followTarget` | Object being followed |
| `visible` | `false` skips drawing the whole scene (`sleep()` sets it) |
| `deadzone` | `{ width, height }` free area around the center |
| `shakeOffset` | Current shake displacement |
| `fadeAlpha`, `fadeColor` | Fade overlay state |
| `flashAlpha`, `flashColor` | Flash overlay state |
| `backgroundColor` | Optional viewport fill behind the world |

### Methods

| Method | Description |
| --- | --- |
| `follow(target, options)`, `startFollow`, `stopFollow` | Follow behavior |
| `setLerp(x, y?)`, `setFollowOffset(x, y)` | Smoothing and offset |
| `setDeadzone(w, h)` | Deadzone in world pixels |
| `centerOn(x, y)`, `scrollTo(x, y)` | Position the view |
| `setBounds(x, y, w, h)` / `setBounds({x,y,width,height})`, `clearBounds()` | Limits |
| `setZoom(z)`, `zoomTo(z, ms, ease?)` | Zoom (clamped to `0.05..20`) |
| `panTo(x, y, ms, ease?)` | Glide the view to a world position; follow is suspended while it runs |
| `shake(durationMs, intensityPx)` | Random shake that decays |
| `fadeOut(ms, color?, callback?)`, `fadeIn(ms, color?, callback?)` | Full-screen fade |
| `flash(color, ms)` | Full-screen flash |
| `screenToWorld(x, y)`, `worldToScreen(x, y)` | Coordinate conversion |
| `worldView` | `{ x, y, width, height }` in world units |
| `setSize(w, h)`, `resize(w, h)` | Viewport size |
| `setBackgroundColor(color)` | Viewport fill |

### Effects examples

```js
// Damage feedback
this.camera.shake(300, 10);
this.camera.flash('rgba(243,139,168,0.3)', 200);

// Zoom in on a boss
this.camera.zoomTo(1.6, 600, 'sine.inOut');

// Cut to black, then back
this.camera.fadeOut(400, '#000000', () => {
  this.scene.start('Next');
});
this.camera.fadeIn(400);
```

Camera shake and fades are visual only; `worldX/worldY` pointer coordinates ignore shake but include zoom and scroll.

### HUD

Pin HUD objects with `setScrollFactor(0)`. They render after the world, so they are immune to camera scroll, zoom and shake:

```js
this.add.text(16, 16, 'HP 3', { fontSize: 18 }).setScrollFactor(0).setDepth(1000);
```

### Camera limits

- One active camera; split-screen and minimaps are not built in.
- `zoom` is uniform (no independent X/Y zoom).
- Camera rotation is not supported.
- Following uses the body center if the target has a body, otherwise the display center.
