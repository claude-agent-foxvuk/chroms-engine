/*! Chroms Engine v1.1.0 | built 2026-11-26 | docs: docs/en/index.md / docs/ru/index.md */
/* ---- 00-core.js ---- */
/**
 * Chroms Engine v1.1.0
 * A modular 2D game engine for the browser, designed for humans and AI agents.
 *
 * This file is part of the source bundle in src/. The distributable is chroms.js,
 * produced by `node build.js`. Do not edit chroms.js directly.
 */
(function (global) {
  'use strict';

  const VERSION = '1.1.0';
  let _uid = 0;

  function uid(prefix) {
    _uid += 1;
    return (prefix || 'obj') + '_' + _uid.toString(36);
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!isObject(value)) return value;
    const out = {};
    for (const key in value) out[key] = clone(value[key]);
    return out;
  }

  function deepMerge(target, source) {
    if (!isObject(target)) return clone(source);
    for (const key in source) {
      const value = source[key];
      if (isObject(value) && isObject(target[key])) {
        target[key] = deepMerge(target[key], value);
      } else {
        target[key] = clone(value);
      }
    }
    return target;
  }

  /**
   * Small math helpers. All angles are radians unless a function name says
   * otherwise; object rotation in the engine is stored in degrees.
   */
  const MathUtils = {
    PI2: Math.PI * 2,
    clamp(value, min, max) {
      return value < min ? min : value > max ? max : value;
    },
    clamp01(value) {
      return MathUtils.clamp(value, 0, 1);
    },
    lerp(a, b, t) {
      return a + (b - a) * t;
    },
    inverseLerp(a, b, value) {
      return a === b ? 0 : (value - a) / (b - a);
    },
    map(value, inMin, inMax, outMin, outMax) {
      return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
    },
    smoothstep(t) {
      t = MathUtils.clamp01(t);
      return t * t * (3 - 2 * t);
    },
    sign(value) {
      return value < 0 ? -1 : value > 0 ? 1 : 0;
    },
    wrap(value, min, max) {
      const range = max - min;
      if (range === 0) return min;
      return min + ((((value - min) % range) + range) % range);
    },
    snap(value, step) {
      return step ? Math.round(value / step) * step : value;
    },
    degToRad(degrees) {
      return (degrees * Math.PI) / 180;
    },
    radToDeg(radians) {
      return (radians * 180) / Math.PI;
    },
    angleBetween(x1, y1, x2, y2) {
      return Math.atan2(y2 - y1, x2 - x1);
    },
    distanceBetween(x1, y1, x2, y2) {
      return Math.hypot(x2 - x1, y2 - y1);
    },
    distanceSq(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return dx * dx + dy * dy;
    },
    rotate(x, y, radians) {
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return { x: x * cos - y * sin, y: x * sin + y * cos };
    },
    randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    randomFloat(min, max) {
      return Math.random() * (max - min) + min;
    },
    pick(array) {
      return array[Math.floor(Math.random() * array.length)];
    },
    shuffle(array) {
      const out = array.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    percent(value, total) {
      return total > 0 ? (value / total) * 100 : 0;
    }
  };

  /** Simple 2D vector. Methods mutate the vector unless noted. */
  class Vec2 {
    constructor(x, y) {
      this.x = x || 0;
      this.y = y || 0;
    }
    set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }
    copy(v) {
      this.x = v.x;
      this.y = v.y;
      return this;
    }
    clone() {
      return new Vec2(this.x, this.y);
    }
    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }
    subtract(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    }
    scale(s) {
      this.x *= s;
      this.y *= s;
      return this;
    }
    dot(v) {
      return this.x * v.x + this.y * v.y;
    }
    length() {
      return Math.hypot(this.x, this.y);
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    normalize() {
      const len = this.length();
      if (len > 0) {
        this.x /= len;
        this.y /= len;
      }
      return this;
    }
    limit(max) {
      const len = this.length();
      if (len > max && len > 0) {
        this.scale(max / len);
      }
      return this;
    }
    angle() {
      return Math.atan2(this.y, this.x);
    }
    rotate(radians) {
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const x = this.x;
      this.x = x * cos - this.y * sin;
      this.y = x * sin + this.y * cos;
      return this;
    }
    distanceTo(v) {
      return Math.hypot(v.x - this.x, v.y - this.y);
    }
    static fromAngle(radians, length) {
      const len = length === undefined ? 1 : length;
      return new Vec2(Math.cos(radians) * len, Math.sin(radians) * len);
    }
  }

  /** Deterministic pseudo-random generator (mulberry32). */
  class Random {
    constructor(seed) {
      this.seed = (seed === undefined ? Date.now() : seed) >>> 0;
      this._state = this.seed;
    }
    reset(seed) {
      this.seed = seed === undefined ? this.seed : seed >>> 0;
      this._state = this.seed;
      return this;
    }
    next() {
      this._state = (this._state + 0x6d2b79f5) >>> 0;
      let t = this._state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    float(min, max) {
      return this.next() * (max - min) + min;
    }
    int(min, max) {
      return Math.floor(this.float(min, max + 1));
    }
    bool(chance) {
      return this.next() < (chance === undefined ? 0.5 : chance);
    }
    pick(array) {
      return array[Math.floor(this.next() * array.length)];
    }
    shuffle(array) {
      const out = array.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }
    angle() {
      return this.next() * Math.PI * 2;
    }
  }

  /** Minimal event emitter used by the game, scenes, objects and input. */
  class EventEmitter {
    constructor() {
      this._listeners = {};
    }
    on(event, handler, context) {
      if (typeof handler !== 'function') return this;
      (this._listeners[event] || (this._listeners[event] = [])).push({
        handler,
        context,
        once: false
      });
      return this;
    }
    once(event, handler, context) {
      if (typeof handler !== 'function') return this;
      (this._listeners[event] || (this._listeners[event] = [])).push({
        handler,
        context,
        once: true
      });
      return this;
    }
    off(event, handler, context) {
      const list = this._listeners[event];
      if (!list) return this;
      if (!handler) {
        delete this._listeners[event];
        return this;
      }
      this._listeners[event] = list.filter(
        (entry) =>
          entry.handler !== handler ||
          (context !== undefined && entry.context !== context)
      );
      return this;
    }
    emit(event, ...args) {
      const list = this._listeners[event];
      if (!list || list.length === 0) return false;
      for (const entry of list.slice()) {
        if (entry.once) this.off(event, entry.handler, entry.context);
        entry.handler.apply(entry.context || this, args);
      }
      return true;
    }
    listenerCount(event) {
      return (this._listeners[event] || []).length;
    }
    removeAllListeners(event) {
      if (event) delete this._listeners[event];
      else this._listeners = {};
      return this;
    }
  }

  /**
   * localStorage-backed key/value store with an in-memory fallback.
   * Every game gets one under `game.storage`; docs show JSON save/load recipes.
   */
  class SaveManager {
    constructor(prefix) {
      this.prefix = prefix || 'chroms';
      this.memory = new Map();
      this.available = false;
      try {
        const probe = '__chroms_probe__';
        global.localStorage.setItem(probe, '1');
        global.localStorage.removeItem(probe);
        this.available = true;
      } catch (error) {
        this.available = false;
      }
    }
    _key(key) {
      return this.prefix + ':' + key;
    }
    save(key, value) {
      const raw = JSON.stringify(value);
      if (this.available) {
        try {
          global.localStorage.setItem(this._key(key), raw);
        } catch (error) {
          this.memory.set(this._key(key), raw);
        }
      } else {
        this.memory.set(this._key(key), raw);
      }
      return this;
    }
    load(key, fallback) {
      let raw = null;
      const fullKey = this._key(key);
      if (this.available) {
        try {
          raw = global.localStorage.getItem(fullKey);
        } catch (error) {
          raw = null;
        }
      }
      if (raw === null) raw = this.memory.has(fullKey) ? this.memory.get(fullKey) : null;
      if (raw === null) return fallback === undefined ? null : fallback;
      try {
        return JSON.parse(raw);
      } catch (error) {
        return fallback === undefined ? null : fallback;
      }
    }
    has(key) {
      return this.load(key, undefined) !== undefined;
    }
    remove(key) {
      const fullKey = this._key(key);
      if (this.available) {
        try {
          global.localStorage.removeItem(fullKey);
        } catch (error) {
          /* ignore */
        }
      }
      this.memory.delete(fullKey);
      return this;
    }
    clear() {
      if (this.available) {
        try {
          const keys = [];
          for (let i = 0; i < global.localStorage.length; i += 1) {
            const key = global.localStorage.key(i);
            if (key && key.indexOf(this.prefix + ':') === 0) keys.push(key);
          }
          keys.forEach((key) => global.localStorage.removeItem(key));
        } catch (error) {
          /* ignore */
        }
      }
      this.memory.clear();
      return this;
    }
    keys() {
      const out = new Set();
      this.memory.forEach((value, key) => out.add(key.slice(this.prefix.length + 1)));
      if (this.available) {
        try {
          for (let i = 0; i < global.localStorage.length; i += 1) {
            const key = global.localStorage.key(i);
            if (key && key.indexOf(this.prefix + ':') === 0) {
              out.add(key.slice(this.prefix.length + 1));
            }
          }
        } catch (error) {
          /* ignore */
        }
      }
      return Array.from(out);
    }
  }

  /** Easing functions. Both `Easings['quad.in']` and `Ease.quadIn` are exposed. */
  function bounceOut(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) {
      t -= 1.5 / d1;
      return n1 * t * t + 0.75;
    }
    if (t < 2.5 / d1) {
      t -= 2.25 / d1;
      return n1 * t * t + 0.9375;
    }
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  }

  const Ease = {
    linear: (t) => t,
    quadIn: (t) => t * t,
    quadOut: (t) => 1 - (1 - t) * (1 - t),
    quadInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    cubicIn: (t) => t * t * t,
    cubicOut: (t) => 1 - Math.pow(1 - t, 3),
    cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    quartIn: (t) => t * t * t * t,
    quartOut: (t) => 1 - Math.pow(1 - t, 4),
    quartInOut: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    quintIn: (t) => t * t * t * t * t,
    quintOut: (t) => 1 - Math.pow(1 - t, 5),
    quintInOut: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
    sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
    sineOut: (t) => Math.sin((t * Math.PI) / 2),
    sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    expoOut: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    expoInOut: (t) => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      return t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;
    },
    circIn: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
    circOut: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    circInOut: (t) =>
      t < 0.5
        ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
        : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
    backIn: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * t * t * t - c1 * t * t;
    },
    backOut: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    backInOut: (t) => {
      const c1 = 1.70158;
      const c2 = c1 * 1.525;
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },
    elasticIn: (t) => {
      if (t === 0 || t === 1) return t;
      const c4 = (2 * Math.PI) / 3;
      return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
    elasticOut: (t) => {
      if (t === 0 || t === 1) return t;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    elasticInOut: (t) => {
      if (t === 0 || t === 1) return t;
      const c5 = (2 * Math.PI) / 4.5;
      return t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    },
    bounceIn: (t) => 1 - bounceOut(1 - t),
    bounceOut: bounceOut,
    bounceInOut: (t) =>
      t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2,
    steps: (steps, round) => {
      const n = Math.max(1, steps || 1);
      return (t) => {
        const value = Math.floor(t * n) / n;
        return round === false ? value : value;
      };
    }
  };

  const Easings = {
    linear: 'linear',
    smooth: 'sine.inOut',
    sineIn: 'sine.in',
    sineOut: 'sine.out',
    sineInOut: 'sine.inOut',
    quadIn: 'quad.in',
    quadOut: 'quad.out',
    quadInOut: 'quad.inOut',
    cubicIn: 'cubic.in',
    cubicOut: 'cubic.out',
    cubicInOut: 'cubic.inOut',
    quartIn: 'quart.in',
    quartOut: 'quart.out',
    quartInOut: 'quart.inOut',
    quintIn: 'quint.in',
    quintOut: 'quint.out',
    quintInOut: 'quint.inOut',
    expoIn: 'expo.in',
    expoOut: 'expo.out',
    expoInOut: 'expo.inOut',
    circIn: 'circ.in',
    circOut: 'circ.out',
    circInOut: 'circ.inOut',
    backIn: 'back.in',
    backOut: 'back.out',
    backInOut: 'back.inOut',
    elasticIn: 'elastic.in',
    elasticOut: 'elastic.out',
    elasticInOut: 'elastic.inOut',
    bounceIn: 'bounce.in',
    bounceOut: 'bounce.out',
    bounceInOut: 'bounce.inOut'
  };

  const EaseLookup = {
    linear: Ease.linear,
    'sine.in': Ease.sineIn,
    'sine.out': Ease.sineOut,
    'sine.inout': Ease.sineInOut,
    'quad.in': Ease.quadIn,
    'quad.out': Ease.quadOut,
    'quad.inout': Ease.quadInOut,
    'cubic.in': Ease.cubicIn,
    'cubic.out': Ease.cubicOut,
    'cubic.inout': Ease.cubicInOut,
    'quart.in': Ease.quartIn,
    'quart.out': Ease.quartOut,
    'quart.inout': Ease.quartInOut,
    'quint.in': Ease.quintIn,
    'quint.out': Ease.quintOut,
    'quint.inout': Ease.quintInOut,
    'expo.in': Ease.expoIn,
    'expo.out': Ease.expoOut,
    'expo.inout': Ease.expoInOut,
    'circ.in': Ease.circIn,
    'circ.out': Ease.circOut,
    'circ.inout': Ease.circInOut,
    'back.in': Ease.backIn,
    'back.out': Ease.backOut,
    'back.inout': Ease.backInOut,
    'elastic.in': Ease.elasticIn,
    'elastic.out': Ease.elasticOut,
    'elastic.inout': Ease.elasticInOut,
    'bounce.in': Ease.bounceIn,
    'bounce.out': Ease.bounceOut,
    'bounce.inout': Ease.bounceInOut
  };

  /** Resolve an easing name ('quad.out') or a custom t => t function. */
  function resolveEase(ease) {
    if (typeof ease === 'function') return ease;
    if (!ease) return Ease.linear;
    const key = String(ease).toLowerCase();
    return EaseLookup[key] || Ease.linear;
  }

  const Chroms = {
    version: VERSION,
    VERSION: VERSION,
    Math: MathUtils,
    MathUtils: MathUtils,
    Vec2: Vec2,
    Random: Random,
    EventEmitter: EventEmitter,
    SaveManager: SaveManager,
    Ease: Ease,
    Easings: Easings,
    resolveEase: resolveEase,
    utils: {
      uid,
      clone,
      deepMerge,
      isObject
    },
    plugins: {}
  };

/* ---- 10-systems.js ---- */
  /**
   * Asset pipeline: images, audio, JSON, text, sprite sheets and texture atlases.
   * Loading is queue-based; call `start()` after queueing assets in `preload()`.
   */
  class AssetLoader {
    constructor(game) {
      this.game = game || null;
      this.queue = [];
      this.images = {};
      this.audios = {};
      this.json = {};
      this.texts = {};
      this.spritesheets = {};
      this.atlases = {};
      this.errors = [];
      this.loaded = 0;
      this.total = 0;
      this.progress = 0;
      this.isLoading = false;
      this._pending = 0;
    }

    image(key, url) {
      this.queue.push({ type: 'image', key, url });
      return this;
    }
    audio(key, url) {
      this.queue.push({ type: 'audio', key, url });
      return this;
    }
    json(key, url) {
      this.queue.push({ type: 'json', key, url });
      return this;
    }
    text(key, url) {
      this.queue.push({ type: 'text', key, url });
      return this;
    }
    /**
     * Slice an image into frames. Also registers the image under `key` so
     * `add.image(x, y, key)` works, and exposes `getFrame(key, index)`.
     */
    spritesheet(key, url, frameWidth, frameHeight, options) {
      const opts = options || {};
      this.queue.push({
        type: 'spritesheet',
        key,
        url,
        frameWidth,
        frameHeight,
        margin: opts.margin || 0,
        spacing: opts.spacing || 0
      });
      return this;
    }
    /** Atlas accepts an already-parsed JSON object or a URL to load it from. */
    atlas(key, imageUrl, dataOrUrl) {
      this.queue.push({ type: 'atlas', key, url: imageUrl, dataOrUrl });
      return this;
    }

    getImage(key) {
      return this.images[key] || null;
    }
    getAudio(key) {
      return this.audios[key] || null;
    }
    getJSON(key, fallback) {
      return key in this.json ? this.json[key] : fallback === undefined ? null : fallback;
    }
    getText(key, fallback) {
      return key in this.texts ? this.texts[key] : fallback === undefined ? null : fallback;
    }
    get(key) {
      return (
        this.images[key] ||
        this.audios[key] ||
        this.json[key] ||
        this.texts[key] ||
        null
      );
    }
    getFrame(key, frame) {
      const sheet = this.spritesheets[key];
      if (sheet) {
        if (frame === undefined) {
          return { image: sheet.image, x: 0, y: 0, width: sheet.frameWidth, height: sheet.frameHeight };
        }
        const found = sheet.frames[frame];
        if (found) {
          return {
            image: sheet.image,
            x: found.x,
            y: found.y,
            width: found.width,
            height: found.height
          };
        }
        return null;
      }
      const atlas = this.atlases[key];
      if (atlas && atlas.frames[frame]) {
        const f = atlas.frames[frame];
        return { image: atlas.image, x: f.x, y: f.y, width: f.width, height: f.height };
      }
      return null;
    }
    has(key) {
      return (
        key in this.images ||
        key in this.audios ||
        key in this.json ||
        key in this.texts ||
        key in this.spritesheets ||
        key in this.atlases
      );
    }
    reset() {
      this.queue = [];
      this.loaded = 0;
      this.total = 0;
      this.progress = 0;
      this.isLoading = false;
      this.errors = [];
      return this;
    }

    /**
     * Load the queue. `start(onComplete)` keeps v1.0 compatibility;
     * `start(onProgress, onComplete)` also reports 0..1 progress.
     */
    start(onProgress, onDone) {
      let progressCb = onProgress;
      let doneCb = onDone;
      if (typeof onProgress === 'function' && typeof onDone !== 'function') {
        progressCb = null;
        doneCb = onProgress;
      }
      const queue = this.queue.slice();
      this.queue = [];
      this.loaded = 0;
      this.total = queue.length;
      this.progress = 0;
      this.errors = [];
      this.isLoading = queue.length > 0;
      if (this.game) this.game.events.emit('load-start', { total: this.total });

      if (queue.length === 0) {
        this.isLoading = false;
        if (progressCb) progressCb(1, 0, 0);
        if (doneCb) doneCb({ errors: [] });
        return this;
      }

      let remaining = queue.length;
      const tick = (ok) => {
        this.loaded += 1;
        remaining -= 1;
        this.progress = this.loaded / this.total;
        if (this.game) {
          this.game.events.emit('load-progress', {
            progress: this.progress,
            loaded: this.loaded,
            total: this.total,
            key: ok && ok.key
          });
        }
        if (progressCb) progressCb(this.progress, this.loaded, this.total);
        if (remaining === 0 && !this.isLoading) {
          /* already finished */
        }
        if (remaining === 0) {
          this.isLoading = false;
          if (this.game) {
            this.game.events.emit('load-complete', {
              errors: this.errors,
              total: this.total
            });
          }
          if (doneCb) doneCb({ errors: this.errors });
        }
      };

      queue.forEach((item) => {
        const fail = (error) => {
          this.errors.push({ key: item.key, type: item.type, error });
          tick(null);
        };
        if (item.type === 'image') {
          const img = new Image();
          img.onload = () => {
            this.images[item.key] = img;
            tick(item);
          };
          img.onerror = fail;
          img.src = item.url;
        } else if (item.type === 'spritesheet') {
          const img = new Image();
          img.onload = () => {
            const frames = [];
            const fw = item.frameWidth;
            const fh = item.frameHeight;
            const cols = Math.max(1, Math.floor((img.width - item.margin) / (fw + item.spacing)));
            const rows = Math.max(1, Math.floor((img.height - item.margin) / (fh + item.spacing)));
            for (let row = 0; row < rows; row += 1) {
              for (let col = 0; col < cols; col += 1) {
                frames.push({
                  x: item.margin + col * (fw + item.spacing),
                  y: item.margin + row * (fh + item.spacing),
                  width: fw,
                  height: fh
                });
              }
            }
            this.images[item.key] = img;
            this.spritesheets[item.key] = { image: img, frames, frameWidth: fw, frameHeight: fh };
            tick(item);
          };
          img.onerror = fail;
          img.src = item.url;
        } else if (item.type === 'atlas') {
          const img = new Image();
          let data = null;
          let waiting = 2;
          const finish = () => {
            waiting -= 1;
            if (waiting > 0) return;
            if (!img || !data) {
              fail(new Error('Atlas data or image failed'));
              return;
            }
            const frames = {};
            const rawFrames = data.frames || {};
            if (Array.isArray(rawFrames)) {
              rawFrames.forEach((entry) => {
                const f = entry.frame || entry;
                frames[entry.filename || entry.name] = {
                  x: f.x,
                  y: f.y,
                  width: f.w !== undefined ? f.w : f.width,
                  height: f.h !== undefined ? f.h : f.height
                };
              });
            } else {
              Object.keys(rawFrames).forEach((name) => {
                const entry = rawFrames[name];
                const f = entry.frame || entry;
                frames[name] = {
                  x: f.x,
                  y: f.y,
                  width: f.w !== undefined ? f.w : f.width,
                  height: f.h !== undefined ? f.h : f.height
                };
              });
            }
            this.images[item.key] = img;
            this.atlases[item.key] = { image: img, frames, data };
            tick(item);
          };
          img.onload = finish;
          img.onerror = () => finish();
          img.src = item.url;
          if (typeof item.dataOrUrl === 'string') {
            fetch(item.dataOrUrl)
              .then((res) => res.json())
              .then((value) => {
                data = value;
                finish();
              })
              .catch(() => {
                finish();
              });
          } else {
            data = item.dataOrUrl;
            finish();
          }
        } else if (item.type === 'audio') {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.addEventListener('canplaythrough', () => {
            this.audios[item.key] = audio;
            tick(item);
          });
          audio.addEventListener('loadeddata', () => {
            if (!this.audios[item.key]) {
              this.audios[item.key] = audio;
              tick(item);
            }
          });
          audio.addEventListener('error', fail);
          audio.src = item.url;
          audio.load();
        } else if (item.type === 'json') {
          fetch(item.url)
            .then((res) => res.json())
            .then((value) => {
              this.json[item.key] = value;
              tick(item);
            })
            .catch(fail);
        } else if (item.type === 'text') {
          fetch(item.url)
            .then((res) => res.text())
            .then((value) => {
              this.texts[item.key] = value;
              tick(item);
            })
            .catch(fail);
        }
      });
      return this;
    }
  }

  /**
   * Keyboard + pointer + gamepad input. Frame state (`justDown` / `justUp`)
   * is cleared automatically at the end of every game loop.
   */
  class InputManager {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.game = game || null;
      this.keys = {};
      this.justPressed = {};
      this.justReleased = {};
      this.capturedCodes = new Set();
      this.actions = {};
      this.pointer = {
        x: 0,
        y: 0,
        worldX: 0,
        worldY: 0,
        isDown: false,
        justDown: false,
        justUp: false,
        downTime: 0
      };
      this.pointers = new Map();
      this.wheelDelta = 0;
      this.enabled = true;
      this.gamepads = [];
      this._dragTargets = [];
      this._dragging = null;
      this._listeners = [];
      this.events = new EventEmitter();

      const on = (target, event, handler) => {
        target.addEventListener(event, handler);
        this._listeners.push([target, event, handler]);
      };

      on(global, 'keydown', (e) => {
        if (!this.enabled) return;
        if (this.capturedCodes.has(e.code)) e.preventDefault();
        if (!this.keys[e.code]) {
          this.justPressed[e.code] = true;
          this._emitAction(e.code, 'down');
        }
        this.keys[e.code] = true;
      });
      on(global, 'keyup', (e) => {
        if (!this.enabled) return;
        if (this.capturedCodes.has(e.code)) e.preventDefault();
        if (this.keys[e.code]) {
          this.justReleased[e.code] = true;
          this._emitAction(e.code, 'up');
        }
        this.keys[e.code] = false;
      });
      on(global, 'blur', () => {
        this.keys = {};
        this.pointer.isDown = false;
      });

      on(canvas, 'pointerdown', (e) => {
        if (!this.enabled) return;
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        const point = this._pointFromEvent(e);
        this.pointer.x = point.x;
        this.pointer.y = point.y;
        this.pointer.isDown = true;
        this.pointer.justDown = true;
        this.pointer.downTime = performance.now();
        this.pointers.set(e.pointerId, { x: point.x, y: point.y, isDown: true });
        if (this._dragTargets.length) this._beginDrag();
      });
      on(canvas, 'pointermove', (e) => {
        if (!this.enabled) return;
        const point = this._pointFromEvent(e);
        this.pointer.x = point.x;
        this.pointer.y = point.y;
        if (this.pointers.has(e.pointerId)) {
          const p = this.pointers.get(e.pointerId);
          p.x = point.x;
          p.y = point.y;
        }
        if (this._dragging) this._dragMove();
      });
      on(global, 'pointerup', (e) => {
        if (!this.enabled) return;
        if (this.pointers.has(e.pointerId)) this.pointers.delete(e.pointerId);
        if (this.pointer.isDown) {
          this.pointer.justUp = true;
          this.pointer.isDown = false;
        }
        if (this._dragging) this._endDrag();
      });
      on(canvas, 'wheel', (e) => {
        if (!this.enabled) return;
        this.wheelDelta = e.deltaY;
      });
      on(canvas, 'contextmenu', (e) => e.preventDefault());
    }

    /** Convert a pointer event to logical canvas coordinates. */
    _pointFromEvent(e) {
      const rect = this.canvas.getBoundingClientRect();
      const logicalWidth = this.game ? this.game.width : this.canvas.width;
      const logicalHeight = this.game ? this.game.height : this.canvas.height;
      const scaleX = rect.width > 0 ? logicalWidth / rect.width : 1;
      const scaleY = rect.height > 0 ? logicalHeight / rect.height : 1;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }

    /** Prevent the browser default for a key (arrows, space, etc.). */
    capture(codes) {
      (Array.isArray(codes) ? codes : [codes]).forEach((code) => this.capturedCodes.add(code));
      return this;
    }
    releaseCapture(codes) {
      (Array.isArray(codes) ? codes : [codes]).forEach((code) => this.capturedCodes.delete(code));
      return this;
    }

    /**
     * Bind an action name to one or more key codes:
     * `input.addAction('jump', ['Space', 'KeyW'])`.
     */
    addAction(name, codes) {
      this.actions[name] = Array.isArray(codes) ? codes.slice() : [codes];
      return this;
    }
    setKeybinding(name, codes) {
      return this.addAction(name, codes);
    }
    actionDown(name) {
      const codes = this.actions[name];
      return codes ? codes.some((code) => !!this.keys[code]) : false;
    }
    actionJustDown(name) {
      const codes = this.actions[name];
      return codes ? codes.some((code) => !!this.justPressed[code]) : false;
    }
    actionJustUp(name) {
      const codes = this.actions[name];
      return codes ? codes.some((code) => !!this.justReleased[code]) : false;
    }
    _emitAction(code, phase) {
      Object.keys(this.actions).forEach((name) => {
        if (this.actions[name].indexOf(code) !== -1) {
          this.events && this.events.emit('action-' + phase, name, code);
          if (this.game) this.game.events.emit('action-' + phase, name, code);
        }
      });
    }

    isDown(code) {
      return !!this.keys[code];
    }
    isJustDown(code) {
      return !!this.justPressed[code];
    }
    isJustUp(code) {
      return !!this.justReleased[code];
    }
    isAnyDown(codes) {
      return codes.some((code) => this.isDown(code));
    }
    /** True while all listed keys are held. */
    areDown(codes) {
      return codes.every((code) => this.isDown(code));
    }

    /** Poll gamepads; called every frame by the game. */
    update() {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      this.gamepads = [];
      for (let i = 0; i < pads.length; i += 1) {
        if (pads[i]) this.gamepads.push(pads[i]);
      }
    }
    gamepad(index) {
      return this.gamepads[index || 0] || null;
    }
    gamepadDown(button, padIndex) {
      const pad = this.gamepad(padIndex);
      if (!pad || !pad.buttons[button]) return false;
      const b = pad.buttons[button];
      return typeof b === 'object' ? b.pressed : b > 0.5;
    }
    gamepadAxis(axis, padIndex) {
      const pad = this.gamepad(padIndex);
      return pad ? pad.axes[axis] || 0 : 0;
    }

    /**
     * Make a game object draggable with the primary pointer.
     * Options: dragX, dragY (false to lock an axis), onDragStart, onDrag, onDragEnd.
     */
    enableDrag(object, options) {
      object._dragOptions = options || {};
      object._dragOptions.startX = object.x;
      object._dragOptions.startY = object.y;
      if (this._dragTargets.indexOf(object) === -1) this._dragTargets.push(object);
      return object;
    }
    disableDrag(object) {
      this._dragTargets = this._dragTargets.filter((item) => item !== object);
      if (this._dragging && this._dragging.object === object) this._dragging = null;
      return this;
    }
    _hitTest(object, x, y) {
      return (
        object &&
        object.active &&
        object.visible &&
        x >= object.x &&
        x <= object.x + object.displayWidth &&
        y >= object.y &&
        y <= object.y + object.displayHeight
      );
    }
    _beginDrag() {
      for (let i = this._dragTargets.length - 1; i >= 0; i -= 1) {
        const object = this._dragTargets[i];
        const screen = typeof object.isScreenSpace === 'function' && object.isScreenSpace();
        const x = screen ? this.pointer.x : this.pointer.worldX;
        const y = screen ? this.pointer.y : this.pointer.worldY;
        if (this._hitTest(object, x, y)) {
          const opts = object._dragOptions || {};
          this._dragging = {
            object,
            screen,
            offsetX: x - object.x,
            offsetY: y - object.y,
            options: opts
          };
          object.isDragged = true;
          if (opts.onDragStart) opts.onDragStart(object);
          break;
        }
      }
    }
    _dragMove() {
      const drag = this._dragging;
      const opts = drag.options;
      const px = drag.screen ? this.pointer.x : this.pointer.worldX;
      const py = drag.screen ? this.pointer.y : this.pointer.worldY;
      const x = px - drag.offsetX;
      const y = py - drag.offsetY;
      const object = drag.object;
      if (object.body) {
        object.body.setVelocity(0, 0);
      }
      object.x = opts.dragX === false ? drag.options.startX : x;
      object.y = opts.dragY === false ? drag.options.startY : y;
      if (opts.onDrag) opts.onDrag(object, this.pointer);
    }
    _endDrag() {
      const drag = this._dragging;
      this._dragging = null;
      if (!drag) return;
      drag.object.isDragged = false;
      if (drag.options.onDragEnd) drag.options.onDragEnd(drag.object);
    }

    /** Called by the game after scene update to refresh world-space pointer coords. */
    _syncWorldPointer(camera) {
      if (!camera) return;
      const point = camera.screenToWorld(this.pointer.x, this.pointer.y);
      this.pointer.worldX = point.x;
      this.pointer.worldY = point.y;
    }

    clearFrameState() {
      this.justPressed = {};
      this.justReleased = {};
      this.pointer.justDown = false;
      this.pointer.justUp = false;
      this.wheelDelta = 0;
    }

    destroy() {
      this._listeners.forEach(([target, event, handler]) => {
        target.removeEventListener(event, handler);
      });
      this._listeners = [];
      this._dragTargets = [];
      this._dragging = null;
      this.enabled = false;
    }
  }

  /**
   * Audio: music/SFX channels with volume, fades, mute and a tiny WebAudio
   * synthesizer (`beep`) for prototyping without asset files.
   */
  class SoundManager {
    constructor(loader) {
      this.loader = loader;
      this.masterVolume = 1;
      this.musicVolume = 0.7;
      this.sfxVolume = 1;
      this.muted = false;
      this.music = null;
      this.musicKey = null;
      this.active = [];
      this._fades = [];
      this._context = null;
      this._unlocked = false;
      this._lastBeepAt = 0;
      this.events = new EventEmitter();
    }

    unlock() {
      this._unlocked = true;
      if (this._context && this._context.state === 'suspended') {
        this._context.resume().catch(() => {});
      }
      return this;
    }
    _ensureContext() {
      if (this._context) return this._context;
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return null;
      try {
        this._context = new Ctx();
      } catch (error) {
        this._context = null;
      }
      return this._context;
    }

    setMasterVolume(volume) {
      this.masterVolume = MathUtils.clamp01(volume);
      this._applyVolumes();
      return this;
    }
    setSfxVolume(volume) {
      this.sfxVolume = MathUtils.clamp01(volume);
      return this;
    }
    setMusicVolume(volume) {
      this.musicVolume = MathUtils.clamp01(volume);
      this._applyVolumes();
      return this;
    }
    mute(value) {
      this.muted = value === undefined ? true : !!value;
      this._applyVolumes();
      return this;
    }
    toggleMute() {
      return this.mute(!this.muted);
    }
    _applyVolumes() {
      this.active.forEach((handle) => {
        const channel = handle.channel === 'music' ? this.musicVolume : this.sfxVolume;
        handle.audio.volume = this.muted ? 0 : handle.baseVolume * channel * this.masterVolume;
      });
      if (this.music && this.music.audio) {
        this.music.audio.volume = this.muted
          ? 0
          : this.music.baseVolume * this.musicVolume * this.masterVolume;
      }
    }

    /**
     * Play a sound effect. Options: volume, rate (playbackRate), loop, channel.
     * Returns a handle with stop(), setVolume(), setRate().
     */
    play(key, options) {
      const opts = typeof options === 'number' ? { volume: options } : options || {};
      const source = this.loader ? this.loader.getAudio(key) : null;
      if (!source) {
        this.events.emit('missing', key);
        return null;
      }
      const audio = source.cloneNode(true);
      const baseVolume = opts.volume === undefined ? 1 : opts.volume;
      const channel = opts.loop ? 'music' : opts.channel || 'sfx';
      audio.volume = this.muted ? 0 : baseVolume * (channel === 'music' ? this.musicVolume : this.sfxVolume) * this.masterVolume;
      audio.loop = !!opts.loop;
      audio.playbackRate = opts.rate || 1;
      const playPromise = audio.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
      const handle = {
        key,
        audio,
        channel,
        baseVolume,
        stop() {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (error) {
            /* ignore */
          }
          const idx = this.owner.active.indexOf(this);
          if (idx !== -1) this.owner.active.splice(idx, 1);
        },
        setVolume(value) {
          this.baseVolume = value;
          this.owner._applyVolumes();
        },
        setRate(value) {
          audio.playbackRate = value;
        },
        owner: this
      };
      audio.addEventListener('ended', () => {
        const idx = this.active.indexOf(handle);
        if (idx !== -1) this.active.splice(idx, 1);
      });
      this.active.push(handle);
      return handle;
    }

    /** Play looping music, stopping the previous track (with optional fade). */
    musicPlay(key, options) {
      const opts = options || {};
      const fade = opts.fade === undefined ? 0 : opts.fade;
      if (this.music) this.stopMusic(fade);
      const handle = this.play(key, { volume: opts.volume === undefined ? 1 : opts.volume, loop: true, channel: 'music' });
      if (!handle) return null;
      this.music = handle;
      this.musicKey = key;
      if (fade > 0) {
        handle.audio.volume = 0;
        this._fadeTo(handle, handle.baseVolume * this.musicVolume * this.masterVolume, fade);
      }
      return handle;
    }
    stopMusic(fade) {
      if (!this.music) return this;
      const handle = this.music;
      this.music = null;
      this.musicKey = null;
      if (fade && fade > 0) {
        this._fadeTo(handle, 0, fade, () => handle.stop());
      } else {
        handle.stop();
      }
      return this;
    }
    stop(key) {
      this.active.slice().forEach((handle) => {
        if (handle.key === key) handle.stop();
      });
      return this;
    }
    stopAll() {
      this.active.slice().forEach((handle) => handle.stop());
      this.music = null;
      this.musicKey = null;
      return this;
    }

    _fadeTo(handle, target, duration, onComplete) {
      this._fades.push({
        handle,
        from: handle.audio.volume,
        to: target,
        duration: Math.max(0.001, duration / 1000),
        elapsed: 0,
        onComplete
      });
      return this;
    }
    /** Called by the game loop; advances fade envelopes. */
    update(dt) {
      if (!this._fades.length) return;
      this._fades = this._fades.filter((fade) => {
        fade.elapsed += dt;
        const t = MathUtils.clamp01(fade.elapsed / fade.duration);
        fade.handle.audio.volume = MathUtils.clamp01(
          MathUtils.lerp(fade.from, fade.to, t)
        );
        if (t >= 1) {
          if (fade.onComplete) fade.onComplete();
          return false;
        }
        return true;
      });
    }

    /**
     * Synthesize a tone with WebAudio. Handy for prototypes:
     * `sound.beep({ frequency: 440, duration: 0.1, type: 'square' })`.
     */
    beep(options) {
      const opts = options || {};
      const ctx = this._ensureContext();
      if (!ctx) return null;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = opts.delay ? now + opts.delay : now;
      const duration = opts.duration || 0.12;
      const volume = (opts.volume === undefined ? 0.2 : opts.volume) * (this.muted ? 0 : 1);
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(opts.frequency || 440, start);
      if (opts.slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
      return osc;
    }
  }

/* ---- 20-physics.js ---- */
  /**
   * A physics body attached to a game object. AABB based, with velocity,
   * acceleration, gravity, drag, bouncing, sensors and world bounds.
   */
  class Body {
    constructor(object, config) {
      const opts = config || {};
      this.id = uid('body');
      this.object = object;
      this.scene = object.scene || null;
      this.game = object.game || (object.scene ? object.scene.game : null);
      this.world = null;
      this.offsetX = opts.offsetX || 0;
      this.offsetY = opts.offsetY || 0;
      this.width = opts.width !== undefined ? opts.width : object.width || 32;
      this.height = opts.height !== undefined ? opts.height : object.height || 32;
      this.velocity = new Vec2(opts.velocityX || 0, opts.velocityY || 0);
      this.acceleration = new Vec2(opts.accelerationX || 0, opts.accelerationY || 0);
      this.drag = new Vec2(opts.dragX || 0, opts.dragY || 0);
      this.maxVelocity = new Vec2(
        opts.maxVelocityX === undefined ? Infinity : opts.maxVelocityX,
        opts.maxVelocityY === undefined ? Infinity : opts.maxVelocityY
      );
      this.gravity = new Vec2(opts.gravityX || 0, opts.gravityY || 0);
      this.bounce = opts.bounce === undefined ? 0 : opts.bounce;
      this.allowGravity = opts.allowGravity !== false;
      this.immovable = !!opts.immovable;
      this.collideWorldBounds = !!opts.collideWorldBounds;
      this.isSensor = !!opts.isSensor;
      this.isCircle = !!opts.isCircle;
      this.enabled = opts.enabled !== false;
      this.active = true;
      this.collisionCount = 0;
      this.touching = { none: true, up: false, down: false, left: false, right: false };
      this.blocked = { up: false, down: false, left: false, right: false };
      this.onCollide = null;
      this.onWorldBounds = null;
      this.custom = {};
    }

    get x() {
      return this.object.x + this.offsetX;
    }
    get y() {
      return this.object.y + this.offsetY;
    }
    get centerX() {
      return this.x + this.width / 2;
    }
    get centerY() {
      return this.y + this.height / 2;
    }
    get right() {
      return this.x + this.width;
    }
    get bottom() {
      return this.y + this.height;
    }
    get speed() {
      return this.velocity.length();
    }

    setSize(width, height) {
      this.width = width;
      this.height = height === undefined ? width : height;
      return this;
    }
    setOffset(x, y) {
      this.offsetX = x;
      this.offsetY = y;
      return this;
    }
    setVelocity(x, y) {
      this.velocity.set(x || 0, y === undefined ? 0 : y);
      return this;
    }
    setVelocityX(x) {
      this.velocity.x = x;
      return this;
    }
    setVelocityY(y) {
      this.velocity.y = y;
      return this;
    }
    addVelocity(x, y) {
      this.velocity.x += x;
      this.velocity.y += y || 0;
      return this;
    }
    setAcceleration(x, y) {
      this.acceleration.set(x || 0, y || 0);
      return this;
    }
    setGravityY(y) {
      this.gravity.y = y || 0;
      return this;
    }
    setGravity(x, y) {
      this.gravity.set(x || 0, y || 0);
      return this;
    }
    setDrag(x, y) {
      this.drag.set(x || 0, y === undefined ? x || 0 : y);
      return this;
    }
    setMaxVelocity(x, y) {
      this.maxVelocity.set(x === undefined ? Infinity : x, y === undefined ? Infinity : y);
      return this;
    }
    setBounce(value) {
      this.bounce = value;
      return this;
    }
    setImmovable(value) {
      this.immovable = value === undefined ? true : !!value;
      return this;
    }
    setCollideWorldBounds(value) {
      this.collideWorldBounds = value === undefined ? true : !!value;
      return this;
    }
    setAllowGravity(value) {
      this.allowGravity = value === undefined ? true : !!value;
      return this;
    }
    setSensor(value) {
      this.isSensor = value === undefined ? true : !!value;
      return this;
    }
    setCircle(value) {
      this.isCircle = value === undefined ? true : !!value;
      return this;
    }
    setEnabled(value) {
      this.enabled = !!value;
      return this;
    }
    setAllowSleep() {
      return this;
    }
    setAllowGravity(value) {
      this.allowGravity = value === undefined ? true : !!value;
      return this;
    }
    getBounds() {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
    /** Move the parent object (used by collision resolution). */
    _moveBy(dx, dy) {
      if (dx) this.object.x += dx;
      if (dy) this.object.y += dy;
    }
    /** Remove this body from its world. */
    destroy() {
      if (this.world) this.world.remove(this);
      if (this.object && this.object.body === this) this.object.body = null;
      this.enabled = false;
      return this;
    }
  }

  /**
   * Physics world shared by all scenes of a game. Register colliders with
   * `addCollider(a, b)`; a and b may be game objects, bodies, groups or arrays.
   */
  class PhysicsWorld {
    constructor(config) {
      const opts = config || {};
      this.game = opts.game || null;
      this.gravity = new Vec2(
        opts.gravity && opts.gravity.x ? opts.gravity.x : 0,
        opts.gravity && opts.gravity.y ? opts.gravity.y : 0
      );
      this.bodies = [];
      this.colliders = [];
      this.bounds = null;
      this.enabled = opts.enabled !== false;
      this.fixedStep = opts.fixedStep || 1 / 120;
      this.maxSubSteps = opts.maxSubSteps || 6;
      this.accumulator = 0;
      this.timeScale = 1;
      this.debug = !!opts.debug;
      this.stats = { steps: 0, pairs: 0, time: 0 };
      this.events = new EventEmitter();
    }

    setGravity(x, y) {
      this.gravity.set(x || 0, y || 0);
      return this;
    }
    setBounds(x, y, width, height) {
      this.bounds = { x, y, width, height };
      return this;
    }
    clearBounds() {
      this.bounds = null;
      return this;
    }
    clear() {
      this.bodies.slice().forEach((body) => this.remove(body));
      this.colliders = [];
      this.accumulator = 0;
      return this;
    }

    /** Add a body. Created automatically by `object.enablePhysics()`. */
    add(target, config) {
      if (target instanceof Body) {
        if (this.bodies.indexOf(target) === -1) {
          this.bodies.push(target);
          target.world = this;
        }
        return target;
      }
      const body = new Body(target, config);
      body.world = this;
      this.bodies.push(body);
      if (target && typeof target === 'object') target.body = body;
      return body;
    }
    remove(target) {
      const body = target instanceof Body ? target : target && target.body;
      if (!body) return this;
      const index = this.bodies.indexOf(body);
      if (index !== -1) this.bodies.splice(index, 1);
      body.world = null;
      return this;
    }
    /** Remove every body belonging to a scene (called on scene shutdown). */
    removeScene(scene) {
      this.bodies.slice().forEach((body) => {
        if (body.scene === scene) this.remove(body);
      });
      this.colliders = this.colliders.filter(
        (collider) => collider.scene !== scene
      );
      return this;
    }

    /**
     * Register a persistent pair (or group pair) checked every step.
     * `collide(a, b, cb)` separates bodies; `overlap(a, b, cb)` only reports.
     */
    addCollider(a, b, callback, options) {
      const opts = options || {};
      const collider = {
        id: uid('collider'),
        a,
        b,
        callback: callback || null,
        overlapOnly: !!opts.overlapOnly,
        scene: (a && a.scene) || (b && b.scene) || null,
        active: true,
        object: null
      };
      this.colliders.push(collider);
      const handle = {
        id: collider.id,
        remove: () => this.removeCollider(collider),
        setCallback: (fn) => {
          collider.callback = fn;
          return handle;
        },
        pause: () => {
          collider.active = false;
          return handle;
        },
        resume: () => {
          collider.active = true;
          return handle;
        }
      };
      collider.handle = handle;
      return handle;
    }
    removeCollider(collider) {
      const id = collider && collider.id ? collider.id : collider;
      this.colliders = this.colliders.filter((item) => item !== collider && item.id !== id);
      return this;
    }
    collide(a, b, callback) {
      return this.addCollider(a, b, callback, { overlapOnly: false });
    }
    overlapPair(a, b, callback) {
      return this.addCollider(a, b, callback, { overlapOnly: true });
    }

    _bodiesOf(target, out) {
      const result = out || [];
      if (!target) return result;
      if (target instanceof Body) {
        if (result.indexOf(target) === -1) result.push(target);
        return result;
      }
      if (typeof target === 'object' && target.body instanceof Body) {
        if (result.indexOf(target.body) === -1) result.push(target.body);
        return result;
      }
      if (Array.isArray(target)) {
        target.forEach((item) => this._bodiesOf(item, result));
        return result;
      }
      if (typeof target === 'object' && target.children && typeof target.children.forEach === 'function') {
        target.children.forEach((child) => this._bodiesOf(child, result));
        return result;
      }
      if (
        target &&
        typeof target.x === 'number' &&
        typeof target.y === 'number' &&
        typeof target.width === 'number' &&
        typeof target.height === 'number' &&
        target.active !== false
      ) {
        const object = target;
        result.push({
          object,
          enabled: true,
          active: true,
          isSensor: false,
          immovable: true,
          bounce: 0,
          collisionCount: 0,
          offsetX: 0,
          offsetY: 0,
          velocity: { x: 0, y: 0 },
          blocked: { up: false, down: false, left: false, right: false },
          get x() {
            return object.x;
          },
          get y() {
            return object.y;
          },
          get width() {
            return object.width;
          },
          get height() {
            return object.height;
          },
          get centerX() {
            return object.x + object.width / 2;
          },
          get centerY() {
            return object.y + object.height / 2;
          },
          _moveBy() {}
        });
      }
      return result;
    }

    /**
     * Check whether two targets overlap. Returns a boolean (v1.0 compatible).
     * Accepts objects, bodies, groups and arrays.
     */
    overlap(a, b) {
      const listA = this._bodiesOf(a);
      const listB = this._bodiesOf(b);
      for (const bodyA of listA) {
        if (!bodyA.enabled || !bodyA.active || bodyA.object.active === false) continue;
        for (const bodyB of listB) {
          if (!bodyB.enabled || !bodyB.active || bodyB.object.active === false) continue;
          if (bodyA === bodyB) continue;
          if (this._intersects(bodyA, bodyB)) return true;
        }
      }
      return false;
    }

    /** Immediately separate two targets and invoke `callback(objA, objB)`. */
    collideNow(a, b, callback) {
      const listA = this._bodiesOf(a);
      const listB = this._bodiesOf(b);
      let hit = false;
      listA.forEach((bodyA) => {
        listB.forEach((bodyB) => {
          if (bodyA === bodyB) return;
          if (!bodyA.enabled || !bodyB.enabled) return;
          if (!this._intersects(bodyA, bodyB)) return;
          hit = true;
          if (!bodyA.isSensor && !bodyB.isSensor) this._separate(bodyA, bodyB);
          this._notify(bodyA, bodyB, callback);
        });
      });
      return hit;
    }

    _intersects(a, b) {
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    }

    /** Cast a ray and return the nearest hit, or null. */
    raycast(x1, y1, x2, y2, options) {
      const opts = options || {};
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      if (length === 0) return null;
      const dirX = dx / length;
      const dirY = dy / length;
      const targets = opts.targets ? this._bodiesOf(opts.targets) : this.bodies;
      let best = null;
      targets.forEach((body) => {
        if (!body.enabled || (body.isSensor && !opts.includeSensors)) return;
        const rect = { x: body.x, y: body.y, width: body.width, height: body.height };
        const hit = this._rayVsRect(x1, y1, dirX, dirY, length, rect);
        if (hit && (!best || hit.distance < best.distance)) {
          best = {
            body,
            object: body.object,
            x: x1 + dirX * hit.distance,
            y: y1 + dirY * hit.distance,
            distance: hit.distance,
            normalX: hit.normalX,
            normalY: hit.normalY
          };
        }
      });
      return best;
    }
    _rayVsRect(ox, oy, dx, dy, maxDistance, rect) {
      let tmin = 0;
      let tmax = maxDistance;
      let normalX = 0;
      let normalY = 0;
      if (Math.abs(dx) < 1e-8) {
        if (ox < rect.x || ox > rect.x + rect.width) return null;
      } else {
        const invDx = 1 / dx;
        let t1 = (rect.x - ox) * invDx;
        let t2 = (rect.x + rect.width - ox) * invDx;
        if (t1 > t2) [t1, t2] = [t2, t1];
        if (t1 > tmin) {
          tmin = t1;
          normalX = dx > 0 ? -1 : 1;
          normalY = 0;
        }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return null;
      }
      if (Math.abs(dy) < 1e-8) {
        if (oy < rect.y || oy > rect.y + rect.height) return null;
      } else {
        const invDy = 1 / dy;
        let t1 = (rect.y - oy) * invDy;
        let t2 = (rect.y + rect.height - oy) * invDy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        if (t1 > tmin) {
          tmin = t1;
          normalX = 0;
          normalY = dy > 0 ? -1 : 1;
        }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return null;
      }
      return { distance: tmin, normalX, normalY };
    }

    queryRect(x, y, width, height) {
      const rect = { x, y, width, height };
      return this.bodies.filter((body) => {
        return (
          body.x < rect.x + rect.width &&
          body.x + body.width > rect.x &&
          body.y < rect.y + rect.height &&
          body.y + body.height > rect.y
        );
      });
    }
    queryPoint(x, y) {
      return this.bodies.filter(
        (body) => x >= body.x && x <= body.x + body.width && y >= body.y && y <= body.y + body.height
      );
    }

    _notify(a, b, callback) {
      a.collisionCount += 1;
      b.collisionCount += 1;
      if (callback) callback(a.object, b.object);
      if (a.onCollide) a.onCollide(b.object, a);
      if (b.onCollide) b.onCollide(a.object, b);
      if (a.object && a.object.events) {
        a.object.events.emit(a.isSensor || b.isSensor ? 'overlap' : 'collide', b.object);
      }
      if (b.object && b.object.events) {
        b.object.events.emit(a.isSensor || b.isSensor ? 'overlap' : 'collide', a.object);
      }
      this.events.emit('collision', a.object, b.object);
    }

    _separate(a, b) {
      const aLeft = a.x;
      const aRight = a.x + a.width;
      const bLeft = b.x;
      const bRight = b.x + b.width;
      const aTop = a.y;
      const aBottom = a.y + a.height;
      const bTop = b.y;
      const bBottom = b.y + b.height;
      const overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
      const overlapY = Math.min(aBottom, bBottom) - Math.max(aTop, bTop);
      if (overlapX <= 0 || overlapY <= 0) return null;

      const aCenterX = aLeft + a.width / 2;
      const bCenterX = bLeft + b.width / 2;
      const aCenterY = aTop + a.height / 2;
      const bCenterY = bTop + b.height / 2;

      let axis = 'x';
      let amount = overlapX;
      let direction = aCenterX < bCenterX ? -1 : 1;
      if (overlapY < overlapX) {
        axis = 'y';
        amount = overlapY;
        direction = aCenterY < bCenterY ? -1 : 1;
      }

      if (axis === 'y') {
        if (direction === -1) {
          a.blocked.down = true;
          b.blocked.up = true;
        } else {
          a.blocked.up = true;
          b.blocked.down = true;
        }
      } else if (direction === -1) {
        a.blocked.right = true;
        b.blocked.left = true;
      } else {
        a.blocked.left = true;
        b.blocked.right = true;
      }

      if (a.immovable && b.immovable) {
        return { axis, amount, direction };
      }
      if (a.immovable) {
        b._moveBy(-direction * amount, axis === 'y' ? -direction * amount : 0);
        if (axis === 'y' && b.velocity.y * direction > 0) {
          b.velocity.y = -b.velocity.y * b.bounce;
        }
        if (axis === 'x' && b.velocity.x * direction > 0) {
          b.velocity.x = -b.velocity.x * b.bounce;
        }
      } else if (b.immovable) {
        a._moveBy(direction * amount, axis === 'y' ? direction * amount : 0);
        if (axis === 'y' && a.velocity.y * direction < 0) {
          a.velocity.y = -a.velocity.y * a.bounce;
        }
        if (axis === 'x' && a.velocity.x * direction < 0) {
          a.velocity.x = -a.velocity.x * a.bounce;
        }
      } else {
        const half = amount / 2;
        if (axis === 'y') {
          a._moveBy(0, direction * half);
          b._moveBy(0, -direction * half);
          if (a.velocity.y * direction < 0) a.velocity.y = -a.velocity.y * a.bounce;
          if (b.velocity.y * direction > 0) b.velocity.y = -b.velocity.y * b.bounce;
        } else {
          a._moveBy(direction * half, 0);
          b._moveBy(-direction * half, 0);
          if (a.velocity.x * direction < 0) a.velocity.x = -a.velocity.x * a.bounce;
          if (b.velocity.x * direction > 0) b.velocity.x = -b.velocity.x * b.bounce;
        }
      }
      return { axis, amount, direction };
    }

    /** Advance the world using a fixed timestep accumulator. */
    step(delta) {
      if (!this.enabled || this.bodies.length === 0) {
        this._processColliders();
        return;
      }
      const dt = (delta || 0) * this.timeScale;
      this.accumulator += dt;
      let steps = 0;
      const start = Date.now();
      while (this.accumulator >= this.fixedStep && steps < this.maxSubSteps) {
        this._integrate(this.fixedStep);
        this.accumulator -= this.fixedStep;
        steps += 1;
      }
      if (this.accumulator > this.fixedStep * this.maxSubSteps) this.accumulator = 0;
      this._processColliders();
      this.stats.steps = steps;
      this.stats.time = Date.now() - start;
    }

    _integrate(dt) {
      this.bodies.forEach((body) => {
        body.blocked.up = false;
        body.blocked.down = false;
        body.blocked.left = false;
        body.blocked.right = false;
        body.touching.none = true;
        if (!body.enabled || !body.active || body.object.active === false) return;
        if (body.immovable) return;

        if (body.allowGravity) {
          body.velocity.x += (this.gravity.x + body.gravity.x) * dt;
          body.velocity.y += (this.gravity.y + body.gravity.y) * dt;
        }
        body.velocity.x += body.acceleration.x * dt;
        body.velocity.y += body.acceleration.y * dt;

        if (body.drag.x) {
          const amount = body.drag.x * dt;
          if (Math.abs(body.velocity.x) <= amount) body.velocity.x = 0;
          else body.velocity.x -= Math.sign(body.velocity.x) * amount;
        }
        if (body.drag.y) {
          const amount = body.drag.y * dt;
          if (Math.abs(body.velocity.y) <= amount) body.velocity.y = 0;
          else body.velocity.y -= Math.sign(body.velocity.y) * amount;
        }
        if (body.maxVelocity.x !== Infinity) {
          body.velocity.x = MathUtils.clamp(body.velocity.x, -body.maxVelocity.x, body.maxVelocity.x);
        }
        if (body.maxVelocity.y !== Infinity) {
          body.velocity.y = MathUtils.clamp(body.velocity.y, -body.maxVelocity.y, body.maxVelocity.y);
        }

        body._moveBy(body.velocity.x * dt, body.velocity.y * dt);

        if (body.collideWorldBounds && this.bounds) {
          const b = this.bounds;
          let collided = false;
          if (body.x < b.x) {
            body._moveBy(b.x - body.x, 0);
            body.velocity.x = Math.abs(body.velocity.x) * body.bounce;
            body.blocked.left = true;
            collided = true;
          } else if (body.x + body.width > b.x + b.width) {
            body._moveBy(b.x + b.width - (body.x + body.width), 0);
            body.velocity.x = -Math.abs(body.velocity.x) * body.bounce;
            body.blocked.right = true;
            collided = true;
          }
          if (body.y < b.y) {
            body._moveBy(0, b.y - body.y);
            body.velocity.y = Math.abs(body.velocity.y) * body.bounce;
            body.blocked.up = true;
            collided = true;
          } else if (body.y + body.height > b.y + b.height) {
            body._moveBy(0, b.y + b.height - (body.y + body.height));
            body.velocity.y = -Math.abs(body.velocity.y) * body.bounce;
            body.blocked.down = true;
            collided = true;
          }
          if (collided) {
            if (body.onWorldBounds) body.onWorldBounds(body);
            this.events.emit('world-bounds', body);
          }
        }
      });
    }

    _processColliders() {
      this.colliders.forEach((collider) => {
        if (!collider.active) return;
        if (collider.tilemap) {
          this.collideTilemap(collider.a, collider.tilemap, collider.callback);
          return;
        }
        const listA = this._bodiesOf(collider.a);
        const listB = this._bodiesOf(collider.b);
        listA.forEach((bodyA) => {
          if (!bodyA.enabled || !bodyA.active || bodyA.object.active === false) return;
          listB.forEach((bodyB) => {
            if (bodyA === bodyB) return;
            if (!bodyB.enabled || !bodyB.active || bodyB.object.active === false) return;
            if (!this._intersects(bodyA, bodyB)) return;
            this.stats.pairs += 1;
            if (!collider.overlapOnly && !bodyA.isSensor && !bodyB.isSensor) {
              this._separate(bodyA, bodyB);
            }
            this._notify(bodyA, bodyB, collider.callback);
          });
        });
      });
    }

    /**
     * Resolve a game object against solid tiles of a tilemap.
     * Call from `update()` or register via `world.addTilemapCollider`.
     */
    collideTilemap(object, tilemap, callback) {
      if (!object || !tilemap || typeof tilemap.getSolidTilesInRect !== 'function') return 0;
      const body = object.body;
      const rect = body
        ? { x: body.x, y: body.y, width: body.width, height: body.height }
        : { x: object.x, y: object.y, width: object.width, height: object.height };
      const tiles = tilemap.getSolidTilesInRect(rect.x, rect.y, rect.width, rect.height);
      let hits = 0;
      tiles.forEach((tile) => {
        const overlapX =
          Math.min(rect.x + rect.width, tile.x + tile.width) - Math.max(rect.x, tile.x);
        const overlapY =
          Math.min(rect.y + rect.height, tile.y + tile.height) - Math.max(rect.y, tile.y);
        if (overlapX <= 0 || overlapY <= 0) return;
        hits += 1;
        const useX = overlapX < overlapY;
        const amount = useX ? overlapX : overlapY;
        const tileCenterX = tile.x + tile.width / 2;
        const tileCenterY = tile.y + tile.height / 2;
        const objCenterX = rect.x + rect.width / 2;
        const objCenterY = rect.y + rect.height / 2;
        const dirX = objCenterX < tileCenterX ? -1 : 1;
        const dirY = objCenterY < tileCenterY ? -1 : 1;
        if (useX) {
          object.x += dirX * amount;
          if (body) {
            if (body.velocity.x * dirX < 0) body.velocity.x = -body.velocity.x * body.bounce;
            body.blocked[dirX < 0 ? 'right' : 'left'] = true;
          }
        } else {
          object.y += dirY * amount;
          if (body) {
            if (body.velocity.y * dirY < 0) body.velocity.y = -body.velocity.y * body.bounce;
            body.blocked[dirY < 0 ? 'down' : 'up'] = true;
          }
        }
        if (callback) callback(object, tile);
        if (tilemap.events) tilemap.events.emit('tile-collision', object, tile);
        rect.x = object.x + (body ? body.offsetX : 0);
        rect.y = object.y + (body ? body.offsetY : 0);
      });
      if (object.events && hits) object.events.emit('tile-collide', tilemap, hits);
      return hits;
    }

    addTilemapCollider(object, tilemap, callback) {
      const collider = {
        id: uid('collider'),
        a: object,
        b: null,
        tilemap,
        callback: callback || null,
        overlapOnly: false,
        scene: object.scene || null,
        active: true
      };
      this.colliders.push(collider);
      collider.handle = {
        id: collider.id,
        remove: () => this.removeCollider(collider),
        pause: () => {
          collider.active = false;
        },
        resume: () => {
          collider.active = true;
        }
      };
      return collider.handle;
    }
  }

/* ---- 30-gameobjects.js ---- */
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

/* ---- 40-effects.js ---- */
  const TWEEN_RESERVED = [
    'targets',
    'target',
    'duration',
    'delay',
    'ease',
    'easing',
    'yoyo',
    'repeat',
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
            this._write(target, key, MathUtils.lerp(0, 1, eased) < 0.5 ? prop.start : prop.end);
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
          this._apply(0);
          return;
        }
        if (this.repeat === -1 || this.repeatCount < this.repeat) {
          if (this.repeat !== -1) this.repeatCount += 1;
          this.direction = 1;
          this.elapsed = 0;
          this._apply(0);
          if (this.onRepeat) this.onRepeat(this, this.repeatCount);
          if (this.hold > 0) this.holdElapsed = this.hold;
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
      this.state = 'running';
      this.direction = 1;
      this.elapsed = this.duration;
      this._advance(0.0001);
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
    pauseAll() {
      Object.keys(this.anims).forEach(() => {});
      return this;
    }
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
          const size = this.config.size * scale;
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
            const size = this.config.size * scale;
            ctx.fillRect(-size / 2, -size / 2, size, size);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, (this.config.size * scale) / 2), 0, Math.PI * 2);
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

/* ---- 50-scene.js ---- */
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
      this._fadeTween = null;
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
      this.zoom = MathUtils.clamp(value, 0.05, 20);
      this._clamp();
      return this;
    }
    zoomTo(value, duration, ease) {
      if (!this.scene || !this.scene.tweens || !duration) {
        return this.setZoom(value);
      }
      this.scene.tweens.add({
        targets: this,
        zoom: value,
        duration,
        ease: ease || 'sine.inOut'
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

/* ---- 60-game.js ---- */
  /**
   * Game core: canvas, main loop, scene registry, loading screen, global
   * systems, debug overlay and an AI-readable capability manifest.
   */
  class Game {
    constructor(config) {
      const cfg = config || {};
      this.config = cfg;
      this.width = cfg.width || 800;
      this.height = cfg.height || 600;
      this.backgroundColor = cfg.backgroundColor || '#181825';
      this.pixelRatio =
        cfg.pixelRatio ||
        (global.devicePixelRatio ? Math.min(2, global.devicePixelRatio) : 1);
      this.scaleMode = cfg.scaleMode || 'fit';
      this.autoResize = cfg.autoResize !== false && this.scaleMode !== 'none';
      this.fixedStep = cfg.fixedStep || 1 / 60;
      this.maxDelta = cfg.maxDelta || 0.1;
      this.timeScale = cfg.timeScale === undefined ? 1 : cfg.timeScale;
      this.pauseOnHidden = cfg.pauseOnHidden !== false;
      this.antialias = cfg.antialias !== false;
      this.debugKey = cfg.debugKey === undefined ? 'Backquote' : cfg.debugKey;

      this.parent =
        typeof cfg.parent === 'string'
          ? document.getElementById(cfg.parent) || document.body
          : cfg.parent || document.body;
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'chroms-canvas';
      this.canvas.style.display = 'block';
      this.canvas.style.margin = '0 auto';
      this.canvas.style.outline = 'none';
      this.canvas.style.touchAction = 'none';
      this.parent.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = this.antialias;

      this.events = new EventEmitter();
      this.load = new AssetLoader(this);
      this.input = new InputManager(this.canvas, this);
      this.sound = new SoundManager(this.load);
      this.physics = new PhysicsWorld({
        game: this,
        gravity: cfg.gravity || (cfg.physics && cfg.physics.gravity),
        enabled: !(cfg.physics && cfg.physics.enabled === false),
        fixedStep: (cfg.physics && cfg.physics.fixedStep) || 1 / 120,
        maxSubSteps: cfg.physics && cfg.physics.maxSubSteps,
        debug: !!(cfg.physics && cfg.physics.debug)
      });
      this.anims = new AnimationManager(this);
      this.tweens = new TweenManager(this);
      this.time = new TimerManager(this);
      this.storage = new SaveManager(cfg.storagePrefix || 'chroms');
      this.seed = cfg.seed;
      this.random = new Random(cfg.seed);
      this.plugins = {};
      const self = this;
      this.scale = {
        mode: this.scaleMode,
        pixelRatio: this.pixelRatio,
        get width() {
          return self.width;
        },
        get height() {
          return self.height;
        },
        resize: () => {
          this.resize();
          return this;
        }
      };

      this.scenes = {};
      this.sceneOrder = [];
      this.currentScene = null;
      this.running = false;
      this.paused = false;
      this.elapsed = 0;
      this.delta = 0;
      this.fps = 0;
      this.frameCount = 0;
      this.transition = { alpha: 0, color: '#000000' };
      this.loadingStyle = Object.assign(
        {
          text: 'Loading...',
          barColor: '#89b4fa',
          trackColor: 'rgba(255,255,255,0.12)',
          textColor: '#cdd6f4',
          show: true
        },
        cfg.loading || {}
      );
      this.debug = {
        enabled: !!cfg.debug,
        showFps: true,
        showBodies: true,
        showPointers: false,
        _fpsSamples: [],
        toggle() {
          this.enabled = !this.enabled;
          return this.enabled;
        },
        draw: (ctx) => this._drawDebug(ctx)
      };

      this._lastTime = 0;
      this._fpsTime = 0;
      this._fpsFrames = 0;
      this._raf = null;
      this._listeners = [];
      this._cleanupFns = [];
      this._registerLifecycle();
      this.resize();

      const scenes = cfg.scenes || cfg.scene;
      if (scenes) {
        (Array.isArray(scenes) ? scenes : [scenes]).forEach((SceneClass) =>
          this.addScene(SceneClass)
        );
        const startKey = cfg.startScene || (this.sceneOrder.length ? this.sceneOrder[0] : null);
        if (startKey) this.startScene(startKey);
      }

      (cfg.plugins || []).forEach((plugin) => this.use(plugin));

      const onGesture = () => this.sound.unlock();
      document.addEventListener('pointerdown', onGesture);
      document.addEventListener('keydown', onGesture);
      this._cleanupFns.push(() => {
        document.removeEventListener('pointerdown', onGesture);
        document.removeEventListener('keydown', onGesture);
      });

      this.events.emit('ready', this);
      if (cfg.autoStart !== false) this.start();
    }

    _registerLifecycle() {
      const onResize = () => {
        if (this.autoResize) this.resize();
      };
      global.addEventListener('resize', onResize);
      const onVisibility = () => {
        this.events.emit('visibility', document.hidden);
      };
      document.addEventListener('visibilitychange', onVisibility);
      this._cleanupFns.push(() => {
        global.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
      });
    }

    /** Register a scene class or instance. */
    addScene(SceneClass) {
      let scene;
      if (typeof SceneClass === 'function') {
        scene = new SceneClass();
      } else {
        scene = SceneClass;
      }
      if (!scene || !scene.key) {
        throw new Error('[Chroms] A scene needs a key (super("MyScene")).');
      }
      if (!scene._bound) scene._bind(this);
      this.scenes[scene.key] = scene;
      if (this.sceneOrder.indexOf(scene.key) === -1) this.sceneOrder.push(scene.key);
      this.events.emit('scene-added', scene);
      return scene;
    }
    getScene(key) {
      return this.scenes[key] || null;
    }
    removeScene(key) {
      if (this.currentScene && this.currentScene.key === key) {
        this._cleanupScene(this.currentScene);
        this.currentScene = null;
      }
      delete this.scenes[key];
      this.sceneOrder = this.sceneOrder.filter((item) => item !== key);
      return this;
    }

    /** Switch to a scene. Options: fade (ms), fadeColor. */
    startScene(key, data, options) {
      if (!this.scenes[key]) {
        console.error('[Chroms] Scene not found: ' + key);
        return null;
      }
      const opts = options || {};
      const fade = opts.fade === undefined ? 0 : opts.fade;
      if (fade > 0) {
        this.transition.color = opts.fadeColor || '#000000';
        this.tweens.add({
          targets: this.transition,
          alpha: 1,
          duration: fade / 2,
          ease: 'sine.in',
          onComplete: () => {
            this._activateScene(key, data);
            this.tweens.add({
              targets: this.transition,
              alpha: 0,
              duration: fade / 2,
              ease: 'sine.out'
            });
          }
        });
        return this.scenes[key];
      }
      return this._activateScene(key, data);
    }
    _activateScene(key, data) {
      const scene = this.scenes[key];
      if (!scene) return null;
      if (this.currentScene && this.currentScene !== scene) {
        const previous = this.currentScene;
        previous.status = 'stopped';
        if (typeof previous.shutdown === 'function') previous.shutdown();
        this.events.emit('scene-stop', previous);
        this._cleanupScene(previous);
      } else if (this.currentScene === scene) {
        const previous = this.currentScene;
        if (typeof previous.shutdown === 'function') previous.shutdown();
        this._cleanupScene(previous);
      }
      this.currentScene = scene;
      scene.data = data || {};
      scene.status = 'loading';
      scene.init(data || {});
      this.events.emit('scene-start', scene);
      scene.preload();
      const loadingKey = scene.key;
      this.load.start(
        (progress) => {
          scene.loadProgress = progress;
          this.events.emit('scene-load-progress', scene, progress);
        },
        () => {
          if (this.currentScene !== scene) return;
          scene.status = 'running';
          scene.create();
          this.events.emit('scene-create', scene);
        }
      );
      return scene;
    }
    stopScene(key) {
      const scene = key ? this.scenes[key] : this.currentScene;
      if (!scene) return this;
      if (typeof scene.shutdown === 'function') scene.shutdown();
      this._cleanupScene(scene);
      scene.status = 'stopped';
      if (this.currentScene === scene) this.currentScene = null;
      this.events.emit('scene-stop', scene);
      return this;
    }
    _cleanupScene(scene) {
      if (!scene) return;
      if (scene.camera) {
        scene.camera.fadeAlpha = 0;
        scene.camera.flashAlpha = 0;
        scene.camera.stopFollow();
        scene.camera.clearBounds();
        scene.camera.setZoom(1);
        scene.camera.scrollTo(0, 0);
        scene.camera.shakeTime = 0;
        scene.camera.shakeOffset.set(0, 0);
      }
      scene.children.slice().forEach((child) => {
        if (child && !child.destroyed) child.destroy(true);
      });
      scene.children = [];
      scene._fixedAccumulator = 0;
      if (scene.tweens) scene.tweens.removeAll();
      if (scene.time) scene.time.clear();
      this.physics.removeScene(scene);
      scene.events.emit('cleanup');
    }
    pauseScene(key) {
      const scene = key ? this.scenes[key] : this.currentScene;
      if (scene) scene.pause();
      return this;
    }
    resumeScene(key) {
      const scene = key ? this.scenes[key] : this.currentScene;
      if (scene) scene.resume();
      return this;
    }
    sleepScene(key) {
      const scene = key ? this.scenes[key] : this.currentScene;
      if (scene) scene.sleep();
      return this;
    }
    wakeScene(key) {
      const scene = key ? this.scenes[key] : this.currentScene;
      if (scene) scene.wake();
      return this;
    }

    start() {
      if (this.running) return this;
      this.running = true;
      this._lastTime = performance.now();
      this._fpsTime = this._lastTime;
      this._raf = requestAnimationFrame((time) => this._loop(time));
      this.events.emit('start', this);
      return this;
    }
    stop() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
      this.events.emit('stop', this);
      return this;
    }
    pause() {
      this.paused = true;
      this.events.emit('pause', this);
      return this;
    }
    resume() {
      this.paused = false;
      this._lastTime = performance.now();
      this.events.emit('resume', this);
      return this;
    }
    togglePause() {
      return this.paused ? this.resume() : this.pause();
    }
    setTimeScale(value) {
      this.timeScale = value;
      return this;
    }
    setBackgroundColor(color) {
      this.backgroundColor = color;
      return this;
    }

    _loop(timestamp) {
      if (!this.running) return;
      this._raf = requestAnimationFrame((time) => this._loop(time));
      const rawDt = Math.min((timestamp - this._lastTime) / 1000, this.maxDelta) || 0;
      this._lastTime = timestamp;
      this.delta = rawDt * this.timeScale;
      this.elapsed += this.delta;
      this.frameCount += 1;

      if (this.debugKey && this.input.isJustDown(this.debugKey)) {
        this.debug.toggle();
        this.events.emit('debug-toggle', this.debug.enabled);
      }

      this.input.update();
      this.sound.update(this.delta);

      if (!this.paused) {
        if (document.hidden && this.pauseOnHidden) {
          /* skip simulation while hidden */
        } else {
          const scene = this.currentScene;
          if (scene && scene.status === 'running') {
            scene._update(this.delta);
            this.physics.step(this.delta);
          }
          this.tweens.update(this.delta);
          this.time.update(this.delta);
          this.events.emit('preupdate', this.delta);
          this.events.emit('postupdate', this.delta);
        }
      }

      this.render();
      this.input.clearFrameState();
      this._updateFps(rawDt);
    }

    _updateFps(rawDt) {
      this._fpsFrames += 1;
      this._fpsTime += rawDt;
      if (this._fpsTime >= 0.5) {
        this.fps = Math.round(this._fpsFrames / this._fpsTime);
        this._fpsFrames = 0;
        this._fpsTime = 0;
      }
    }

    render() {
      const ctx = this.ctx;
      const ratio = this.pixelRatio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = this.antialias;
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);
      if (this.currentScene) {
        this.currentScene._render(ctx);
      }
      if (this.load.isLoading && this.loadingStyle.show) {
        this._drawLoading(ctx);
      }
      if (this.transition.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = MathUtils.clamp01(this.transition.alpha);
        ctx.fillStyle = this.transition.color;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }
      if (this.debug.enabled) this._drawDebug(ctx);
    }

    _drawLoading(ctx) {
      const width = Math.min(440, this.width - 80);
      const x = (this.width - width) / 2;
      const y = this.height / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(17,17,27,0.7)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = this.loadingStyle.trackColor;
      ctx.fillRect(x, y, width, 10);
      ctx.fillStyle = this.loadingStyle.barColor;
      ctx.fillRect(x, y, width * MathUtils.clamp01(this.load.progress), 10);
      ctx.fillStyle = this.loadingStyle.textColor;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        this.loadingStyle.text + ' ' + Math.round(this.load.progress * 100) + '%',
        this.width / 2,
        y - 12
      );
      ctx.restore();
    }

    _drawDebug(ctx) {
      const camera = this.currentScene ? this.currentScene.camera : null;
      ctx.save();
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      if (this.debug.showFps) {
        const objects = this.currentScene ? this.currentScene.children.length : 0;
        const lines = [
          'FPS ' + this.fps,
          'objects ' + objects,
          'bodies ' + this.physics.bodies.length,
          'scene ' + (this.currentScene ? this.currentScene.key : '-')
        ];
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(8, 8, 150, 16 * lines.length + 8);
        ctx.fillStyle = '#a6e3a1';
        lines.forEach((line, index) => {
          ctx.fillText(line, 14, 13 + index * 16);
        });
      }
      if (this.debug.showBodies && camera) {
        ctx.strokeStyle = 'rgba(250,179,135,0.9)';
        ctx.lineWidth = 1;
        this.physics.bodies.forEach((body) => {
          if (!body.enabled || !body.active) return;
          const topLeft = camera.worldToScreen(body.x, body.y);
          ctx.strokeRect(
            topLeft.x,
            topLeft.y,
            body.width * camera.zoom,
            body.height * camera.zoom
          );
        });
      }
      if (this.debug.showPointers) {
        const pointer = this.input.pointer;
        ctx.fillStyle = '#f38ba8';
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    resize() {
      const ratio = this.pixelRatio;
      this.canvas.width = Math.round(this.width * ratio);
      this.canvas.height = Math.round(this.height * ratio);
      const mode = this.scaleMode;
      if (mode === 'none') {
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
      } else if (mode === 'stretch') {
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
      } else {
        const isBody = this.parent === document.body;
        const availableW = isBody
          ? (global.innerWidth || document.documentElement.clientWidth) * 0.96
          : this.parent.clientWidth || this.width;
        const availableH = isBody
          ? (global.innerHeight || document.documentElement.clientHeight) * 0.96
          : this.parent.clientHeight || this.height;
        const scale = Math.min(availableW / this.width, availableH / this.height);
        this.canvas.style.width = Math.round(this.width * scale) + 'px';
        this.canvas.style.height = Math.round(this.height * scale) + 'px';
      }
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.ctx.imageSmoothingEnabled = this.antialias;
      Object.keys(this.scenes || {}).forEach((key) => {
        const scene = this.scenes[key];
        if (scene.camera) scene.camera.setSize(this.width, this.height);
      });
      this.events.emit('resize', this.width, this.height);
      return this;
    }

    screenshot(type) {
      return this.canvas.toDataURL(type || 'image/png');
    }

    /** Install a plugin: a function or `{ install(game) }`. */
    use(plugin) {
      let installer = plugin;
      let name = plugin && (plugin.name || plugin.key);
      if (typeof plugin === 'string') {
        installer = Chroms.plugins[plugin];
        name = plugin;
      }
      if (!installer) {
        console.warn('[Chroms] Unknown plugin', plugin);
        return this;
      }
      try {
        if (typeof installer === 'function') installer(this);
        else if (typeof installer.install === 'function') installer.install(this);
        this.plugins[name || 'plugin'] = installer;
        this.events.emit('plugin-install', name || 'plugin', installer);
      } catch (error) {
        console.error('[Chroms] Plugin failed:', error);
      }
      return this;
    }

    /** Machine-readable engine summary (same payload as `Chroms.describe()`). */
    describe() {
      return buildManifest();
    }

    destroy() {
      this.stop();
      this.events.emit('destroy', this);
      if (this.currentScene) {
        this._cleanupScene(this.currentScene);
        this.currentScene = null;
      }
      this.sound.stopAll();
      this.input.destroy();
      this._cleanupFns.forEach((fn) => fn());
      this._cleanupFns = [];
      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      return this;
    }
  }

  /** Machine-readable summary for humans, tools and LLM agents. */
  function buildManifest() {
    return {
      name: 'Chroms',
      version: VERSION,
      runtime: 'browser',
      renderer: 'Canvas 2D',
      units: {
        duration: 'milliseconds for tweens and timers',
        angles: 'degrees in object.angle / setAngle(); radians in math helpers',
        coordinates: 'pixels, top-left origin, y grows down'
      },
      entryPoints: {
        game: 'new Chroms.Game({ width, height, parent, backgroundColor, scene: [SceneClass], gravity, debug })',
        scene:
          'class MyScene extends Chroms.Scene { constructor(){ super("MyScene"); } preload(){} create(){} update(dt){} }',
        docs: {
          llms: 'docs/llms.txt',
          english: 'docs/en/index.md',
          russian: 'docs/ru/index.md',
          apiManifest: 'docs/api.json'
        }
      },
      lifecycle: ['init(data)', 'preload()', 'create()', 'update(dt)', 'fixedUpdate(dt)', 'shutdown()'],
      systems: {
        add: [
          'sprite',
          'image',
          'rect',
          'circle',
          'line',
          'text',
          'tileSprite',
          'container',
          'group',
          'particles',
          'tilemap',
          'button',
          'joystick',
          'existing'
        ],
        physics:
          'AABB world: body enablePhysics({...}), setVelocity, setGravityY, setBounce, setImmovable, collideWorldBounds; world.collide/overlap/addCollider/raycast/collideTilemap',
        input:
          'input.isDown(code), isJustDown, addAction(name, codes), actionDown(name), pointer {x,y,worldX,worldY,isDown,justDown}, enableDrag(object), gamepad helpers',
        tweens: 'scene.tweens.add({ targets, x, y, alpha, duration, ease, yoyo, repeat, delay, onComplete })',
        timers: 'scene.time.delayedCall(ms, fn), scene.time.addEvent({ delay, loop, callback })',
        animation:
          'game.anims.create({ key, spritesheet, frames|start/end, frameRate, repeat, yoyo }); sprite.play(key)',
        particles:
          'scene.add.particles(x, y, { speed, lifespan, quantity, frequency, colors, gravityY, emitZone })',
        camera:
          'scene.camera.follow(target, { lerpX, lerpY, offsetX, offsetY }); setBounds, setZoom, shake, fadeOut',
        storage: 'game.storage.save(key, value), load(key, fallback)',
        audio:
          'scene.sound.play(key), musicPlay(key, { fade }), beep({ frequency }), mute/toggleMute',
        tilemap:
          'scene.add.tilemap(jsonOrKey) with layers, tileset, solid; physics.collideTilemap(object, map)'
      },
      gotchas: [
        'Physics is AABB only; rotated sprites use their unrotated box.',
        'Call scene.physics.collide/addCollider once; the world checks the pair every fixed step.',
        'Set velocities in update(); the physics step runs after scene.update.',
        'Scene tweens/timers are destroyed on scene switch; use game.tweens/game.time for global ones.',
        'Assets must be queued in preload(); create() runs after loading.',
        'Pointer world coordinates are in scene.camera space and refreshed once per frame.',
        'Canvas text uses style.baseline (top by default) and origin top-left unless setOrigin is called.'
      ],
      aiRecipe: [
        'Read docs/llms.txt for a compact API map.',
        'Extend Chroms.Scene, queue assets in preload(), build the world in create().',
        'Use update(dt) for input and setVelocity; register collisions once with scene.physics.addCollider.',
        'Use scene.tweens / scene.time for effects and game.storage for persistence.'
      ]
    };
  }

  /** Register a named plugin usable via `game.use('name')`. */
  Chroms.registerPlugin = function registerPlugin(name, installer) {
    Chroms.plugins[name] = installer;
    return Chroms;
  };

  Chroms.createGame = function createGame(config) {
    return new Game(config);
  };

  Object.assign(Chroms, {
    Game,
    Scene,
    Camera,
    Tilemap,
    GameObject,
    Sprite,
    Rect,
    Circle,
    Line,
    Text,
    TileSprite,
    Container,
    Group,
    Button,
    Joystick,
    ParticleEmitter,
    Body,
    PhysicsWorld,
    InputManager,
    AssetLoader,
    SoundManager,
    Tween,
    TweenManager,
    Timer,
    TimerManager,
    AnimationManager
  });

  Chroms.describe = function describe() {
    return buildManifest();
  };

  global.Chroms = Chroms;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chroms;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
