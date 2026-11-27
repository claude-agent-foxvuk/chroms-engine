# Эффекты и камера

## Твины

Твины анимируют числовые (или строковые двухсостоянийные) свойства. Длительности и задержки — **миллисекунды**. `scene.tweens` очищается при переключении сцены; `game.tweens` живёт глобально.

```js
this.tweens.add({
  targets: this.player,
  x: 500,
  alpha: 0.4,
  scaleX: 1.2,
  scaleY: 1.2,
  angle: 90,
  duration: 600,
  delay: 100,
  ease: 'quad.out',
  yoyo: true,
  repeat: 2,
  hold: 150,
  onStart: (tween) => {},
  onUpdate: (tween, eased) => {},
  onYoyo: (tween) => {},
  onRepeat: (tween, count) => {},
  onComplete: (tween) => {}
});
```

### Конфиг

| Ключ | По умолчанию | Значение |
| --- | --- | --- |
| `targets` / `target` | — | Объект или массив |
| любое число/строка в конфиге | — | Анимируемое свойство |
| `{ from, to }` у свойства | текущее значение | Явные начало и конец |
| `from` | — | Объект стартовых значений |
| `duration` | `1000` | мс |
| `delay` | `0` | мс |
| `ease` / `easing` | `'linear'` | Имя или функция |
| `yoyo` | `false` | Обратно к старту |
| `repeat` | `0` | Дополнительные циклы; `-1` — бесконечно |
| `repeatDelay` | `0` | Пауза между повторами, мс |
| `hold` | `0` | Пауза в крайних точках, мс |
| `paused` | `false` | Создать на паузе |
| `persist` | `false` | Не останавливать при уничтожении цели |
| `onStart`, `onUpdate`, `onYoyo`, `onRepeat`, `onComplete`, `onStop` | — | Колбэки; `onStop` вызывается при `tween.stop()`, а `onComplete` — нет |

```js
this.tweens.add({
  targets: this.enemy,
  x: { from: 100, to: 700 },
  duration: 2000,
  ease: 'sine.inOut',
  yoyo: true,
  repeat: -1
});

// Точечные пути:
this.tweens.add({
  targets: this.player,
  'body.velocity.y': -300,
  duration: 300,
  ease: 'back.out'
});
```

Строковые свойства, если обе величины — цвета, интерполируются поканально: `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)` и `rgba(...)`. Поэтому `color` у фигур/текста и `backgroundColor` плавно перетекают, а не переключаются на середине. Остальные строки сохраняют двухсостоянийное поведение.

```js
this.tweens.add({
  targets: [this.panel, this.label],
  color: '#f38ba8',
  duration: 400,
  yoyo: true,
  repeat: -1,
  repeatDelay: 250
});
```

### Изинги

`linear`, `sine.in/out/inOut`, `quad.*`, `cubic.*`, `quart.*`, `quint.*`, `expo.*`, `circ.*`, `back.*`, `elastic.*`, `bounce.*`. Регистр не важен; `inOut` и `inout` работают. Своя функция получает `t` в `0..1`:

```js
this.tweens.add({ targets: box, x: 600, duration: 500, ease: (t) => t * t });
```

`Chroms.Ease` содержит camelCase-функции (`Chroms.Ease.quadOut`), `Chroms.resolveEase('quad.out')` возвращает функцию.

### Управление

```js
const tween = this.tweens.add({ targets: box, x: 100, duration: 300 });

tween.pause();
tween.resume();
tween.stop();
tween.restart();
tween.complete();
tween.isPlaying();
tween.getProgress();
tween.setTimeScale(2);

this.tweens.killTweensOf(box);
this.tweens.pauseAll();
this.tweens.resumeAll();
this.tweens.removeAll();
this.tweens.timeScale = 0.5;
```

### Счётчики

```js
this.tweens.addCounter({
  from: 0,
  to: 100,
  duration: 800,
  ease: 'cubic.out',
  onUpdate: (value) => this.scoreText.setText('Счёт ' + Math.round(value)),
  onComplete: (value) => console.log('итог', value)
});
```

### Таймлайны

`chain` запускает конфиги последовательно; `onComplete` каждого конфига сохраняется.

```js
this.tweens.chain([
  { targets: box, x: 300, duration: 300, ease: 'quad.out' },
  { targets: box, y: 400, duration: 300, ease: 'bounce.out' },
  { targets: box, alpha: 0, duration: 200 }
]);
```

## Таймеры

```js
this.time.delayedCall(500, () => this.spawnWave());
this.time.addEvent({
  delay: 1000,
  loop: true,
  repeat: 5,
  name: 'spawner',
  callback: (arg) => {},
  args: ['wave']
});
this.time.loop(250, () => this.tick());
```

Методы `Timer`: `remove`, `pause`, `resume`, `reset(delay?)`, `getProgress`, `getRemaining`, `isRunning`; событие `complete`.

Методы менеджера: `addEvent`, `delayedCall`, `loop`, `remove`, `clear`/`removeAll`, `removeByName`, `pauseAll`, `resumeAll`, `timeScale`, `paused`.

Таймеры сцены (`scene.time`) очищаются вместе со сценой; `game.time` — глобальные. `delay: 0` срабатывает на следующем обновлении.

## Частицы

```js
const sparks = this.add.particles(400, 300, {
  speed: { min: 60, max: 240 },
  angle: { min: 0, max: 360 },
  lifespan: { min: 400, max: 900 },
  quantity: 2,
  frequency: 40,          // мс между выбросами; -1 — без авто-выброса
  max: 400,
  size: 5,
  shape: 'circle',        // или 'square'
  color: '#89b4fa',
  colors: ['#89b4fa', '#cba6f7', '#f38ba8'],
  alpha: { start: 1, end: 0 },
  scale: { start: 1, end: 0.2 },
  gravityX: 0,
  gravityY: 200,
  blendMode: 'lighter',
  emitting: true,
  emitZone: { type: 'circle', radius: 40 },
  follow: player,
  texture: 'spark',
  rotate: false,
  rotateSpeed: 0,
  seed: 123,
  onParticle: (particle) => {}
});
```

`emitZone`: `{ type: 'rect', x, y, width, height }` (смещение от эмиттера) или `{ type: 'circle', radius }` (вокруг эмиттера).

### API эмиттера

```js
sparks.explode(30);
sparks.explode(30, x, y);
sparks.emitParticleAt(x, y, 5);
sparks.start();
sparks.stop();
sparks.isEmitting();
sparks.setFrequency(20);
sparks.setQuantity(4);
sparks.setSpeed({ min: 100, max: 200 });
sparks.setLifespan(500);
sparks.setGravity(400);
sparks.getParticleCount();
sparks.clear();
sparks.destroy();
```

Частицы обновляются в `update(dt)` эмиттера (эмиттер — ребёнок сцены) и рисуются относительно него. Для одноразовых эффектов ставьте `frequency: -1`. По умолчанию эмиттер сразу начинает испускать.

```js
const burst = this.add.particles(x, y, {
  speed: { min: 80, max: 220 },
  lifespan: { min: 250, max: 600 },
  frequency: -1,
  colors: ['#f9e2af', '#fab387'],
  blendMode: 'lighter'
});
burst.explode(18);
this.time.delayedCall(800, () => burst.destroy());
```

## Камера

Одна камера на сцену: `scene.camera` (и `scene.cameras[0]`).

```js
this.camera.setBounds(0, 0, 3200, 600);
this.camera.follow(this.player, {
  lerpX: 0.12,
  lerpY: 0.12,
  offsetX: 0,
  offsetY: 40,
  deadzoneWidth: 120,
  deadzoneHeight: 80
});
```

### Свойства

| Свойство | Значение |
| --- | --- |
| `x`, `y` | Левый верхний угол вида в мировых координатах |
| `width`, `height` | Размер вида в экранных пикселях |
| `zoom` | Масштаб (видимый мир = `width/zoom`) |
| `bounds` | Прямоугольник ограничения |
| `followTarget` | Цель слежения |
| `visible` | `false` не рисует сцену целиком (выставляется `sleep()`) |
| `deadzone` | `{ width, height }` вокруг центра |
| `shakeOffset` | Текущее смещение тряски |
| `fadeAlpha`, `fadeColor` | Затухание |
| `flashAlpha`, `flashColor` | Вспышка |
| `backgroundColor` | Фон видового окна |

### Методы

| Метод | Описание |
| --- | --- |
| `follow(target, options)`, `startFollow`, `stopFollow` | Слежение |
| `setLerp(x, y?)`, `setFollowOffset(x, y)` | Сглаживание и смещение |
| `setDeadzone(w, h)` | Мёртвая зона в мировых пикселях |
| `centerOn(x, y)`, `scrollTo(x, y)` | Позиция вида |
| `setBounds(...)`, `clearBounds()` | Границы |
| `setZoom(z)`, `zoomTo(z, ms, ease?)` | Зум (клампится в `0.05..20`) |
| `panTo(x, y, ms, ease?)` | Плавно увести вид в мировую точку; follow приостанавливается на время панорамы |
| `shake(durationMs, intensityPx)` | Затухающая тряска |
| `fadeOut(ms, color?, cb?)`, `fadeIn(ms, color?, cb?)` | Затемнение/проявление |
| `flash(color, ms)` | Вспышка |
| `screenToWorld(x, y)`, `worldToScreen(x, y)` | Преобразование координат |
| `worldView` | `{x, y, width, height}` в мировых единицах |
| `setSize`, `resize` | Размер вида |
| `setBackgroundColor` | Фон видового окна |

### Примеры

```js
this.camera.shake(300, 10);
this.camera.flash('rgba(243,139,168,0.3)', 200);
this.camera.zoomTo(1.6, 600, 'sine.inOut');

this.camera.fadeOut(400, '#000000', () => this.scene.start('Next'));
this.camera.fadeIn(400);
```

Тряска и затухания — только визуальные. `worldX/worldY` указателя не учитывают тряску, но учитывают зум и скролл.

### HUD

Прибивайте HUD через `setScrollFactor(0)`. Он рисуется после мира и не зависит от позиции, зума и тряски камеры.

```js
this.add.text(16, 16, 'HP 3', { fontSize: 18 }).setScrollFactor(0).setDepth(1000);
```

### Ограничения камеры

- Одна активная камера; split-screen и миникарт нет.
- `zoom` равномерный (без раздельного X/Y).
- Поворот камеры не поддерживается.
- Слежение использует центр тела, если оно есть, иначе визуальный центр.
