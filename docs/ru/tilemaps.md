# Тайлмапы

Chroms рисует JSON-тайлмапы с несколькими слоями, цветными тайлами или тайлами из спрайт-листа и AABB-коллизиями с твёрдыми тайлами. Парсер намеренно небольшой: импорта TMX/Tiled и объектных слоёв нет.

## Формат карты

```js
const mapData = {
  tileWidth: 32,
  tileHeight: 32,
  width: 25,          // в тайлах
  height: 19,
  tileset: {
    key: 'tiles',     // загруженный спрайт-лист
    firstgid: 1,      // gid 1 = индекс кадра 0
    columns: 8
  },
  tiles: ['#181825', '#313244', '#585b70'], // цвета, если нет tileset
  layers: [
    {
      name: 'background',
      data: [/* width * height gid'ов */],
      visible: true,
      opacity: 1
    },
    {
      name: 'walls',
      data: [/* ... */],
      visible: true,
      solid: true,
      collides: [2]   // только gid 2 блокирует
    }
  ]
};

const map = this.add.tilemap(mapData, 0, 0);
```

- `data` — плоский массив построчно: `data[y * width + x]`.
- `0` (или ложное значение) — пустой тайл.
- С `tileset` индекс кадра = `gid - firstgid`.
- Без `tileset` значение индексирует `tiles[]` (тоже со смещением `firstgid`, если задан).
- Слои рисуются в порядке массива; верхние слои должны идти позже.
- `solid: true` делает твёрдыми все непустые тайлы.
- `collides: [gid]` делает твёрдыми только перечисленные. Можно передать функцию `(gid) => boolean`.
- Слой коллизий может быть невидимым; `visible` влияет только на отрисовку.
- `offsetX` / `offsetY` слоя сдвигают и отрисовку, и коллизии.

Загрузка JSON через загрузчик:

```js
preload() {
  this.load.json('level-1', 'levels/level-1.json');
  this.load.spritesheet('tiles', 'assets/tiles.png', 32, 32);
}

create() {
  this.map = this.add.tilemap('level-1');
  this.physics.addTilemapCollider(this.player, this.map);
}
```

## API

| Член | Описание |
| --- | --- |
| `getLayer(name)` | Слой (по умолчанию первый) |
| `getTileAt(layer, tileX, tileY)` | gid или `null` |
| `setTileAt(layer, tileX, tileY, gid)` | Изменить тайл |
| `getTileAtWorld(x, y, layer)` | gid в мировой точке |
| `setTileAtWorld(x, y, gid, layer)` | Изменить по мировой точке |
| `tileToWorld(tileX, tileY)` | Мировой левый верхний угол тайла |
| `worldToTile(x, y)` | Координаты тайла |
| `setLayerVisible(name, visible)` | Видимость слоя |
| `setLayerCollision(name, solid?)` | Твёрдость слоя |
| `isSolid(layer, gid)` | Предикат коллизии |
| `getSolidTilesInRect(x, y, w, h)` | Прямоугольники твёрдых тайлов |
| `collidesRect(x, y, w, h)` | Булев результат |
| `tileWidth`, `tileHeight`, `mapWidth`, `mapHeight` | Размеры |
| `x`, `y`, `width`, `height` | Позиция/размер карты в пикселях |
| `events` | Событие `tile-collision(object, tile)` |

Отрисовка обрезается по `scene.camera.worldView`, поэтому большие карты рисуют только видимые тайлы.

## Физика

`PhysicsWorld.collideTilemap(object, map, callback?)` разрешает объект относительно твёрдых тайлов и возвращает число попаданий. Вызывайте каждый кадр:

```js
update() {
  this.physics.collideTilemap(this.player, this.map);
}
```

Или зарегистрируйте один раз:

```js
this.physics.addTilemapCollider(this.player, this.map, (player, tile) => {
  // tile: { x, y, width, height, index, tileX, tileY, layer }
});
```

Разрешение AABB: объект выталкивается по оси наименьшего перекрытия, скорость по этой оси инвертируется с учётом `body.bounce`, выставляются `body.blocked.up/down/left/right`. Для платформеров и стен сверху этого достаточно.

Порядок важен: `physics.step()` идёт после `scene.update()`. Вызов `collideTilemap` в `update()` разрешает столкновения по позициям предыдущего шага; `addTilemapCollider` срабатывает во время шага мира после движения. Для быстрых персонажей лучше зарегистрированный коллайдер или меньший `physics.fixedStep`.

## Рецепты

### Карта из массивов

```js
const width = 40;
const height = 20;
const data = new Array(width * height).fill(0);

for (let x = 0; x < width; x += 1) {
  data[x] = 2;
  data[(height - 1) * width + x] = 2;
}
for (let y = 0; y < height; y += 1) {
  data[y * width] = 2;
  data[y * width + width - 1] = 2;
}
[6, 7, 8].forEach((x) => { data[15 * width + x] = 2; });

this.map = this.add.tilemap({
  tileWidth: 32,
  tileHeight: 32,
  width,
  height,
  tiles: ['#181825', '#313244', '#585b70'],
  layers: [{ name: 'world', data, solid: true, collides: [2] }]
});
```

### Невидимый слой коллизий

```js
layers: [
  { name: 'art', data: artData, visible: true },
  { name: 'collision', data: collisionData, visible: false, solid: true }
]
```

### Удалить тайл при попадании

```js
this.map.setTileAt('world', tileX, tileY, 0);
```

### Тайл под указателем

```js
const tile = this.map.getTileAtWorld(
  this.input.pointer.worldX,
  this.input.pointer.worldY,
  'world'
);
if (tile) {
  const coords = this.map.worldToTile(
    this.input.pointer.worldX,
    this.input.pointer.worldY
  );
  this.map.setTileAt('world', coords.x, coords.y, 0);
}
```

### Лучи по тайлам

`physics.raycast` проверяет тела, а не тайлы. Либо дайте ключевым тайлам тела, либо реализуйте обход сетки через `getTileAtWorld`.

## Ограничения

- Один tileset на карту; нет отдельных tileset на слой, анимированных кадров, свойств тайлов и отражённых тайлов.
- Нет объектных слоёв, image-слоёв и парсинга `.tmx`.
- Коллизия — прямоугольник тайла против прямоугольника объекта (AABB); диагональных и односторонних тайлов нет.
- Большие карты стоят по элементу массива на тайл; слои — обычные JS-массивы.
