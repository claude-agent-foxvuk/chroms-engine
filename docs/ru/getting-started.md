# С чего начать

Соберём маленький платформер: движение, прыжок, платформы, камера, HUD и победа. Используются цветные прямоугольники, поэтому ассеты не нужны.

## 1. Файлы

```
project/
  chroms.js
  index.html
  game.js
  chroms.config.json   (рекомендуется: name, version, engine, author)
```

`chroms.config.json` объявляет версию движка, под которую сделан проект, и обычные метаданные пакета. Во время работы он необязателен; см. [Метаданные проекта](index.md#метаданные-проекта).

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Моя игра на Chroms</title>
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

## 2. Скелет сцены

```js
class GameScene extends Chroms.Scene {
  constructor() {
    super('GameScene'); // уникальный ключ
  }

  init(data) {
    // данные из scene.start(key, data) / game.startScene(key, data)
  }

  preload() {
    // только постановка ассетов в очередь
  }

  create() {
    // создание мира; вызывается после загрузки
  }

  update(dt) {
    // dt в секундах, уже ограничен и умножен на timeScale
  }

  fixedUpdate(step) {
    // необязательно: фиксированные шаги (по умолчанию 1/60 с)
  }

  shutdown() {
    // необязательная очистка; объекты сцены уничтожаются сами
  }
}

new Chroms.Game({
  width: 800,
  height: 600,
  backgroundColor: '#181825',
  scene: [GameScene]
});
```

Первая сцена в массиве запускается автоматически.

## 3. Игрок и ввод

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

`body.blocked.down` выставляется при разрешении столкновений и доступен в `update()` после шага физики.

## 4. Платформы и коллизии

`physics.addCollider(a, b)` регистрирует **постоянную** пару. Мир проверяет её каждый фиксированный шаг и расталкивает тела.

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

`immovable: true` не даёт платформе двигаться. Игрока выталкивает, вертикальная скорость обнуляется при приземлении.

## 5. Камера и HUD

```js
this.camera.setBounds(0, 0, 1600, 600);
this.camera.follow(this.player, { lerpX: 0.12, lerpY: 0.12, offsetY: 40 });

this.hud = this.add
  .text(16, 16, 'Монеты 0', { fontSize: 20, color: '#f9e2af' })
  .setScrollFactor(0); // HUD не двигается с камерой
```

Камера центрируется на теле игрока (или на визуальном центре объекта без тела), сглаживается через lerp и упирается в границы.

## 6. Монеты, победа и обратная связь

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
  this.hud.setText('Монеты ' + this.score);
  this.camera.shake(120, 3);
  this.camera.flash('rgba(249,226,175,0.12)', 120);
  this.sound.beep({ frequency: 660, slideTo: 990, duration: 0.08, type: 'triangle' });

  if (this.score === 3) this.finish();
});

finish() {
  this.physics.colliders = [];
  this.add
    .text(400, 280, 'Победа!', { fontSize: 48, color: '#a6e3a1' })
    .setOrigin(0.5)
    .setScrollFactor(0);
}
```

`overlapPair` только сообщает о пересечении, не расталкивая тела — это то, что нужно для сборщиков и триггеров.

## 7. Ассеты

Ассеты ставятся в очередь в `preload`; `create` вызывается после `load.start`.

```js
preload() {
  this.load.image('hero', 'assets/hero.png');
  this.load.audio('jump', 'assets/jump.ogg');
  this.load.spritesheet('hero-sheet', 'assets/hero-sheet.png', 32, 48);
  this.load.json('level', 'assets/level.json');
}

create() {
  this.hero = this.add.sprite(100, 300, 32, 48, 'hero-sheet');

  this.anims.create({
    key: 'run',
    spritesheet: 'hero-sheet',
    frames: [0, 1, 2, 3],
    frameRate: 12,
    repeat: -1
  });
  this.hero.play('run');
}
```

Картинки и аудио работают и через `file://`, а `load.json` / `load.text` используют `fetch` и требуют HTTP-сервер.

## 8. Рекорд

```js
const best = this.game.storage.load('best', 0);
if (this.score > best) this.game.storage.save('best', this.score);
```

`game.storage` — обёртка над localStorage с пространством имён и запасным хранилищем в памяти.

## 9. Пауза, рестарт, смена сцены

```js
this.game.pause();
this.game.resume();
this.game.togglePause();

this.scene.restart();       // пересобрать текущую сцену
this.scene.start('Menu');   // уничтожить эту сцену и начать другую
this.scene.start('Menu', {}, { fade: 300 });
```

При переключении сцены Chroms уничтожает объекты предыдущей сцены и очищает её твины и таймеры. Глобальные `game.tweens`, `game.time`, `game.anims`, `game.storage` и `game.sound` сохраняются.

## 10. Дальше

- [Базовые концепции](core-concepts.md) — цикл, координаты, порядок отрисовки.
- [Ввод и физика](input-and-physics.md) — тела, группы, лучи, тайлмапы.
- [Эффекты и камера](effects-and-camera.md) — частицы, твины, камера.
- [Для ИИ-агентов](ai-agents.md) — если код генерирует нейросеть.
