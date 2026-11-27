# Getting started

This tutorial builds a tiny platformer with movement, jumping, platforms, a camera, a HUD and a win condition. It uses colored rectangles so it runs without asset files.

## 1. Files

The minimum is two files:

```
project/
  chroms.js
  index.html
  chroms.config.json   (recommended: name, version, engine, author)
```

`chroms.config.json` declares the engine version the project was built against and ordinary package metadata. It is optional at runtime; see [Project metadata](index.md#project-metadata).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Chroms game</title>
  <style>
    html, body { margin: 0; height: 100%; background: #11111b; }
    body { display: grid; place-items: center; }
    canvas { border-radius: 8px; }
  </style>
</head>
<body>
  <script src="chroms.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

`game.js` contains your scenes and the `Chroms.Game` instance.

## 2. Scene skeleton

Every scene extends `Chroms.Scene` and passes a unique key to `super`.

```js
class GameScene extends Chroms.Scene {
  constructor() {
    super('GameScene'); // unique key
  }

  init(data) {
    // receives data from scene.start(key, data) / game.startScene(key, data)
  }

  preload() {
    // queue assets here; create() runs after they finish loading
  }

  create() {
    // build the world once
  }

  update(dt) {
    // dt is seconds, already clamped and time-scaled
  }

  fixedUpdate(dt) {
    // optional: fixed steps (default 1/60 s), runs before update()
  }

  shutdown() {
    // optional cleanup; scene objects are destroyed automatically
  }
}

new Chroms.Game({
  width: 800,
  height: 600,
  backgroundColor: '#181825',
  scene: [GameScene]
});
```

The first scene in the array starts automatically. Add more classes to switch between them later.

## 3. Player and input

```js
create() {
  this.physics.setGravity(0, 1200);
  this.physics.setBounds(0, 0, 1600, 600);

  this.player = this.add.rect(100, 400, 32, 44, '#89b4fa', 7);
  this.player.enablePhysics();
  this.player.setMaxVelocity(240, 900);

  this.input.capture(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
}

update() {
  let vx = 0;
  if (this.input.isDown('ArrowLeft') || this.input.isDown('KeyA')) vx = -240;
  if (this.input.isDown('ArrowRight') || this.input.isDown('KeyD')) vx = 240;
  this.player.setVelocityX(vx);

  const jump =
    this.input.isDown('Space') ||
    this.input.isDown('ArrowUp') ||
    this.input.isDown('KeyW');

  if (jump && this.player.body.blocked.down) {
    this.player.setVelocityY(-480);
  }
}
```

`body.blocked.down` is set by collision resolution. It is available during `update()` from the previous physics step.

## 4. Platforms and collision

`physics.addCollider(a, b)` registers a *persistent* pair. The world checks it every fixed step and separates the bodies.

```js
this.platforms = this.add.group();

[
  [0, 540, 1600, 60],
  [260, 440, 200, 24],
  [540, 340, 180, 24]
].forEach(([x, y, w, h]) => {
  const platform = this.add.rect(x, y, w, h, '#45475a', 4);
  platform.enablePhysics({ immovable: true });
  this.platforms.add(platform);
});

this.physics.addCollider(this.player, this.platforms);
```

`immovable: true` keeps platforms in place. The player is pushed out and its vertical velocity is zeroed on landing.

## 5. Camera

```js
this.camera.setBounds(0, 0, 1600, 600);
this.camera.follow(this.player, { lerpX: 0.12, lerpY: 0.12, offsetY: 40 });
```

The camera centers on the player's body, smooths with lerp and stops at the bounds. A HUD stays fixed with `setScrollFactor(0)`:

```js
this.hud = this.add
  .text(16, 16, 'Coins 0', { fontSize: 20, color: '#f9e2af' })
  .setScrollFactor(0);
```

## 6. Coins, win condition and feedback

```js
this.coins = this.add.group();
this.score = 0;

[[300, 400], [600, 300], [1000, 240]].forEach(([x, y]) => {
  const coin = this.add.circle(x, y, 10, '#f9e2af');
  this.coins.add(coin);
  this.tweens.add({
    targets: coin,
    y: y - 8,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut'
  });
});

this.physics.overlapPair(this.player, this.coins, (player, coin) => {
  coin.destroy();
  this.score += 1;
  this.hud.setText('Coins ' + this.score);
  this.camera.shake(120, 3);
  this.camera.flash('rgba(249,226,175,0.12)', 120);
  this.sound.beep({ frequency: 660, slideTo: 990, duration: 0.08, type: 'triangle' });

  if (this.score === 3) {
    this.finish();
  }
});

finish() {
  this.physics.colliders = [];
  this.add
    .text(400, 280, 'You win!', { fontSize: 48, color: '#a6e3a1' })
    .setOrigin(0.5)
    .setScrollFactor(0);
}
```

`overlapPair` reports intersections without separating bodies, which is what collectibles and triggers need.

## 7. Assets

Queue assets in `preload`; `create` is called after `load.start` finishes.

```js
preload() {
  this.load.image('hero', 'assets/hero.png');
  this.load.audio('jump', 'assets/jump.ogg');
  this.load.spritesheet('hero-sheet', 'assets/hero-sheet.png', 32, 48);
  this.load.json('level', 'assets/level.json');
}

create() {
  this.player = this.add.image(100, 300, 'hero');
  this.player.setSize(32, 48);
  this.player.enablePhysics();

  this.anims.create({
    key: 'run',
    spritesheet: 'hero-sheet',
    frames: [0, 1, 2, 3],
    frameRate: 12,
    repeat: -1
  });
  this.hero = this.add.sprite(100, 300, 32, 48, 'hero-sheet');
  this.hero.play('run');
}
```

Images and audio work from `file://`, but `load.json` and `load.text` use `fetch` and need an HTTP server. See [assets-audio-storage.md](assets-audio-storage.md).

## 8. Save a high score

```js
const best = this.game.storage.load('best', 0);
if (this.score > best) this.game.storage.save('best', this.score);
```

`game.storage` is a namespaced localStorage wrapper. It falls back to memory when storage is unavailable (private mode, some `file://` setups).

## 9. Pause, restart and scene changes

```js
this.game.pause();
this.game.resume();
this.game.togglePause();
this.scene.restart();           // rebuild the current scene
this.scene.start('Menu');       // destroy this scene and start another
this.scene.start('Menu', {}, { fade: 300 });
```

When you switch scenes Chroms destroys the previous scene's objects and clears its tweens and timers. Global `game.tweens`, `game.time`, `game.anims`, `game.storage` and `game.sound` survive.

## 10. Next steps

- [Core concepts](core-concepts.md) for the loop, coordinates and render order.
- [Input & physics](input-and-physics.md) for bodies, groups, raycasts and tile collisions.
- [Effects & camera](effects-and-camera.md) for particles, tween details and camera tricks.
- [AI agents](ai-agents.md) if you are generating code with an LLM.
