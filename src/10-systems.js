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
