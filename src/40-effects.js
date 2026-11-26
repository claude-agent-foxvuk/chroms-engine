  const TWEEN_RESERVED = [
    'targets',
    'target',
    'duration',
    'delay',
    'ease',
    'easing',
    'yoyo',
    'repeat',
    'repeatDelay',
    'hold',
    'onStart',
    'onUpdate',
    'onComplete',
    'onYoyo',
    'onRepeat',
    'paused',
    'from',
    'name',
    'persist'
  ];

  /**
   * A property tween. Durations and delays are in milliseconds.
   * Properties may be plain values or `{ from, to }` pairs, and support
   * dotted paths like `'body.velocity.x'`.
   */
  class Tween {
    constructor(manager, config) {
      const cfg = config || {};
      this.manager = manager;
      this.config = cfg;
      this.id = uid('tween');
      this.name = cfg.name || '';
      this.targets = cfg.targets
        ? Array.isArray(cfg.targets)
          ? cfg.targets
          : [cfg.targets]
        : cfg.target
        ? [cfg.target]
        : [];
      this.duration = Math.max(0, cfg.duration === undefined ? 1000 : cfg.duration);
      this.delay = Math.max(0, cfg.delay || 0);
      this.ease = resolveEase(cfg.ease || cfg.easing);
      this.yoyo = !!cfg.yoyo;
      this.repeat = cfg.repeat === undefined ? 0 : cfg.repeat;
      this.repeatDelay = cfg.repeatDelay || 0;
      this.hold = cfg.hold || 0;
      this.persist = !!cfg.persist;
      this.onStart = cfg.onStart || null;
      this.onUpdate = cfg.onUpdate || null;
      this.onComplete = cfg.onComplete || null;
      this.onYoyo = cfg.onYoyo || null;
      this.onRepeat = cfg.onRepeat || null;
      this.elapsed = 0;
      this.delayElapsed = 0;
      this.holdElapsed = 0;
      this.repeatCount = 0;
      this.direction = 1;
      this.state = 'pending';
      this.paused = !!cfg.paused;
      this.timeScale = 1;
      this.properties = {};

      const from = cfg.from || {};
      Object.keys(cfg).forEach((key) => {
        if (TWEEN_RESERVED.indexOf(key) !== -1) return;
        const value = cfg[key];
        let start;
        let end;
        if (isObject(value) && ('to' in value || 'from' in value)) {
          end = value.to;
          start = 'from' in value ? value.from : this._read(this.targets[0], key);
        } else {
          end = value;
          start = key in from ? from[key] : this._read(this.targets[0], key);
        }
        if (start === undefined || end === undefined) return;
        this.properties[key] = { start, end };
      });
    }

    _read(target, path) {
      if (!target) return undefined;
      const parts = String(path).split('.');
      let value = target;
      for (let i = 0; i < parts.length; i += 1) {
        if (value === null || value === undefined) return undefined;
        value = value[parts[i]];
      }
      return typeof value === 'function' ? undefined : value;
    }
    _write(target, path, value) {
      const parts = String(path).split('.');
      let object = target;
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (object[parts[i]] === null || object[parts[i]] === undefined) return;
        object = object[parts[i]];
      }
      object[parts[parts.length - 1]] = value;
    }

    /** Manually set the progress 0..1 (also used by yoyo/repeat). */
    _apply(progress) {
      const eased = this.ease(MathUtils.clamp01(progress));
      this.targets.forEach((target) => {
        if (!target) return;
        Object.keys(this.properties).forEach((key) => {
          const prop = this.properties[key];
          const value = MathUtils.lerp(prop.start, prop.end, eased);
          if (typeof prop.start === 'number' && typeof prop.end === 'number') {
            this._write(target, key, value);
          } else if (typeof prop.start === 'string' && typeof prop.end === 'string') {
            if (isColorString(prop.start) && isColorString(prop.end)) {
              this._write(target, key, colorToCss(lerpColor(prop.start, prop.end, eased)));
            } else {
              this._write(target, key, eased < 0.5 ? prop.start : prop.end);
            }
          }
        });
      });
      if (this.onUpdate) this.onUpdate(this, eased);
    }

    update(deltaMs) {
      if (this.state === 'complete' || this.paused) return;
      const dt = deltaMs * this.timeScale;
      if (this.state === 'pending') {
        this.delayElapsed += dt;
        if (this.delayElapsed < this.delay) return;
        const carry = this.delayElapsed - this.delay;
        this.delayElapsed = this.delay;
        this.state = 'running';
        if (this.onStart) this.onStart(this);
        this._apply(0);
        if (carry === 0) return;
        this._advance(carry);
        return;
      }
      this._advance(dt);
    }

    _advance(dt) {
      if (this.holdElapsed > 0) {
        this.holdElapsed -= dt;
        if (this.holdElapsed > 0) return;
        dt = -this.holdElapsed;
        this.holdElapsed = 0;
      }
      this.elapsed += dt;
      const progress = this.duration === 0 ? 1 : this.elapsed / this.duration;
      if (progress >= 1) {
        this._apply(1);
        if (this.yoyo && this.direction === 1) {
          this.direction = -1;
          this.elapsed = 0;
          if (this.onYoyo) this.onYoyo(this);
          if (this.hold > 0) this.holdElapsed = this.hold;
          return;
        }
        if (this.repeat === -1 || this.repeatCount < this.repeat) {
          if (this.repeat !== -1) this.repeatCount += 1;
          this.direction = 1;
          this.elapsed = 0;
          if (this.onRepeat) this.onRepeat(this, this.repeatCount);
          const pause = Math.max(this.hold, this.repeatDelay);
          if (pause > 0) this.holdElapsed = pause;
          return;
        }
        this.state = 'complete';
        if (this.onComplete) this.onComplete(this);
        this.manager._remove(this);
        return;
      }
      const value = this.direction === 1 ? progress : 1 - progress;
      this._apply(value);
    }

    setTimeScale(value) {
      this.timeScale = value;
      return this;
    }
    getProgress() {
      return this.duration === 0
        ? 1
        : MathUtils.clamp01(this.elapsed / this.duration) * (this.direction === 1 ? 1 : -1);
    }
    isPlaying() {
      return this.state === 'pending' || this.state === 'running';
    }
    pause() {
      this.paused = true;
      return this;
    }
    resume() {
      this.paused = false;
      return this;
    }
    stop() {
      this.state = 'complete';
      this.manager._remove(this);
      return this;
    }
    restart() {
      this.state = 'pending';
      this.elapsed = 0;
      this.delayElapsed = 0;
      this.holdElapsed = 0;
      this.repeatCount = 0;
      this.direction = 1;
      this.paused = false;
      this.manager._add(this);
      return this;
    }
    complete() {
      this._apply(1);
      this.elapsed = this.duration;
      this.state = 'complete';
      if (this.onComplete) this.onComplete(this);
      this.manager._remove(this);
      return this;
    }
  }

  /** Owns all tweens for a game. Also available as `scene.tweens`. */
  class TweenManager {
    constructor(game) {
      this.game = game;
      this.tweens = [];
      this.timeScale = 1;
      this.paused = false;
      this.events = new EventEmitter();
    }

    add(config) {
      const tween = new Tween(this, config);
      this._add(tween);
      return tween;
    }
    _add(tween) {
      if (this.tweens.indexOf(tween) === -1) this.tweens.push(tween);
      return tween;
    }
    _remove(tween) {
      const index = this.tweens.indexOf(tween);
      if (index !== -1) this.tweens.splice(index, 1);
      this.events.emit('complete', tween);
    }
    remove(tween) {
      return tween ? tween.stop() : this;
    }
    killTweensOf(target) {
      this.tweens
        .filter((tween) => tween.targets.indexOf(target) !== -1)
        .forEach((tween) => tween.stop());
      return this;
    }
    pauseAll() {
      this.paused = true;
      return this;
    }
    resumeAll() {
      this.paused = false;
      return this;
    }
    removeAll() {
      this.tweens.slice().forEach((tween) => tween.stop());
      return this;
    }
    /** Tween a single number; useful for score counters and custom values. */
    addCounter(config) {
      const cfg = config || {};
      const holder = { value: cfg.from === undefined ? 0 : cfg.from };
      const tween = this.add({
        targets: holder,
        value: cfg.to === undefined ? 1 : cfg.to,
        duration: cfg.duration,
        delay: cfg.delay,
        ease: cfg.ease,
        repeat: cfg.repeat,
        yoyo: cfg.yoyo,
        hold: cfg.hold,
        onUpdate: () => {
          if (cfg.onUpdate) cfg.onUpdate(holder.value, tween);
        },
        onComplete: () => {
          if (cfg.onComplete) cfg.onComplete(holder.value, tween);
        }
      });
      tween.getValue = () => holder.value;
      return tween;
    }
    /** Run tween configs one after another. */
    chain(configs) {
      const list = (configs || []).slice();
      const group = { tweens: [], isPlaying: () => group.tweens.some((t) => t.isPlaying()), stop() {} };
      const run = (index) => {
        if (index >= list.length) return;
        const config = Object.assign({}, list[index]);
        const previousComplete = config.onComplete;
        config.onComplete = (...args) => {
          if (previousComplete) previousComplete(...args);
          run(index + 1);
        };
        const tween = this.add(config);
        group.tweens.push(tween);
      };
      run(0);
      group.stop = () => group.tweens.forEach((tween) => tween.stop());
      return group;
    }

    update(delta) {
      if (this.paused) return;
      const ms = delta * 1000 * this.timeScale;
      this.tweens.slice().forEach((tween) => {
        const alive = tween.targets.length === 0 || tween.targets.some((target) => {
          if (!target) return false;
          if (target.destroyed) return false;
          if (target.active === false) return false;
          return true;
        });
        if (!alive && !tween.persist) {
          tween.state = 'complete';
          this._remove(tween);
          return;
        }
        tween.update(ms);
      });
    }
  }

  /** A single timer handle returned by `TimerManager`. */
  class Timer {
    constructor(manager, config) {
      const cfg = config || {};
      this.manager = manager;
      this.id = uid('timer');
      this.delay = Math.max(0, cfg.delay || 0);
      this.callback = cfg.callback || null;
      this.args = cfg.args || [];
      this.loop = !!cfg.loop;
      this.repeat = cfg.repeat === undefined ? -1 : cfg.repeat;
      this.repeatCount = 0;
      this.elapsed = 0;
      this.paused = false;
      this.removed = false;
      this.startAt = cfg.startAt || 0;
      this.elapsed = this.startAt;
      this.name = cfg.name || '';
      this.events = new EventEmitter();
    }
    remove() {
      this.removed = true;
      this.manager._remove(this);
      return this;
    }
    pause() {
      this.paused = true;
      return this;
    }
    resume() {
      this.paused = false;
      return this;
    }
    reset(delay) {
      if (delay !== undefined) this.delay = delay;
      this.elapsed = 0;
      this.repeatCount = 0;
      this.removed = false;
      this.paused = false;
      this.manager._add(this);
      return this;
    }
    getProgress() {
      return this.delay === 0 ? 1 : MathUtils.clamp01(this.elapsed / this.delay);
    }
    getRemaining() {
      return Math.max(0, this.delay - this.elapsed);
    }
    isRunning() {
      return !this.removed && !this.paused;
    }
  }

  /** Delay and loop scheduling for a game. Also exposed as `scene.time`. */
  class TimerManager {
    constructor(game) {
      this.game = game;
      this.timers = [];
      this.timeScale = 1;
      this.paused = false;
      this.events = new EventEmitter();
    }
    addEvent(config) {
      const timer = new Timer(this, config);
      this._add(timer);
      return timer;
    }
    delayedCall(delay, callback, args) {
      return this.addEvent({ delay, callback, args: args || [], loop: false });
    }
    loop(delay, callback, args) {
      return this.addEvent({ delay, callback, args: args || [], loop: true });
    }
    _add(timer) {
      if (this.timers.indexOf(timer) === -1) this.timers.push(timer);
      return timer;
    }
    _remove(timer) {
      const index = this.timers.indexOf(timer);
      if (index !== -1) this.timers.splice(index, 1);
    }
    remove(timer) {
      if (timer) timer.remove();
      return this;
    }
    clear() {
      this.timers.slice().forEach((timer) => {
        timer.removed = true;
      });
      this.timers = [];
      return this;
    }
    removeAll() {
      return this.clear();
    }
    pauseAll() {
      this.paused = true;
      return this;
    }
    resumeAll() {
      this.paused = false;
      return this;
    }
    /** Remove timers by name. */
    removeByName(name) {
      this.timers.filter((timer) => timer.name === name).forEach((timer) => timer.remove());
      return this;
    }
    update(delta) {
      if (this.paused) return;
      const ms = delta * 1000 * this.timeScale;
      this.timers.slice().forEach((timer) => {
        if (timer.paused || timer.removed) return;
        timer.elapsed += ms;
        if (timer.elapsed < timer.delay) return;
        const overshoot = timer.elapsed - timer.delay;
        if (timer.callback) timer.callback.apply(null, timer.args);
        timer.events.emit('complete', timer);
        if (timer.loop && (timer.repeat === -1 || timer.repeatCount < timer.repeat)) {
          timer.repeatCount += 1;
          timer.elapsed = overshoot;
          if (timer.delay === 0) timer.elapsed = 0;
        } else {
          timer.removed = true;
          this._remove(timer);
        }
      });
    }
  }

  /** Stores named animations; created on `game.anims` and `scene.anims`. */
  class AnimationManager {
    constructor(game) {
      this.game = game;
      this.anims = {};
      this.sprites = [];
      this.events = new EventEmitter();
    }
    /**
     * `frames` may be an array of frame names/indices, or use
     * `{ spritesheet: 'hero', start: 0, end: 3 }`.
     */
    create(config) {
      const cfg = config || {};
      if (!cfg.key) throw new Error('[Chroms] Animation key is required');
      let frames = cfg.frames;
      if (!frames && cfg.spritesheet) {
        frames = [];
        const start = cfg.start || 0;
        const end = cfg.end === undefined ? start : cfg.end;
        for (let i = start; i <= end; i += 1) frames.push(i);
      }
      frames = frames || [0];
      const animation = {
        key: cfg.key,
        frames: frames.slice(),
        frameRate: cfg.frameRate || 10,
        repeat: cfg.repeat === undefined ? 0 : cfg.repeat,
        yoyo: !!cfg.yoyo,
        spritesheet: cfg.spritesheet || null,
        onComplete: cfg.onComplete || null,
        onFrame: cfg.onFrame || null
      };
      this.anims[cfg.key] = animation;
      this.events.emit('create', animation);
      return animation;
    }
    exists(key) {
      return !!this.anims[key];
    }
    get(key) {
      return this.anims[key] || null;
    }
    getAll() {
      return Object.keys(this.anims).map((key) => this.anims[key]);
    }
    remove(key) {
      delete this.anims[key];
      return this;
    }
    play(sprite, key, options) {
      const def = this.anims[key];
      if (!def || !sprite) return null;
      const opts = options || {};
      if (opts.ignoreIfPlaying && sprite._anim && sprite._anim.key === key && sprite._anim.playing) {
        return sprite._anim;
      }
      if (def.spritesheet) sprite.texture = def.spritesheet;
      const anim = {
        key,
        frames: def.frames,
        frameRate: def.frameRate,
        repeat: def.repeat,
        yoyo: def.yoyo,
        current: 0,
        direction: 1,
        time: 0,
        repeatCount: 0,
        playing: true,
        paused: false,
        onComplete: def.onComplete,
        onFrame: def.onFrame
      };
      sprite._anim = anim;
      if (this.sprites.indexOf(sprite) === -1) this.sprites.push(sprite);
      sprite.frame = def.frames[0];
      sprite.events.emit('animationstart', key, sprite);
      this.events.emit('start', key, sprite);
      return anim;
    }
    stop(sprite) {
      if (sprite && sprite._anim) {
        sprite._anim.playing = false;
        this.events.emit('stop', sprite._anim.key, sprite);
      }
      return this;
    }
    _liveSprites() {
      this.sprites = this.sprites.filter((sprite) => sprite && !sprite.destroyed);
      return this.sprites;
    }
    /** Drop a sprite from the registry; called when it is destroyed. */
    forget(sprite) {
      const index = this.sprites.indexOf(sprite);
      if (index !== -1) this.sprites.splice(index, 1);
      return this;
    }
    pauseAll() {
      this._liveSprites().forEach((sprite) => sprite.pause());
      this.events.emit('pause-all');
      return this;
    }
    resumeAll() {
      this._liveSprites().forEach((sprite) => sprite.resume());
      this.events.emit('resume-all');
      return this;
    }
    stopAll() {
      this._liveSprites().forEach((sprite) => sprite.stop());
      this.events.emit('stop-all');
      return this;
    }
  }

  /** True for '#rgb', '#rrggbb', '#rrggbbaa', 'rgb(...)' and 'rgba(...)'. */
  function isColorString(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text) || /^rgba?\(/i.test(text);
  }

  function parseColor(value) {
    if (typeof value !== 'string') return { r: 255, g: 255, b: 255, a: 1 };
    let hex = value.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      };
    }
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(',').map((part) => parseFloat(part));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  function colorToCss(color) {
    return (
      'rgba(' +
      Math.round(color.r) +
      ',' +
      Math.round(color.g) +
      ',' +
      Math.round(color.b) +
      ',' +
      MathUtils.clamp01(color.a).toFixed(3) +
      ')'
    );
  }
  function lerpColor(from, to, t) {
    const a = typeof from === 'string' ? parseColor(from) : from;
    const b = typeof to === 'string' ? parseColor(to) : to;
    return {
      r: MathUtils.lerp(a.r, b.r, t),
      g: MathUtils.lerp(a.g, b.g, t),
      b: MathUtils.lerp(a.b, b.b, t),
      a: MathUtils.lerp(a.a, b.a, t)
    };
  }
  function sampleColors(colors, t) {
    if (!colors || colors.length === 0) return null;
    if (colors.length === 1) return parseColor(colors[0]);
    const scaled = MathUtils.clamp01(t) * (colors.length - 1);
    const index = Math.floor(scaled);
    const frac = scaled - index;
    if (index >= colors.length - 1) return parseColor(colors[colors.length - 1]);
    return lerpColor(colors[index], colors[index + 1], frac);
  }

  /**
   * Particle emitter. Config highlights:
   * speed, angle (degrees), lifespan, quantity, frequency (ms), max,
   * gravityX/Y, color, colors, alpha {start,end}, scale {start,end},
   * size, shape, texture, blendMode, emitting, emitZone, follow.
   */
  class ParticleEmitter extends GameObject {
    constructor(scene, x, y, config) {
      super(scene, x, y, 0, 0);
      const cfg = config || {};
      this.type = 'ParticleEmitter';
      this.config = {
        speed: cfg.speed === undefined ? { min: 40, max: 120 } : cfg.speed,
        angle: cfg.angle === undefined ? { min: 0, max: 360 } : cfg.angle,
        lifespan: cfg.lifespan === undefined ? { min: 600, max: 1200 } : cfg.lifespan,
        quantity: cfg.quantity === undefined ? 1 : cfg.quantity,
        frequency: cfg.frequency === undefined ? 80 : cfg.frequency,
        max: cfg.max === undefined ? 300 : cfg.max,
        gravityX: cfg.gravityX || 0,
        gravityY: cfg.gravityY === undefined ? 0 : cfg.gravityY,
        color: cfg.color || '#ffffff',
        colors: cfg.colors || null,
        alpha: cfg.alpha || { start: 1, end: 0 },
        scale: cfg.scale || { start: 1, end: 0.2 },
        size: cfg.size === undefined ? 4 : cfg.size,
        shape: cfg.shape || 'circle',
        texture: cfg.texture || null,
        blendMode: cfg.blendMode || 'source-over',
        emitting: cfg.emitting === undefined ? true : !!cfg.emitting,
        emitZone: cfg.emitZone || null,
        follow: cfg.follow || null,
        rotate: cfg.rotate || false,
        rotateSpeed: cfg.rotateSpeed || 0
      };
      this.particles = [];
      this._emitAccumulator = 0;
      this._rng = new Random(cfg.seed);
      this.onParticle = cfg.onParticle || null;
      this.stopped = !this.config.emitting;
      this.blendMode = this.config.blendMode;
    }

    _range(value, fallbackMin, fallbackMax) {
      if (typeof value === 'number') return { min: value, max: value };
      if (!value) return { min: fallbackMin, max: fallbackMax };
      if ('min' in value || 'max' in value) {
        return {
          min: value.min === undefined ? value.max : value.min,
          max: value.max === undefined ? value.min : value.max
        };
      }
      if ('start' in value || 'end' in value) {
        return {
          min: value.start === undefined ? value.end : value.start,
          max: value.end === undefined ? value.start : value.end
        };
      }
      return { min: fallbackMin, max: fallbackMax };
    }

    emitParticleAt(x, y, count) {
      const total = count === undefined ? 1 : count;
      for (let i = 0; i < total; i += 1) {
        if (this.particles.length >= this.config.max) break;
        const speed = this._range(this.config.speed, 40, 120);
        const angle = this._range(this.config.angle, 0, 360);
        const lifespan = this._range(this.config.lifespan, 600, 1200);
        const sizes = this._range(this.config.size, 4, 4);
        const angleRad = MathUtils.degToRad(this._rng.float(angle.min, angle.max));
        const speedValue = this._rng.float(speed.min, speed.max);
        let px = x;
        let py = y;
        const zone = this.config.emitZone;
        if (zone) {
          if (zone.type === 'rect') {
            px += this._rng.float(zone.x || 0, (zone.x || 0) + (zone.width || 0));
            py += this._rng.float(zone.y || 0, (zone.y || 0) + (zone.height || 0));
          } else if (zone.type === 'circle') {
            const r = (zone.radius || 0) * Math.sqrt(this._rng.next());
            const a = this._rng.angle();
            px += Math.cos(a) * r;
            py += Math.sin(a) * r;
          }
        }
        const life = this._rng.float(lifespan.min, lifespan.max);
        const particle = {
          x: px,
          y: py,
          vx: Math.cos(angleRad) * speedValue,
          vy: Math.sin(angleRad) * speedValue,
          life,
          maxLife: life,
          size: this._rng.float(sizes.min, sizes.max),
          rotation: this._rng.float(0, Math.PI * 2),
          rotationSpeed: MathUtils.degToRad(this.config.rotateSpeed),
          seed: this._rng.next()
        };
        this.particles.push(particle);
        if (this.onParticle) this.onParticle(particle);
      }
      return this;
    }
    explode(count, x, y) {
      return this.emitParticleAt(
        x === undefined ? this.x : x,
        y === undefined ? this.y : y,
        count === undefined ? 20 : count
      );
    }
    start() {
      this.stopped = false;
      this.config.emitting = true;
      return this;
    }
    stop() {
      this.stopped = true;
      this.config.emitting = false;
      return this;
    }
    isEmitting() {
      return !this.stopped;
    }
    clear() {
      this.particles = [];
      return this;
    }
    setFrequency(frequency) {
      this.config.frequency = frequency;
      return this;
    }
    setQuantity(quantity) {
      this.config.quantity = quantity;
      return this;
    }
    setSpeed(value) {
      this.config.speed = value;
      return this;
    }
    setLifespan(value) {
      this.config.lifespan = value;
      return this;
    }
    setGravity(y) {
      this.config.gravityY = y;
      return this;
    }
    setPosition(x, y) {
      super.setPosition(x, y);
      if (this.particles.length === 0) return this;
      return this;
    }
    getParticleCount() {
      return this.particles.length;
    }

    update(dt) {
      if (this.config.follow) {
        this.x = this.config.follow.x;
        this.y = this.config.follow.y;
      }
      if (!this.stopped && this.config.frequency >= 0) {
        this._emitAccumulator += dt * 1000;
        const interval = this.config.frequency === 0 ? 16 : this.config.frequency;
        let guard = 0;
        while (this._emitAccumulator >= interval && guard < 10) {
          this._emitAccumulator -= interval;
          this.emitParticleAt(this.x, this.y, this.config.quantity);
          guard += 1;
        }
      }
      const gravityX = this.config.gravityX;
      const gravityY = this.config.gravityY;
      this.particles = this.particles.filter((p) => {
        p.life -= dt * 1000;
        if (p.life <= 0) return false;
        p.vx += gravityX * dt;
        p.vy += gravityY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;
        return true;
      });
    }

    draw(ctx) {
      const loader = this.scene ? this.scene.load : null;
      const texture = this.config.texture ? loader && loader.getImage(this.config.texture) : null;
      this.particles.forEach((p) => {
        const t = 1 - p.life / p.maxLife;
        const alphaCfg = this._range(this.config.alpha, 1, 0);
        const scaleCfg = this._range(this.config.scale, 1, 0.2);
        const alpha = MathUtils.lerp(alphaCfg.min, alphaCfg.max, t);
        const scale = MathUtils.lerp(scaleCfg.min, scaleCfg.max, t);
        const sizeBase = p.size === undefined ? this.config.size : p.size;
        const baseColor = sampleColors(
          this.config.colors,
          t
        ) || parseColor(this.config.color);
        const drawAlpha = MathUtils.clamp01(baseColor.a * alpha);
        ctx.save();
        ctx.globalAlpha = drawAlpha;
        ctx.translate(p.x - this.x, p.y - this.y);
        if (this.config.rotate) ctx.rotate(p.rotation);
        if (texture) {
          const size = sizeBase * scale;
          ctx.drawImage(texture, -size / 2, -size / 2, size, size);
        } else {
          ctx.fillStyle =
            'rgb(' +
            Math.round(baseColor.r) +
            ',' +
            Math.round(baseColor.g) +
            ',' +
            Math.round(baseColor.b) +
            ')';
          if (this.config.shape === 'square') {
            const size = sizeBase * scale;
            ctx.fillRect(-size / 2, -size / 2, size, size);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, (sizeBase * scale) / 2), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      });
    }
    destroy(fromScene) {
      this.particles = [];
      return super.destroy(fromScene);
    }
  }
