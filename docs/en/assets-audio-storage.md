# Assets, audio and storage

## Loading assets

Queue assets in `preload()`; Chroms starts the queue after `preload()` returns and calls `create()` when it finishes.

```js
preload() {
  this.load.image('hero', 'assets/hero.png');
  this.load.audio('jump', 'assets/jump.ogg');
  this.load.json('level', 'assets/level.json');
  this.load.text('credits', 'assets/credits.txt');
  this.load.spritesheet('hero-sheet', 'assets/hero.png', 32, 48);
  this.load.atlas('ui', 'assets/ui.png', 'assets/ui.json');
}
```

| Method | Stored in | Getter |
| --- | --- | --- |
| `image(key, url)` | `loader.images` | `getImage(key)` |
| `audio(key, url)` | `loader.audios` | `getAudio(key)` |
| `json(key, url)` | `loader.json` | `getJSON(key, fallback?)` |
| `text(key, url)` | `loader.texts` | `getText(key, fallback?)` |
| `spritesheet(key, url, fw, fh, { margin, spacing })` | image + `loader.spritesheets` | `getImage`, `getFrame(key, index)` |
| `atlas(key, imageUrl, dataOrUrl)` | image + `loader.atlases` | `getFrame(key, name)` |

`loader.get(key)` checks images, audio, JSON and text. `loader.has(key)` includes sheets and atlases.

### Sprite sheets

`spritesheet` slices the image left-to-right, top-to-bottom using frame width/height plus optional `margin` and `spacing` (both in pixels). It also registers the full image under the same key, so `add.image` works.

```js
this.anims.create({
  key: 'walk',
  spritesheet: 'hero-sheet',
  frames: [0, 1, 2, 3],
  frameRate: 10,
  repeat: -1
});

const hero = this.add.sprite(100, 300, 32, 48, 'hero-sheet');
hero.play('walk');
```

### Atlases

Two common JSON shapes are accepted:

```json
{ "frames": {
  "hero_idle_0": { "frame": { "x": 0, "y": 0, "w": 32, "h": 48 } }
} }
```

```json
{ "frames": [
  { "filename": "hero_idle_0", "frame": { "x": 0, "y": 0, "w": 32, "h": 48 } }
] }
```

`getFrame('atlasKey', 'hero_idle_0')` returns `{ image, x, y, width, height }`. Sprites draw atlas frames automatically when `texture` is the atlas key and `frame` is a frame name.

### Progress and errors

`loader.progress` is `0..1`, with `loaded` and `total` counts and an `errors` array (`{ key, type, error }`). While a queue is running, the game draws its loading screen. Events on `game.events`:

```js
game.events.on('load-progress', ({ progress, loaded, total, key }) => {});
game.events.on('load-complete', ({ errors }) => {});
game.events.on('scene-load-progress', (scene, progress) => {});
```

Failed assets are reported and loading continues; `create()` still runs. Missing images fall back to colored rectangles, so prototypes keep working.

To drive loading manually (outside `preload`):

```js
this.load.image('late', 'late.png');
this.load.start(
  (progress, loaded, total) => console.log(progress),
  ({ errors }) => console.log('done', errors)
);
```

`start(onComplete)` is also supported for v1.0 compatibility. `loader.reset()` clears the queue counters (not already loaded assets).

### File protocol caveat

`Image` and `Audio` work from `file://`, but `fetch` (used by `json` and `text`, and by atlases loaded from a URL) is blocked by browser security. Serve over HTTP when using JSON, text or external atlas data.

## Audio

`scene.sound` is the shared `SoundManager`. Audio is created from the loader cache; call `play` after preloading.

```js
preload() {
  this.load.audio('jump', 'assets/jump.ogg');
  this.load.audio('music', 'assets/music.ogg');
}

create() {
  this.sound.play('jump', { volume: 0.6, rate: 1.1 });
  this.sound.musicPlay('music', { volume: 0.5, fade: 800 });
}
```

### SFX

```js
const handle = this.sound.play('jump', {
  volume: 0.8,
  rate: 1.2,        // playbackRate
  loop: false,
  channel: 'sfx'    // or 'music'
});

handle.setVolume(0.3);
handle.setRate(0.9);
handle.stop();

this.sound.stop('jump');
this.sound.stopAll();
```

Each call clones the cached audio element, so overlapping sounds work. A missing key returns `null` and emits `missing` on `sound.events`.

### Music

```js
this.sound.musicPlay('theme', { volume: 0.6, fade: 1000 });
this.sound.stopMusic(700);
this.sound.setMusicVolume(0.4);
this.sound.setSfxVolume(0.8);
this.sound.setMasterVolume(0.9);
```

Only one music handle is tracked (`sound.music`, `sound.musicKey`). `musicPlay` stops the previous track; `fade` is in milliseconds.

Pause and resume keep the playback position, which is what a settings menu or a tab switch needs:

```js
this.sound.musicPause();
this.sound.musicResume();
this.sound.isMusicPlaying();   // true only while a track exists and is not paused
```

Stopping a paused track clears the flag, so the next `musicPlay()` starts in a playing state.

### Mute and volume

```js
this.sound.mute(true);
this.sound.toggleMute();
this.sound.setMasterVolume(0.5);
```

`masterVolume`, `musicVolume` and `sfxVolume` multiply per-playback `volume`.

### Synthesized beeps

Useful for prototypes and UI feedback, powered by WebAudio:

```js
this.sound.beep({
  frequency: 440,
  slideTo: 880,
  duration: 0.12,   // seconds here
  type: 'triangle',
  volume: 0.15,
  delay: 0
});
```

The audio context is created lazily and unlocked on the first pointer/key gesture (the game registers listeners automatically). Browsers still require a gesture before audio starts.

### Autoplay limits

`Audio.play()` may reject before user interaction; Chroms swallows the rejection. Start music from a click/key handler or after `sound.unlock()`.

## Storage

`game.storage` is a namespaced `SaveManager` with a memory fallback.

```js
game.storage.save('profile', { level: 3, coins: 120 });
const profile = game.storage.load('profile', { level: 1, coins: 0 });
game.storage.has('profile');
game.storage.remove('profile');
game.storage.keys();     // keys under the prefix
game.storage.clear();    // only this prefix
```

The prefix defaults to `'chroms'`; set it in the game config:

```js
new Chroms.Game({ storagePrefix: 'my-game', /* ... */ });
```

Values are JSON-serialized. `localStorage` failures (private mode, quota, `file://` restrictions) fall back to an in-memory `Map`; the data then lasts for the page session only. Check `game.storage.available`.

### Snapshots

`export()` returns every value under the prefix as a plain object; `import()` writes one back. Useful for save files, cloud sync and tests:

```js
const snapshot = game.storage.export();
// { profile: {...}, 'slot-1': {...} }

game.storage.import(snapshot);            // merge into the current storage
game.storage.import(snapshot, true);       // replace: clears the prefix first
```

### Save slots recipe

```js
saveSlot(index) {
  this.game.storage.save('slot-' + index, {
    score: this.score,
    player: { x: this.player.x, y: this.player.y },
    savedAt: Date.now()
  });
}

loadSlot(index) {
  const data = this.game.storage.load('slot-' + index, null);
  if (!data) return false;
  this.score = data.score;
  this.player.setPosition(data.player.x, data.player.y);
  return true;
}
```

## Object data vs storage

For runtime-only metadata use the object data bag:

```js
enemy.setData({ hp: 3, kind: 'slime' });
enemy.incData('hp', -1);
enemy.getData('hp');
```

`game.storage` persists across reloads; object data does not.
