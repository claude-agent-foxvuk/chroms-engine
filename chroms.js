/**
 * Chroms Engine v1.0
 * Модульный 2D-движок для браузерных игр
 */

const Chroms = {
  // Главный класс инициализации игры
  Game: class {
    constructor(config) {
      this.width = config.width || 800;
      this.height = config.height || 600;
      this.backgroundColor = config.backgroundColor || '#181825';
      this.scenes = {};
      this.currentScene = null;
      this.lastTime = 0;

      // Создание холста
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.display = 'block';
      this.canvas.style.margin = '0 auto';
      
      const container = config.parent ? document.getElementById(config.parent) : document.body;
      container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      // Подсистемы движка
      this.input = new Chroms.InputManager(this.canvas);
      this.load = new Chroms.AssetLoader();
      this.sound = new Chroms.SoundManager(this.load);
      this.physics = new Chroms.PhysicsEngine();

      // Регистрация сцен
      if (config.scene) {
        const sceneList = Array.isArray(config.scene) ? config.scene : [config.scene];
        sceneList.forEach((SceneClass) => {
          const instance = new SceneClass(this);
          this.scenes[instance.key] = instance;
        });
        // Запуск первой сцены
        const firstKey = Object.keys(this.scenes)[0];
        this.startScene(firstKey);
      }

      requestAnimationFrame((t) => this.loop(t));
    }

    startScene(key, data = {}) {
      if (!this.scenes[key]) {
        console.error(`[Chroms] Сцена "${key}" не найдена.`);
        return;
      }
      this.currentScene = this.scenes[key];
      this.currentScene.init(data);
      
      // Сначала предзагрузка, потом создание
      this.currentScene.preload();
      this.load.start(() => {
        this.currentScene.create();
      });
    }

    loop(timestamp) {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1) || 0;
      this.lastTime = timestamp;

      // Очистка экрана
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.width, this.height);

      if (this.currentScene) {
        this.currentScene.update(dt);
        this.currentScene._render(this.ctx);
      }

      this.input.clearFrameState();
      requestAnimationFrame((t) => this.loop(t));
    }
  },

  // Базовый класс Сцены
  Scene: class {
    constructor(key) {
      this.key = key;
      this.game = null;
      this.children = [];
      this.camera = { x: 0, y: 0, zoom: 1 };
    }

    // Привязка к ядру вызывается автоматически
    _bind(game) {
      this.game = game;
      this.add = {
        sprite: (x, y, w, h, colorOrKey) => {
          const obj = new Chroms.Sprite(this.game, x, y, w, h, colorOrKey);
          this.children.push(obj);
          return obj;
        },
        text: (x, y, text, style) => {
          const txt = new Chroms.Text(x, y, text, style);
          this.children.push(txt);
          return txt;
        }
      };
      this.physics = game.physics;
      this.input = game.input;
      this.load = game.load;
      this.sound = game.sound;
    }

    init(data) {}
    preload() {}
    create() {}
    update(dt) {}

    _render(ctx) {
      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);
      ctx.scale(this.camera.zoom, this.camera.zoom);

      for (const child of this.children) {
        if (child.active) {
          if (child.updatePhysics) child.updatePhysics(1 / 60);
          child.draw(ctx);
        }
      }
      ctx.restore();
    }
  },

  // Игровой объект (Спрайт)
  Sprite: class {
    constructor(game, x, y, width, height, textureOrColor = '#ffffff') {
      this.game = game;
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.textureOrColor = textureOrColor;
      this.vx = 0;
      this.vy = 0;
      this.gravityY = 0;
      this.bounce = 0;
      this.active = true;
      this.alpha = 1;
    }

    setVelocity(vx, vy) {
      this.vx = vx;
      this.vy = vy;
      return this;
    }

    setGravityY(g) {
      this.gravityY = g;
      return this;
    }

    updatePhysics(dt) {
      this.vy += this.gravityY * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      const img = this.game.load.getImage(this.textureOrColor);
      if (img) {
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
      } else {
        ctx.fillStyle = this.textureOrColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
      ctx.restore();
    }

    destroy() {
      this.active = false;
    }
  },

  // Текстовый объект
  Text: class {
    constructor(x, y, text, style = {}) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.font = style.font || '20px sans-serif';
      this.color = style.color || '#ffffff';
      this.active = true;
    }

    setText(newText) {
      this.text = newText;
    }

    draw(ctx) {
      ctx.fillStyle = this.color;
      ctx.font = this.font;
      ctx.fillText(this.text, this.x, this.y);
    }
  },

  // Менеджер ввода (Клавиатура и Мышь/Тач)
  InputManager: class {
    constructor(canvas) {
      this.keys = {};
      this.justPressed = {};
      this.pointer = { x: 0, y: 0, isDown: false };

      window.addEventListener('keydown', (e) => {
        if (!this.keys[e.code]) this.justPressed[e.code] = true;
        this.keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });
      canvas.addEventListener('pointerdown', (e) => {
        this.pointer.isDown = true;
        this._updatePointer(canvas, e);
      });
      canvas.addEventListener('pointermove', (e) => {
        this._updatePointer(canvas, e);
      });
      window.addEventListener('pointerup', () => {
        this.pointer.isDown = false;
      });
    }

    _updatePointer(canvas, e) {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
    }

    isDown(code) {
      return !!this.keys[code];
    }

    isJustDown(code) {
      return !!this.justPressed[code];
    }

    clearFrameState() {
      this.justPressed = {};
    }
  },

  // Загрузчик картинок и звуков
  AssetLoader: class {
    constructor() {
      this.queue = [];
      this.images = {};
      this.audios = {};
    }

    image(key, url) {
      this.queue.push({ type: 'image', key, url });
    }

    audio(key, url) {
      this.queue.push({ type: 'audio', key, url });
    }

    getImage(key) {
      return this.images[key] || null;
    }

    start(onComplete) {
      if (this.queue.length === 0) {
        onComplete();
        return;
      }
      let loaded = 0;
      const total = this.queue.length;
      const checkDone = () => {
        loaded++;
        if (loaded >= total) {
          this.queue = [];
          onComplete();
        }
      };

      this.queue.forEach((item) => {
        if (item.type === 'image') {
          const img = new Image();
          img.onload = checkDone;
          img.onerror = checkDone;
          img.src = item.url;
          this.images[item.key] = img;
        } else if (item.type === 'audio') {
          const aud = new Audio(item.url);
          aud.oncanplaythrough = checkDone;
          aud.onerror = checkDone;
          this.audios[item.key] = aud;
        }
      });
    }
  },

  // Звуковой модуль
  SoundManager: class {
    constructor(loader) {
      this.loader = loader;
    }
    play(key, volume = 1.0) {
      const audio = this.loader.audios[key];
      if (audio) {
        const clone = audio.cloneNode();
        clone.volume = volume;
        clone.play().catch(() => {});
      }
    }
  },

  // Физика столкновений
  PhysicsEngine: class {
    overlap(a, b) {
      if (!a.active || !b.active) return false;
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    }
  }
};

// Небольшой патч для автоматической привязки сцены при создании
const OriginalGame = Chroms.Game;
Chroms.Game = class extends OriginalGame {
  constructor(config) {
    super({ ...config, scene: null });
    if (config.scene) {
      const sceneList = Array.isArray(config.scene) ? config.scene : [config.scene];
      sceneList.forEach((SceneClass) => {
        const instance = new SceneClass();
        instance._bind(this);
        this.scenes[instance.key] = instance;
      });
      this.startScene(Object.keys(this.scenes)[0]);
    }
  }
};
