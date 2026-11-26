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
      this._anim = null;
    }

    setTexture(texture, frame) {
      this.texture = texture;
      this.frame = frame === undefined ? null : frame;
      return this;
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
      let next = anim.current + anim.direction;
      const last = anim.frames.length - 1;
      if (next > last || next < 0) {
        if (anim.yoyo) {
          anim.direction *= -1;
          next = anim.current + anim.direction;
        } else if (anim.repeat === -1 || anim.repeatCount < anim.repeat) {
          if (anim.repeat !== -1) anim.repeatCount += 1;
          next = 0;
        } else {
          anim.playing = false;
          this.frame = anim.frames[anim.current];
          if (anim.onComplete) anim.onComplete(this, anim);
          this.events.emit('animationcomplete', anim.key, this);
          return;
        }
      }
      anim.current = MathUtils.clamp(next, 0, last);
      this.frame = anim.frames[anim.current];
      if (anim.onFrame) anim.onFrame(this, this.frame, anim.current);
      this.events.emit('animationframe', this.frame, anim.current);
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
      if (frameData && frameData.image) {
        const sx = frameData.x;
        const sy = frameData.y;
        const sw = frameData.width;
        const sh = frameData.height;
        ctx.save();
        ctx.translate(this.flipX ? this.width : 0, this.flipY ? this.height : 0);
        ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        ctx.drawImage(frameData.image, sx, sy, sw, sh, 0, 0, this.width, this.height);
        ctx.restore();
        return;
      }
      const image = loader ? loader.getImage(this.texture) : null;
      if (image) {
        ctx.save();
        ctx.translate(this.flipX ? this.width : 0, this.flipY ? this.height : 0);
        ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        ctx.drawImage(image, 0, 0, this.width, this.height);
        ctx.restore();
        return;
      }
      ctx.fillStyle = this.texture || '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    destroy(fromScene) {
      if (this._anim) this._anim.playing = false;
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
        ctx.translate(-(this.tilePositionX % (sw || 1)), -(this.tilePositionY % (sh || 1)));
        ctx.fillStyle = this._pattern;
        ctx.fillRect(
          -(this.tilePositionX % (sw || 1)),
          -(this.tilePositionY % (sh || 1)),
          this.width + sw,
          this.height + sh
        );
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
