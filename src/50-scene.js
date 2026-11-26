  const MIN_ZOOM = 0.05;
  const MAX_ZOOM = 20;

  /**
   * 2D camera: follow with lerp/deadzone, bounds, zoom, shake, fade and flash.
   * The engine uses one camera per scene (`scene.camera`).
   */
  class Camera {
    constructor(scene, x, y, width, height, zoom) {
      this.scene = scene;
      this.x = x || 0;
      this.y = y || 0;
      this.width = width || 800;
      this.height = height || 600;
      this.zoom = zoom || 1;
      this.bounds = null;
      this.followTarget = null;
      this.lerp = new Vec2(0.1, 0.1);
      this.followOffset = new Vec2(0, 0);
      this.deadzone = null;
      this.shakeTime = 0;
      this.shakeDuration = 0;
      this.shakeIntensity = 0;
      this.shakeOffset = new Vec2(0, 0);
      this.fadeAlpha = 0;
      this.fadeColor = '#000000';
      this.flashAlpha = 0;
      this.flashColor = '#ffffff';
      this.backgroundColor = null;
      this.visible = true;
      this._fadeTween = null;
      this._panTween = null;
      this._zoomTween = null;
    }

    setBounds(x, y, width, height) {
      if (isObject(x)) {
        this.bounds = { x: x.x || 0, y: x.y || 0, width: x.width, height: x.height };
      } else {
        this.bounds = { x, y, width, height };
      }
      this._clamp();
      return this;
    }
    clearBounds() {
      this.bounds = null;
      return this;
    }
    setSize(width, height) {
      this.width = width;
      this.height = height;
      return this;
    }
    resize(width, height) {
      return this.setSize(width, height);
    }
    setZoom(value) {
      this.zoom = MathUtils.clamp(value, MIN_ZOOM, MAX_ZOOM);
      this._clamp();
      return this;
    }
    zoomTo(value, duration, ease) {
      const target = MathUtils.clamp(value, MIN_ZOOM, MAX_ZOOM);
      if (!this.scene || !this.scene.tweens || !duration) {
        return this.setZoom(target);
      }
      if (this._zoomTween) this._zoomTween.stop();
      this._zoomTween = this.scene.tweens.add({
        targets: this,
        zoom: target,
        duration,
        ease: ease || 'sine.inOut',
        onUpdate: () => {
          this.zoom = MathUtils.clamp(this.zoom, MIN_ZOOM, MAX_ZOOM);
        },
        onComplete: () => {
          this._zoomTween = null;
          this.setZoom(target);
        }
      });
      return this;
    }
    /** Glide the camera to a world position over `duration` ms. */
    panTo(x, y, duration, ease) {
      if (!this.scene || !this.scene.tweens || !duration) return this.scrollTo(x, y);
      if (this._panTween) this._panTween.stop();
      this._panTween = this.scene.tweens.add({
        targets: this,
        x,
        y,
        duration,
        ease: ease || 'sine.inOut',
        onComplete: () => {
          this._panTween = null;
        }
      });
      return this;
    }
    setBackgroundColor(color) {
      this.backgroundColor = color;
      return this;
    }

    /**
     * Follow a game object. Options: lerpX, lerpY, offsetX, offsetY,
     * deadzoneWidth, deadzoneHeight.
     */
    follow(target, options) {
      const opts = options || {};
      this.followTarget = target;
      if (opts.lerpX !== undefined) this.lerp.x = opts.lerpX;
      if (opts.lerpY !== undefined) this.lerp.y = opts.lerpY;
      if (opts.lerp !== undefined) this.lerp.set(opts.lerp, opts.lerp);
      if (opts.offsetX !== undefined) this.followOffset.x = opts.offsetX;
      if (opts.offsetY !== undefined) this.followOffset.y = opts.offsetY;
      if (opts.deadzoneWidth !== undefined || opts.deadzoneHeight !== undefined) {
        this.setDeadzone(opts.deadzoneWidth || 0, opts.deadzoneHeight || 0);
      }
      const centerX = target.body
        ? target.body.centerX
        : target.x + target.displayWidth / 2;
      const centerY = target.body
        ? target.body.centerY
        : target.y + target.displayHeight / 2;
      this.centerOn(centerX, centerY);
      return this;
    }
    startFollow(target, options) {
      return this.follow(target, options);
    }
    stopFollow() {
      this.followTarget = null;
      return this;
    }
    setLerp(x, y) {
      this.lerp.set(x, y === undefined ? x : y);
      return this;
    }
    setFollowOffset(x, y) {
      this.followOffset.set(x, y || 0);
      return this;
    }
    setDeadzone(width, height) {
      this.deadzone = width || height ? { width: width || 0, height: height || 0 } : null;
      return this;
    }
    centerOn(x, y) {
      this.x = x - this.width / (2 * this.zoom);
      this.y = y - this.height / (2 * this.zoom);
      this._clamp();
      return this;
    }
    scrollTo(x, y) {
      this.x = x;
      this.y = y;
      this._clamp();
      return this;
    }
    shake(duration, intensity) {
      this.shakeDuration = (duration === undefined ? 250 : duration) / 1000;
      this.shakeTime = this.shakeDuration;
      this.shakeIntensity = intensity === undefined ? 6 : intensity;
      return this;
    }
    fadeOut(duration, color, callback) {
      if (color) this.fadeColor = color;
      if (this._fadeTween) this._fadeTween.stop();
      this._fadeTween = null;
      this.fadeAlpha = 0;
      if (!this.scene || !this.scene.tweens) {
        this.fadeAlpha = 1;
        if (callback) callback(this);
        return this;
      }
      const tween = this.scene.tweens.add({
        targets: this,
        fadeAlpha: 1,
        duration: duration === undefined ? 500 : duration,
        onComplete: () => {
          if (callback) callback(this);
        }
      });
      this._fadeTween = tween;
      return this;
    }
    fadeIn(duration, color, callback) {
      if (color) this.fadeColor = color;
      if (this._fadeTween) this._fadeTween.stop();
      this._fadeTween = null;
      if (!this.scene || !this.scene.tweens) {
        this.fadeAlpha = 0;
        if (callback) callback(this);
        return this;
      }
      this.fadeAlpha = 1;
      const tween = this.scene.tweens.add({
        targets: this,
        fadeAlpha: 0,
        duration: duration === undefined ? 500 : duration,
        onComplete: () => {
          if (callback) callback(this);
        }
      });
      this._fadeTween = tween;
      return this;
    }
    flash(color, duration) {
      this.flashColor = color || '#ffffff';
      this.flashAlpha = 1;
      this._flashDecay = (duration === undefined ? 250 : duration) / 1000;
      return this;
    }
    _clamp() {
      if (!this.bounds) return this;
      const viewWidth = this.width / this.zoom;
      const viewHeight = this.height / this.zoom;
      if (this.bounds.width > viewWidth) {
        this.x = MathUtils.clamp(this.x, this.bounds.x, this.bounds.x + this.bounds.width - viewWidth);
      } else {
        this.x = this.bounds.x + (this.bounds.width - viewWidth) / 2;
      }
      if (this.bounds.height > viewHeight) {
        this.y = MathUtils.clamp(this.y, this.bounds.y, this.bounds.y + this.bounds.height - viewHeight);
      } else {
        this.y = this.bounds.y + (this.bounds.height - viewHeight) / 2;
      }
      return this;
    }
    update(dt) {
      if (this.followTarget) {
        const target = this.followTarget;
        const viewWidth = this.width / this.zoom;
        const viewHeight = this.height / this.zoom;
        const targetCenterX = target.body
          ? target.body.centerX
          : target.x + target.displayWidth / 2;
        const targetCenterY = target.body
          ? target.body.centerY
          : target.y + target.displayHeight / 2;
        const targetX = targetCenterX + this.followOffset.x - viewWidth / 2;
        const targetY = targetCenterY + this.followOffset.y - viewHeight / 2;
        if (this.deadzone) {
          const centerX = this.x + viewWidth / 2;
          const centerY = this.y + viewHeight / 2;
          const halfW = this.deadzone.width / 2;
          const halfH = this.deadzone.height / 2;
          if (targetCenterX < centerX - halfW) {
            this.x = MathUtils.lerp(this.x, targetX, this.lerp.x);
          } else if (targetCenterX > centerX + halfW) {
            this.x = MathUtils.lerp(this.x, targetX, this.lerp.x);
          }
          if (targetCenterY < centerY - halfH) {
            this.y = MathUtils.lerp(this.y, targetY, this.lerp.y);
          } else if (targetCenterY > centerY + halfH) {
            this.y = MathUtils.lerp(this.y, targetY, this.lerp.y);
          }
        } else {
          this.x = MathUtils.lerp(this.x, targetX, this.lerp.x);
          this.y = MathUtils.lerp(this.y, targetY, this.lerp.y);
        }
      }
      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        const power = this.shakeIntensity * Math.max(0, this.shakeTime / this.shakeDuration);
        this.shakeOffset.set(
          MathUtils.randomFloat(-power, power),
          MathUtils.randomFloat(-power, power)
        );
      } else if (this.shakeOffset.x !== 0 || this.shakeOffset.y !== 0) {
        this.shakeOffset.set(0, 0);
      }
      if (this.flashAlpha > 0) {
        const decay = this._flashDecay || 0.25;
        this.flashAlpha = MathUtils.clamp01(this.flashAlpha - dt / decay);
      }
      this._clamp();
      return this;
    }
    get worldView() {
      return {
        x: this.x,
        y: this.y,
        width: this.width / this.zoom,
        height: this.height / this.zoom
      };
    }
    apply(ctx) {
      ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.x, -this.y);
      return this;
    }
    screenToWorld(x, y) {
      return {
        x: x / this.zoom + this.x,
        y: y / this.zoom + this.y
      };
    }
    worldToScreen(x, y) {
      return {
        x: (x - this.x) * this.zoom + this.shakeOffset.x,
        y: (y - this.y) * this.zoom + this.shakeOffset.y
      };
    }
    _drawOverlays(ctx) {
      if (this.fadeAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = MathUtils.clamp01(this.fadeAlpha);
        ctx.fillStyle = this.fadeColor;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }
      if (this.flashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = MathUtils.clamp01(this.flashAlpha);
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }
    }
  }

  /**
   * Tilemap renderer with multiple layers and AABB tile collision.
   * Data format (see docs):
   * { tileWidth, tileHeight, width, height,
   *   tileset: { key, firstgid, columns } | null,
   *   tiles: ['#color', ...],
   *   layers: [{ name, data: [gid,...], visible, opacity, solid, collides: [gid] }] }
   */
  class Tilemap extends GameObject {
    constructor(scene, data, x, y) {
      const map = data || {};
      const tileWidth = map.tileWidth || 32;
      const tileHeight = map.tileHeight || 32;
      const mapWidth = map.width || 1;
      const mapHeight = map.height || 1;
      super(scene, x || 0, y || 0, mapWidth * tileWidth, mapHeight * tileHeight);
      this.type = 'Tilemap';
      this.data = map;
      this.tileWidth = tileWidth;
      this.tileHeight = tileHeight;
      this.mapWidth = mapWidth;
      this.mapHeight = mapHeight;
      this.tileset = map.tileset || null;
      this.tiles = map.tiles || [];
      this.layers = (map.layers || []).map((layer) =>
        Object.assign(
          {
            name: layer.name || 'layer',
            data: layer.data || [],
            visible: layer.visible !== false,
            opacity: layer.opacity === undefined ? 1 : layer.opacity,
            solid: !!layer.solid,
            collides: layer.collides || null,
            offsetX: layer.offsetX || 0,
            offsetY: layer.offsetY || 0
          },
          layer
        )
      );
      this.events = new EventEmitter();
    }

    getLayer(name) {
      if (!name) return this.layers[0] || null;
      return this.layers.find((layer) => layer.name === name) || null;
    }
    getTileAt(layerName, tileX, tileY) {
      const layer = this.getLayer(layerName);
      if (!layer) return null;
      if (tileX < 0 || tileY < 0 || tileX >= this.mapWidth || tileY >= this.mapHeight) return null;
      return layer.data[tileY * this.mapWidth + tileX] || 0;
    }
    setTileAt(layerName, tileX, tileY, gid) {
      const layer = this.getLayer(layerName);
      if (!layer) return this;
      if (tileX < 0 || tileY < 0 || tileX >= this.mapWidth || tileY >= this.mapHeight) return this;
      layer.data[tileY * this.mapWidth + tileX] = gid;
      return this;
    }
    getTileAtWorld(x, y, layerName) {
      const tileX = Math.floor((x - this.x) / this.tileWidth);
      const tileY = Math.floor((y - this.y) / this.tileHeight);
      return this.getTileAt(layerName, tileX, tileY);
    }
    setTileAtWorld(x, y, gid, layerName) {
      return this.setTileAt(
        layerName,
        Math.floor((x - this.x) / this.tileWidth),
        Math.floor((y - this.y) / this.tileHeight),
        gid
      );
    }
    tileToWorld(tileX, tileY) {
      return { x: this.x + tileX * this.tileWidth, y: this.y + tileY * this.tileHeight };
    }
    worldToTile(x, y) {
      return {
        x: Math.floor((x - this.x) / this.tileWidth),
        y: Math.floor((y - this.y) / this.tileHeight)
      };
    }
    setLayerVisible(name, visible) {
      const layer = this.getLayer(name);
      if (layer) layer.visible = visible;
      return this;
    }
    setLayerCollision(name, solid) {
      const layer = this.getLayer(name);
      if (layer) layer.solid = solid === undefined ? true : !!solid;
      return this;
    }
    isSolid(layer, gid) {
      if (!gid) return false;
      if (layer.collides) {
        if (typeof layer.collides === 'function') return !!layer.collides(gid);
        if (Array.isArray(layer.collides)) return layer.collides.indexOf(gid) !== -1;
      }
      return !!layer.solid;
    }
    /** Every solid tile intersecting a world rectangle. */
    getSolidTilesInRect(x, y, width, height) {
      const out = [];
      this.layers.forEach((layer) => {
        if (!layer.solid && !layer.collides) return;
        const startX = Math.max(0, Math.floor((x - this.x - layer.offsetX) / this.tileWidth));
        const startY = Math.max(0, Math.floor((y - this.y - layer.offsetY) / this.tileHeight));
        const endX = Math.min(
          this.mapWidth - 1,
          Math.floor((x + width - this.x - layer.offsetX) / this.tileWidth)
        );
        const endY = Math.min(
          this.mapHeight - 1,
          Math.floor((y + height - this.y - layer.offsetY) / this.tileHeight)
        );
        for (let tileY = startY; tileY <= endY; tileY += 1) {
          for (let tileX = startX; tileX <= endX; tileX += 1) {
            const gid = layer.data[tileY * this.mapWidth + tileX] || 0;
            if (!this.isSolid(layer, gid)) continue;
            out.push({
              x: this.x + layer.offsetX + tileX * this.tileWidth,
              y: this.y + layer.offsetY + tileY * this.tileHeight,
              width: this.tileWidth,
              height: this.tileHeight,
              index: gid,
              tileX,
              tileY,
              layer: layer.name
            });
          }
        }
      });
      return out;
    }
    collidesRect(x, y, width, height) {
      return this.getSolidTilesInRect(x, y, width, height).length > 0;
    }
    _frameFor(gid) {
      if (!this.tileset || !this.scene || !this.scene.load) return null;
      const index = gid - (this.tileset.firstgid || 0);
      return this.scene.load.getFrame(this.tileset.key, index);
    }
    draw(ctx) {
      const view = this.scene && this.scene.camera ? this.scene.camera.worldView : null;
      this.layers.forEach((layer) => {
        if (!layer.visible || !layer.data) return;
        ctx.save();
        ctx.globalAlpha *= layer.opacity;
        let startX = 0;
        let startY = 0;
        let endX = this.mapWidth - 1;
        let endY = this.mapHeight - 1;
        if (view) {
          startX = Math.max(
            0,
            Math.floor((view.x - this.x - layer.offsetX) / this.tileWidth)
          );
          startY = Math.max(
            0,
            Math.floor((view.y - this.y - layer.offsetY) / this.tileHeight)
          );
          endX = Math.min(
            this.mapWidth - 1,
            Math.ceil((view.x + view.width - this.x - layer.offsetX) / this.tileWidth)
          );
          endY = Math.min(
            this.mapHeight - 1,
            Math.ceil((view.y + view.height - this.y - layer.offsetY) / this.tileHeight)
          );
        }
        for (let tileY = startY; tileY <= endY; tileY += 1) {
          for (let tileX = startX; tileX <= endX; tileX += 1) {
            const gid = layer.data[tileY * this.mapWidth + tileX] || 0;
            if (!gid) continue;
            const px = layer.offsetX + tileX * this.tileWidth;
            const py = layer.offsetY + tileY * this.tileHeight;
            const frame = this._frameFor(gid);
            if (frame && frame.image) {
              ctx.drawImage(
                frame.image,
                frame.x,
                frame.y,
                frame.width,
                frame.height,
                px,
                py,
                this.tileWidth,
                this.tileHeight
              );
            } else if (this.tiles.length) {
              const index = gid - (this.tileset ? this.tileset.firstgid || 0 : 0);
              ctx.fillStyle = this.tiles[index] || this.tiles[0] || '#555566';
              ctx.fillRect(px, py, this.tileWidth, this.tileHeight);
            } else {
              ctx.fillStyle = '#555566';
              ctx.fillRect(px, py, this.tileWidth, this.tileHeight);
            }
          }
        }
        ctx.restore();
      });
    }
  }

  /**
   * A game scene. Subclass it and implement `preload`, `create`, `update`,
   * optionally `init`, `fixedUpdate` and `shutdown`.
   */
  class Scene {
    constructor(key) {
      if (isObject(key)) {
        this.key = key.key || 'Scene';
        this.config = key;
      } else {
        this.key = key || 'Scene';
        this.config = {};
      }
      this.game = null;
      this.children = [];
      this.cameras = [];
      this.camera = null;
      this.events = new EventEmitter();
      this.status = 'new';
      this.data = {};
      this._bound = false;
      this._loading = false;
      this._updateChildren = this.config.updateChildren !== false;
    }

    _bind(game) {
      this.game = game;
      this.physics = game.physics;
      this.input = game.input;
      this.load = game.load;
      this.sound = game.sound;
      this.anims = game.anims;
      this.storage = game.storage;
      this.scale = game.scale || null;
      this.tweens = new TweenManager(game);
      this.time = new TimerManager(game);
      this.camera = new Camera(this, 0, 0, game.width, game.height, 1);
      this.cameras = [this.camera];
      this.add = this._createFactory();
      this._bound = true;
      return this;
    }

    _createFactory() {
      const scene = this;
      return {
        sprite(x, y, width, height, textureOrColor) {
          const object = new Sprite(scene, x, y, width, height, textureOrColor);
          scene.children.push(object);
          return object;
        },
        image(x, y, key, options) {
          const opts = options || {};
          const image = scene.load ? scene.load.getImage(key) : null;
          const width = opts.width || (image ? image.width : 32);
          const height = opts.height || (image ? image.height : 32);
          const object = new Sprite(scene, x, y, width, height, key);
          scene.children.push(object);
          return object;
        },
        rect(x, y, width, height, color, radius) {
          const object = new Rect(scene, x, y, width, height, color, radius);
          scene.children.push(object);
          return object;
        },
        circle(x, y, radius, color) {
          const object = new Circle(scene, x, y, radius, color);
          scene.children.push(object);
          return object;
        },
        line(x1, y1, x2, y2, color, lineWidth) {
          const object = new Line(scene, x1, y1, x2, y2, color, lineWidth);
          scene.children.push(object);
          return object;
        },
        text(x, y, text, style) {
          const object = new Text(scene, x, y, text, style);
          scene.children.push(object);
          return object;
        },
        tileSprite(x, y, width, height, key, options) {
          const object = new TileSprite(scene, x, y, width, height, key, options);
          scene.children.push(object);
          return object;
        },
        container(x, y) {
          const object = new Container(scene, x, y);
          scene.children.push(object);
          return object;
        },
        group(config) {
          const object = new Group(scene, config);
          scene.children.push(object);
          return object;
        },
        particles(x, y, config) {
          const object = new ParticleEmitter(scene, x, y, config);
          scene.children.push(object);
          return object;
        },
        tilemap(dataOrKey, x, y) {
          let data = dataOrKey;
          if (typeof dataOrKey === 'string' && scene.load) {
            data = scene.load.getJSON(dataOrKey, null);
            if (!data) {
              console.warn('[Chroms] Tilemap JSON not found:', dataOrKey);
              data = { tileWidth: 32, tileHeight: 32, width: 1, height: 1, layers: [] };
            }
          }
          const object = new Tilemap(scene, data, x, y);
          scene.children.push(object);
          return object;
        },
        button(x, y, width, height, label, options) {
          const object = new Button(scene, x, y, width, height, label, options);
          scene.children.push(object);
          return object;
        },
        joystick(x, y, options) {
          const object = new Joystick(scene, x, y, options);
          scene.children.push(object);
          return object;
        },
        animatedSprite(x, y, width, height, texture) {
          const object = new Sprite(scene, x, y, width, height, texture);
          scene.children.push(object);
          return object;
        },
        existing(object) {
          if (!object) return null;
          if (object.scene !== scene) {
            object.scene = scene;
            object.game = scene.game;
          }
          if (scene.children.indexOf(object) === -1) scene.children.push(object);
          return object;
        }
      };
    }

    init(data) {}
    preload() {}
    create() {}
    update(dt) {}
    fixedUpdate(dt) {}
    shutdown() {}

    /** Start another scene (optionally with a fade transition). */
    start(key, data, options) {
      if (this.game) this.game.startScene(key, data, options);
      return this;
    }
    restart(data, options) {
      if (this.game) this.game.startScene(this.key, data, options);
      return this;
    }
    stop() {
      if (this.game) this.game.stopScene(this.key);
      return this;
    }
    pause() {
      this.status = 'paused';
      this.events.emit('pause');
      return this;
    }
    resume() {
      if (this.status === 'paused') {
        this.status = 'running';
        this.events.emit('resume');
      }
      return this;
    }
    sleep() {
      this.status = 'sleeping';
      if (this.camera) this.camera.visible = false;
      this.events.emit('sleep');
      return this;
    }
    wake() {
      if (this.status === 'sleeping') {
        this.status = 'running';
        if (this.camera) this.camera.visible = true;
        this.events.emit('wake');
      }
      return this;
    }

    getChildren() {
      return this.children;
    }
    find(predicate) {
      return this.children.find(predicate) || null;
    }
    findByName(name) {
      return this.children.find((child) => child.name === name) || null;
    }
    findByType(type) {
      return this.children.filter((child) => child.type === type);
    }
    getChildrenByType(type) {
      return this.findByType(type);
    }
    remove(object, destroyObject) {
      const index = this.children.indexOf(object);
      if (index !== -1) this.children.splice(index, 1);
      if (destroyObject && object && !object.destroyed) object.destroy();
      return this;
    }

    _update(dt) {
      this.input._syncWorldPointer(this.camera);
      this.time.update(dt);
      this.tweens.update(dt);
      if (this.fixedUpdate !== Scene.prototype.fixedUpdate) {
        const step = this.game ? this.game.fixedStep : 1 / 60;
        this._fixedAccumulator = (this._fixedAccumulator || 0) + dt;
        let steps = 0;
        while (this._fixedAccumulator >= step && steps < 8) {
          this.fixedUpdate(step);
          this._fixedAccumulator -= step;
          steps += 1;
        }
        if (steps === 8) this._fixedAccumulator = 0;
      }
      this.events.emit('update', dt);
      this.update(dt);
      if (this._updateChildren) {
        this.children.slice().forEach((child) => {
          if (!child || child.destroyed) return;
          if (child.active && typeof child.update === 'function') child.update(dt);
        });
      }
      if (this.camera) this.camera.update(dt);
      this.events.emit('postupdate', dt);
    }

    _render(ctx) {
      const camera = this.camera;
      if (!camera || camera.visible === false) return;
      const objects = this.children.slice().sort((a, b) => a.depth - b.depth);
      ctx.save();
      if (camera.backgroundColor) {
        ctx.fillStyle = camera.backgroundColor;
        ctx.fillRect(0, 0, camera.width, camera.height);
      }
      camera.apply(ctx);
      this.events.emit('prerender', ctx);
      objects.forEach((child) => {
        if (child.destroyed || child.visible === false || child.isScreenSpace()) return;
        child.render(ctx);
      });
      this.events.emit('render', ctx);
      ctx.restore();
      objects.forEach((child) => {
        if (child.destroyed || child.visible === false || !child.isScreenSpace()) return;
        child.render(ctx);
      });
      camera._drawOverlays(ctx);
    }
  }
