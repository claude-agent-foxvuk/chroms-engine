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
      this.catchErrors = cfg.catchErrors !== false;
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
      this.lastError = null;
      this.errorOverlay = Object.assign(
        { show: true, title: 'Chroms error' },
        cfg.errorOverlay || {}
      );
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

      (cfg.plugins || []).forEach((plugin) => this.use(plugin));

      const scenes = cfg.scenes || cfg.scene;
      if (scenes) {
        (Array.isArray(scenes) ? scenes : [scenes]).forEach((SceneClass) =>
          this.addScene(SceneClass)
        );
        const startKey = cfg.startScene || (this.sceneOrder.length ? this.sceneOrder[0] : null);
        if (startKey) this.startScene(startKey);
      }

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
      scene.events.removeAllListeners();
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

    /**
     * Crisp pixel-art rendering: disables smoothing and pins the canvas to
     * 1 device pixel per game pixel. `setPixelArt(false)` restores defaults.
     */
    setPixelArt(value) {
      const enabled = value === undefined ? true : !!value;
      this.antialias = !enabled;
      this.pixelRatio = enabled
        ? 1
        : global.devicePixelRatio
        ? Math.min(2, global.devicePixelRatio)
        : 1;
      if (this.canvas && this.canvas.style) {
        this.canvas.style.imageRendering = enabled ? 'pixelated' : '';
      }
      this.resize();
      return this;
    }

    /** Toggle browser fullscreen for the document; resolves without error if blocked. */
    toggleFullscreen() {
      const doc = global.document;
      if (!doc) return this;
      const request = doc.fullscreenElement ? doc.exitFullscreen : null;
      const target = doc.documentElement;
      const promise = request
        ? request.call(doc)
        : target && target.requestFullscreen
        ? target.requestFullscreen()
        : null;
      if (promise && promise.catch) promise.catch(() => {});
      return this;
    }

    _loop(timestamp) {
      if (!this.running) return;
      this._raf = requestAnimationFrame((time) => this._loop(time));
      const rawDt = Math.min((timestamp - this._lastTime) / 1000, this.maxDelta) || 0;
      this._lastTime = timestamp;
      this._advance(rawDt * this.timeScale);
      this._updateFps(rawDt);
    }

    /**
     * Advance by `dt` seconds without requestAnimationFrame. Defaults to
     * `game.fixedStep`. Use it for tests, replays and turn-based play.
     * `dt` is not clamped by `maxDelta`.
     */
    step(dt) {
      const seconds = dt === undefined ? this.fixedStep : dt;
      return this._advance(Math.max(0, seconds) * this.timeScale);
    }

    _advance(delta) {
      this.delta = delta;
      this.elapsed += delta;
      this.frameCount += 1;
      if (this.debugKey && this.input.isJustDown(this.debugKey)) {
        this.debug.toggle();
        this.events.emit('debug-toggle', this.debug.enabled);
      }
      this.input.update();
      this.sound.update(delta);
      if (!this.paused) {
        try {
          this._simulate(delta);
        } catch (error) {
          this._handleError(error, 'update');
        }
      }
      this.render();
      this.input.clearFrameState();
      return this;
    }

    _simulate(delta) {
      if (!(document.hidden && this.pauseOnHidden)) {
        const scene = this.currentScene;
        if (scene && scene.status === 'running') {
          scene._update(delta);
          this.physics.step(delta);
        }
      }
      this.tweens.update(delta);
      this.time.update(delta);
      this.events.emit('preupdate', delta);
      this.events.emit('postupdate', delta);
      return this;
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
      try {
        this._renderFrame();
      } catch (error) {
        this._handleError(error, 'render');
      }
      if (this.lastError) {
        try {
          this._drawErrorOverlay(this.ctx);
        } catch (error) {
          /* the canvas itself may be unusable */
        }
      }
      return this;
    }

    _renderFrame() {
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

    /**
     * Record an exception from update()/render(), log it once, emit `error`
     * and pause so the overlay stays readable. `catchErrors: false` rethrows.
     */
    _handleError(error, phase) {
      if (this.catchErrors === false) throw error;
      const name = phase || 'update';
      const message = error && error.message ? error.message : String(error);
      if (this.lastError && this.lastError.message === message) return this;
      this.lastError = {
        message,
        stack: error && error.stack ? String(error.stack) : '',
        phase: name,
        frame: this.frameCount,
        time: this.elapsed
      };
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Chroms] ' + name + ' failed:', error);
      }
      this.events.emit('error', error, name);
      if (!this.paused) this.pause();
      return this;
    }

    /** Dismiss the error overlay reported by an earlier frame. */
    clearError() {
      this.lastError = null;
      return this;
    }

    _drawErrorOverlay(ctx) {
      if (!this.errorOverlay.show || !this.lastError) return this;
      const padding = 24;
      const width = Math.min(640, this.width - padding * 2);
      const x = (this.width - width) / 2;
      const top = this.height / 2 - 92;
      ctx.save();
      ctx.fillStyle = 'rgba(17,17,27,0.88)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = 'rgba(49,50,68,0.96)';
      ctx.fillRect(x, top, width, 184);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#f38ba8';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(this.errorOverlay.title, x + padding, top + 20);
      ctx.fillStyle = '#f9e2af';
      ctx.font = '12px monospace';
      ctx.fillText(
        this.lastError.phase + '  •  frame ' + this.lastError.frame,
        x + padding,
        top + 48
      );
      ctx.fillStyle = '#cdd6f4';
      ctx.font = '14px monospace';
      this._wrapLines(ctx, this.lastError.message, width - padding * 2, 4).forEach(
        (line, index) => {
          ctx.fillText(line, x + padding, top + 74 + index * 20);
        }
      );
      ctx.fillStyle = '#6c7086';
      ctx.font = '12px monospace';
      ctx.fillText('game.clearError() dismisses this overlay', x + padding, top + 158);
      ctx.restore();
      return this;
    }

    _wrapLines(ctx, text, maxWidth, maxLines) {
      const words = String(text).split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      words.forEach((word) => {
        const test = line ? line + ' ' + word : word;
        if (line && ctx.measureText(test).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if (line) lines.push(line);
      if (maxLines && lines.length > maxLines) {
        lines.length = maxLines;
        lines[maxLines - 1] += ' …';
      }
      return lines;
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
      inspiration:
        'API shapes inspired by Phaser 3 (scenes, add factory, groups, tweens, timers, camera), independent Canvas 2D implementation',
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
          'animatedSprite',
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
      debugging: {
        step: 'game.step(dt?) advances one frame without requestAnimationFrame (tests, replays, turn-based)',
        errorOverlay:
          'an exception from update() or render() is logged once, emitted as game.events "error", drawn over the canvas and pauses the game; game.clearError() dismisses it, catchErrors: false rethrows',
        overlay: 'Backquote toggles the FPS/body debug overlay'
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
