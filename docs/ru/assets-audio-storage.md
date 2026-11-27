# Ассеты, аудио и сохранения

## Загрузка ассетов

Ставьте ассеты в очередь в `preload()`; Chroms запускает очередь после выхода из `preload()` и вызывает `create()`, когда всё готово.

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

| Метод | Куда | Геттер |
| --- | --- | --- |
| `image(key, url)` | `loader.images` | `getImage(key)` |
| `audio(key, url)` | `loader.audios` | `getAudio(key)` |
| `json(key, url)` | `loader.json` | `getJSON(key, fallback?)` |
| `text(key, url)` | `loader.texts` | `getText(key, fallback?)` |
| `spritesheet(key, url, fw, fh, { margin, spacing })` | изображение + `loader.spritesheets` | `getImage`, `getFrame(key, index)` |
| `atlas(key, imageUrl, dataOrUrl)` | изображение + `loader.atlases` | `getFrame(key, name)` |

`loader.get(key)` проверяет изображения, аудио, JSON и текст. `loader.has(key)` учитывает листы и атласы.

### Спрайт-листы

`spritesheet` режет изображение слева направо, сверху вниз с учётом `margin` и `spacing` (в пикселях). Полное изображение тоже доступно по тому же ключу.

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

### Атласы

Поддерживаются два формата JSON:

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

`getFrame('ui', 'hero_idle_0')` вернёт `{ image, x, y, width, height }`. Спрайт рисует кадр атласа, если `texture` — ключ атласа, а `frame` — имя кадра.

### Прогресс и ошибки

`loader.progress` — `0..1`, также доступны `loaded`, `total`, `errors` (`{ key, type, error }`). Пока очередь грузится, игра показывает экран загрузки. События на `game.events`:

```js
game.events.on('load-progress', ({ progress, loaded, total, key }) => {});
game.events.on('load-complete', ({ errors }) => {});
game.events.on('scene-load-progress', (scene, progress) => {});
```

Ошибки не останавливают загрузку; `create()` всё равно вызывается. Отсутствующие изображения заменяются цветными прямоугольниками, поэтому прототипы не ломаются.

Ручная загрузка:

```js
this.load.image('late', 'late.png');
this.load.start(
  (progress, loaded, total) => console.log(progress),
  ({ errors }) => console.log('готово', errors)
);
```

`start(onComplete)` тоже поддерживается для совместимости с 1.0. `loader.reset()` очищает очередь и счётчики (не загруженные ранее ассеты).

### Ограничение `file://`

`Image` и `Audio` работают через `file://`, но `fetch` (JSON, текст, атлас по URL) браузер блокирует. Для JSON/текста и внешних атласов нужен HTTP.

## Аудио

`scene.sound` — общий `SoundManager`. Звуки берутся из кэша загрузчика; вызывайте `play` после `preload`.

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
  rate: 1.2,
  loop: false,
  channel: 'sfx'
});

handle.setVolume(0.3);
handle.setRate(0.9);
handle.stop();

this.sound.stop('jump');
this.sound.stopAll();
```

Каждый вызов клонирует аудиоэлемент, поэтому звуки накладываются. Для отсутствующего ключа вернётся `null` и событие `missing` на `sound.events`.

Число вторым аргументом тоже работает: `sound.play('jump', 0.5)`.

### Музыка и громкость

```js
this.sound.musicPlay('theme', { volume: 0.6, fade: 1000 });
this.sound.stopMusic(700);
this.sound.setMusicVolume(0.4);
this.sound.setSfxVolume(0.8);
this.sound.setMasterVolume(0.9);
this.sound.mute(true);
this.sound.toggleMute();
```

Отслеживается один музыкальный трек (`sound.music`, `sound.musicKey`). `fade` — миллисекунды. `masterVolume`, `musicVolume`, `sfxVolume` перемножаются с громкостью конкретного проигрывания.

Пауза и продолжение сохраняют позицию — это нужно меню настроек и смене вкладки:

```js
this.sound.musicPause();
this.sound.musicResume();
this.sound.isMusicPlaying();   // true, только если трек есть и не на паузе
```

Остановка приостановленного трека сбрасывает флаг, поэтому следующий `musicPlay()` сразу играет.

### Синтезированные бипы

```js
this.sound.beep({
  frequency: 440,
  slideTo: 880,
  duration: 0.12,   // секунды
  type: 'triangle',
  volume: 0.15,
  delay: 0
});
```

Контекст WebAudio создаётся лениво и разблокируется первым указателем/клавишей (игра сама вешает обработчики). Браузеры всё равно требуют жест пользователя перед звуком.

## Сохранения

`game.storage` — `SaveManager` с пространством имён и запасным хранилищем в памяти.

```js
game.storage.save('profile', { level: 3, coins: 120 });
const profile = game.storage.load('profile', { level: 1, coins: 0 });
game.storage.has('profile');
game.storage.remove('profile');
game.storage.keys();
game.storage.clear(); // только этот префикс
```

Префикс по умолчанию `'chroms'`, меняется в конфиге:

```js
new Chroms.Game({ storagePrefix: 'my-game' /* ... */ });
```

Значения сериализуются в JSON. При недоступности `localStorage` (приватный режим, квота, ограничения `file://`) используется `Map` в памяти — данные живут до перезагрузки страницы. Проверить доступность: `game.storage.available`.

### Снимки

`export()` возвращает все значения под префиксом обычным объектом; `import()` записывает его обратно. Удобно для файлов сохранения, облачной синхронизации и тестов:

```js
const snapshot = game.storage.export();
// { profile: {...}, 'slot-1': {...} }

game.storage.import(snapshot);            // слить с текущим хранилищем
game.storage.import(snapshot, true);       // заменить: сначала очищает префикс
```

### Слоты сохранений

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

## Данные объекта vs сохранения

Для временных данных используйте мешок объекта:

```js
enemy.setData({ hp: 3, kind: 'slime' });
enemy.incData('hp', -1);
enemy.getData('hp');
```

`game.storage` переживает перезагрузку, данные объекта — нет.
