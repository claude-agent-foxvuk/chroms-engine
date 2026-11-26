# Руководство для ИИ-агентов

Chroms проектировался так, чтобы LLM могли писать на нём без догадок. Это кратчайший путь от промпта до рабочего кода и инварианты, в которых легко ошибиться.

## Порядок чтения

1. Этот файл.
2. [`../llms.txt`](../llms.txt) — компактная карта API.
3. [`../api.json`](../api.json) — машиночитаемые классы и методы.
4. В рантайме: `console.log(Chroms.describe())` возвращает тот же манифест.

Движок — классический скрипт. Не используйте `import`/`require` в браузерном коде. Всё API в `window.Chroms`. Никакого JSX, TypeScript и сборщика.

## Канонический скелет

```html
<script src="chroms.js"></script>
<script>
  class MainScene extends Chroms.Scene {
    constructor() {
      super('MainScene');
    }
    preload() {
      // только очередь ассетов
    }
    create() {
      // создать объекты один раз
    }
    update(dt) {
      // ввод, скорости, спавн, UI
    }
  }

  new Chroms.Game({
    width: 800,
    height: 600,
    backgroundColor: '#181825',
    scene: [MainScene]
  });
</script>
```

Если ассетов нет, стройте всё из `add.rect`, `add.circle`, `add.line`, `add.text`. Не ссылайтесь на ключ текстуры, который не загружен в `preload`.

## Инварианты

- Координаты: пиксели, левый верхний угол, `y` вниз.
- `object.angle` и `setAngle()` — градусы. `Math.atan2` и `Chroms.Math.angleBetween` — радианы.
- Длительности твинов/таймеров/эффектов камеры — миллисекунды. `update(dt)` — секунды.
- Физика AABB. Поворот и `setOrigin` не меняют тело. `isCircle` — косметика.
- Физика шагает **после** `update()`. Коллизии и `body.blocked` появляются после шага.
- Постоянные коллайдеры регистрируйте один раз в `create`, не в `update`.
- `physics.collide` расталкивает; `physics.overlapPair` только сообщает; `physics.overlap` — разовый булев запрос.
- Переключение/рестарт сцены уничтожает объекты, тела, твины и таймеры сцены.
- Твины/таймеры сцены — `scene.tweens` / `scene.time`; глобальные — `game.tweens` / `game.time`.
- Текст по умолчанию с origin в левом верхнем углу; `setOrigin(0.5)` центрирует. HUD требует `setScrollFactor(0)`.
- Фронты ввода (`justDown`, `justUp`) надёжны только в `update()` и объектных `update()`.
- Ассеты ставятся в очередь в `preload`; `create` вызывается после загрузки.
- `load.json` и `load.text` используют `fetch` и требуют HTTP; изображения/аудио — нет.

## Карта API

```js
// Игра
const game = new Chroms.Game({ width, height, backgroundColor, scene: [S], gravity, debug });

// Сцена
this.add.sprite(x, y, w, h, textureOrColor);
this.add.image(x, y, key, { width, height });
this.add.rect(x, y, w, h, color, radius);
this.add.circle(x, y, radius, color);
this.add.line(x1, y1, x2, y2, color, lineWidth);
this.add.text(x, y, string, { font, fontSize, color, wordWrapWidth, align });
this.add.container(x, y);
this.add.group({ runChildUpdate, maxSize, classType });
this.add.particles(x, y, config);
this.add.tilemap(dataOrKey, x, y);
this.add.button(x, y, w, h, label, { onClick });
this.add.joystick(x, y, { radius });
this.add.existing(object);

// Тела и коллизии
player.enablePhysics({ gravityY, immovable, bounce, collideWorldBounds, isSensor });
player.setVelocity(vx, vy); player.setVelocityX(vx);
player.setGravityY(900); player.setBounce(0.3); player.setImmovable(true);
this.physics.setGravity(0, 1200);
this.physics.setBounds(0, 0, worldW, worldH);
this.physics.addCollider(player, platforms);
this.physics.overlapPair(player, coins, (player, coin) => {});
this.physics.collideTilemap(player, map);
this.physics.raycast(x1, y1, x2, y2, { targets });

// Ввод
this.input.isDown('KeyA');
this.input.isJustDown('Space');
this.input.pointer.x, .y, .worldX, .worldY, .isDown, .justDown;
this.input.addAction('jump', ['Space', 'KeyW']);
this.input.actionDown('jump');

// Эффекты
this.tweens.add({ targets, x, y, alpha, scaleX, scaleY, angle, duration, ease, yoyo, repeat, onComplete });
this.tweens.addCounter({ from, to, duration, onUpdate });
this.time.delayedCall(ms, fn);
this.time.loop(ms, fn);
this.add.particles(x, y, config).explode(n);

// Камера
this.camera.follow(player, { lerpX, lerpY, offsetX, offsetY });
this.camera.setBounds(0, 0, w, h);
this.camera.shake(ms, pixels);
this.camera.flash(color, ms);
this.camera.zoomTo(zoom, ms);

// Данные и звук
game.storage.save('best', score);
game.storage.load('best', 0);
this.sound.play('jump', { volume, rate });
this.sound.beep({ frequency: 440, duration: 0.1 });
```

## Рецепты

### Арена сверху

```js
create() {
  this.physics.setGravity(0, 0);
  this.physics.setBounds(0, 0, 800, 600);
  this.player = this.add.rect(380, 280, 36, 36, '#89b4fa', 8);
  this.player.enablePhysics({ collideWorldBounds: true });
  this.enemies = this.add.group();
  this.physics.addCollider(this.player, this.enemies, (p, e) => this.hit(e));
  this.time.loop(1200, () => this.spawnEnemy());
}

update() {
  let x = 0;
  let y = 0;
  if (this.input.isDown('KeyA')) x -= 1;
  if (this.input.isDown('KeyD')) x += 1;
  if (this.input.isDown('KeyW')) y -= 1;
  if (this.input.isDown('KeyS')) y += 1;
  if (x || y) {
    const l = Math.hypot(x, y);
    x = (x / l) * 280;
    y = (y / l) * 280;
  }
  this.player.setVelocity(x, y);
}
```

### Платформер

```js
create() {
  this.physics.setGravity(0, 1200);
  this.player = this.add.rect(100, 400, 32, 44, '#89b4fa', 6);
  this.player.enablePhysics().setMaxVelocity(240, 900);

  this.platforms = this.add.group();
  [[0, 540, 1600, 60], [300, 420, 180, 24]].forEach(([x, y, w, h]) => {
    const p = this.add.rect(x, y, w, h, '#45475a', 4);
    p.enablePhysics({ immovable: true });
    this.platforms.add(p);
  });

  this.physics.addCollider(this.player, this.platforms);
  this.camera.follow(this.player, { lerpX: 0.12, lerpY: 0.12 });
  this.camera.setBounds(0, 0, 1600, 600);
}

update() {
  let vx = 0;
  if (this.input.isDown('ArrowLeft')) vx = -240;
  if (this.input.isDown('ArrowRight')) vx = 240;
  this.player.setVelocityX(vx);
  if (this.input.isJustDown('Space') && this.player.body.blocked.down) {
    this.player.setVelocityY(-500);
  }
}
```

### HUD и эффекты

```js
this.hud = this.add.text(16, 16, 'Счёт 0', { fontSize: 20, color: '#cdd6f4' })
  .setScrollFactor(0)
  .setDepth(1000);

const burst = this.add.particles(x, y, {
  speed: { min: 80, max: 220 },
  lifespan: { min: 250, max: 600 },
  frequency: -1,
  size: 4,
  colors: ['#f9e2af', '#fab387'],
  blendMode: 'lighter'
});
burst.explode(16);
this.time.delayedCall(700, () => burst.destroy());
```

## Частые ошибки

| Ошибка | Исправление |
| --- | --- |
| `addCollider` внутри `update` | Регистрировать один раз в `create` |
| Двигать объект через `x`, когда есть тело | Использовать `setVelocity`/`body.velocity` |
| Ждать `blocked.down` сразу после `setVelocityY` | Проверять в следующем `update` |
| Ждать расталкивания от `overlap` | Для этого есть `collide`; `overlapPair` только сообщает |
| HUD без `setScrollFactor(0)` | HUD будет скроллиться с камерой |
| Не загруженный ключ текстуры | Спрайт станет цветным прямоугольником |
| Музыка до клика | Браузер блокирует автоплей |
| JSON через `file://` | Нужен HTTP |
| Хранить состояние в объектах сцены после `startScene` | Использовать `game.storage`/глобалы |
| Использовать таймер сцены после рестарта | Таймеры очищаются; создавать в `create` |

## Проверка сгенерированной игры

1. `node --check chroms.js` после сборки исходников (`node build.js`).
2. `node test/smoke.js` — рендер, физика, твины, таймеры, частицы, группы, тайлмапы, ввод, сохранения.
3. Открыть `index.html` в браузере или через HTTP-сервер и проверить консоль.
4. Если ассетов нет — убедиться, что у каждого ключа текстуры есть цветной fallback.
5. Сверить четыре числа: размер холста, спавн игрока, границы мира и границы камеры.

## Промпт для агента

```text
Напиши один HTML-файл на chroms.js (классический скрипт, без импортов).
Используй Chroms.Scene с preload/create/update. Только фигуры (без внешних ассетов).
Движение сверху на WASD, сбор предметов через physics.overlapPair, HUD через
setScrollFactor(0), счёт в game.storage. Вся игра в одном файле.
```

Если нужны ассеты, требуйте `preload()` с точными путями; иначе движок нарисует цветные заглушки, и игра всё равно запустится.
