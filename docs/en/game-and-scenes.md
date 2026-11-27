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
| `sceneStack` | Keys of the active scenes, bottom to top |
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
| `lastError` | Last caught error `{ message, stack, phase, frame }`, or `null` |
| `plugins` | Installed plugins |
| `scale` | `{ mode, pixelRatio, width, height, resize() }` |

### Methods

| Method | Description |
| --- | --- |
| `addScene(SceneClass)` | Register a scene class or instance |
| `getScene(key)`, `removeScene(key)` | Look up / remove a scene |
| `startScene(key, data, { fade, fadeColor })` | Start a scene and stop the other active ones; optional fade in ms |
| `launchScene(key, data?)` | Start a scene on top and keep the running ones alive |
| `getActiveScenes()` | Active scenes, bottom to top |
| `bringToTop(key?)`, `sendToBack(key?)` | Reorder the active stack |
| `isActive(key?)` | `true` while the scene is in the active stack |
| `stopScene(key?)` | Shut down and clean a scene |
| `pauseScene`, `resumeScene`, `sleepScene`, `wakeScene` | Per-scene state changes |
| `start()`, `stop()`, `pause()`, `resume()`, `togglePause()` | Loop control |
| `setTimeScale(value)`, `setBackgroundColor(color)` | Settings |
| `step(dt?)` | Advance one frame by hand, outside `requestAnimationFrame` |
| `setPixelArt(bool?)`, `toggleFullscreen()` | Crisp pixel-art mode and fullscreen |
| `clearError()` | Dismiss the runtime error overlay |
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
| `scene-launch` | `scene` |
| `scene-bring-to-top`, `scene-sent-to-back` | `scene` |
| `scene-load-progress` | `scene`, `0..1` |
| `load-start`, `load-progress`, `load-complete` | loader payload |
| `debug-toggle` | `enabled` |
| `visibility` | `document.hidden` |
| `resize` | `width`, `height` |
| `plugin-install` | `name`, `installer` |
| `error` | `error`, `phase` (`'update'` or `'render'`) |
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
| `add.slider` | `(x, y, width, options)` |
| `add.progressBar` | `(x, y, width, height?, options)` |
| `add.toggle` | `(x, y, options)` |
| `add.polygon` | `(x, y, points, options)` |
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

this.scene.launch('Hud');       // keep this scene running, add one on top
this.scene.bringToTop();        // raise this scene in the stack
this.scene.isActive();          // membership check
```

`scene.start`/`restart` go through the game manager, which shuts down and destroys the scene. With `{ fade }`, a colored overlay fades out, the scene switches, and it fades back in.

### Scene management from the game

```js
game.startScene('PlayScene', { difficulty: 'hard' });
game.stopScene('PlayScene');
game.pauseScene();
game.resumeScene();
game.sleepScene();
game.wakeScene();
```

### Multiple active scenes

`startScene` keeps its original meaning: it stops every other active scene. `launchScene` adds a scene **on top** of the running ones, which is how you build HUDs, pause menus, minimaps and modal dialogs without unloading the world.

```js
class World extends Chroms.Scene {
  create() {
    this.player = this.add.circle(200, 200, 16, '#89b4fa');
    this.player.enablePhysics();
    this.launch('Hud');            // world keeps updating and rendering
  }
  update() {
    if (this.input.isJustDown('Escape')) this.launch('Pause');
  }
}

class Pause extends Chroms.Scene {
  create() {
    this.panel = this.add.rect(200, 120, 400, 260, 'rgba(17,17,27,0.85)', 12)
      .setScrollFactor(0);
    this.add.button(360, 300, 80, 40, 'RESUME', { onClick: () => this.stop() });
  }
}
```

Every scene with status `running` updates and renders in stack order (bottom first), so the top scene draws last. A paused or sleeping scene is skipped and its bodies are frozen; other scenes keep simulating.

Limits worth knowing:

- One shared physics world, so `physics.setBounds()`, gravity and colliders are global to all active scenes.
- One input pointer: `input.pointer.worldX/worldY` is converted through the camera of the last scene updated in the frame. Put HUD objects in a top scene and give them `setScrollFactor(0)`.
- Pointer events are scene-filtered: only scenes with status `running` receive them, `game.pause()` turns widget and `setInteractive` input off globally, and `scene.setBlockInput(true)` on an overlay stops input from reaching the scenes below it, so a manual `this.status` guard is no longer needed. Objects that lose hover while input is off receive `pointerout`.
- Scenes load one at a time. A `startScene`/`launchScene` requested while another scene is still loading is queued (event `scene-queued`) and started when the loader finishes, so its assets are not lost.
- `scene.setBlockInput(true)` (or `scene.blockInput = true`) makes a modal scene swallow pointer input for every scene below it in the stack; clear it when the modal closes.
- `sleep()` remembers whether the scene was paused, and `wake()` restores that status instead of always resuming.

### Manual stepping and errors

`game.step(dt)` advances exactly one frame without `requestAnimationFrame` — useful for tests, replays and turn-based games:

```js
game.step(1 / 60);   // seconds; defaults to game.fixedStep
```

An exception thrown from `update()` or `render()` is caught, emitted as `error`, drawn as an overlay and pauses the game. Inspect `game.lastError` and dismiss it with `game.clearError()`; after fixing the cause call `game.resume()`. `catchErrors: false` rethrows instead, and `errorOverlay: { show: false }` keeps the catch but skips the drawing.

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
