  function roundRectPath(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Base class for everything drawn in a scene. Transform origin is the
   * top-left corner by default; `setOrigin()` changes that.
   */
  class GameObject {
    constructor(scene, x, y, width, height) {
      this.id = uid('obj');
      this.type = 'GameObject';
      this.scene = scene || null;
      this.game = scene ? scene.game : null;
      this.x = x || 0;
      this.y = y || 0;
      this.width = width || 0;
      this.height = height || 0;
      this.originX = 0;
      this.originY = 0;
      this.scaleX = 1;
      this.scaleY = 1;
      this.angle = 0;
      this.alpha = 1;
      this.visible = true;
      this.active = true;
      this.destroyed = false;
      this.depth = 0;
      this.blendMode = 'source-over';
      this.scrollFactorX = 1;
      this.scrollFactorY = 1;
      this.name = '';
      this.data = {};
      this.body = null;
      this.parent = null;
      this.group = null;
      this.isDragged = false;
      this.isHovered = false;
      this._interactive = null;
      this._interactivePressed = false;
      this.events = new EventEmitter();
    }

    get displayWidth() {
      return Math.abs(this.width * this.scaleX);
    }
    get displayHeight() {
      return Math.abs(this.height * this.scaleY);
    }
    get centerX() {
      return this.x + this.displayWidth * this.originX;
    }
    get centerY() {
      return this.y + this.displayHeight * this.originY;
    }
    get right() {
      return this.x + this.displayWidth;
    }
    get bottom() {
      return this.y + this.displayHeight;
    }
    get worldX() {
      return this.parent ? this.parent.worldX + this.x : this.x;
    }
    get worldY() {
      return this.parent ? this.parent.worldY + this.y : this.y;
    }

    setPosition(x, y) {
      this.x = x;
      this.y = y === undefined ? x : y;
      return this;
    }
    setX(x) {
      this.x = x;
      return this;
    }
    setY(y) {
      this.y = y;
      return this;
    }
    setSize(width, height) {
      this.width = width;
      this.height = height === undefined ? width : height;
      return this;
    }
    setScale(x, y) {
      this.scaleX = x;
      this.scaleY = y === undefined ? x : y;
      return this;
    }
    setOrigin(x, y) {
      this.originX = x;
      this.originY = y === undefined ? x : y;
      return this;
    }
    /** Rotation in degrees. */
    setAngle(degrees) {
      this.angle = degrees;
      return this;
    }
    /** Rotation in radians. */
    setRotation(radians) {
      this.angle = MathUtils.radToDeg(radians);
      return this;
    }
    setAlpha(value) {
      this.alpha = MathUtils.clamp01(value);
      return this;
    }
    setVisible(value) {
      this.visible = value === undefined ? true : !!value;
      return this;
    }
    setActive(value) {
      this.active = value === undefined ? true : !!value;
      return this;
    }
    setDepth(value) {
      this.depth = value;
      return this;
    }
    setName(value) {
      this.name = value;
      return this;
    }
    setBlendMode(mode) {
      this.blendMode = mode || 'source-over';
      return this;
    }
    /**
     * `setScrollFactor(0)` pins the object to the screen (HUD); 1 follows the
     * camera. Only 0 and 1 are supported, and both axes should match.
     */
    setScrollFactor(x, y) {
      this.scrollFactorX = x;
      this.scrollFactorY = y === undefined ? x : y;
      return this;
    }
    isScreenSpace() {
      return this.scrollFactorX === 0 && this.scrollFactorY === 0;
    }
    setData(key, value) {
      if (isObject(key)) {
        Object.keys(key).forEach((k) => {
          this.data[k] = key[k];
        });
      } else {
        this.data[key] = value;
      }
      return this;
    }
    getData(key) {
      return this.data[key];
    }
    hasData(key) {
      return key in this.data;
    }
    incData(key, amount) {
      this.data[key] = (this.data[key] || 0) + (amount === undefined ? 1 : amount);
      return this;
    }

    /** Add this object to a scene (removes it from a previous parent). */
    addTo(scene) {
      const target = scene || this.scene;
      if (!target) return this;
      if (this.scene && this.scene !== target) this.scene.remove(this, false);
      if (this.parent) this.parent.remove(this);
      if (this.group) this.group.remove(this);
      this.scene = target;
      this.game = target.game;
      if (target.children.indexOf(this) === -1) target.children.push(this);
      return this;
    }

    /** Create and return a physics body for this object. */
    enablePhysics(config) {
      if (!this.scene) return this;
      if (this.body) this.body.destroy();
      this.body = this.scene.physics.add(this, config || {});
      return this.body;
    }
    disablePhysics() {
      if (this.body) this.body.destroy();
      this.body = null;
      return this;
    }

    setVelocity(vx, vy) {
      if (!this.body) this.enablePhysics();
      this.body.setVelocity(vx, vy);
      return this;
    }
    setVelocityX(vx) {
      if (!this.body) this.enablePhysics();
      this.body.setVelocityX(vx);
      return this;
    }
    setVelocityY(vy) {
      if (!this.body) this.enablePhysics();
      this.body.setVelocityY(vy);
      return this;
    }
    setAcceleration(x, y) {
      if (!this.body) this.enablePhysics();
      this.body.setAcceleration(x, y);
      return this;
    }
    setDrag(x, y) {
      if (!this.body) this.enablePhysics();
      this.body.setDrag(x, y);
      return this;
    }
    setBounce(value) {
      if (!this.body) this.enablePhysics();
      this.body.setBounce(value);
      return this;
    }
    setGravityY(value) {
      if (!this.body) this.enablePhysics();
      this.body.setGravityY(value);
      return this;
    }
    setImmovable(value) {
      if (!this.body) this.enablePhysics();
      this.body.setImmovable(value);
      return this;
    }
    setMaxVelocity(x, y) {
      if (!this.body) this.enablePhysics();
      this.body.setMaxVelocity(x, y);
      return this;
    }
    setCollideWorldBounds(value) {
      if (!this.body) this.enablePhysics();
      this.body.setCollideWorldBounds(value);
      return this;
    }
    setDraggable(value, options) {
      if (!this.scene) return this;
      if (value === false) this.scene.input.disableDrag(this);
      else this.scene.input.enableDrag(this, options);
      return this;
    }
    /**
     * Emit pointerover/pointerout/pointerdown/pointerup/click for this object.
     * Options: hitArea(localX, localY, object), offsetX, offsetY,
     * onClick, onHover, onOut, onDown, onUp.
     */
    setInteractive(options) {
      const opts = options === undefined || options === true ? {} : options;
      this._interactive = Object.assign({ enabled: true }, opts);
      this.isHovered = false;
      if (this.scene && this.scene.input) this.scene.input.addInteractive(this);
      return this;
    }
    disableInteractive() {
      if (this.scene && this.scene.input) this.scene.input.removeInteractive(this);
      if (this._interactive) this._interactive.enabled = false;
      this.isHovered = false;
      return this;
    }

    getBounds() {
      return { x: this.x, y: this.y, width: this.displayWidth, height: this.displayHeight };
    }
    distanceTo(target) {
      const tx = target.x !== undefined ? target.x : target[0];
      const ty = target.y !== undefined ? target.y : target[1];
      return Math.hypot(tx - this.x, ty - this.y);
    }
    angleTo(target) {
      return Math.atan2(target.y - this.y, target.x - this.x);
    }

    update(dt) {}
    draw(ctx) {}

    /** Render with transform, alpha and blend mode applied. */
    render(ctx) {
      if (!this.visible || this.destroyed || this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= this.alpha;
      if (this.blendMode && this.blendMode !== 'source-over') {
        ctx.globalCompositeOperation = this.blendMode;
      }
      ctx.translate(this.x, this.y);
      if (this.angle) ctx.rotate(MathUtils.degToRad(this.angle));
      if (this.scaleX !== 1 || this.scaleY !== 1) ctx.scale(this.scaleX, this.scaleY);
      const offsetX = -this.originX * this.width;
      const offsetY = -this.originY * this.height;
      if (offsetX || offsetY) ctx.translate(offsetX, offsetY);
      this.draw(ctx);
      ctx.restore();
    }

    destroy(fromScene) {
      if (this.destroyed) return this;
      this.destroyed = true;
      this.active = false;
      if (this.scene && this.scene.input) this.scene.input.removeInteractive(this);
      this.events.emit('destroy', this, fromScene);
      if (this.body) {
        this.body.destroy();
        this.body = null;
      }
      if (this.parent) this.parent.remove(this, false);
      if (this.group) this.group.remove(this, false);
      if (this.scene && this.scene.children) {
        const index = this.scene.children.indexOf(this);
        if (index !== -1) this.scene.children.splice(index, 1);
      }
      return this;
    }
  }

  /** Sprite: colored rectangle or texture (including sprite sheets and atlases). */
  class Sprite extends GameObject {
    constructor(scene, x, y, width, height, textureOrColor) {
      super(scene, x, y, width, height);
      this.type = 'Sprite';
      this.texture = textureOrColor || '#ffffff';
      this.frame = null;
      this.flipX = false;
      this.flipY = false;
      this.tint = null;
      this._anim = null;
      this._tintCache = null;
    }

    setTexture(texture, frame) {
      this.texture = texture;
      this.frame = frame === undefined ? null : frame;
      this._tintCache = null;
      return this;
    }
    /** Multiply the texture by a color (cached per frame). */
    setTint(color) {
      this.tint = color || null;
      this._tintCache = null;
      return this;
    }
    clearTint() {
      this.tint = null;
      this._tintCache = null;
      return this;
    }
    _tintedSource(image, sx, sy, sw, sh) {
      const cache = this._tintCache;
      if (
        cache &&
        cache.image === image &&
        cache.color === this.tint &&
        cache.sx === sx &&
        cache.sy === sy &&
        cache.sw === sw &&
        cache.sh === sh
      ) {
        return cache.canvas;
      }
      let canvas = null;
      try {
        canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sw));
        canvas.height = Math.max(1, Math.round(sh));
        const tintCtx = canvas.getContext('2d');
        tintCtx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        tintCtx.globalCompositeOperation = 'source-in';
        tintCtx.fillStyle = this.tint;
        tintCtx.fillRect(0, 0, canvas.width, canvas.height);
        tintCtx.globalCompositeOperation = 'source-over';
      } catch (error) {
        canvas = null;
      }
      this._tintCache = { image, color: this.tint, sx, sy, sw, sh, canvas };
      return canvas;
    }
    setFrame(frame) {
      this.frame = frame;
      return this;
    }
    get frameIndex() {
      return this.frame;
    }
    /** Play a named animation registered with `game.anims.create()` or `scene.anims`. */
    play(key, options) {
      if (!this.scene || !this.scene.anims) return this;
      this.scene.anims.play(this, key, options);
      return this;
    }
    stop() {
      if (this._anim) this._anim.playing = false;
      if (this.scene && this.scene.anims) this.scene.anims.forget(this);
      return this;
    }
    pause() {
      if (this._anim) this._anim.paused = true;
      return this;
    }
    resume() {
      if (this._anim) this._anim.paused = false;
      return this;
    }
    isPlaying(key) {
      return !!(this._anim && this._anim.playing && (!key || this._anim.key === key));
    }
    setFlip(x, y) {
      this.flipX = x === undefined ? true : !!x;
      this.flipY = y === undefined ? this.flipX : !!y;
      return this;
    }

    update(dt) {
      const anim = this._anim;
      if (!anim || !anim.playing || anim.paused) return;
      anim.time += dt * 1000;
      const interval = 1000 / Math.max(1, anim.frameRate);
      let guard = 0;
      while (anim.time >= interval && guard < 8) {
        anim.time -= interval;
        guard += 1;
        this._advanceAnimation(anim);
      }
    }

    _advanceAnimation(anim) {
      const last = anim.frames.length - 1;
      let next = anim.current + anim.direction;
      if (next > last || next < 0) {
        if (anim.yoyo && anim.direction === -1) {
          // The return leg reached the first frame; only repeat or finish.
          if (anim.repeat === -1 || anim.repeatCount < anim.repeat) {
            if (anim.repeat !== -1) anim.repeatCount += 1;
            anim.direction = 1;
            next = last > 0 ? 1 : 0;
          } else {
            this._finishAnimation(anim);
            return;
          }
        } else if (anim.yoyo) {
          anim.direction = -1;
          next = anim.current + anim.direction;
        } else if (anim.repeat === -1 || anim.repeatCount < anim.repeat) {
          if (anim.repeat !== -1) anim.repeatCount += 1;
          next = 0;
        } else {
          this._finishAnimation(anim);
          return;
        }
      }
      anim.current = MathUtils.clamp(next, 0, last);
      this.frame = anim.frames[anim.current];
      if (anim.onFrame) anim.onFrame(this, this.frame, anim.current);
      this.events.emit('animationframe', this.frame, anim.current);
    }

    _finishAnimation(anim) {
      anim.playing = false;
      this.frame = anim.frames[anim.current];
      // Unregister before onComplete, which may start another animation.
      if (this.scene && this.scene.anims) this.scene.anims.forget(this);
      if (anim.onComplete) anim.onComplete(this, anim);
      this.events.emit('animationcomplete', anim.key, this);
    }

    _resolveFrame() {
      if (!this.scene || !this.scene.load) return null;
      const loader = this.scene.load;
      const frame = this.frame === null || this.frame === undefined ? 0 : this.frame;
      return loader.getFrame(this.texture, frame);
    }

    draw(ctx) {
      const loader = this.scene ? this.scene.load : null;
      const frameData = this._resolveFrame();
      const image =
        frameData && frameData.image
          ? frameData.image
          : loader
          ? loader.getImage(this.texture)
          : null;
      if (!image) {
        ctx.fillStyle = this.texture || '#ffffff';
        ctx.fillRect(0, 0, this.width, this.height);
        return;
      }
      const sx = frameData ? frameData.x : 0;
      const sy = frameData ? frameData.y : 0;
      const sw = frameData ? frameData.width : image.width;
      const sh = frameData ? frameData.height : image.height;
      const tinted = this.tint ? this._tintedSource(image, sx, sy, sw, sh) : null;
      ctx.save();
      ctx.translate(this.flipX ? this.width : 0, this.flipY ? this.height : 0);
      ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
      if (tinted) ctx.drawImage(tinted, 0, 0, this.width, this.height);
      else ctx.drawImage(image, sx, sy, sw, sh, 0, 0, this.width, this.height);
      ctx.restore();
    }

    destroy(fromScene) {
      if (this._anim) this._anim.playing = false;
      if (this.scene && this.scene.anims) this.scene.anims.forget(this);
      this._anim = null;
      return super.destroy(fromScene);
    }
  }

  /** Filled rectangle with optional rounded corners. */
  class Rect extends GameObject {
    constructor(scene, x, y, width, height, color, radius) {
      super(scene, x, y, width, height);
      this.type = 'Rect';
      this.color = color || '#ffffff';
      this.radius = radius || 0;
      this.strokeColor = null;
      this.strokeWidth = 0;
    }
    setColor(color) {
      this.color = color;
      return this;
    }
    setRadius(radius) {
      this.radius = radius;
      return this;
    }
    setStroke(color, width) {
      this.strokeColor = color;
      this.strokeWidth = width === undefined ? 1 : width;
      return this;
    }
    draw(ctx) {
      ctx.fillStyle = this.color;
      if (this.radius > 0) {
        roundRectPath(ctx, 0, 0, this.width, this.height, this.radius);
        ctx.fill();
        if (this.strokeColor) {
          ctx.strokeStyle = this.strokeColor;
          ctx.lineWidth = this.strokeWidth;
          ctx.stroke();
        }
      } else {
        ctx.fillRect(0, 0, this.width, this.height);
        if (this.strokeColor) {
          ctx.strokeStyle = this.strokeColor;
          ctx.lineWidth = this.strokeWidth;
          ctx.strokeRect(0, 0, this.width, this.height);
        }
      }
    }
  }

  /** Ellipse/circle. `x, y` is the top-left of the bounding box. */
  class Circle extends GameObject {
    constructor(scene, x, y, radius, color) {
      super(scene, x, y, radius * 2, radius * 2);
      this.type = 'Circle';
      this.radius = radius;
      this.color = color || '#ffffff';
      this.strokeColor = null;
      this.strokeWidth = 0;
    }
    setRadius(radius) {
      this.radius = radius;
      this.width = radius * 2;
      this.height = radius * 2;
      return this;
    }
    setColor(color) {
      this.color = color;
      return this;
    }
    setStroke(color, width) {
      this.strokeColor = color;
      this.strokeWidth = width === undefined ? 1 : width;
      return this;
    }
    draw(ctx) {
      ctx.beginPath();
      ctx.ellipse(this.radius, this.radius, this.radius, this.radius, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      if (this.strokeColor) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
      }
    }
  }

  /** Straight line segment. Coordinates are stored relative to `x, y`. */
  class Line extends GameObject {
    constructor(scene, x1, y1, x2, y2, color, lineWidth) {
      super(scene, Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      this.type = 'Line';
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
      this.color = color || '#ffffff';
      this.lineWidth = lineWidth || 2;
    }
    setPoints(x1, y1, x2, y2) {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
      this.x = Math.min(x1, x2);
      this.y = Math.min(y1, y2);
      this.width = Math.abs(x2 - x1);
      this.height = Math.abs(y2 - y1);
      return this;
    }
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(this.x1 - this.x, this.y1 - this.y);
      ctx.lineTo(this.x2 - this.x, this.y2 - this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
    }
  }

  /** Local-space points, normalized so the shape starts at (0, 0). */
  function normalizePolygonPoints(points) {
    const list = (points || []).map((point) =>
      Array.isArray(point)
        ? { x: point[0], y: point[1] }
        : { x: (point && point.x) || 0, y: (point && point.y) || 0 }
    );
    if (list.length === 0) return { points: [], width: 0, height: 0 };
    let minX = list[0].x;
    let minY = list[0].y;
    let maxX = minX;
    let maxY = minY;
    list.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    return {
      points: list.map((point) => ({ x: point.x - minX, y: point.y - minY })),
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Filled/stroked polygon from local points: `[[0,0],[40,0],[20,30]]`.
   * Points are normalized so the shape starts at the object's own position.
   */
  class Polygon extends GameObject {
    constructor(scene, x, y, points, options) {
      const shape = normalizePolygonPoints(points);
      super(scene, x, y, shape.width, shape.height);
      const opts = options || {};
      this.type = 'Polygon';
      this.points = shape.points;
      this.color = opts.color || opts.fill || '#ffffff';
      this.strokeColor = opts.stroke || null;
      this.strokeWidth = opts.strokeWidth === undefined ? 1 : opts.strokeWidth;
      this.closed = opts.closed !== false;
    }
    setPoints(points) {
      const shape = normalizePolygonPoints(points);
      this.points = shape.points;
      this.width = shape.width;
      this.height = shape.height;
      return this;
    }
    setColor(color) {
      this.color = color;
      return this;
    }
    setStroke(color, width) {
      this.strokeColor = color;
      this.strokeWidth = width === undefined ? 1 : width;
      return this;
    }
    /** Point-in-polygon test in local coordinates. */
    containsPoint(x, y) {
      const points = this.points;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const a = points[i];
        const b = points[j];
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
          inside = !inside;
        }
      }
      return inside;
    }
    getArea() {
      const points = this.points;
      let area = 0;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
      }
      return Math.abs(area / 2);
    }
    draw(ctx) {
      if (this.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i += 1) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      if (this.closed) ctx.closePath();
      if (this.color) {
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      if (this.strokeColor) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
      }
    }
  }

  /**
   * Text with wrapping, alignment, stroke, shadow and a typewriter helper.
   * `style.font` may be a raw CSS font string (v1.0 compatible) or use
   * fontSize/fontFamily/fontWeight.
   */
  class Text extends GameObject {
    constructor(scene, x, y, text, style) {
      super(scene, x, y, 0, 0);
      this.type = 'Text';
      this.text = text === undefined ? '' : String(text);
      const defaults = {
        font: null,
        fontFamily: 'sans-serif',
        fontSize: 20,
        fontStyle: 'normal',
        fontWeight: 'normal',
        color: '#ffffff',
        align: 'left',
        baseline: 'top',
        stroke: null,
        strokeThickness: 0,
        shadowColor: null,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        backgroundColor: null,
        padding: 0,
        lineSpacing: 4,
        wordWrapWidth: 0,
        fixedWidth: 0
      };
      this.style = Object.assign(defaults, style || {});
      this._lines = [this.text];
      this._dirty = true;
      this._typeTimer = null;
      this._fullText = this.text;
      this._measure();
    }

    _fontString() {
      if (this.style.font) return this.style.font;
      return (
        this.style.fontStyle +
        ' ' +
        this.style.fontWeight +
        ' ' +
        this.style.fontSize +
        'px ' +
        this.style.fontFamily
      );
    }
    _measure() {
      const game = this.game;
      if (!game || !game.ctx) {
        this.width = this.style.fixedWidth || 0;
        this.height = this.style.fontSize;
        return this;
      }
      const ctx = game.ctx;
      ctx.save();
      ctx.font = this._fontString();
      const padding = this.style.padding;
      const maxWidth =
        this.style.fixedWidth > 0 ? this.style.fixedWidth - padding * 2 : 0;
      const wrapWidth =
        maxWidth > 0 ? maxWidth : this.style.wordWrapWidth;
      const lines = [];
      this.text.split('\n').forEach((paragraph) => {
        if (!wrapWidth) {
          lines.push(paragraph);
          return;
        }
        const words = paragraph.split(' ');
        let line = '';
        words.forEach((word) => {
          const test = line ? line + ' ' + word : word;
          if (ctx.measureText(test).width > wrapWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        });
        lines.push(line);
      });
      this._lines = lines;
      let maxLineWidth = 0;
      lines.forEach((line) => {
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
      });
      const lineHeight = this.style.fontSize + this.style.lineSpacing;
      this.width = maxWidth > 0 ? maxWidth + padding * 2 : maxLineWidth + padding * 2;
      this.height = lines.length * lineHeight - this.style.lineSpacing + padding * 2;
      ctx.restore();
      this._dirty = false;
      return this;
    }
    measure() {
      return this._measure();
    }
    setText(value) {
      this.text = value === undefined ? '' : String(value);
      this._fullText = this.text;
      this._measure();
      return this;
    }
    setStyle(style) {
      this.style = Object.assign(this.style, style || {});
      this._measure();
      return this;
    }
    setColor(color) {
      this.style.color = color;
      return this;
    }
    setFontSize(size) {
      this.style.fontSize = size;
      this.style.font = null;
      this._measure();
      return this;
    }
    setWordWrapWidth(width) {
      this.style.wordWrapWidth = width;
      this._measure();
      return this;
    }
    /** Reveal the text letter by letter using the scene timer system. */
    typeText(text, charsPerSecond) {
      const full = text === undefined ? this.text : String(text);
      const cps = charsPerSecond || 30;
      if (this._typeTimer) {
        this._typeTimer.remove();
        this._typeTimer = null;
      }
      this._fullText = full;
      this.text = '';
      this._measure();
      let index = 0;
      const delay = 1000 / cps;
      if (!this.scene || !this.scene.time) {
        this.setText(full);
        return this;
      }
      this._typeTimer = this.scene.time.addEvent({
        delay,
        loop: true,
        callback: () => {
          index += 1;
          this.setText(full.slice(0, index));
          if (index >= full.length) {
            this._typeTimer.remove();
            this._typeTimer = null;
            this.events.emit('typecomplete', this);
          }
        }
      });
      return this;
    }
    draw(ctx) {
      if (this._dirty) this._measure();
      const s = this.style;
      ctx.font = this._fontString();
      ctx.textAlign = s.align;
      ctx.textBaseline = s.baseline;
      if (s.backgroundColor) {
        ctx.fillStyle = s.backgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);
      }
      if (s.shadowColor) {
        ctx.shadowColor = s.shadowColor;
        ctx.shadowBlur = s.shadowBlur;
        ctx.shadowOffsetX = s.shadowOffsetX;
        ctx.shadowOffsetY = s.shadowOffsetY;
      }
      const lineHeight = s.fontSize + s.lineSpacing;
      let tx = s.padding;
      if (s.align === 'center') tx = this.width / 2;
      else if (s.align === 'right') tx = this.width - s.padding;
      this._lines.forEach((line, index) => {
        const ty = s.padding + index * lineHeight;
        if (s.strokeThickness > 0 && s.stroke) {
          ctx.strokeStyle = s.stroke;
          ctx.lineWidth = s.strokeThickness;
          ctx.strokeText(line, tx, ty);
        }
        ctx.fillStyle = s.color;
        ctx.fillText(line, tx, ty);
      });
      if (s.shadowColor) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
    }
    destroy(fromScene) {
      if (this._typeTimer) this._typeTimer.remove();
      return super.destroy(fromScene);
    }
  }

  /** Repeating texture. Scroll `tilePositionX/Y` for parallax or conveyor belts. */
  class TileSprite extends GameObject {
    constructor(scene, x, y, width, height, texture, options) {
      super(scene, x, y, width, height);
      this.type = 'TileSprite';
      this.texture = texture;
      this.tilePositionX = 0;
      this.tilePositionY = 0;
      this.tileScaleX = 1;
      this.tileScaleY = 1;
      this.tintColor = (options && options.tint) || null;
      this._pattern = null;
      this._patternImage = null;
    }
    setTexture(texture) {
      this.texture = texture;
      this._pattern = null;
      return this;
    }
    setTilePosition(x, y) {
      this.tilePositionX = x;
      this.tilePositionY = y;
      return this;
    }
    draw(ctx) {
      const loader = this.scene ? this.scene.load : null;
      const image = loader ? loader.getImage(this.texture) : null;
      if (!image) {
        ctx.fillStyle = '#333344';
        ctx.fillRect(0, 0, this.width, this.height);
        return;
      }
      if (!this._pattern || this._patternImage !== image) {
        this._pattern = ctx.createPattern(image, 'repeat');
        this._patternImage = image;
      }
      if (!this._pattern) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.width, this.height);
      ctx.clip();
      const sw = image.width * this.tileScaleX;
      const sh = image.height * this.tileScaleY;
      if (ctx.setTransform && this._pattern.setTransform && typeof DOMMatrix !== 'undefined') {
        const matrix = new DOMMatrix();
        matrix.a = this.tileScaleX;
        matrix.d = this.tileScaleY;
        matrix.e = -this.tilePositionX;
        matrix.f = -this.tilePositionY;
        this._pattern.setTransform(matrix);
        ctx.fillStyle = this._pattern;
        ctx.fillRect(0, 0, this.width, this.height);
      } else {
        const offsetX = -(this.tilePositionX % (sw || 1));
        const offsetY = -(this.tilePositionY % (sh || 1));
        ctx.translate(offsetX, offsetY);
        ctx.fillStyle = this._pattern;
        ctx.fillRect(0, 0, this.width + sw, this.height + sh);
      }
      ctx.restore();
    }
  }

  /** A parent object whose children use coordinates relative to it. */
  class Container extends GameObject {
    constructor(scene, x, y) {
      super(scene, x, y, 0, 0);
      this.type = 'Container';
      this.children = [];
    }
    add(child) {
      if (!child || child === this) return this;
      if (child.parent) child.parent.remove(child);
      if (child.group) child.group.remove(child, false);
      if (child.scene && child.scene !== this.scene) child.scene.remove(child, false);
      if (child.scene && child.scene.children.indexOf(child) !== -1) {
        child.scene.remove(child, false);
      }
      child.parent = this;
      child.scene = this.scene;
      child.game = this.game;
      this.children.push(child);
      return this;
    }
    addMultiple(children) {
      (children || []).forEach((child) => this.add(child));
      return this;
    }
    remove(child, destroyChild) {
      const index = this.children.indexOf(child);
      if (index !== -1) this.children.splice(index, 1);
      if (child && child.parent === this) child.parent = null;
      if (destroyChild && child && !child.destroyed) child.destroy();
      return this;
    }
    removeAll(destroyChildren) {
      this.children.slice().forEach((child) => this.remove(child, destroyChildren));
      return this;
    }
    getChildren() {
      return this.children;
    }
    getFirst(aliveOnly) {
      return this.children.find((child) => !aliveOnly || (child.active && !child.destroyed)) || null;
    }
    getByName(name) {
      return this.children.find((child) => child.name === name) || null;
    }
    get length() {
      return this.children.length;
    }
    update(dt) {
      this.children.forEach((child) => {
        if (child.active && !child.destroyed && typeof child.update === 'function') {
          child.update(dt);
        }
      });
    }
    draw(ctx) {
      this.children
        .filter((child) => child.visible && !child.destroyed)
        .sort((a, b) => a.depth - b.depth)
        .forEach((child) => child.render(ctx));
    }
    destroy(fromScene) {
      this.removeAll(true);
      return super.destroy(fromScene);
    }
  }

  /**
   * A flat collection of objects drawn in world coordinates. Useful for
   * bullets, enemies and platforms; supports `runChildUpdate` and pooling.
   */
  class Group extends GameObject {
    constructor(scene, config) {
      super(scene, 0, 0, 0, 0);
      const opts = config || {};
      this.type = 'Group';
      this.children = [];
      this.classType = opts.classType || Sprite;
      this.runChildUpdate = opts.runChildUpdate !== false;
      this.maxSize = opts.maxSize === undefined ? -1 : opts.maxSize;
      this.defaults = opts.defaults || {};
      this.visible = true;
    }
    create(x, y, width, height, texture) {
      const C = this.classType;
      const child = new C(this.scene, x, y, width, height, texture);
      if (this.defaults && this.defaults.setup) this.defaults.setup(child);
      this.add(child);
      return child;
    }
    add(child) {
      if (!child) return this;
      if (this.maxSize > 0 && this.children.length >= this.maxSize) return this;
      if (child.group && child.group !== this) child.group.remove(child, false);
      if (child.parent) child.parent.remove(child, false);
      if (child.scene && child.scene.children.indexOf(child) !== -1) {
        child.scene.children.splice(child.scene.children.indexOf(child), 1);
      }
      child.group = this;
      child.scene = this.scene;
      child.game = this.game;
      this.children.push(child);
      return this;
    }
    addMultiple(children) {
      (children || []).forEach((child) => this.add(child));
      return this;
    }
    remove(child, destroyChild) {
      const index = this.children.indexOf(child);
      if (index !== -1) this.children.splice(index, 1);
      if (child && child.group === this) child.group = null;
      if (destroyChild && child && !child.destroyed) child.destroy();
      return this;
    }
    clear(destroyChildren) {
      this.children.slice().forEach((child) => this.remove(child, destroyChildren));
      return this;
    }
    getChildren() {
      return this.children;
    }
    getFirst(aliveOnly) {
      return this.children.find((child) => !aliveOnly || (child.active && !child.destroyed)) || null;
    }
    getByName(name) {
      return this.children.find((child) => child.name === name) || null;
    }
    /** Nearest child to a point, by center distance. */
    getClosest(x, y, aliveOnly) {
      let best = null;
      let bestDistance = Infinity;
      this.children.forEach((child) => {
        if (aliveOnly && (!child.active || child.destroyed)) return;
        const distance = MathUtils.distanceSq(
          x,
          y,
          child.x + child.displayWidth / 2,
          child.y + child.displayHeight / 2
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          best = child;
        }
      });
      return best;
    }
    getLast(aliveOnly) {
      for (let i = this.children.length - 1; i >= 0; i -= 1) {
        const child = this.children[i];
        if (!aliveOnly || (child.active && !child.destroyed)) return child;
      }
      return null;
    }
    getRandom(aliveOnly) {
      const pool = aliveOnly
        ? this.children.filter((child) => child.active && !child.destroyed)
        : this.children;
      return pool.length ? MathUtils.pick(pool) : null;
    }
    countActive(value) {
      const active = value === undefined ? true : !!value;
      return this.children.filter((child) => child.active === active && !child.destroyed).length;
    }
    contains(child) {
      return this.children.indexOf(child) !== -1;
    }
    forEach(callback) {
      this.children.forEach(callback);
      return this;
    }
    filter(callback) {
      return this.children.filter(callback);
    }
    find(callback) {
      return this.children.find(callback) || null;
    }
    get length() {
      return this.children.length;
    }
    update(dt) {
      if (!this.runChildUpdate) return;
      this.children.forEach((child) => {
        if (child.active && !child.destroyed && typeof child.update === 'function') {
          child.update(dt);
        }
      });
    }
    draw(ctx) {
      this.children
        .filter((child) => child.visible && !child.destroyed)
        .sort((a, b) => a.depth - b.depth)
        .forEach((child) => child.render(ctx));
    }
    destroy(fromScene) {
      this.clear(true);
      return super.destroy(fromScene);
    }
  }

  /**
   * Clickable UI button. Options: color, hoverColor, pressColor, textColor,
   * radius, fontSize, onClick, onDown, onUp, disabled.
   */
  class Button extends GameObject {
    constructor(scene, x, y, width, height, label, options) {
      super(scene, x, y, width, height);
      const opts = options || {};
      this.type = 'Button';
      this.label = label || '';
      this.color = opts.color || '#45475a';
      this.hoverColor = opts.hoverColor || '#585b70';
      this.pressColor = opts.pressColor || '#313244';
      this.textColor = opts.textColor || '#cdd6f4';
      this.disabledColor = opts.disabledColor || '#2a2a3a';
      this.radius = opts.radius || 6;
      this.fontSize = opts.fontSize || 18;
      this.enabled = opts.disabled ? false : true;
      this.hovered = false;
      this.pressed = false;
      this.onClick = opts.onClick || null;
      this.onDown = opts.onDown || null;
      this.onUp = opts.onUp || null;
      this.events = new EventEmitter();
    }
    setText(label) {
      this.label = label;
      return this;
    }
    setEnabled(value) {
      this.enabled = value === undefined ? true : !!value;
      if (!this.enabled) {
        this.hovered = false;
        this.pressed = false;
      }
      return this;
    }
    _containsPointer(pointer) {
      const px = this.isScreenSpace() ? pointer.x : pointer.worldX;
      const py = this.isScreenSpace() ? pointer.y : pointer.worldY;
      return (
        px >= this.x &&
        px <= this.x + this.displayWidth &&
        py >= this.y &&
        py <= this.y + this.displayHeight
      );
    }
    update(dt) {
      if (!this.scene) return;
      const input = this.scene.input;
      const pointer = input.pointer;
      const inside = this.enabled && this._containsPointer(pointer);
      this.hovered = inside;
      if (inside && pointer.justDown) {
        this.pressed = true;
        if (this.onDown) this.onDown(this);
        this.events.emit('down', this);
      }
      if (this.pressed && !pointer.isDown) {
        this.pressed = false;
        const stillInside = this._containsPointer(pointer);
        if (stillInside && this.enabled) {
          if (this.onClick) this.onClick(this);
          if (this.onUp) this.onUp(this);
          this.events.emit('click', this);
          if (this.scene) this.scene.events.emit('button-click', this);
        }
      }
    }
    draw(ctx) {
      let color = this.color;
      if (!this.enabled) color = this.disabledColor;
      else if (this.pressed) color = this.pressColor;
      else if (this.hovered) color = this.hoverColor;
      ctx.fillStyle = color;
      roundRectPath(ctx, 0, 0, this.width, this.height, this.radius);
      ctx.fill();
      ctx.fillStyle = this.enabled ? this.textColor : '#6c7086';
      ctx.font = 'bold ' + this.fontSize + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.width / 2, this.height / 2 + 1);
    }
  }

  /**
   * On-screen virtual joystick. `x, y` is the center of the base.
   * Read `joystick.value` ({x, y} normalized) and `joystick.angle`.
   */
  class Joystick extends GameObject {
    constructor(scene, x, y, options) {
      const opts = options || {};
      const radius = opts.radius || 60;
      super(scene, x - radius, y - radius, radius * 2, radius * 2);
      this.type = 'Joystick';
      this.radius = radius;
      this.knobRadius = opts.knobRadius || radius * 0.42;
      this.baseColor = opts.baseColor || 'rgba(205,214,244,0.18)';
      this.knobColor = opts.knobColor || 'rgba(137,180,250,0.85)';
      this.value = new Vec2(0, 0);
      this.angle = 0;
      this.magnitude = 0;
      this.activeTouch = false;
      this._pointerId = null;
      this.onChange = opts.onChange || null;
    }
    get centerX() {
      return this.x + this.radius;
    }
    get centerY() {
      return this.y + this.radius;
    }
    update(dt) {
      if (!this.scene) return;
      const pointer = this.scene.input.pointer;
      const px = this.isScreenSpace() ? pointer.x : pointer.worldX;
      const py = this.isScreenSpace() ? pointer.y : pointer.worldY;
      const dx = px - this.centerX;
      const dy = py - this.centerY;
      const distance = Math.hypot(dx, dy);
      if (pointer.justDown && distance <= this.radius * 1.25) {
        this.activeTouch = true;
      }
      if (!pointer.isDown) this.activeTouch = false;
      if (this.activeTouch) {
        const max = this.radius;
        const clamped = Math.min(distance, max);
        const nx = distance > 0 ? dx / distance : 0;
        const ny = distance > 0 ? dy / distance : 0;
        this.value.set((nx * clamped) / max, (ny * clamped) / max);
        this.magnitude = clamped / max;
        this.angle = Math.atan2(dy, dx);
      } else {
        this.value.set(0, 0);
        this.magnitude = 0;
      }
      if (this.onChange) this.onChange(this.value, this);
    }
    draw(ctx) {
      const cx = this.radius;
      const cy = this.radius;
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.baseColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(205,214,244,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const kx = cx + this.value.x * this.radius;
      const ky = cy + this.value.y * this.radius;
      ctx.beginPath();
      ctx.arc(kx, ky, this.knobRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.knobColor;
      ctx.fill();
    }
  }

  /**
   * Draggable value slider. Options: min, max, value, step, vertical, height,
   * trackColor, fillColor, knobColor, knobRadius, disabled, onChange.
   */
  class Slider extends GameObject {
    constructor(scene, x, y, width, options) {
      const opts = options || {};
      const height = opts.height || 20;
      super(scene, x, y, width, height);
      this.type = 'Slider';
      this.min = opts.min === undefined ? 0 : opts.min;
      this.max = opts.max === undefined ? 1 : opts.max;
      this.step = opts.step || 0;
      this.vertical = !!opts.vertical;
      this.value = MathUtils.clamp(opts.value === undefined ? this.min : opts.value, this.min, this.max);
      this.trackColor = opts.trackColor || 'rgba(255,255,255,0.14)';
      this.fillColor = opts.fillColor || '#89b4fa';
      this.knobColor = opts.knobColor || '#cdd6f4';
      this.knobRadius = opts.knobRadius || height * 0.6;
      this.disabled = !!opts.disabled;
      this.dragging = false;
      this.onChange = opts.onChange || null;
    }
    get ratio() {
      return this.max === this.min ? 0 : (this.value - this.min) / (this.max - this.min);
    }
    getValue() {
      return this.value;
    }
    setValue(value, silent) {
      let next = MathUtils.clamp(value, this.min, this.max);
      if (this.step > 0) next = Math.round((next - this.min) / this.step) * this.step + this.min;
      next = MathUtils.clamp(next, this.min, this.max);
      const changed = next !== this.value;
      this.value = next;
      if (changed && !silent && this.onChange) this.onChange(next, this);
      return this;
    }
    setRange(min, max) {
      this.min = min;
      this.max = max;
      this.setValue(this.value, true);
      return this;
    }
    setEnabled(value) {
      this.disabled = !(value === undefined ? true : !!value);
      if (this.disabled) this.dragging = false;
      return this;
    }
    _pointerPoint(pointer) {
      const screen = this.isScreenSpace();
      return screen
        ? { x: pointer.x, y: pointer.y }
        : { x: pointer.worldX, y: pointer.worldY };
    }
    _contains(point) {
      const pad = this.knobRadius;
      return (
        point.x >= this.x - (this.vertical ? pad : 0) &&
        point.x <= this.x + this.width + (this.vertical ? pad : 0) &&
        point.y >= this.y - (this.vertical ? 0 : pad) &&
        point.y <= this.y + this.height + (this.vertical ? 0 : pad)
      );
    }
    update(dt) {
      if (!this.scene || this.disabled) return;
      const pointer = this.scene.input.pointer;
      const point = this._pointerPoint(pointer);
      if (pointer.justDown && this._contains(point)) this.dragging = true;
      if (!pointer.isDown) this.dragging = false;
      if (!this.dragging) return;
      const ratio = this.vertical
        ? 1 - MathUtils.clamp01((point.y - this.y) / Math.max(1, this.height))
        : MathUtils.clamp01((point.x - this.x) / Math.max(1, this.width));
      this.setValue(this.min + ratio * (this.max - this.min));
    }
    draw(ctx) {
      const ratio = MathUtils.clamp01(this.ratio);
      const thickness = 6;
      const mid = this.height / 2;
      if (this.vertical) {
        const h = this.height;
        const x = this.width / 2 - thickness / 2;
        ctx.fillStyle = this.trackColor;
        roundRectPath(ctx, x, 0, thickness, h, thickness / 2);
        ctx.fill();
        ctx.fillStyle = this.disabled ? '#45475a' : this.fillColor;
        roundRectPath(ctx, x, h - h * ratio, thickness, Math.max(0, h * ratio), thickness / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.width / 2, h - h * ratio, this.knobRadius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = this.disabled ? '#6c7086' : this.knobColor;
        ctx.fill();
        return;
      }
      ctx.fillStyle = this.trackColor;
      roundRectPath(ctx, 0, mid - thickness / 2, this.width, thickness, thickness / 2);
      ctx.fill();
      ctx.fillStyle = this.disabled ? '#45475a' : this.fillColor;
      roundRectPath(ctx, 0, mid - thickness / 2, Math.max(0, this.width * ratio), thickness, thickness / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.width * ratio, mid, this.knobRadius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = this.disabled ? '#6c7086' : this.knobColor;
      ctx.fill();
    }
  }

  /** Read-only 0..1 bar. Options: value, trackColor, fillColor, radius. */
  class ProgressBar extends GameObject {
    constructor(scene, x, y, width, height, options) {
      const opts = options || {};
      super(scene, x, y, width, height === undefined ? 12 : height);
      this.type = 'ProgressBar';
      this.value = MathUtils.clamp01(opts.value === undefined ? 0 : opts.value);
      this.trackColor = opts.trackColor || 'rgba(255,255,255,0.12)';
      this.fillColor = opts.fillColor || '#a6e3a1';
      this.radius = opts.radius === undefined ? this.height / 2 : opts.radius;
    }
    setValue(value) {
      this.value = MathUtils.clamp01(value);
      return this;
    }
    setProgress(value) {
      return this.setValue(value);
    }
    getValue() {
      return this.value;
    }
    setColors(fill, track) {
      if (fill) this.fillColor = fill;
      if (track) this.trackColor = track;
      return this;
    }
    draw(ctx) {
      ctx.fillStyle = this.trackColor;
      roundRectPath(ctx, 0, 0, this.width, this.height, this.radius);
      ctx.fill();
      if (this.value <= 0) return;
      ctx.fillStyle = this.fillColor;
      roundRectPath(ctx, 0, 0, Math.max(1, this.width * this.value), this.height, this.radius);
      ctx.fill();
    }
  }

  /** On/off switch. Options: width, height, value, onColor, offColor, disabled, onChange. */
  class Toggle extends GameObject {
    constructor(scene, x, y, options) {
      const opts = options || {};
      super(scene, x, y, opts.width || 54, opts.height || 28);
      this.type = 'Toggle';
      this.value = !!opts.value;
      this.disabled = !!opts.disabled;
      this.onColor = opts.onColor || '#a6e3a1';
      this.offColor = opts.offColor || 'rgba(255,255,255,0.16)';
      this.knobColor = opts.knobColor || '#ffffff';
      this.onChange = opts.onChange || null;
      this._knob = this.value ? 1 : 0;
    }
    setValue(value, silent) {
      const next = !!value;
      const changed = next !== this.value;
      this.value = next;
      if (changed && !silent && this.onChange) this.onChange(next, this);
      return this;
    }
    getValue() {
      return this.value;
    }
    toggle() {
      return this.setValue(!this.value);
    }
    setEnabled(value) {
      this.disabled = !(value === undefined ? true : !!value);
      return this;
    }
    _contains(pointer) {
      const screen = this.isScreenSpace();
      const px = screen ? pointer.x : pointer.worldX;
      const py = screen ? pointer.y : pointer.worldY;
      return (
        px >= this.x &&
        px <= this.x + this.displayWidth &&
        py >= this.y &&
        py <= this.y + this.displayHeight
      );
    }
    update(dt) {
      if (this.scene && !this.disabled) {
        const pointer = this.scene.input.pointer;
        if (pointer.justDown && this._contains(pointer)) this.toggle();
      }
      const target = this.value ? 1 : 0;
      this._knob += (target - this._knob) * Math.min(1, (dt || 0) * 12);
      if (Math.abs(target - this._knob) < 0.01) this._knob = target;
    }
    draw(ctx) {
      const h = this.height;
      const w = this.width;
      roundRectPath(ctx, 0, 0, w, h, Math.min(h, w) / 2);
      ctx.fillStyle = this.disabled ? '#45475a' : this.value ? this.onColor : this.offColor;
      ctx.fill();
      const knobRadius = Math.max(2, h / 2 - 4);
      const inset = knobRadius + 4;
      const cx = inset + (w - inset * 2) * MathUtils.clamp01(this._knob);
      ctx.beginPath();
      ctx.arc(cx, h / 2, knobRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.disabled ? '#6c7086' : this.knobColor;
      ctx.fill();
    }
  }
