# Game and scenes

## Creating a game

```js
const game = new Chroms.Game({
  width: 800,
  height: 600,
  parent: document.body,        // or an element id: 'game-root'
  backgroundColor: '#181825',
  scene: [BootScene, MenuScene, PlayScene],
  startScene: 'MenuScene',      // optional; defaults to the first scene
  gravity: { x: 0, y: 1000 },
  debug: true
});
```

`new Chroms.createGame(config)` is an alias for `new Chroms.Game(config)`.

### Config reference

| Key | Default | Meaning |
| --- | --- | --- |
| `width`, `height` | `800`, `600` | Logical canvas size in pixels |
| `parent` | `document.body` | Element or element id to append the canvas to |
| `backgroundColor` | `'#181825'` | Clear color |
| `pixelRatio` | `min(2, devicePixelRatio)` | Backing-store scale; CSS size is independent |
| `scaleMode` | `'fit'` | `'fit'`, `'letterbox'`, `'stretch'`, `'none'` |
| `autoResize` | `true` (except `none`) | Re-fit on window resize |
| `antialias` | `true` | `imageSmoothingEnabled` |
| `fixedStep` | `1/60` | Scene `fixedUpdate` step in seconds |
| `maxDelta` | `0.1` | Maximum frame delta in seconds |
| `timeScale` | `1` | Global simulation speed |
| `pauseOnHidden` | `true` | Skip simulation when the tab is hidden |
| `debug` | `false` | Enable the debug overlay |
| `debugKey` | `'Backquote'` | Key code that toggles the overlay; `null` disables |
| `gravity` | `{x:0,y:0}` | World gravity; takes precedence over `physics.gravity` |
| `physics` | `{}` | `{ gravity, enabled, fixedStep, maxSubSteps, debug }` |
| `scene` / `scenes` | none | Scene class or array of classes |
| `startScene` | first key | Scene to activate |
| `plugins` | `[]` | Plugins to install |
| `loading` | see below | Loading screen style |
| `storagePrefix` | `'chroms'` | localStorage namespace |
| `seed` | `Date.now()` | Seed for `game.random` |
| `autoStart` | `true` | Start the loop immediately |

Loading screen options:

```js
loading: {
  text: 'Loading...',
  barColor: '#89b4fa',
  trackColor: 'rgba(255,255,255,0.12)',
  textColor: '#cdd6f4',
  show: true
}
```

### Properties

| Property | Description |
| --- | --- |
| `canvas`, `ctx` | Canvas element and 2D context |
| `width`, `height` | Logical size |
| `scaleMode`, `pixelRatio` | Rendering setup |
| `scenes`, `sceneOrder`, `currentScene` | Scene registry |
| `events` | Game `EventEmitter` |
| `load` | `AssetLoader` |
| `input` | `InputManager` |
| `sound` | `SoundManager` |
| `physics` | `PhysicsWorld` |
| `anims` | `AnimationManager` |
| `tweens`, `time` | Global `TweenManager` and `TimerManager` |
| `storage` | `SaveManager` |
| `random` | Seeded `Random` |
| `fps`, `delta`, `elapsed`, `frameCount` | Timing telemetry |
| `paused`, `running`, `timeScale` | Loop state |
| `debug` | Debug object: `enabled`, `showFps`, `showBodies`, `showPointers`, `toggle()`, `draw(ctx)` |
| `loadingStyle`, `transition` | Loading screen and scene fade state |
| `plugins` | Installed plugins |
| `scale` | `{ mode, pixelRatio, width, height, resize() }` |

### Methods

| Method | Description |
| --- | --- |
| `addScene(SceneClass)` | Register a scene class or instance |
| `getScene(key)`, `removeScene(key)` | Look up / remove a scene |
| `startScene(key, data, { fade, fadeColor })` | Stop the current scene, start another; optional fade in ms |
| `stopScene(key?)` | Shut down and clean a scene |
| `pauseScene`, `resumeScene`, `sleepScene`, `wakeScene` | Per-scene state changes |
| `start()`, `stop()`, `pause()`, `resume()`, `togglePause()` | Loop control |
| `setTimeScale(value)`, `setBackgroundColor(color)` | Settings |
| `resize()` | Recompute canvas/CSS size |
| `render()` | Draw the current frame manually |
| `screenshot(type?)` | Canvas data URL (`'image/png'` by default) |
| `use(plugin)` | Install a function plugin, `{ install(game) }` object or registered name |
| `describe()` | Machine-readable manifest (same as `Chroms.describe()`) |
| `destroy()` | Stop the loop, destroy scenes and remove the canvas |

### Events

| Event | Arguments |
| --- | --- |
| `ready` | `game` |
| `start`, `stop`, `pause`, `resume` | `game` |
| `preupdate`, `postupdate` | `delta` |
| `scene-added` | `scene` |
| `scene-start` | `scene` |
| `scene-create` | `scene` |
| `scene-stop` | `scene` |
| `scene-load-progress` | `scene`, `0..1` |
| `load-start`, `load-progress`, `load-complete` | loader payload |
| `debug-toggle` | `enabled` |
| `visibility` | `document.hidden` |
| `resize` | `width`, `height` |
| `plugin-install` | `name`, `installer` |
| `destroy` | `game` |

### Scaling

`fit` (default) and `letterbox` preserve the aspect ratio and fit the window or parent. `stretch` fills the parent (`100%` CSS width/height). `none` uses exact CSS pixels and disables auto resize. The canvas backing store always uses `pixelRatio`; input is mapped to logical coordinates automatically.

### Loading screen

Assets are queued in a scene's `preload()`. While the queue is loading, the game draws a centered progress bar over the background and suppresses the previous scene's simulation. To do something custom, listen to `load-progress` and set `loading.show = false`.

### Debug overlay

Press the debug key (`` ` `` by default) or set `game.debug.enabled = true`. It shows FPS, object count, body count and current scene; body rectangles are outlined in orange. Toggle individual parts:

```js
game.debug.showFps = true;
game.debug.showBodies = false;
game.debug.showPointers = true;
game.debug.toggle();
```

### Plugins

```js
Chroms.registerPlugin('timer-bar', (game) => {
  game.timerBar = { /* ... */ };
});

game.use('timer-bar');
game.use((g) => g.events.on('scene-create', (s) => console.log('scene', s.key)));
game.use({ install: (g) => { /* ... */ } });
```

## Scenes

### Definition

```js
class PlayScene extends Chroms.Scene {
  constructor() {
    super('PlayScene');
  }
}

// or with scene config:
super({ key: 'PlayScene', updateChildren: false });
```

`updateChildren: false` disables automatic child `update()` calls (useful when you update groups manually).

### Scene properties

| Property | Description |
| --- | --- |
| `key` | Unique scene name |
| `game` | Owning game |
| `children` | Direct scene children (not group/container children) |
| `camera`, `cameras` | The scene camera and a one-element array |
| `events` | Scene emitter |
| `status` | `new`, `loading`, `running`, `paused`, `sleeping`, `stopped` |
| `data` | Data passed to the scene |
| `add` | Object factory (table below) |
| `physics` | Shared `PhysicsWorld` |
| `input`, `load`, `sound`, `anims`, `storage`, `scale` | Aliases of game systems |
| `tweens`, `time` | Scene-scoped managers cleared on switch |
| `loadProgress` | Last reported loading progress |

### Lifecycle methods

Override any of: `init(data)`, `preload()`, `create()`, `update(dt)`, `fixedUpdate(step)`, `shutdown()`.

`fixedUpdate` receives a deterministic step and can run multiple times per rendered frame. It runs before `update`.

### Object factories

| Factory | Signature |
| --- | --- |
| `add.sprite` | `(x, y, width, height, textureOrColor)` |
| `add.image` | `(x, y, key, { width, height }?)` |
| `add.animatedSprite` | `(x, y, width, height, texture)` (plain sprite; call `.play()`) |
| `add.rect` | `(x, y, width, height, color, radius?)` |
| `add.circle` | `(x, y, radius, color)` |
| `add.line` | `(x1, y1, x2, y2, color, lineWidth?)` |
| `add.text` | `(x, y, text, style)` |
| `add.tileSprite` | `(x, y, width, height, texture, options?)` |
| `add.container` | `(x, y)` |
| `add.group` | `(config?)` |
| `add.particles` | `(x, y, config)` |
| `add.tilemap` | `(dataOrJsonKey, x?, y?)` |
| `add.button` | `(x, y, width, height, label, options)` |
| `add.joystick` | `(x, y, options)` |
| `add.existing` | `(object)` |

All factories add the object to the scene except `add.group().create(...)`, which adds to the group. See [game-objects.md](game-objects.md).

### Scene navigation and state

```js
this.scene.start('Menu', { from: 'game' }, { fade: 300 });
this.scene.restart();
this.scene.stop();
this.scene.pause();
this.scene.resume();
this.scene.sleep();
this.scene.wake();
```

`scene.start`/`restart` go through the game manager, which shuts down and destroys the current scene. With `{ fade }`, a colored overlay fades out, the scene switches, and it fades back in.

### Scene management from the game

```js
game.startScene('PlayScene', { difficulty: 'hard' });
game.stopScene('PlayScene');
game.pauseScene();
game.resumeScene();
game.sleepScene();
game.wakeScene();
```

### Searching children

```js
this.children;                         // direct children
this.find((o) => o.name === 'player');
this.findByName('player');
this.findByType('Sprite');
this.getChildrenByType('Text');
this.remove(object, true);             // remove and destroy
```

Group children live on the group, not in `scene.children`.

### Scene events

| Event | When |
| --- | --- |
| `update` | Before the user `update(dt)` |
| `postupdate` | After children and camera update |
| `prerender` | Inside the camera transform, before world objects |
| `render` | Inside the camera transform, after world objects |
| `pause`, `resume`, `sleep`, `wake` | State changes |
| `cleanup` | Objects are about to be destroyed |
| `button-click` | Any `Button` in the scene was clicked (receives the button) |

## Groups vs containers

- `Group` is a flat collection of objects that keep **world coordinates**. Use it for bullets, coins, enemies and platform sets. It can run child updates, enforce `maxSize`, and works with physics colliders.
- `Container` is a **parent transform**. Children use coordinates local to the container and inherit its position, rotation, scale and alpha. Use it for composite objects (a ship with a turret, a card with text and icons).

```js
const enemies = this.add.group({ runChildUpdate: true });
const enemy = enemies.create(100, 100, 24, 24, '#f38ba8');
enemy.enablePhysics({ bounce: 1, collideWorldBounds: true });
this.physics.addCollider(this.player, enemies, (player, hit) => hit.destroy());

const card = this.add.container(200, 150);
card.add(this.add.rect(0, 0, 200, 120, '#313244', 10));
card.add(this.add.text(16, 16, 'Card', { fontSize: 20, color: '#cdd6f4' }));
card.setScale(1.1);
```
