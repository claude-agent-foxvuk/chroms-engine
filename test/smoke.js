'use strict';

/**
 * Headless smoke test. Stubs just enough DOM/Canvas to exercise the engine in
 * Node: scene lifecycle, rendering, physics, tweens, timers, particles,
 * tilemaps, input, camera and storage.
 */
const assert = require('assert');
const path = require('path');

const calls = { drawImage: 0, fillText: 0, fillRect: 0 };

class StubContext {
  constructor() {
    this.canvas = null;
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.font = '10px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'top';
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.shadowColor = 'transparent';
    this.shadowBlur = 0;
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    this.imageSmoothingEnabled = true;
  }
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  setTransform() {}
  fillRect() {
    calls.fillRect += 1;
  }
  strokeRect() {}
  clearRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  arc() {}
  ellipse() {}
  rect() {}
  clip() {}
  fill() {}
  stroke() {}
  fillText() {
    calls.fillText += 1;
  }
  strokeText() {}
  drawImage() {
    calls.drawImage += 1;
  }
  measureText(text) {
    return { width: String(text).length * 8 };
  }
  createPattern() {
    return { setTransform() {} };
  }
}

class StubCanvas {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.style = {};
    this.className = '';
    this.ctx = new StubContext();
    this.ctx.canvas = this;
    this.listeners = {};
  }
  getContext() {
    return this.ctx;
  }
  addEventListener(type, handler) {
    (this.listeners[type] || (this.listeners[type] = [])).push(handler);
  }
  removeEventListener() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width, height: this.height };
  }
  setPointerCapture() {}
  toDataURL() {
    return 'data:image/png;base64,stub';
  }
}

function createElement(tag) {
  if (tag === 'canvas') return new StubCanvas();
  return { style: {}, appendChild() {}, clientWidth: 800, clientHeight: 600 };
}

const listenerMap = {};
global.window = globalThis;
global.innerWidth = 1024;
global.innerHeight = 768;
global.addEventListener = (type, handler) => {
  (listenerMap[type] || (listenerMap[type] = [])).push(handler);
};
global.removeEventListener = () => {};
global.document = {
  hidden: false,
  body: {
    appendChild() {},
    clientWidth: 800,
    clientHeight: 600
  },
  documentElement: { clientWidth: 1024, clientHeight: 768 },
  createElement,
  getElementById() {
    return null;
  },
  addEventListener() {},
  removeEventListener() {}
};
global.devicePixelRatio = 1;
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};
global.performance = global.performance || { now: () => Date.now() };
global.Image = class Image {
  constructor() {
    this.width = 64;
    this.height = 64;
  }
  set src(value) {
    this._src = value;
  }
};
global.Audio = class Audio {
  constructor() {
    this.volume = 1;
    this.currentTime = 0;
    this.playbackRate = 1;
    this.loop = false;
  }
  addEventListener() {}
  load() {}
  play() {
    return Promise.resolve();
  }
  pause() {}
  cloneNode() {
    return new global.Audio();
  }
};
global.localStorage = (() => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    key: (index) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
    clear: () => store.clear()
  };
})();

const Chroms = require(path.join(__dirname, '..', 'chroms.js'));
assert.strictEqual(Chroms.version, '1.2.3');
assert.ok(Chroms.describe().systems.physics.includes('AABB'));

const parent = createElement('div');
let sceneRef = null;

class TestScene extends Chroms.Scene {
  constructor() {
    super('test');
  }
  create() {
    sceneRef = this;
    this.created = true;
    this.sawPlugin = this.game.pluginReady === true;
    this.scoreText = this.add.text(10, 10, 'Score: 0', {
      font: 'bold 22px sans-serif',
      color: '#cdd6f4',
      wordWrapWidth: 300
    });
    this.player = this.add.sprite(100, 100, 40, 40, '#89b4fa');
    this.player.enablePhysics({ gravityY: 800, collideWorldBounds: true });
    this.platform = this.add.rect(100, 400, 300, 20, '#45475a');
    this.platform.enablePhysics({ immovable: true });
    this.physics.addCollider(this.player, this.platform);

    this.target = this.add.circle(500, 100, 20, '#f9e2af');
    this.group = this.add.group();
    this.group.create(600, 300, 30, 30, '#a6e3a1').enablePhysics({ immovable: true });
    this.physics.addCollider(this.player, this.group);
    // A collider between plain objects must not leak into the next scene.
    this.physics.addCollider(
      { x: 0, y: 0, width: 2, height: 2 },
      { x: 0, y: 0, width: 2, height: 2 }
    );

    this.emitter = this.add.particles(200, 100, {
      speed: { min: 10, max: 20 },
      lifespan: { min: 100, max: 200 },
      quantity: 2,
      frequency: 50,
      colors: ['#89b4fa', '#f38ba8'],
      size: 6
    });
    this.emitter.explode(5);

    this.tilemap = this.add.tilemap(
      {
        tileWidth: 16,
        tileHeight: 16,
        width: 10,
        height: 10,
        tiles: ['#1e1e2e', '#313244'],
        layers: [
          { name: 'ground', data: new Array(100).fill(1), solid: false },
          { name: 'walls', data: new Array(100).fill(0), solid: true }
        ]
      },
      600,
      50
    );
    this.tilemap.setTileAt('walls', 0, 0, 2);
    this.tilemap.setTileAt('walls', 1, 0, 2);

    this.button = this.add.button(400, 500, 120, 40, 'Click', {
      onClick: () => {
        this.buttonClicked = true;
      }
    });
    this.joystick = this.add.joystick(700, 500, { radius: 50 });

    this.camera.follow(this.player, { lerpX: 1, lerpY: 1 });
    this.camera.setBounds(0, 0, 1600, 1200);
    this.camera.shake(100, 3);

    this.box = { value: 0 };
    this.tweenDone = false;
    this.tweens.add({
      targets: this.player,
      x: 200,
      duration: 200,
      ease: 'quad.out',
      onComplete: () => {
        this.tweenDone = true;
      }
    });
    this.timerFired = false;
    this.time.delayedCall(100, () => {
      this.timerFired = true;
    });

    this.anims.create({
      key: 'spin',
      frames: [0, 1, 2, 3],
      frameRate: 10,
      repeat: -1
    });
    this.player.play('spin');
    this.container = this.add.container(50, 50);
    this.container.add(this.add.rect(0, 0, 10, 10, '#ffffff'));
    this.tileSprite = this.add.tileSprite(0, 0, 10, 10, 'missing');
    this.line = this.add.line(0, 0, 10, 10, '#ffffff', 2);
  }
  update(dt) {
    this.updateCount = (this.updateCount || 0) + 1;
  }
}

const game = new Chroms.Game({
  width: 800,
  height: 600,
  parent,
  scene: [TestScene],
  plugins: [(g) => { g.pluginReady = true; }],
  debug: false,
  autoStart: false,
  scaleMode: 'none',
  gravity: { x: 0, y: 0 }
});

assert.ok(game.currentScene, 'scene should start');
assert.ok(game.currentScene.sawPlugin, 'plugins should install before the first scene');
assert.strictEqual(game.currentScene.key, 'test');
assert.ok(game.currentScene.created, 'create() should run after preload');
assert.ok(sceneRef.scoreText.width > 0, 'text should measure');
assert.ok(sceneRef.scoreText.height > 0, 'text should measure height');

game.running = true;
function frames(count, ms) {
  let time = game._lastTime || 0;
  for (let i = 0; i < count; i += 1) {
    time += ms;
    game._loop(time);
  }
}
frames(120, 16.67);

assert.ok(sceneRef.updateCount >= 119, 'update should run');
assert.ok(sceneRef.tweenDone, 'tween should complete');
assert.ok(sceneRef.timerFired, 'timer should fire');
assert.ok(sceneRef.buttonClicked === undefined, 'button should not be clicked yet');
assert.ok(sceneRef.player.y > 100, 'gravity should move the player');
assert.ok(sceneRef.player.y <= 360.5, 'platform should stop the player near y=360');
assert.ok(
  Math.abs(sceneRef.player.y - 360) < 8,
  'player should rest on the platform, got ' + sceneRef.player.y
);
assert.ok(sceneRef.emitter.getParticleCount() > 0, 'particles should exist');
assert.ok(calls.fillRect > 0, 'renderer should draw rectangles');
assert.ok(calls.fillText > 0, 'renderer should draw text');
const ray = sceneRef.physics.raycast(210, 0, 210, 1000);
assert.ok(ray && ray.object, 'raycast should hit the player or platform');
assert.ok(ray.distance > 0);
assert.ok(sceneRef.physics.overlap(sceneRef.player, sceneRef.player) === false);
assert.strictEqual(typeof sceneRef.physics.overlap(sceneRef.player, sceneRef.target), 'boolean');
assert.ok(sceneRef.physics.queryRect(0, 0, 800, 600).length > 0, 'queryRect');
assert.ok(sceneRef.tilemap.getTileAt('walls', 0, 0) === 2);
assert.ok(sceneRef.tilemap.getSolidTilesInRect(600, 50, 20, 20).length > 0);
assert.ok(sceneRef.tilemap.collidesRect(600, 50, 20, 20));
assert.ok(sceneRef.camera.followTarget === sceneRef.player);
const view = sceneRef.camera.worldView;
assert.ok(view.width === 800 && view.height === 600);

sceneRef.camera.setZoom(2);
assert.strictEqual(sceneRef.camera.worldView.width, 400);
sceneRef.camera.setZoom(1);
assert.deepStrictEqual(sceneRef.camera.screenToWorld(0, 0), {
  x: sceneRef.camera.x,
  y: sceneRef.camera.y
});

// Drag support.
sceneRef.input.enableDrag(sceneRef.target);
sceneRef.input.pointer.worldX = sceneRef.target.x + 1;
sceneRef.input.pointer.worldY = sceneRef.target.y + 1;
sceneRef.input.pointer.isDown = true;
sceneRef.input._beginDrag();
sceneRef.input.pointer.worldX += 10;
sceneRef.input._dragMove();
assert.ok(sceneRef.target.x > 500, 'drag should move the object');
sceneRef.input._endDrag();

// Button click using direct pointer state.
sceneRef.input.pointer.worldX = 450;
sceneRef.input.pointer.worldY = 510;
sceneRef.input.pointer.justDown = true;
sceneRef.input.pointer.isDown = true;
sceneRef.button.update(0.016);
sceneRef.input.pointer.justDown = false;
sceneRef.input.pointer.isDown = false;
sceneRef.button.update(0.016);
assert.ok(sceneRef.buttonClicked, 'button should click');

// Group API.
assert.strictEqual(sceneRef.group.length, 1);
assert.ok(sceneRef.group.getFirst(true));
assert.strictEqual(sceneRef.group.countActive(true), 1);

// Animation advances frames.
const firstFrame = sceneRef.player.frame;
frames(10, 50);
assert.notStrictEqual(sceneRef.player.frame, firstFrame);

// A yoyo animation without repeats must finish on its return leg.
sceneRef.anims.create({
  key: 'yoyo-once',
  frames: [0, 1, 2],
  frameRate: 10,
  yoyo: true,
  repeat: 0
});
const yoyo = sceneRef.add.sprite(10, 10, 10, 10, '#ffffff');
yoyo.play('yoyo-once');
for (let i = 0; i < 20; i += 1) yoyo.update(0.1);
assert.strictEqual(yoyo.isPlaying(), false, 'yoyo animation should complete');

// Storage.
game.storage.save('slot', { score: 42 });
assert.deepStrictEqual(game.storage.load('slot'), { score: 42 });
assert.ok(game.storage.has('slot'));
game.storage.remove('slot');
assert.strictEqual(game.storage.load('slot', 'none'), 'none');

// Text typewriter and timers.
sceneRef.scoreText.typeText('Hi', 1000);
frames(3, 30);
assert.ok(sceneRef.scoreText.text.length > 0, 'typewriter should reveal text');

assert.ok(game.screenshot().startsWith('data:image/png'));

// --- 1.2.0 regressions ---

// A hold keeps the end value before a yoyo leg starts.
const holder = { value: 0 };
const holdTween = sceneRef.tweens.add({
  targets: holder,
  value: 100,
  duration: 100,
  yoyo: true,
  hold: 50
});
holdTween.update(100);
assert.strictEqual(holder.value, 100, 'tween should reach the end value');
holdTween.update(25);
assert.strictEqual(holder.value, 100, 'tween should hold the end value');
holdTween.update(50);
assert.ok(holder.value < 100 && holder.value > 0, 'tween should yoyo back, got ' + holder.value);
holdTween.stop();

// Particle size accepts a range and is sampled per particle.
const ranged = sceneRef.add.particles(20, 20, { size: { min: 4, max: 8 }, frequency: -1 });
ranged.explode(4);
assert.strictEqual(ranged.particles.length, 4, 'explode should emit particles');
assert.ok(
  ranged.particles.every((particle) => particle.size >= 4 && particle.size <= 8),
  'particle size should be sampled from the range'
);
ranged.destroy();

// Animation manager drives every sprite that played an animation.
sceneRef.anims.pauseAll();
assert.ok(sceneRef.player._anim.paused, 'anims.pauseAll should pause sprites');
sceneRef.anims.resumeAll();
assert.ok(!sceneRef.player._anim.paused, 'anims.resumeAll should resume sprites');
sceneRef.anims.stopAll();
assert.ok(!sceneRef.player.isPlaying(), 'anims.stopAll should stop playback');
sceneRef.player.play('spin');

// The animation registry must not keep destroyed sprites alive.
const disposable = sceneRef.add.sprite(30, 30, 10, 10, '#ffffff');
disposable.play('spin');
assert.ok(sceneRef.anims.sprites.indexOf(disposable) !== -1, 'play should register the sprite');
disposable.destroy();
assert.strictEqual(
  sceneRef.anims.sprites.indexOf(disposable),
  -1,
  'destroyed sprites should leave the animation registry'
);

// --- 1.2.1: stopped and finished animations leave the registry too ---
const pooled = sceneRef.add.sprite(40, 40, 10, 10, '#ffffff');
pooled.play('spin');
assert.ok(sceneRef.anims.sprites.indexOf(pooled) !== -1, 'play registers the sprite');
pooled.stop();
assert.strictEqual(
  sceneRef.anims.sprites.indexOf(pooled),
  -1,
  'stopped sprites should leave the animation registry'
);
sceneRef.anims.create({ key: 'once', frames: [0, 1], frameRate: 60, repeat: 0 });
pooled.play('once');
pooled.update(1);
assert.ok(!pooled.isPlaying(), 'a finite animation should finish');
assert.strictEqual(
  sceneRef.anims.sprites.indexOf(pooled),
  -1,
  'finished sprites should leave the animation registry'
);
pooled.play('spin');
assert.ok(sceneRef.anims.sprites.indexOf(pooled) !== -1, 'replaying re-registers the sprite');

// stopAll still stops every sprite while unregistering them.
const pooledB = sceneRef.add.sprite(50, 50, 10, 10, '#ffffff');
pooledB.play('spin');
sceneRef.anims.stopAll();
assert.ok(!pooled.isPlaying() && !pooledB.isPlaying(), 'stopAll should stop every sprite');
assert.strictEqual(sceneRef.anims.sprites.length, 0, 'stopAll should empty the registry');
pooled.destroy();
pooledB.destroy();

// Group lookup helpers.
const wall = sceneRef.group.getFirst(true);
wall.setName('wall');
assert.strictEqual(sceneRef.group.getByName('wall'), wall, 'group.getByName');
assert.strictEqual(sceneRef.group.getByName('missing'), null, 'group.getByName miss');
assert.strictEqual(
  sceneRef.group.getClosest(wall.x + 1, wall.y + 1, true),
  wall,
  'group.getClosest'
);

// Camera panTo tweens the camera position and outranks an active follow.
sceneRef.camera.follow(sceneRef.player, { lerpX: 1, lerpY: 1 });
sceneRef.camera.scrollTo(0, 0);
sceneRef.camera.panTo(500, 400, 120);
const panTween = sceneRef.camera._panTween;
assert.ok(panTween, 'panTo should tween the camera');
panTween.update(60);
const panX = sceneRef.camera.x;
const panY = sceneRef.camera.y;
assert.ok(panX > 0 || panY > 0, 'panTo should move the camera');
sceneRef.camera.update(0.016);
assert.strictEqual(sceneRef.camera.x, panX, 'follow must not overwrite an active pan');
assert.strictEqual(sceneRef.camera.y, panY, 'follow must not overwrite an active pan');
panTween.update(60);
assert.strictEqual(sceneRef.camera._panTween, null, 'panTo clears itself when the tween ends');
const completedX = sceneRef.camera.x;
sceneRef.camera.update(0.016);
assert.notStrictEqual(sceneRef.camera.x, completedX, 'follow resumes after the pan ends');

// Pixel-art switch and fullscreen guard.
game.setPixelArt(true);
assert.strictEqual(game.antialias, false, 'setPixelArt disables smoothing');
assert.strictEqual(game.pixelRatio, 1, 'setPixelArt pins the pixel ratio');
assert.strictEqual(game.canvas.style.imageRendering, 'pixelated');
game.setPixelArt(false);
assert.strictEqual(game.antialias, true, 'setPixelArt(false) restores smoothing');
assert.strictEqual(game.toggleFullscreen(), game, 'toggleFullscreen is safe without the API');

const manifest = Chroms.describe();
assert.ok(manifest.inspiration.indexOf('Phaser 3') !== -1, 'manifest should credit Phaser 3');
assert.ok(manifest.systems.add.indexOf('animatedSprite') !== -1, 'manifest should list animatedSprite');

// --- 1.2.0 regressions ---

// Manual stepping advances one frame without requestAnimationFrame.
const updatesBeforeStep = sceneRef.updateCount;
const elapsedBeforeStep = game.elapsed;
game.step(0.5);
assert.strictEqual(sceneRef.updateCount, updatesBeforeStep + 1, 'game.step should update once');
assert.ok(
  Math.abs(game.elapsed - (elapsedBeforeStep + 0.5 * game.timeScale)) < 1e-9,
  'game.step should advance the clock'
);
assert.ok(game.physics.stats.pairs > 0, 'stats.pairs should count pairs in the last step');
assert.ok(Number.isFinite(game.physics.stats.time), 'stats.time should be a finite number');

// zoomTo clamps the zoom so worldView never divides by zero.
sceneRef.camera.zoomTo(0.0001, 100);
sceneRef.tweens.update(0.2);
assert.ok(sceneRef.camera.zoom >= 0.05, 'zoomTo should clamp the zoom');
assert.ok(Number.isFinite(sceneRef.camera.worldView.width), 'worldView should stay finite');
sceneRef.camera.setZoom(1);

// complete() finishes a yoyo tween instead of starting the return leg.
const completed = { value: 0 };
const yoyoTween = sceneRef.tweens.add({
  targets: completed,
  value: 50,
  duration: 100,
  yoyo: true,
  repeat: 2
});
yoyoTween.complete();
assert.strictEqual(completed.value, 50, 'complete() should apply the end value');
assert.strictEqual(yoyoTween.state, 'complete', 'complete() should finish the tween');
assert.strictEqual(
  sceneRef.tweens.tweens.indexOf(yoyoTween),
  -1,
  'complete() should unregister the tween'
);

// A cancelled pointer must not leave input stuck.
sceneRef.input.pointers.set(9, { x: 0, y: 0, isDown: true });
sceneRef.input.pointer.isDown = true;
const cancelHandlers = listenerMap.pointercancel || [];
assert.ok(cancelHandlers.length > 0, 'pointercancel should be listened for');
cancelHandlers.forEach((handler) => handler({ pointerId: 9 }));
assert.strictEqual(sceneRef.input.pointers.has(9), false, 'pointercancel clears the pointer');
assert.strictEqual(sceneRef.input.pointer.isDown, false, 'pointercancel releases the pointer');

// --- 1.2.0 ---

// Collision layers and masks filter pairs.
const ghost = sceneRef.add.sprite(sceneRef.player.x, sceneRef.player.y, 40, 40, '#ffffff');
const ghostBody = ghost.enablePhysics({ immovable: true });
ghostBody.setCollisionGroup('ghost');
ghostBody.setCollidesWith(['nothing']);
assert.strictEqual(
  sceneRef.physics.overlap(sceneRef.player, ghost),
  false,
  'collidesWith should block the pair'
);
ghostBody.setCollidesWith(['*']);
assert.strictEqual(
  sceneRef.physics.overlap(sceneRef.player, ghost),
  true,
  'collidesWith "*" should allow the pair'
);

// The world collision matrix filters by group name.
const playerBody = sceneRef.player.body;
playerBody.setCollisionGroup('player');
ghostBody.setCollidesWith(null);
sceneRef.physics.setCollisionMatrix({ player: ['ghost'], ghost: ['player'] });
assert.strictEqual(
  sceneRef.physics.overlap(sceneRef.player, ghost),
  true,
  'matrix should allow player/ghost'
);
sceneRef.physics.setCollisionMatrix({ player: ['wall'] });
assert.strictEqual(
  sceneRef.physics.overlap(sceneRef.player, ghost),
  false,
  'matrix should block player/ghost'
);
sceneRef.physics.setCollisionMatrix(null);
playerBody.setCollisionGroup(null);
ghostBody.setCollisionGroup(null);
ghost.destroy();

// Steering helpers.
const mover = sceneRef.add.sprite(20, 20, 10, 10, '#ffffff');
const moverBody = mover.enablePhysics({});
assert.strictEqual(sceneRef.physics.moveTo(mover, 200, 20, 100), false);
assert.ok(moverBody.velocity.x > 0, 'moveTo should aim at the target');
moverBody.setVelocityFromAngle(90, 50);
assert.ok(Math.abs(moverBody.velocity.x) < 1e-9, 'angle 90 has no x velocity');
assert.ok(Math.abs(moverBody.velocity.y - 50) < 1e-9, 'angle 90 points down');
assert.strictEqual(sceneRef.physics.moveTo(mover, moverBody.centerX, moverBody.centerY, 100), true);
assert.strictEqual(moverBody.speed, 0, 'arriving should stop the body');

// Slider: drag, step snapping and onChange.
const slider = sceneRef.add.slider(100, 560, 200, { min: 0, max: 100, value: 20, step: 5 });
assert.strictEqual(slider.getValue(), 20);
slider.setValue(53);
assert.strictEqual(slider.getValue(), 55, 'slider step should snap');
let sliderValue = null;
slider.onChange = (value) => {
  sliderValue = value;
};
sceneRef.input.pointer.worldX = 200;
sceneRef.input.pointer.worldY = 570;
sceneRef.input.pointer.isDown = true;
sceneRef.input.pointer.justDown = true;
slider.update(0.016);
sceneRef.input.pointer.justDown = false;
assert.strictEqual(slider.dragging, true, 'slider should start dragging on press');
slider.update(0.016);
assert.strictEqual(sliderValue, 50, 'slider should report the dragged value');
sceneRef.input.pointer.isDown = false;
slider.update(0.016);
assert.strictEqual(slider.dragging, false, 'slider should stop dragging on release');

// ProgressBar clamps.
const bar = sceneRef.add.progressBar(20, 560, 180, 12, { value: 0.25 });
assert.strictEqual(bar.getValue(), 0.25);
bar.setValue(1.4);
assert.strictEqual(bar.getValue(), 1, 'progress should clamp to 1');
bar.setValue(-2);
assert.strictEqual(bar.getValue(), 0, 'progress should clamp to 0');

// Toggle flips on press and animates its knob.
let toggled = null;
const toggle = sceneRef.add.toggle(300, 560, {
  onChange: (value) => {
    toggled = value;
  }
});
sceneRef.input.pointer.worldX = 310;
sceneRef.input.pointer.worldY = 570;
sceneRef.input.pointer.isDown = true;
sceneRef.input.pointer.justDown = true;
toggle.update(0.016);
sceneRef.input.pointer.justDown = false;
sceneRef.input.pointer.isDown = false;
assert.strictEqual(toggle.getValue(), true, 'toggle should flip on press');
assert.strictEqual(toggled, true, 'toggle should call onChange');
toggle.update(0.5);
assert.strictEqual(toggle._knob, 1, 'toggle knob should animate to on');

// Polygon geometry and hit testing.
const polygon = sceneRef.add.polygon(
  600,
  400,
  [[0, 0], [40, 0], [20, 30]],
  { color: '#89b4fa' }
);
assert.strictEqual(polygon.width, 40);
assert.strictEqual(polygon.height, 30);
assert.ok(polygon.getArea() > 0, 'polygon area should be positive');
assert.strictEqual(polygon.containsPoint(20, 10), true, 'polygon contains an inner point');
assert.strictEqual(polygon.containsPoint(1, 25), false, 'polygon rejects an outer point');

// Sprite tinting renders through an offscreen canvas.
sceneRef.load.images.tinted = { width: 8, height: 8 };
const tintedSprite = sceneRef.add.sprite(10, 400, 8, 8, 'tinted');
tintedSprite.setTint('#ff0000');
const drawsBeforeTint = calls.drawImage;
tintedSprite.render(game.ctx);
assert.ok(calls.drawImage > drawsBeforeTint, 'tinted sprite should draw');
assert.ok(tintedSprite._tintCache && tintedSprite._tintCache.canvas, 'tint should be cached');
tintedSprite.clearTint();
assert.strictEqual(tintedSprite.tint, null);
tintedSprite.destroy();
delete sceneRef.load.images.tinted;

// setInteractive emits pointerover/click and unregisters on destroy.
const interactive = sceneRef.add.rect(400, 200, 40, 40, '#ffffff');
const seen = [];
interactive.setInteractive({
  onClick: () => seen.push('click'),
  onHover: () => seen.push('over')
});
sceneRef.input.pointer.worldX = 410;
sceneRef.input.pointer.worldY = 210;
sceneRef.input.update();
assert.deepStrictEqual(seen, ['over'], 'interactive should emit pointerover');
sceneRef.input.pointer.justDown = true;
sceneRef.input.pointer.isDown = true;
sceneRef.input.update();
sceneRef.input.pointer.justDown = false;
sceneRef.input.pointer.isDown = false;
sceneRef.input.pointer.justUp = true;
sceneRef.input.update();
sceneRef.input.pointer.justUp = false;
assert.deepStrictEqual(seen.slice(1), ['click'], 'interactive should emit click');
interactive.destroy();
assert.strictEqual(
  sceneRef.input._interactive.indexOf(interactive),
  -1,
  'destroy should unregister interactive objects'
);

// Key chords.
sceneRef.input.addKeyCombo('dash', ['ShiftLeft', 'KeyD']);
sceneRef.input.keys.ShiftLeft = true;
sceneRef.input.keys.KeyD = true;
sceneRef.input.justPressed.KeyD = true;
assert.strictEqual(sceneRef.input.keyComboDown('dash'), true);
assert.strictEqual(sceneRef.input.keyComboJustDown('dash'), true);
sceneRef.input.justPressed.KeyD = false;
assert.strictEqual(sceneRef.input.keyComboJustDown('dash'), false);
sceneRef.input.keys.ShiftLeft = false;
sceneRef.input.keys.KeyD = false;

// Color tweens interpolate instead of flipping at 50%.
const colorHolder = { color: '#000000' };
const colorTween = sceneRef.tweens.add({
  targets: colorHolder,
  color: '#ffffff',
  duration: 100
});
colorTween.update(50);
assert.ok(colorHolder.color.startsWith('rgba('), 'color tween should interpolate, got ' + colorHolder.color);
colorTween.stop();

// repeatDelay holds the end value before the next repeat.
const repeatHolder = { value: 0 };
const repeatTween = sceneRef.tweens.add({
  targets: repeatHolder,
  value: 10,
  duration: 50,
  repeat: 1,
  repeatDelay: 100
});
repeatTween.update(50);
assert.strictEqual(repeatHolder.value, 10, 'first leg should finish');
repeatTween.update(50);
assert.strictEqual(repeatHolder.value, 10, 'repeatDelay should hold the end value');
repeatTween.update(60);
assert.notStrictEqual(repeatTween.state, 'complete', 'the repeat should still be running');
repeatTween.stop();

// Storage snapshots.
game.storage.save('progress', { level: 3 });
const snapshot = game.storage.export();
assert.deepStrictEqual(snapshot.progress, { level: 3 });
game.storage.clear();
assert.strictEqual(game.storage.load('progress', null), null);
game.storage.import(snapshot);
assert.deepStrictEqual(game.storage.load('progress'), { level: 3 });
game.storage.remove('progress');

// Music pause/resume.
game.load.audios.song = new global.Audio();
const musicHandle = game.sound.musicPlay('song', { volume: 0.5 });
assert.ok(musicHandle, 'music should play');
game.sound.musicPause();
assert.strictEqual(game.sound.isMusicPlaying(), false, 'musicPause should pause');
game.sound.musicResume();
assert.strictEqual(game.sound.isMusicPlaying(), true, 'musicResume should resume');

// A fresh track must not inherit the paused flag of a stopped one.
game.sound.musicPause();
game.sound.stopMusic();
assert.ok(game.sound.musicPlay('song', { volume: 0 }), 'a track should play after a paused stop');
assert.strictEqual(
  game.sound.isMusicPlaying(),
  true,
  'musicPlay should clear the paused flag'
);
game.sound.stopMusic();
assert.strictEqual(
  game.sound.isMusicPlaying(),
  false,
  'isMusicPlaying stays false after stopMusic'
);
delete game.load.audios.song;

// Tilemap object layers.
const objectMap = sceneRef.add.tilemap(
  {
    tileWidth: 16,
    tileHeight: 16,
    width: 4,
    height: 4,
    layers: [
      { name: 'objects', data: [], objects: [{ name: 'spawn', x: 32, y: 64 }] }
    ]
  },
  0,
  0
);
assert.strictEqual(objectMap.getObjects('objects').length, 1);
assert.strictEqual(objectMap.getObjectByName('spawn').x, 32);
objectMap.destroy();

sceneRef.input.pointer.isDown = false;
sceneRef.input.pointer.justDown = false;
sceneRef.input.pointer.justUp = false;

// Scene switching + cleanup.
class SecondScene extends Chroms.Scene {
  constructor() {
    super('second');
  }
  create() {
    this.add.text(0, 0, 'second');
  }
}
sceneRef.events.on('custom-event', () => {});
game.addScene(SecondScene);
game.startScene('second');
assert.strictEqual(game.currentScene.key, 'second');
assert.strictEqual(sceneRef.children.length, 0, 'old scene should be cleaned');
assert.strictEqual(sceneRef.events.listenerCount('custom-event'), 0, 'scene listeners should be cleared');

const bodiesAfterSwitch = game.physics.bodies.length;
assert.strictEqual(bodiesAfterSwitch, 0, 'old scene bodies removed');
assert.strictEqual(game.physics.colliders.length, 0, 'old scene colliders removed');

game.startScene('test');
assert.ok(game.currentScene.created === undefined || game.currentScene.created === true);
assert.ok(game.currentScene.children.length > 0, 'scene should rebuild');
frames(5, 16.67);

// An uncaught update error pauses the game and draws an overlay.
class BrokenScene extends Chroms.Scene {
  constructor() {
    super('broken');
  }
  create() {
    this.add.text(0, 0, 'broken');
  }
  update() {
    throw new Error('boom');
  }
}
const brokenGame = new Chroms.Game({
  width: 320,
  height: 240,
  parent,
  scene: [BrokenScene],
  autoStart: false,
  scaleMode: 'none',
  debug: false
});
const caughtErrors = [];
brokenGame.events.on('error', (error, phase) => caughtErrors.push({ error, phase }));
const realConsoleError = console.error;
console.error = () => {}; // the engine logs the caught error once; keep test output clean
brokenGame.step();
console.error = realConsoleError;
assert.ok(brokenGame.lastError, 'the error should be recorded');
assert.strictEqual(brokenGame.lastError.message, 'boom');
assert.strictEqual(brokenGame.lastError.phase, 'update');
assert.strictEqual(brokenGame.paused, true, 'a caught error should pause the game');
assert.strictEqual(caughtErrors.length, 1, 'the error should be emitted once');
assert.strictEqual(caughtErrors[0].phase, 'update');
brokenGame.step();
assert.strictEqual(caughtErrors.length, 1, 'the same error should not be re-emitted');
brokenGame.clearError();
assert.strictEqual(brokenGame.lastError, null, 'clearError should dismiss the overlay');
brokenGame.destroy();

// Multiple active scenes: launch, stack order, pause and stop.
class WorldScene extends Chroms.Scene {
  constructor() {
    super('world');
  }
  create() {
    this.updates = 0;
    this.physics.setBounds(0, 0, 200, 200);
    this.player = this.add.rect(0, 0, 10, 10, '#ffffff');
    this.player.enablePhysics({ velocityX: 120, collideWorldBounds: true });
  }
  update() {
    this.updates += 1;
  }
}
class HudScene extends Chroms.Scene {
  constructor() {
    super('hud');
  }
  create() {
    this.updates = 0;
    this.add.text(0, 0, 'HUD');
  }
  update() {
    this.updates += 1;
  }
}
const multiGame = new Chroms.Game({
  width: 200,
  height: 200,
  parent,
  scene: [WorldScene],
  autoStart: false,
  scaleMode: 'none',
  debug: false
});
const world = multiGame.currentScene;
multiGame.addScene(HudScene);
const hud = multiGame.launchScene('hud');
assert.strictEqual(multiGame.sceneStack.length, 2, 'launch should stack scenes');
assert.strictEqual(multiGame.currentScene.key, 'hud', 'the launched scene renders on top');
assert.strictEqual(hud.isActive(), true, 'launched scene is active');
assert.strictEqual(world.isActive(), true, 'the previous scene stays active');
const worldUpdates = world.updates;
const hudUpdates = hud.updates;
multiGame.step(0.05);
assert.strictEqual(world.updates, worldUpdates + 1, 'both active scenes update');
assert.strictEqual(hud.updates, hudUpdates + 1, 'both active scenes update');
assert.ok(world.player.x > 0, 'world bodies simulate');

// Pausing one scene freezes its bodies and leaves the others running.
multiGame.pauseScene('world');
const worldX = world.player.x;
const worldUpdateCount = world.updates;
const hudUpdateCount = hud.updates;
multiGame.step(0.05);
assert.strictEqual(world.player.x, worldX, 'paused scene bodies should freeze');
assert.strictEqual(world.updates, worldUpdateCount, 'paused scene should not update');
assert.strictEqual(hud.updates, hudUpdateCount + 1, 'other scenes keep updating');
multiGame.resumeScene('world');

// --- 1.2.1: a reparented body belongs to its new scene ---
world.player.addTo(hud);
assert.strictEqual(world.player.body.scene, hud, 'body.scene should follow the object');
multiGame.pauseScene('hud');
world.player.body.velocity.x = 120;
const movedX = world.player.body.x;
multiGame.step(0.05);
assert.strictEqual(
  world.player.body.x,
  movedX,
  'a reparented body must obey the new scene status'
);
multiGame.resumeScene('hud');
world.player.body.velocity.x = 0;
world.player.addTo(world);
assert.strictEqual(world.player.body.scene, world, 'body.scene follows the object back');

// Reordering and stopping.
multiGame.bringToTop('world');
assert.strictEqual(multiGame.currentScene.key, 'world');
assert.deepStrictEqual(multiGame.sceneStack, ['hud', 'world']);
multiGame.stopScene('hud');
assert.strictEqual(multiGame.sceneStack.length, 1);
assert.strictEqual(hud.isActive(), false, 'stopped scene leaves the stack');
assert.strictEqual(multiGame.currentScene.key, 'world');
multiGame.stopScene('world');
assert.strictEqual(multiGame.currentScene, null);
multiGame.destroy();

// --- 1.2.1: restarting a slept scene must make it render again ---
class SleeperScene extends Chroms.Scene {
  constructor() {
    super('sleeper');
  }
  create() {
    this.add.rect(0, 0, 8, 8, '#ffffff');
  }
}
const sleepGame = new Chroms.Game({
  width: 160,
  height: 120,
  parent,
  scene: [SleeperScene],
  autoStart: false,
  scaleMode: 'none',
  debug: false
});
const sleeper = sleepGame.currentScene;
sleeper.sleep();
assert.strictEqual(sleeper.camera.visible, false, 'sleep hides the scene camera');
sleepGame.startScene('sleeper');
assert.strictEqual(sleeper.camera.visible, true, 'a restarted scene must render again');

// Sleeping a paused scene and waking it returns to paused, not running.
sleeper.pause();
sleeper.sleep();
sleeper.wake();
assert.strictEqual(sleeper.status, 'paused', 'wake should restore the paused state');
sleeper.resume();
sleepGame.destroy();

// --- 1.2.2 regressions ---
// Pointer input respects scene status, blockInput and container transforms.
let padClicks = 0;
const pad = sceneRef.add.rect(300, 40, 60, 30, '#ffffff').setScrollFactor(0);
pad.setInteractive({ onClick: () => { padClicks += 1; } });
const tap = (x, y) => {
  const pointer = game.input.pointer;
  pointer.x = x;
  pointer.y = y;
  pointer.worldX = x;
  pointer.worldY = y;
  pointer.justDown = true;
  pointer.isDown = true;
  game.input.update();
  pointer.justDown = false;
  pointer.isDown = false;
  pointer.justUp = true;
  game.input.update();
  game.input.clearFrameState();
};
tap(310, 50);
assert.strictEqual(padClicks, 1, 'screen-space interactive objects receive clicks');
sceneRef.pause();
tap(310, 50);
assert.strictEqual(padClicks, 1, 'paused scenes ignore pointer input');
sceneRef.resume();
game.pause();
tap(310, 50);
assert.strictEqual(padClicks, 1, 'a paused game ignores pointer input');
game.resume();

// Containers: hit testing follows the parent transform.
const cardHolder = sceneRef.add.container(200, 300).setScrollFactor(0);
const card = sceneRef.add.rect(10, 10, 40, 20, '#ffffff');
cardHolder.add(card);
let cardClicks = 0;
card.setInteractive({ onClick: () => { cardClicks += 1; } });
tap(215, 315);
assert.strictEqual(cardClicks, 1, 'interactive children of a container use world transforms');
tap(150, 150);
assert.strictEqual(cardClicks, 1, 'clicks outside the container child do nothing');

// A modal scene blocks input for the scenes below it.
class ModalScene extends Chroms.Scene {
  constructor() {
    super('modal');
  }
  create() {
    this.setBlockInput(true);
  }
}
game.addScene(ModalScene);
game.launchScene('modal');
tap(310, 50);
assert.strictEqual(padClicks, 1, 'blockInput stops clicks on scenes below');
game.stopScene('modal');
tap(310, 50);
assert.strictEqual(padClicks, 2, 'closing the modal returns input');

// Cancelled tweens and camera fades clear their references.
let tweenStops = 0;
const stoppable = sceneRef.tweens.add({
  targets: { v: 0 },
  v: 1,
  duration: 100,
  onStop: () => { tweenStops += 1; }
});
stoppable.stop();
stoppable.stop();
assert.strictEqual(tweenStops, 1, 'onStop fires once when a tween is cancelled');
sceneRef.camera.fadeOut(100);
assert.ok(sceneRef.camera._fadeTween, 'fadeOut creates a tween');
sceneRef.camera._fadeTween.stop();
assert.strictEqual(sceneRef.camera._fadeTween, null, 'cancelling a fade clears its reference');

// The error overlay resets the canvas transform before drawing.
const transforms = [];
const originalSetTransform = game.ctx.setTransform;
game.ctx.setTransform = (...args) => { transforms.push(args); };
game.lastError = { message: 'boom', phase: 'update', frame: 1, stack: '' };
game._drawErrorOverlay(game.ctx);
game.ctx.setTransform = originalSetTransform;
assert.ok(
  transforms.some((args) => args[0] === game.pixelRatio),
  'the error overlay resets the canvas transform'
);
game.clearError();

// A start requested during another load is queued instead of resetting it.
const queueGame = new Chroms.Game({
  width: 120,
  height: 90,
  parent,
  scene: [SleeperScene, SecondScene],
  autoStart: false,
  scaleMode: 'none',
  debug: false
});
let queuedEvents = 0;
queueGame.events.on('scene-queued', () => { queuedEvents += 1; });
queueGame.load.isLoading = true;
queueGame.startScene('second');
assert.strictEqual(queuedEvents, 1, 'a start during loading is queued');
assert.strictEqual(queueGame.currentScene.key, 'sleeper', 'the running scene is left alone');
assert.strictEqual(queueGame.currentScene.status, 'running', 'the running scene keeps running');
queueGame.load.isLoading = false;
queueGame._startQueuedScenes();
assert.strictEqual(queueGame.currentScene.key, 'second', 'the queued scene starts after loading');
assert.strictEqual(queueGame.currentScene.status, 'running', 'the queued scene is running');
assert.strictEqual(queueGame.getActiveScenes().length, 1, 'a queued startScene still switches scenes');
queueGame.destroy();

// Physics reuses one cache map instead of allocating per step.
game.step(1 / 60);
const cacheStore = sceneRef.physics._cacheStore;
assert.ok(cacheStore instanceof Map, 'a stepped world keeps its cache map');
game.step(1 / 60);
assert.strictEqual(sceneRef.physics._cacheStore, cacheStore, 'the physics cache map is reused');

// Sprite frame lookups are cached until the texture or frame changes.
const cachedFrame = sceneRef.player._resolveFrame();
assert.strictEqual(sceneRef.player._resolveFrame(), cachedFrame, 'frame data is cached per texture/frame');

// --- 1.2.3 regressions ---
// Version helpers compare numerically and understand ranges.
assert.strictEqual(Chroms.compareVersions('1.2.3', '1.2.3'), 0);
assert.strictEqual(Chroms.compareVersions('1.2.3', '1.2.0'), 1);
assert.strictEqual(Chroms.compareVersions('1.10.0', '1.9.9'), 1, 'versions compare as numbers');
assert.strictEqual(Chroms.compareVersions('nope', '1.0.0'), null);
assert.ok(Chroms.satisfies('1.2.3', '^1.2.0'));
assert.ok(!Chroms.satisfies('2.0.0', '^1.2.3'));
assert.ok(Chroms.satisfies('1.2.9', '~1.2.3'));
assert.ok(!Chroms.satisfies('1.3.0', '~1.2.3'));
assert.ok(Chroms.satisfies('1.9.0', '1.x'));
assert.ok(Chroms.satisfies('1.2.3', '>=1.2.0, <2.0.0'));
assert.ok(Chroms.isCompatible('^1.0.0'));

// Manifest validation and normalization.
const goodConfig = Chroms.validateConfig({
  name: 'my-game',
  version: '0.1.0',
  engine: '^1.2.0',
  author: { name: 'Jane', email: 'jane@example.com' }
});
assert.ok(goodConfig.ok, 'a complete manifest validates');
assert.strictEqual(goodConfig.config.author, 'Jane <jane@example.com>');
assert.deepStrictEqual(goodConfig.warnings, []);
const emptyConfig = Chroms.validateConfig({ version: 'x' });
assert.ok(!emptyConfig.ok, 'name and engine are required');
assert.ok(emptyConfig.errors.length >= 2);
const badEngine = Chroms.validateConfig({ name: 'x', engine: 'latest' });
assert.ok(!badEngine.ok, 'a malformed engine range is rejected');
const futureEngine = Chroms.validateConfig({ name: 'x', engine: '^9.0.0' });
assert.ok(futureEngine.ok, 'an engine mismatch only warns');
assert.strictEqual(futureEngine.warnings.length, 1);

// A game exposes the manifest and includes it in describe().
const projectGame = new Chroms.Game({
  width: 100,
  height: 80,
  parent,
  scene: [SleeperScene],
  autoStart: false,
  scaleMode: 'none',
  project: { name: 'demo', version: '0.1.0', engine: '^1.2.0' }
});
assert.strictEqual(projectGame.project.name, 'demo');
assert.strictEqual(projectGame.getProjectConfig().engine, '^1.2.0');
assert.strictEqual(projectGame.describe().project.name, 'demo');
assert.strictEqual(Chroms.describe().config.file, 'chroms.config.json');
projectGame.destroy();

// Separation against an immovable body moves along one axis only.
const floor = sceneRef.add.rect(100, 100, 100, 20, '#ffffff');
floor.enablePhysics({ immovable: true });
const walker = sceneRef.add.rect(140, 85, 20, 20, '#ffffff');
walker.enablePhysics();
sceneRef.physics.collideNow(walker, floor);
assert.strictEqual(Math.round(walker.x), 140, 'vertical separation does not move x');
assert.strictEqual(Math.round(walker.y), 80, 'vertical separation moves only y');
const separationWall = sceneRef.add.rect(200, 200, 20, 100, '#ffffff');
separationWall.enablePhysics({ immovable: true });
const separationRunner = sceneRef.add.rect(185, 220, 20, 20, '#ffffff');
separationRunner.enablePhysics();
sceneRef.physics.collideNow(separationRunner, separationWall);
assert.strictEqual(Math.round(separationRunner.x), 180, 'horizontal separation moves only x');
assert.strictEqual(Math.round(separationRunner.y), 220, 'horizontal separation does not move y');

// Audio volume, channel selection and fade cleanup.
const stubAudio = () => ({
  volume: 1,
  currentTime: 0,
  playbackRate: 1,
  loop: false,
  addEventListener() {},
  play() { return Promise.resolve(); },
  pause() {}
});
game.load.audios.blip = { cloneNode: () => stubAudio() };
game.sound.setSfxVolume(1);
const blip = game.sound.play('blip', { volume: 0.5 });
assert.strictEqual(blip.audio.volume, 0.5);
game.sound.setSfxVolume(0.5);
assert.strictEqual(blip.audio.volume, 0.25, 'setSfxVolume updates playing sounds');
game.sound._fadeTo(blip, 0, 1000);
assert.strictEqual(game.sound._fades.length, 1);
blip.stop();
assert.strictEqual(game.sound._fades.length, 0, 'stopping a sound drops its fade');
const looped = game.sound.play('blip', { loop: true, channel: 'sfx' });
assert.strictEqual(looped.channel, 'sfx', 'an explicit channel wins over loop');
looped.stop();
game.sound.setSfxVolume(1);

// A locked drag axis keeps the position from the start of the drag.
const draggable = sceneRef.add.rect(10, 50, 40, 40, '#ffffff');
game.input.enableDrag(draggable, { dragX: false });
draggable.x = 90;
const dragPointer = game.input.pointer;
dragPointer.worldX = 100;
dragPointer.worldY = 60;
game.input._beginDrag();
assert.ok(game.input._dragging, 'the drag starts on the object');
dragPointer.worldX = 160;
game.input._dragMove();
assert.strictEqual(draggable.x, 90, 'a locked axis holds the drag-start position');
assert.strictEqual(draggable.y, 50);
game.input._endDrag();
game.input.disableDrag(draggable);

// once() removes only its own listener.
const bus = new Chroms.EventEmitter();
let busCalls = 0;
const busHandler = () => { busCalls += 1; };
bus.once('tick', busHandler);
bus.on('tick', busHandler);
bus.emit('tick');
bus.emit('tick');
assert.strictEqual(busCalls, 3, 'a persistent listener survives once()');

// sendToBack() moves game.currentScene with the stack.
const stackGame = new Chroms.Game({
  width: 100,
  height: 80,
  parent,
  scene: [SleeperScene, SecondScene],
  autoStart: false,
  scaleMode: 'none'
});
stackGame.startScene('sleeper');
stackGame.launchScene('second');
assert.strictEqual(stackGame.currentScene.key, 'second');
stackGame.sendToBack('second');
assert.strictEqual(stackGame.currentScene.key, 'sleeper', 'currentScene follows the reordered stack');
stackGame.destroy();

// The loader resolves sprite sheets, and a killed tween is not "complete".
game.load.spritesheets.cardSheet = { image: {}, frames: [] };
assert.ok(game.load.get('cardSheet'), 'loader.get resolves sprite sheets');
let managerCompletes = 0;
const onManagerComplete = () => { managerCompletes += 1; };
sceneRef.tweens.events.on('complete', onManagerComplete);
const killedTween = sceneRef.tweens.add({ targets: { v: 0 }, v: 1, duration: 1000 });
killedTween.stop();
assert.strictEqual(managerCompletes, 0, 'a stopped tween is not reported as complete');
sceneRef.tweens.events.off('complete', onManagerComplete);

game.destroy();
assert.ok(!game.running);

console.log('smoke ok: ' + JSON.stringify({ fillRect: calls.fillRect, fillText: calls.fillText }));
