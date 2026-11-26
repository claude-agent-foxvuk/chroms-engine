# Tilemaps

Chroms renders JSON tilemaps with multiple layers, color tiles or sprite-sheet tiles, and AABB collision against solid tiles. The parser is intentionally small; there is no TMX/Tiled importer and no object layer support.

## Map format

```js
const mapData = {
  tileWidth: 32,
  tileHeight: 32,
  width: 25,          // in tiles
  height: 19,
  tileset: {
    key: 'tiles',     // a loaded spritesheet
    firstgid: 1,      // gid 1 = frame index 0
    columns: 8
  },
  tiles: ['#181825', '#313244', '#585b70'], // fallback colors when no tileset
  layers: [
    {
      name: 'background',
      data: [/* width * height gids */],
      visible: true,
      opacity: 1
    },
    {
      name: 'walls',
      data: [/* ... */],
      visible: true,
      solid: true,
      collides: [2]   // only gid 2 blocks, when using `collides`
    }
  ]
};

const map = this.add.tilemap(mapData, 0, 0);
```

- `data` is a flat, row-major array: `data[y * width + x]`.
- `0` (or falsy) means an empty tile.
- With a `tileset`, the frame index is `gid - firstgid`.
- Without a tileset, the value indexes `tiles[]` (also offset by `firstgid` if one is set).
- Layers render in array order. Higher layers should come later.
- `solid: true` makes every non-empty tile solid.
- `collides: [gids]` makes only listed gids solid. A function `(gid) => boolean` is also accepted.
- A collision layer may be invisible; `visible` only affects rendering.
- Layer `offsetX` / `offsetY` shift rendering and collision together.

Load map JSON through the asset loader:

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

| Member | Description |
| --- | --- |
| `getLayer(name)` | Layer object (defaults to first) |
| `getTileAt(layer, tileX, tileY)` | gid or `null` |
| `setTileAt(layer, tileX, tileY, gid)` | Edit one tile |
| `getTileAtWorld(x, y, layer)` | gid at a world point |
| `setTileAtWorld(x, y, gid, layer)` | Edit at a world point |
| `tileToWorld(tileX, tileY)` | Top-left world point of a tile |
| `worldToTile(x, y)` | Tile coordinates |
| `setLayerVisible(name, visible)` | Toggle rendering |
| `setLayerCollision(name, solid?)` | Toggle a layer's solid flag |
| `isSolid(layer, gid)` | Collision predicate |
| `getSolidTilesInRect(x, y, w, h)` | Solid tile rects in a world rect |
| `collidesRect(x, y, w, h)` | Boolean |
| `tileWidth`, `tileHeight`, `mapWidth`, `mapHeight` | Dimensions |
| `x`, `y`, `width`, `height` | Map position/size in world pixels |
| `events` | Emits `tile-collision(object, tile)` |

Rendering is culled to `scene.camera.worldView`, so large maps only draw visible tiles.

## Physics integration

`PhysicsWorld.collideTilemap(object, map, callback?)` resolves an object against solid tiles and returns the hit count. Use it every frame for characters that move over the map:

```js
update() {
  this.physics.collideTilemap(this.player, this.map);
}
```

Or register it once (the world calls it before/with other colliders each step):

```js
this.physics.addTilemapCollider(this.player, this.map, (player, tile) => {
  // tile: { x, y, width, height, index, tileX, tileY, layer }
});
```

The resolution is AABB: the object is pushed out along the axis of least overlap, its velocity on that axis is inverted by `body.bounce`, and `body.blocked.up/down/left/right` is set. This is enough for platformers and top-down walls.

Order matters: `physics.step()` runs after `scene.update()`. Calling `collideTilemap` in `update()` resolves against the positions from the previous step; calling it via `addTilemapCollider` happens during the world step after movement. For fast-moving characters, prefer the registered collider or use a smaller `physics.fixedStep`.

## Recipes

### Building a level from arrays

```js
const width = 40;
const height = 20;
const data = new Array(width * height).fill(0);

// floor and ceiling
for (let x = 0; x < width; x += 1) {
  data[x] = 2;
  data[(height - 1) * width + x] = 2;
}
// side walls
for (let y = 0; y < height; y += 1) {
  data[y * width] = 2;
  data[y * width + width - 1] = 2;
}
// a platform
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

### A hidden collision layer

```js
layers: [
  { name: 'art', data: artData, visible: true },
  { name: 'collision', data: collisionData, visible: false, solid: true }
]
```

### Destroy a tile on hit

```js
this.map.setTileAt('world', tileX, tileY, 0);
```

### Pick a tile under the pointer

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

### Raycast vs tiles

`physics.raycast` tests bodies, not tiles. Give key tiles bodies or implement a grid walk with `getTileAtWorld` if you need tile raycasts.

## Limits

- One tileset per map, no per-layer tilesets, animation frames, tile properties or flipped tiles.
- No object layers, image layers or Tiled `.tmx` parsing.
- Collision is tile-rect vs object-rect (AABB); diagonal/one-way tiles are not built in.
- Very large maps still cost one array entry per tile; layers are plain JS arrays.
