# Игровые объекты

Все рисуемые объекты наследуют `GameObject` и создаются через фабрики сцены, которые сразу добавляют их в сцену.

## GameObject

```js
const box = this.add.rect(100, 100, 40, 40, '#89b4fa');
box.setPosition(200, 150)
   .setScale(1.2)
   .setOrigin(0.5)
   .setAngle(15)
   .setDepth(10)
   .setName('box');
```

### Поля

| Поле | По умолчанию | Комментарий |
| --- | --- | --- |
| `x`, `y` | аргументы фабрики | Позиция в мире |
| `width`, `height` | аргументы | Размер без трансформаций |
| `originX`, `originY` | `0, 0` | Точка вращения/масштаба |
| `scaleX`, `scaleY` | `1` | Отрицательные значения отражают |
| `angle` | `0` | Градусы |
| `alpha` | `1` | `0..1` |
| `visible`, `active` | `true` | Неактивные не обновляются и не сталкиваются |
| `depth` | `0` | Больше — позже в своём проходе |
| `blendMode` | `'source-over'` | Режим наложения canvas |
| `scrollFactorX/Y` | `1` | `0` на обоих = экран/HUD |
| `body` | `null` | Создаётся `enablePhysics()` |
| `name`, `data` | `''`, `{}` | Метка и свободные данные |
| `displayWidth`, `displayHeight` | вычисляются | Размер с учётом масштаба |
| `centerX/Y`, `right`, `bottom` | вычисляются | Границы с учётом origin |
| `worldX/Y` | вычисляются | Позиция с учётом контейнера |

### Методы

`setPosition`, `setX`, `setY`, `setSize`, `setScale`, `setOrigin`, `setAngle(deg)`, `setRotation(rad)`, `setAlpha`, `setVisible`, `setActive`, `setDepth`, `setBlendMode`, `setScrollFactor(x, y?)`, `setName`, `setData`, `getData`, `hasData`, `incData`, `addTo(scene)`, `enablePhysics(config?)`, `disablePhysics`, `setVelocity`, `setVelocityX/Y`, `setAcceleration`, `setDrag`, `setBounce`, `setGravityY`, `setImmovable`, `setMaxVelocity`, `setCollideWorldBounds`, `setDraggable(bool, options?)`, `setInteractive(options?)`, `disableInteractive()`, `getBounds`, `distanceTo`, `angleTo`, `destroy`.

События: `destroy`, `collide`, `overlap`, `tile-collide`, `animationstart`, `animationframe`, `animationcomplete`, `typecomplete`, а после `setInteractive` — ещё `pointerover`, `pointerout`, `pointerdown`, `pointerup`, `click`.

## Sprite

Цветной прямоугольник или текстура. Умеет проигрывать анимации.

```js
const hero = this.add.sprite(120, 300, 32, 48, 'hero-sheet');
hero.setFrame(2);
hero.play('run', { ignoreIfPlaying: true });
hero.setFlip(true, false);

const placeholder = this.add.sprite(200, 200, 40, 40, '#a6e3a1');
placeholder.setTexture('hero');
```

Ключ текстуры ищется так: кадр спрайт-листа → кадр атласа → обычное изображение → CSS-цвет. Если изображения нет, рисуется прямоугольник указанным цветом — прототипы работают без ассетов.

Свойства/методы: `texture`, `frame`, `setTexture(key, frame?)`, `setFrame`, `flipX/Y`, `setFlip`, `play(key, { ignoreIfPlaying })`, `stop`, `pause`, `resume`, `isPlaying`, `setTint(color)`, `clearTint()`, `tint`.

`setTint` перекрашивает спрайт в плоский цвет (кэшируется на кадр текстуры), `clearTint()` возвращает исходные цвета.

## Анимации

Анимации лежат в `game.anims` (общие для всех сцен) и доступны как `scene.anims`.

```js
this.anims.create({
  key: 'run',
  spritesheet: 'hero-sheet', // опционально переключает текстуру спрайта
  frames: [0, 1, 2, 3],
  frameRate: 12,
  repeat: -1,
  yoyo: false
});

this.anims.create({
  key: 'idle',
  spritesheet: 'hero-sheet',
  start: 4,
  end: 7,
  frameRate: 6,
  repeat: -1
});

this.hero.play('run');
```

`repeat` — число **дополнительных** циклов (0 — один раз). `frameRate` — кадров в секунду. Номера кадров — индексы спрайт-листа (для атласов `gid - firstgid`). У каждого спрайта своё состояние анимации.

Методы: `create`, `exists`, `get`, `getAll`, `remove`, `play(sprite, key, options)`, `stop(sprite)`, `pauseAll`, `resumeAll`, `stopAll`. События: `create`, `start`, `stop`.

Спрайт покидает реестр при уничтожении, при `stop()` (на спрайте или через `anims.stop()`) и при завершении конечной анимации. Поэтому `pauseAll()`/`resumeAll()` проходят только по реально играющим анимациям, а пулинг не растит `anims.sprites`.

## Text

```js
const title = this.add.text(400, 60, 'Chroms', {
  font: 'bold 48px sans-serif',
  color: '#89b4fa',
  align: 'center',
  baseline: 'top',
  stroke: '#11111b',
  strokeThickness: 4,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  lineSpacing: 6,
  wordWrapWidth: 300,
  padding: 4,
  backgroundColor: 'rgba(0,0,0,0.25)'
});

title.setOrigin(0.5, 0.5);
title.setText('Chroms v1.2.1');
```

| Ключ стиля | По умолчанию |
| --- | --- |
| `font` | `null` (сырой CSS font) |
| `fontFamily`, `fontSize`, `fontWeight`, `fontStyle` | `sans-serif`, `20`, `normal`, `normal` |
| `color` | `'#ffffff'` |
| `align` | `'left'` |
| `baseline` | `'top'` |
| `stroke`, `strokeThickness` | `null`, `0` |
| `shadowColor`, `shadowBlur`, `shadowOffsetX/Y` | `null`, `0`, `0`, `0` |
| `backgroundColor`, `padding` | `null`, `0` |
| `lineSpacing` | `4` |
| `wordWrapWidth` | `0` (без переноса) |
| `fixedWidth` | `0` |

Текст измеряется при создании и после `setText`/`setStyle`/`setFontSize`/`setWordWrapWidth`. Размер влияет на origin и выравнивание. Методы: `setText`, `setStyle(partial)`, `setColor`, `setFontSize`, `setWordWrapWidth`, `measure`, `typeText(text, symbolsPerSecond)`.

```js
dialog.typeText('Движок готов.', 40); // использует scene.time
```

## Фигуры

```js
const panel = this.add.rect(40, 40, 300, 180, '#313244', 12);
panel.setColor('#45475a').setRadius(8).setStroke('#89b4fa', 2);

const ball = this.add.circle(200, 200, 24, '#f9e2af'); // x,y — левый верхний угол
ball.setRadius(30).setStroke('#11111b', 2);

const line = this.add.line(20, 20, 220, 120, '#89b4fa', 3);
line.setPoints(20, 20, 220, 220);
```

У `Circle` `x, y` — левый верхний угол описанного квадрата, `width = height = 2 * radius`. У `Line` координаты абсолютные, `x/y` пересчитывается в минимальный угол.

### Polygon

Произвольная замкнутая или открытая фигура. Точки локальные, нормализуются так, что левый верхний угол объекта — `(0, 0)`; `width`/`height` берутся из bounding box.

```js
const star = this.add.polygon(300, 200, [
  [0, -40], [12, -12], [42, -12], [18, 6], [26, 36],
  [0, 18], [-26, 36], [-18, 6], [-42, -12], [-12, -12]
], { color: '#f9e2af', stroke: '#11111b', strokeWidth: 2 });

star.containsPoint(300, 200);   // локальные координаты
star.getArea();
star.setPoints(next);
```

## TileSprite

Повторяющаяся текстура с обрезкой:

```js
const water = this.add.tileSprite(0, 480, 800, 120, 'water');

update(dt) {
  water.tilePositionX += 40 * dt;
}
```

Поля: `texture`, `tilePositionX/Y`, `tileScaleX/Y`; методы `setTexture`, `setTilePosition`. Без текстуры рисуется тёмная заглушка.

## Container

Родительская трансформация: дети задаются в локальных координатах и наследуют позицию, поворот, масштаб и альфу. Дети обновляются контейнером и не лежат в `scene.children`.

```js
const ship = this.add.container(400, 300);
ship.add(this.add.rect(-30, -12, 60, 24, '#89b4fa', 6));
ship.add(this.add.circle(-42, -6, 8, '#fab387'));
ship.setAngle(-10).setScale(1.4);

this.tweens.add({ targets: ship, angle: 10, duration: 900, yoyo: true, repeat: -1 });
```

Методы: `add`, `addMultiple`, `remove(child, destroyChild?)`, `removeAll(destroyChildren?)`, `getChildren`, `getFirst`, `getByName`, `length`. Физика внутри контейнеров не поддерживается — используйте группы или независимые тела.

## Group

Плоская коллекция в мировых координатах, удобна для пулинга и коллизий.

```js
const bullets = this.add.group({
  runChildUpdate: true,
  maxSize: 100,
  classType: Chroms.Sprite,
  defaults: { setup: (b) => b.setDepth(5) }
});

const bullet = bullets.create(400, 300, 6, 14, '#f9e2af');
bullet.enablePhysics().setVelocity(0, -500);

this.physics.overlapPair(bullets, enemies, (bullet, enemy) => {
  bullet.destroy();
  enemy.destroy();
});
```

Методы: `create`, `add`, `addMultiple`, `remove`, `clear`, `getChildren`, `getFirst`, `getLast`, `getRandom`, `countActive`, `contains`, `forEach`, `filter`, `find`, `length`. При добавлении в группу объект убирается из `scene.children`.

## UI-виджеты

### Slider

```js
const volume = this.add.slider(300, 500, 220, {
  min: 0,
  max: 1,
  value: 0.6,
  step: 0.05,
  fillColor: '#a6e3a1',
  onChange: (value, slider) => this.sound.setMasterVolume(value)
}).setScrollFactor(0);

volume.setValue(0.3);          // silent: true пропускает onChange
volume.setRange(0, 2);
volume.setEnabled(false);
```

`width` — длина дорожки, `height` по умолчанию 20. Тяните ползунок или кликните по дорожке. `step: 0` — непрерывно, `vertical: true` — вертикально, `knobRadius` меняет размер ползунка.

### ProgressBar

Только для чтения, значение `0..1` — здоровье, загрузка, кулдауны.

```js
const hp = this.add.progressBar(20, 660, 240, 14, {
  value: 1,
  fillColor: '#f38ba8',
  trackColor: 'rgba(255,255,255,0.12)',
  radius: 7
}).setScrollFactor(0);

hp.setValue(0.45);      // клампится в 0..1
hp.setColors('#a6e3a1');
hp.setProgress(0.8);    // алиас
```

### Toggle

Двухпозиционный переключатель с анимацией ползунка.

```js
const music = this.add.toggle(300, 540, {
  value: true,
  onColor: '#a6e3a1',
  onChange: (on) => (on ? this.sound.musicResume() : this.sound.musicPause())
}).setScrollFactor(0);

music.toggle();
music.setValue(false);   // silent: true пропускает onChange
music.getValue();
```

`width`/`height` по умолчанию `54`/`28`. Отключённые виджеты рисуются, но не реагируют на ввод.

## Button

```js
const button = this.add.button(320, 380, 160, 48, 'ИГРАТЬ', {
  color: '#313244',
  hoverColor: '#45475a',
  pressColor: '#1e1e2e',
  textColor: '#cdd6f4',
  radius: 8,
  fontSize: 18,
  disabled: false,
  onClick: (button) => this.scene.start('Play'),
  onDown: (button) => {},
  onUp: (button) => {}
});

button.setScrollFactor(0); // если камера двигается
button.setText('ЕЩЁ');
button.setEnabled(false);
```

События: `down`, `click`; событие сцены `button-click`. Отключённая кнопка не реагирует, но рисуется.

## Joystick

```js
this.stick = this.add.joystick(120, 480, {
  radius: 60,
  knobRadius: 24,
  baseColor: 'rgba(205,214,244,0.18)',
  knobColor: 'rgba(137,180,250,0.85)',
  onChange: (value, stick) => {}
}).setScrollFactor(0).setDepth(50);

update() {
  this.player.setVelocity(this.stick.value.x * 250, this.stick.value.y * 250);
}
```

`x, y` — **центр** базы. `value` — нормализованный `Vec2` (длина ≤ 1), `magnitude` — `0..1`, `angle` — радианы. Работает с основным указателем.

## HUD

`setScrollFactor(0)` рисует объект после трансформации камеры, в экранных пикселях. Кнопки и джойстик в этом режиме автоматически используют экранные координаты указателя.

```js
this.add.text(16, 16, 'HP', { fontSize: 16 }).setScrollFactor(0).setDepth(100);
```

Поддерживаются только факторы `0`/`1`, и для HUD оба должны быть `0`.
