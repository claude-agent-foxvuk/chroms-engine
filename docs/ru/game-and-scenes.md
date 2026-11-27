# Игра и сцены

## Создание игры

```js
const game = new Chroms.Game({
  width: 800,
  height: 600,
  parent: document.body,   // или id элемента: 'game-root'
  backgroundColor: '#181825',
  scene: [BootScene, MenuScene, PlayScene],
  startScene: 'MenuScene',
  gravity: { x: 0, y: 1000 },
  debug: true
});
```

`Chroms.createGame(config)` — алиас `new Chroms.Game(config)`.

### Конфигурация

| Ключ | По умолчанию | Значение |
| --- | --- | --- |
| `width`, `height` | `800`, `600` | Логический размер холста |
| `parent` | `document.body` | Элемент или его id |
| `backgroundColor` | `'#181825'` | Цвет очистки |
| `pixelRatio` | `min(2, devicePixelRatio)` | Масштаб backing store |
| `scaleMode` | `'fit'` | `fit`, `letterbox`, `stretch`, `none` |
| `autoResize` | `true` (кроме `none`) | Пересчёт при ресайзе окна |
| `antialias` | `true` | Сглаживание изображений |
| `fixedStep` | `1/60` | Шаг `scene.fixedUpdate`, секунды |
| `maxDelta` | `0.1` | Максимальный `dt`, секунды |
| `timeScale` | `1` | Глобальная скорость симуляции |
| `pauseOnHidden` | `true` | Не симулировать в скрытой вкладке |
| `debug` | `false` | Включить debug-оверлей |
| `debugKey` | `'Backquote'` | Клавиша переключения; `null` отключает |
| `gravity` | `{x:0,y:0}` | Гравитация мира (приоритет над `physics.gravity`) |
| `physics` | `{}` | `{ gravity, enabled, fixedStep, maxSubSteps, debug }` |
| `scene` / `scenes` | — | Класс сцены или массив классов |
| `startScene` | первый ключ | Стартовая сцена |
| `plugins` | `[]` | Плагины для установки |
| `loading` | см. ниже | Стиль экрана загрузки |
| `storagePrefix` | `'chroms'` | Пространство имён localStorage |
| `seed` | `Date.now()` | Сид `game.random` |
| `autoStart` | `true` | Запускать цикл сразу |

```js
loading: {
  text: 'Загрузка...',
  barColor: '#89b4fa',
  trackColor: 'rgba(255,255,255,0.12)',
  textColor: '#cdd6f4',
  show: true
}
```

### Свойства

`canvas`, `ctx`, `width`, `height`, `scaleMode`, `pixelRatio`, `scenes`, `sceneOrder`, `sceneStack`, `currentScene`, `events`, `load`, `input`, `sound`, `physics`, `anims`, `tweens`, `time`, `storage`, `random`, `fps`, `delta`, `elapsed`, `frameCount`, `paused`, `running`, `timeScale`, `debug`, `loadingStyle`, `transition`, `lastError`, `plugins`, `scale`.

`sceneStack` — ключи активных сцен снизу вверх; `lastError` — последняя пойманная ошибка `{ message, stack, phase, frame }` или `null`.

### Методы

| Метод | Описание |
| --- | --- |
| `addScene(SceneClass)` | Зарегистрировать класс/экземпляр сцены |
| `getScene(key)`, `removeScene(key)` | Получить / удалить сцену |
| `startScene(key, data, { fade, fadeColor })` | Запустить сцену, остановив остальные активные; fade в мс |
| `launchScene(key, data?)` | Запустить сцену поверх работающих, не останавливая их |
| `getActiveScenes()` | Активные сцены снизу вверх |
| `bringToTop(key?)`, `sendToBack(key?)` | Переставить сцену в стеке |
| `isActive(key?)` | `true`, пока сцена в активном стеке |
| `stopScene(key?)` | Остановить и очистить сцену |
| `pauseScene`, `resumeScene`, `sleepScene`, `wakeScene` | Состояния сцен |
| `start`, `stop`, `pause`, `resume`, `togglePause` | Управление циклом |
| `setTimeScale`, `setBackgroundColor` | Настройки |
| `step(dt?)` | Провести один кадр вручную, без `requestAnimationFrame` |
| `setPixelArt(bool?)`, `toggleFullscreen()` | Пиксельный режим и полный экран |
| `clearError()` | Убрать оверлей ошибки |
| `resize()` | Пересчитать холст и CSS |
| `render()` | Нарисовать кадр вручную |
| `screenshot(type?)` | Data URL (`image/png`) |
| `use(plugin)` | Установить плагин |
| `describe()` | Машиночитаемый манифест |
| `destroy()` | Остановить игру и удалить холст |

### События

`ready`, `start`, `stop`, `pause`, `resume`, `preupdate`, `postupdate`, `scene-added`, `scene-start`, `scene-create`, `scene-stop`, `scene-launch`, `scene-bring-to-top`, `scene-sent-to-back`, `scene-load-progress`, `load-start`, `load-progress`, `load-complete`, `debug-toggle`, `visibility`, `resize`, `plugin-install`, `error` (`error`, `phase`), `destroy`.

### Масштаб

`fit` и `letterbox` сохраняют пропорции и вписывают холст в окно/родителя. `stretch` растягивает на 100% родителя. `none` использует точные CSS-пиксели и отключает авто-ресайз. Backing store всегда учитывает `pixelRatio`; ввод автоматически пересчитывается в логические координаты.

### Экран загрузки

Ассеты ставятся в очередь в `preload()`. Пока очередь грузится, игра рисует прогресс-бар поверх фона и не симулирует предыдущую сцену. Для своего экрана слушайте `load-progress` и выставьте `loading.show = false`.

### Debug и плагины

```js
game.debug.enabled = true;
game.debug.showFps = true;
game.debug.showBodies = false;
game.debug.showPointers = true;
game.debug.toggle();

Chroms.registerPlugin('my-plugin', (game) => {
  game.myPlugin = { hello: () => 'hi' };
});
game.use('my-plugin');
game.use((g) => g.events.on('scene-create', (s) => console.log(s.key)));
game.use({ install: (g) => {} });
```

## Сцены

```js
class PlayScene extends Chroms.Scene {
  constructor() {
    super('PlayScene');
  }
}

// или с конфигом:
super({ key: 'PlayScene', updateChildren: false });
```

`updateChildren: false` отключает автоматический вызов `update()` у детей.

### Свойства сцены

| Свойство | Описание |
| --- | --- |
| `key` | Уникальный ключ |
| `game` | Игра |
| `children` | Прямые дети (дети групп/контейнеров здесь не лежат) |
| `camera`, `cameras` | Камера и массив из одного элемента |
| `events` | Эмиттер сцены |
| `status` | `new`, `loading`, `running`, `paused`, `sleeping`, `stopped` |
| `data` | Данные, переданные в сцену |
| `add` | Фабрики объектов |
| `physics`, `input`, `load`, `sound`, `anims`, `storage`, `scale` | Алиасы систем игры |
| `tweens`, `time` | Твины и таймеры сцены, очищаются при переключении |
| `loadProgress` | Последний прогресс загрузки |

### Жизненный цикл

Переопределяйте `init(data)`, `preload()`, `create()`, `update(dt)`, `fixedUpdate(step)`, `shutdown()`. `fixedUpdate` получает детерминированный шаг и может выполниться несколько раз за кадр; он идёт до `update`.

### Фабрики объектов

| Фабрика | Сигнатура |
| --- | --- |
| `add.sprite` | `(x, y, width, height, textureOrColor)` |
| `add.image` | `(x, y, key, { width, height }?)` |
| `add.animatedSprite` | `(x, y, width, height, texture)` |
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

### Навигация и состояние

```js
this.scene.start('Menu', { from: 'game' }, { fade: 300 });
this.scene.restart();
this.scene.stop();
this.scene.pause();
this.scene.resume();
this.scene.sleep();
this.scene.wake();

this.scene.launch('Hud');   // оставить эту сцену работать, добавить сверху
this.scene.bringToTop();    // поднять сцену в стеке
this.scene.isActive();      // проверка членства
```

`start`/`restart` идут через менеджер игры: текущая сцена получает `shutdown`, её объекты уничтожаются. С `{ fade }` появляется затухание, затем переключение и проявление.

```js
game.startScene('PlayScene', { difficulty: 'hard' });
game.stopScene('PlayScene');
game.pauseScene();
game.resumeScene();
```

### Несколько активных сцен

`startScene` сохраняет прежний смысл: он останавливает все остальные активные сцены. `launchScene` добавляет сцену **поверх** работающих — так делают HUD, меню паузы, миникарты и модальные окна, не выгружая мир.

```js
class World extends Chroms.Scene {
  create() {
    this.player = this.add.circle(200, 200, 16, '#89b4fa');
    this.player.enablePhysics();
    this.launch('Hud');            // мир продолжает обновляться и рисоваться
  }
  update() {
    if (this.input.isJustDown('Escape')) this.launch('Pause');
  }
}

class Pause extends Chroms.Scene {
  create() {
    this.add.rect(200, 120, 400, 260, 'rgba(17,17,27,0.85)', 12)
      .setScrollFactor(0);
    this.add.button(360, 300, 80, 40, 'ДАЛЬШЕ', { onClick: () => this.stop() });
  }
}
```

Каждая сцена в статусе `running` обновляется и рисуется в порядке стека (снизу вверх): верхняя рисуется последней. Приостановленные и спящие сцены пропускаются, их тела заморожены, остальные продолжают симуляцию.

Важные ограничения:

- Один общий физический мир: `physics.setBounds()`, гравитация и коллайдеры глобальны для всех активных сцен.
- Один указатель: `input.pointer.worldX/worldY` пересчитывается через камеру последней обновлённой сцены. HUD держите в верхней сцене с `setScrollFactor(0)`.
- События указателя не фильтруются по сценам: проверяются все объекты, зарегистрированные через `setInteractive()`, даже в сцене под оверлеем или на паузе. Защищайте обработчики (`if (this.status !== 'running') return;`) или отключайте ввод нижней сцены, пока открыто модальное окно.
- Сцены грузятся по одной. `launch` во время `preload` другой сцены не поддерживается — дождитесь её `create()` или события `scene-create`.

### Ручной шаг и ошибки

`game.step(dt)` проводит ровно один кадр без `requestAnimationFrame` — для тестов, реплеев и пошаговых игр:

```js
game.step(1 / 60);   // секунды; по умолчанию game.fixedStep
```

Исключение из `update()` или `render()` перехватывается, шлётся событием `error`, рисуется оверлеем и ставит игру на паузу. Смотрите `game.lastError` и закрывайте через `game.clearError()`; после исправления вызовите `game.resume()`. `catchErrors: false` пробрасывает ошибку дальше, а `errorOverlay: { show: false }` оставляет перехват без отрисовки.

### Поиск детей

```js
this.children;
this.find((o) => o.name === 'player');
this.findByName('player');
this.findByType('Sprite');
this.getChildrenByType('Text');
this.remove(object, true); // удалить и уничтожить
```

### События сцены

`update`, `postupdate`, `prerender`, `render`, `pause`, `resume`, `sleep`, `wake`, `cleanup`, `button-click`.

## Group и Container

- `Group` — плоская коллекция в **мировых координатах**. Для пуль, монет, врагов, платформ. Поддерживает `runChildUpdate`, `maxSize`, физические коллайдеры.
- `Container` — **родительская трансформация**. Дети используют локальные координаты и наследуют позицию, поворот, масштаб и альфу. Для составных объектов.

```js
const enemies = this.add.group({ runChildUpdate: true });
const enemy = enemies.create(100, 100, 24, 24, '#f38ba8');
enemy.enablePhysics({ bounce: 1, collideWorldBounds: true });
this.physics.addCollider(this.player, enemies, (player, hit) => hit.destroy());

const card = this.add.container(200, 150);
card.add(this.add.rect(0, 0, 200, 120, '#313244', 10));
card.add(this.add.text(16, 16, 'Карточка', { fontSize: 20, color: '#cdd6f4' }));
card.setScale(1.1);
```
