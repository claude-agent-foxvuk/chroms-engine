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
assert.strictEqual(Chroms.version, '1.1.0');
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
  debug: false,
  autoStart: false,
  scaleMode: 'none',
  gravity: { x: 0, y: 0 }
});

assert.ok(game.currentScene, 'scene should start');
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

// Scene switching + cleanup.
class SecondScene extends Chroms.Scene {
  constructor() {
    super('second');
  }
  create() {
    this.add.text(0, 0, 'second');
  }
}
game.addScene(SecondScene);
game.startScene('second');
assert.strictEqual(game.currentScene.key, 'second');
assert.strictEqual(sceneRef.children.length, 0, 'old scene should be cleaned');

const bodiesAfterSwitch = game.physics.bodies.length;
assert.strictEqual(bodiesAfterSwitch, 0, 'old scene bodies removed');

game.startScene('test');
assert.ok(game.currentScene.created === undefined || game.currentScene.created === true);
assert.ok(game.currentScene.children.length > 0, 'scene should rebuild');
frames(5, 16.67);

game.destroy();
assert.ok(!game.running);

console.log('smoke ok: ' + JSON.stringify({ fillRect: calls.fillRect, fillText: calls.fillText }));
