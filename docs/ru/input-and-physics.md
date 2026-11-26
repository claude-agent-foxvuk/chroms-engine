# Ввод и физика

## Клавиатура

Ввод читается через `scene.input` — это общий `game.input`.

```js
this.input.isDown('ArrowLeft');   // удерживается
this.input.isJustDown('Space');   // нажата в этом кадре
this.input.isJustUp('KeyR');      // отпущена в этом кадре
this.input.isAnyDown(['KeyA', 'ArrowLeft']);
this.input.areDown(['ShiftLeft', 'KeyW']);
```

Коды — значения `KeyboardEvent.code`: `KeyA`, `Digit1`, `ArrowUp`, `Space`, `Escape`, `ShiftLeft` и т.д. Фронты кадра очищаются в конце каждого цикла.

```js
update() {
  if (this.input.isJustDown('Escape')) this.game.togglePause();
  if (this.input.isJustDown('Space')) this.jump();
}
```

### Действия

```js
this.input.addAction('left', ['ArrowLeft', 'KeyA']);
this.input.addAction('right', ['ArrowRight', 'KeyD']);
this.input.addAction('jump', ['Space', 'ArrowUp', 'KeyW']);
this.input.addAction('dash', ['ShiftLeft']);

update() {
  if (this.input.actionDown('jump')) this.jump();
  if (this.input.actionJustDown('dash')) this.dash();
}
```

Методы: `addAction`, `setKeybinding`, `actionDown`, `actionJustDown`, `actionJustUp`. Менеджер ввода и игра шлют `action-down` / `action-up` с `(name, code)`.

### Перехват клавиш

```js
this.input.capture(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
this.input.releaseCapture('Space');
```

## Указатель и тач

```js
const p = this.input.pointer;
p.x, p.y;             // экранные/логические координаты
p.worldX, p.worldY;   // через камеру сцены
p.isDown;
p.justDown;
p.justUp;
p.downTime;
this.input.wheelDelta;
this.input.pointers;  // Map<pointerId, {x, y, isDown}>
```

`worldX/worldY` обновляются в начале каждого обновления сцены, поэтому актуальны внутри `update()`, кнопок и джойстика. События `pointerdown`, `pointermove`, `pointerup` обрабатываются на холсте: мышь, перо и касания используют один API. Второй палец виден в `input.pointers`, основной указатель следует за первым активным нажатием.

```js
update() {
  if (this.input.pointer.justDown) {
    const { x, y } = this.camera.screenToWorld(
      this.input.pointer.x,
      this.input.pointer.y
    );
    this.spawnAt(x, y);
  }
}
```

### Перетаскивание

```js
this.input.enableDrag(this.card, {
  dragX: true,          // false фиксирует ось
  dragY: true,
  onDragStart: (object) => object.setDepth(999),
  onDrag: (object, pointer) => {},
  onDragEnd: (object) => object.setDepth(1)
});

this.input.disableDrag(this.card);
// или: this.card.setDraggable(true, { onDragEnd: ... });
```

HUD-объекты перетаскиваются в экранных координатах, мировые — в мировых. Физические ограничения не применяются: объект позиционируется напрямую.

## Геймпад

```js
const pad = this.input.gamepad(0);   // Gamepad | null
this.input.gamepadDown(0, 0);        // A / крест
this.input.gamepadAxis(0, 1);        // левый стик по Y
```

`this.input.gamepads` обновляется каждый кадр. Кнопки читаются как объекты с `pressed` или числовые значения.

## Обзор физики

`scene.physics` — общий `PhysicsWorld`. Тела — axis-aligned bounding boxes (AABB). Мир шагает фиксированным аккумулятором (`physics.fixedStep`, по умолчанию 1/120 с, `maxSubSteps` 6) после `scene.update()`.

```js
const player = this.add.rect(100, 100, 32, 48, '#89b4fa');
player.enablePhysics({
  gravityY: 0,
  bounce: 0.2,
  dragX: 600,
  maxVelocityX: 300,
  collideWorldBounds: true
});
```

### Конфиг тела

| Ключ | По умолчанию | Значение |
| --- | --- | --- |
| `width`, `height` | размер объекта | Размер тела |
| `offsetX/Y` | `0` | Смещение от левого верхнего угла |
| `velocityX/Y` | `0` | Начальная скорость |
| `accelerationX/Y` | `0` | Постоянное ускорение |
| `dragX/Y` | `0` | Замедление к нулю |
| `maxVelocityX/Y` | `Infinity` | Ограничение скорости |
| `gravityX/Y` | `0` | Дополнительная гравитация |
| `bounce` | `0` | Отскок `0..1` |
| `allowGravity` | `true` | Отключить гравитацию |
| `immovable` | `false` | Статичная платформа |
| `collideWorldBounds` | `false` | Ограничение `physics.bounds` |
| `isSensor` | `false` | Только пересечения, без расталкивания |
| `isCircle` | `false` | Флаг хранения; **коллизия всё равно AABB** |
| `enabled` | `true` | Временно выключить |

### API тела

```js
const body = player.body;
body.setVelocity(120, 0);
body.setVelocityX(0);
body.setAcceleration(0, 900);
body.setDrag(400, 0);
body.setMaxVelocity(250, 900);
body.setGravityY(600);
body.setBounce(0.4);
body.setImmovable(true);
body.setCollideWorldBounds(true);
body.setSensor(false);
body.setEnabled(false);
body.setSize(28, 46).setOffset(2, 2);

body.speed;
body.centerX, body.centerY;
body.blocked.up/down/left/right;
body.collisionCount;
body.onCollide = (other, selfBody) => {};
body.onWorldBounds = (selfBody) => {};
body.destroy();
```

`blocked` сбрасывается в начале интеграции и выставляется при расталкивании. В `update()` он отражает предыдущий шаг — именно это нужно для прыжков.

### Мир

```js
this.physics.setGravity(0, 1200);
this.physics.setBounds(0, 0, 3200, 600);
this.physics.clearBounds();
this.physics.timeScale = 0.5;
this.physics.enabled = false;
this.physics.debug = true;
```

Свойства: `gravity`, `bounds`, `bodies`, `colliders`, `fixedStep`, `maxSubSteps`, `enabled`, `timeScale`, `stats`. События: `collision`, `world-bounds`.

### Коллайдеры

Регистрируйте пару **один раз**. Мир проверяет её каждый шаг; коллайдеры живут до удаления или очистки сцены.

```js
const handle = this.physics.collide(this.player, this.platforms, (player, platform) => {
  // вызывается на каждом контактном шаге (после расталкивания)
});

this.physics.overlapPair(this.player, this.coins, (player, coin) => {
  coin.destroy();
});

handle.pause();
handle.resume();
handle.remove();
```

- `collide(a, b, cb?)` — постоянное расталкивание.
- `overlapPair(a, b, cb?)` — постоянное только сообщение о пересечении.
- `addCollider(a, b, cb?, { overlapOnly })` — низкоуровневая регистрация.
- `removeCollider(handle)`.
- `collideNow(a, b, cb?)` — разовое расталкивание, возвращает `true`, если было пересечение.
- `overlap(a, b)` — разовый булев запрос.

`a` и `b` — объект, `Body`, `Group`, массив или простой объект с `x/y/width/height` (статичный прокси для запросов). Для постоянных коллайдеров нужны настоящие тела.

Колбэки получают `(objectA, objectB)`. `world.events` шлёт `collision(objectA, objectB)` на каждый контакт. События объекта:

```js
player.events.on('collide', (other) => {});
player.events.on('overlap', (other) => {});
```

Один контакт может сообщаться несколько шагов подряд, пока тела соприкасаются. Учитывайте это в одноразовой логике (уничтожение, флаги, кулдауны).

### Лучи

```js
const hit = this.physics.raycast(0, 300, 800, 300, {
  targets: this.enemies,
  includeSensors: false
});

if (hit) {
  hit.object;
  hit.body;
  hit.x, hit.y;
  hit.distance;
  hit.normalX, hit.normalY;
}
```

Без `targets` проверяются все тела. Побеждает ближайшее попадание.

### Запросы

```js
const bodies = this.physics.queryRect(100, 100, 200, 200);
const underPointer = this.physics.queryPoint(pointer.worldX, pointer.worldY);
```

Возвращают `Body[]`; объект — `.object`. Возвращаются только зарегистрированные тела (простые объекты в мир не попадают).

### Коллизии с тайлмапом

```js
update() {
  this.physics.collideTilemap(this.player, this.map);
  // или один раз:
  // this.physics.addTilemapCollider(this.player, this.map, (player, tile) => {});
}
```

`collideTilemap` разрешает объект относительно твёрдых тайлов и возвращает число попаданий. Нужен `map.getSolidTilesInRect` (есть у `Tilemap`). Подробнее — [tilemaps.md](tilemaps.md).

## Рецепты

### Движение сверху

```js
update() {
  let x = 0;
  let y = 0;
  if (this.input.isDown('KeyA')) x -= 1;
  if (this.input.isDown('KeyD')) x += 1;
  if (this.input.isDown('KeyW')) y -= 1;
  if (this.input.isDown('KeyS')) y += 1;
  if (x || y) {
    const len = Math.hypot(x, y);
    x = (x / len) * 260;
    y = (y / len) * 260;
  }
  this.player.setVelocity(x, y);
}
```

### Прыжок в платформере

```js
if (this.input.isJustDown('Space') && this.player.body.blocked.down) {
  this.player.setVelocityY(-520);
}
```

### Важно про движущиеся платформы

Неподвижные тела не переносят стоящих на них автоматически. Двигайте платформу вручную и смещайте игрока на ту же дельту либо используйте другую схему. Встроенного ограничения «стоять на платформе» нет.

### Ограничения

- Только AABB: нет повёрнутых тел, полигонов и суставов.
- Нет continuous collision detection; очень быстрые объекты могут проскочить. Уменьшайте `physics.fixedStep`, размеры тел или используйте лучи.
- Сенсоры не расталкиваются, но всё равно требуют зарегистрированного коллайдера.
- `isCircle` не меняет форму коллизии.
