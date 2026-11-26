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
