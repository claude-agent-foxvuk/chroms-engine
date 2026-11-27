# Chroms Engine v1.2.2 — документация

Chroms — 2D-движок для браузера без зависимостей. Рисует через Canvas 2D, поставляется одним файлом `chroms.js`, а игровая логика живёт в подклассах `Chroms.Scene`.

API вдохновлён **Phaser 3**: сцены с `preload`/`create`/`update`, фабрика `add`, группы, твины, таймеры и камера. Реализация независимая, только Canvas 2D: Phaser не входит в сборку, не импортируется и не требуется.

Документация рассчитана и на людей, и на нейросети: в репозитории есть [`llms.txt`](../llms.txt), [`api.json`](../api.json) и рантайм-манифест `Chroms.describe()`.

## Установка

```html
<script src="chroms.js"></script>
```

Ни сборщика, ни пакетного менеджера, ни транспиляции не нужно. Движок — IIFE, который выставляет `window.Chroms` (а через CommonJS — `module.exports`).

Для JSON, текста и аудио нужен HTTP-сервер: браузеры блокируют `fetch` на `file://`.

```bash
python -m http.server 8080
# http://localhost:8080
```

## Пример за 60 секунд

```html
<script src="chroms.js"></script>
<body style="margin:0;background:#11111b"></body>
<script>
  class Play extends Chroms.Scene {
    constructor() {
      super('Play');
    }

    preload() {
      // this.load.image('hero', 'assets/hero.png');
    }

    create() {
      this.physics.setBounds(0, 0, 800, 600);
      this.player = this.add.rect(380, 280, 36, 36, '#89b4fa', 8);
      this.player.enablePhysics({ collideWorldBounds: true });

      this.orbs = this.add.group();
      this.score = 0;
      this.scoreText = this.add
        .text(16, 16, 'Счёт 0', { fontSize: 20, color: '#cdd6f4' })
        .setScrollFactor(0);

      for (let i = 0; i < 5; i += 1) {
        this.orbs.create(
          Chroms.Math.randomInt(40, 740),
          Chroms.Math.randomInt(60, 540),
          16, 16, '#f9e2af'
        );
      }

      this.physics.overlapPair(this.player, this.orbs, (player, orb) => {
        orb.destroy();
        this.score += 10;
        this.scoreText.setText('Счёт ' + this.score);
        this.camera.shake(120, 4);
        this.sound.beep({ frequency: 620, slideTo: 880, duration: 0.08 });
      });
    }

    update() {
      let vx = 0;
      let vy = 0;
      if (this.input.isDown('ArrowLeft') || this.input.isDown('KeyA')) vx -= 260;
      if (this.input.isDown('ArrowRight') || this.input.isDown('KeyD')) vx += 260;
      if (this.input.isDown('ArrowUp') || this.input.isDown('KeyW')) vy -= 260;
      if (this.input.isDown('ArrowDown') || this.input.isDown('KeyS')) vy += 260;
      this.player.setVelocity(vx, vy);
    }
  }

  const game = new Chroms.Game({
    width: 800,
    height: 600,
    backgroundColor: '#181825',
    scene: [Play]
  });
</script>
```

## Карта документации

| Раздел | Содержание |
| --- | --- |
| [С чего начать](getting-started.md) | Файлы, скелет сцены, первый платформер, ассеты, UI |
| [Базовые концепции](core-concepts.md) | Жизненный цикл, цикл кадра, координаты, origin, depth, HUD, единицы |
| [Игра и сцены](game-and-scenes.md) | Конфиг/методы/события `Game`, загрузка, масштаб, сцены, группы |
| [Игровые объекты](game-objects.md) | Sprite, Text, фигуры (включая Polygon), TileSprite, Container, Group, Button, Joystick, слайдер/прогресс/тоггл, анимации |
| [Ввод и физика](input-and-physics.md) | Клавиатура, комбинации, указатель, геймпад, интерактивные объекты, тела, слои коллизий, коллайдеры, лучи, тайлы |
| [Эффекты и камера](effects-and-camera.md) | Твины, изинги, таймлайны, таймеры, частицы, камера |
| [Ассеты, аудио, сохранения](assets-audio-storage.md) | Загрузчик, прогресс, спрайт-листы, атласы, музыка/SFX, `game.storage` |
| [Тайлмапы](tilemaps.md) | Формат карты, слои, отрисовка, твёрдые тайлы, динамические изменения |
| [Для ИИ-агентов](ai-agents.md) | Порядок чтения, инварианты, рецепты, типичные ошибки, проверка |
| [Миграция и обновление](migration.md) | Изменения поведения 1.0 → 1.1 и заметки 1.1 → 1.2 |

English (primary): [`../en/index.md`](../en/index.md).

## Карта возможностей

**Ядро** — `Chroms.Game`, цикл на `requestAnimationFrame`, фиксированный шаг физики, реестр сцен, плавные переходы, экран загрузки, режимы масштаба (`fit`, `letterbox`, `stretch`, `none`), пауза, управление скоростью, скриншот, плагины, шина событий, debug-оверлей.

**Сцены** — `init → preload → create → update → fixedUpdate → shutdown`; pause/resume/sleep/wake/restart; фабрики объектов; группы и контейнеры; собственные твины/таймеры, очищаемые при переключении; HUD через `setScrollFactor(0)`.

**Отрисовка** — прямоугольники со скруглением, круги, линии, текст (перенос, выравнивание, обводка, тень, фон, «печатная машинка», многострочность), изображения, спрайт-листы, атласы, тайлспрайты, сортировка по глубине, альфа, режимы наложения, поворот, масштаб, origin, камера, отражение спрайтов, частицы.

**Физика** — AABB-тела с гравитацией, ускорением, сопротивлением, максимальной скоростью, отскоком, статичностью, сенсорами, границами мира; фиксированный шаг; постоянные коллайдеры; проверки пересечения; лучевые запросы; запросы прямоугольником/точкой; коллизии с тайлмапом; события столкновений.

**Ввод** — состояние клавиш и фронты кадра, действия, перехват клавиш, несколько указателей, wheel, геймпады, перетаскивание, виртуальный джойстик.

**Аудио** — загружаемое аудио, каналы SFX/музыки, громкость и скорость на проигрывание, затухания, mute, общая громкость, WebAudio-бипы.

**Данные** — сохранения в localStorage с fallback в память, seeded RNG, векторы, математические хелперы, библиотека изингов, `data`-мешки объектов.

**Инструменты** — `Chroms.describe()`, `docs/llms.txt`, `docs/api.json`, headless-смоук-тест, браузерный showcase.

**Новое в 1.2.0** — несколько активных сцен (`scene.launch`, `bringToTop`, `isActive`, `game.getActiveScenes`), слои и маски коллизий (`setCollisionGroup`, `setCollidesWith`, `setCollisionMatrix`), UI-виджеты (`add.slider`, `add.progressBar`, `add.toggle`), `add.polygon`, `sprite.setTint`, `object.setInteractive` с событиями указателя, комбинации клавиш, `repeatDelay` и цветовые твины, `storage.export/import`, `musicPause/musicResume`, объектные слои тайлмапов, `physics.moveTo`.

**Исправления в 1.2.2** — ввод учитывает статус сцены и `scene.blockInput`, хит-тесты и перетаскивание следуют трансформациям `Container`, `wake()` возвращает приостановленную сцену, отменённые фейды и паны очищают ссылки, `Tween.stop()` вызывает `onStop`, запуск сцены во время загрузки ставится в очередь, а оверлей ошибки сбрасывает трансформацию холста.

**Исправления в 1.2.1** — сцена после сна снова рендерится после перезапуска, `camera.panTo()` не перебивается активным `follow()`, флаг паузы музыки не остаётся на остановленном треке, `body.scene` следует за `object.addTo()`, остановленные и завершённые анимации покидают реестр анимаций.

**Новое в 1.1.3** — `game.step(dt?)` для ручных кадров, оверлей ошибок времени выполнения (`game.lastError`, `game.clearError()`, `game.events.on('error')`, `catchErrors: false`), кламп зума в `camera.zoomTo()` и обработка `pointercancel`.

**Новое в 1.1.2** — `camera.panTo(x, y, ms, ease?)`, `game.setPixelArt(bool)`, `game.toggleFullscreen()`, `group.getByName(name)`, `group.getClosest(x, y, aliveOnly?)`, `anims.pauseAll/resumeAll/stopAll`, размер частиц диапазоном `{ min, max }`.

## Совместимость и ограничения

- Только Canvas 2D: нет WebGL, шейдеров, батчинга и render texture.
- Физика только AABB: поворот объекта не поворачивает тело, круги сталкиваются как прямоугольники.
- Одна камера на сцену (`scene.camera`; `scene.cameras` — массив из одного элемента).
- Нет встроенных текстовых полей, скролл-вью и layout-движка.
- Нет импорта TMX/Tiled; формат тайлмапов описан в [tilemaps.md](tilemaps.md).
- Логика и рендер в одном потоке, без воркеров.
- Переключение сцены уничтожает объекты, твины и таймеры предыдущей сцены.
- Все активные сцены делят один физический мир и один указатель; `input.pointer.worldX/worldY` относится к последней обновлённой сцене кадра.
- Указатель видят только запущенные сцены. `game.pause()` отключает ввод виджетов и `setInteractive`, а `scene.setBlockInput(true)` блокирует все сцены под ней.

Версия: **1.2.2** (`Chroms.version`, `Chroms.VERSION`).
