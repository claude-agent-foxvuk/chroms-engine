  /**
   * A physics body attached to a game object. AABB based, with velocity,
   * acceleration, gravity, drag, bouncing, sensors and world bounds.
   */
  class Body {
    constructor(object, config) {
      const opts = config || {};
      this.id = uid('body');
      this.object = object;
      this._scene = object.scene || null;
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
      this.collisionGroup = opts.collisionGroup || null;
      this.collidesWith = opts.collidesWith || null;
      this.enabled = opts.enabled !== false;
      this.active = true;
      this.collisionCount = 0;
      this.touching = { none: true, up: false, down: false, left: false, right: false };
      this.blocked = { up: false, down: false, left: false, right: false };
      this.onCollide = null;
      this.onWorldBounds = null;
      this.custom = {};
    }

    /**
     * Owning scene. Read from the object, so reparenting it with addTo()
     * keeps the physics scene filter correct.
     */
    get scene() {
      const owner = this.object;
      if (owner && owner.scene !== undefined) return owner.scene || null;
      return this._scene;
    }
    set scene(value) {
      this._scene = value || null;
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
    /** Name this body's collision layer, e.g. 'player'. */
    setCollisionGroup(group) {
      this.collisionGroup = group || null;
      return this;
    }
    /** Layer names this body may collide with: array, Set or '*'. */
    setCollidesWith(groups) {
      this.collidesWith = groups || null;
      return this;
    }
    /** Point the velocity at an angle in degrees. */
    setVelocityFromAngle(degrees, speed) {
      const radians = MathUtils.degToRad(degrees);
      const value = speed === undefined ? 100 : speed;
      this.velocity.set(Math.cos(radians) * value, Math.sin(radians) * value);
      return this;
    }
    setEnabled(value) {
      this.enabled = !!value;
      return this;
    }
    setAllowSleep() {
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

  /** True when `list` (array, Set, string or '*') allows a collision with `group`. */
  function groupListAllows(list, group) {
    if (!list) return true;
    const name = group || 'default';
    if (list === '*' || list === true) return true;
    if (Array.isArray(list)) return list.indexOf('*') !== -1 || list.indexOf(name) !== -1;
    if (list instanceof Set) return list.has('*') || list.has(name);
    if (typeof list === 'string') return list === '*' || list === name;
    return true;
  }

  /** Per-body layer/mask check, independent of the world matrix. */
  function bodiesAllowCollision(a, b) {
    if (!a.collidesWith && !b.collidesWith) return true;
    if (a.collidesWith && !groupListAllows(a.collidesWith, b.collisionGroup)) return false;
    if (b.collidesWith && !groupListAllows(b.collidesWith, a.collisionGroup)) return false;
    return true;
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
      this.collisionMatrix = null;
      this._cache = null;
      this._sceneFilter = null;
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
        scene:
          (a && a.scene) ||
          (b && b.scene) ||
          (this.game && this.game.currentScene) ||
          null,
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

    /**
     * Collision layers as a matrix, e.g.
     * `world.setCollisionMatrix({ player: ['enemy'], enemy: ['player'] })`.
     * Pass null to remove the matrix.
     */
    setCollisionMatrix(matrix) {
      this.collisionMatrix = matrix || null;
      return this;
    }
    _allowsPair(a, b) {
      if (!bodiesAllowCollision(a, b)) return false;
      const matrix = this.collisionMatrix;
      if (!matrix) return true;
      const groupA = a.collisionGroup || 'default';
      const groupB = b.collisionGroup || 'default';
      const listA = matrix[groupA];
      const listB = matrix[groupB];
      if (!listA && !listB) return true;
      if (listA && groupListAllows(listA, b.collisionGroup)) return true;
      if (listB && groupListAllows(listB, a.collisionGroup)) return true;
      return false;
    }
    _bodyActive(body) {
      if (!this._sceneFilter) return true;
      if (!body.scene) return true;
      return this._sceneFilter.has(body.scene);
    }

    _bodiesOf(target, out) {
      if (!out && this._cache) {
        const cached = this._cache.get(target);
        if (cached) return cached;
      }
      const result = this._collectBodies(target, out);
      if (!out && this._cache) this._cache.set(target, result);
      return result;
    }

    _collectBodies(target, out) {
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
          if (!this._allowsPair(bodyA, bodyB)) continue;
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
          if (!this._allowsPair(bodyA, bodyB)) return;
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
        b._moveBy(
          axis === 'x' ? -direction * amount : 0,
          axis === 'y' ? -direction * amount : 0
        );
        if (axis === 'y' && b.velocity.y * direction > 0) {
          b.velocity.y = -b.velocity.y * b.bounce;
        }
        if (axis === 'x' && b.velocity.x * direction > 0) {
          b.velocity.x = -b.velocity.x * b.bounce;
        }
      } else if (b.immovable) {
        a._moveBy(
          axis === 'x' ? direction * amount : 0,
          axis === 'y' ? direction * amount : 0
        );
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
    step(delta, scenes) {
      this.stats.pairs = 0;
      this._sceneFilter = scenes && scenes.length ? new Set(scenes) : null;
      // Reuse one map: a fresh Map per step is pure GC churn.
      this._cacheStore = this._cacheStore || new Map();
      this._cacheStore.clear();
      this._cache = this._cacheStore;
      try {
        if (!this.enabled || this.bodies.length === 0) {
          this._processColliders();
          return;
        }
        const dt = (delta || 0) * this.timeScale;
        this.accumulator += dt;
        let steps = 0;
        const start = performance.now();
        while (this.accumulator >= this.fixedStep && steps < this.maxSubSteps) {
          this._integrate(this.fixedStep);
          this.accumulator -= this.fixedStep;
          steps += 1;
        }
        if (this.accumulator > this.fixedStep * this.maxSubSteps) this.accumulator = 0;
        this._processColliders();
        this.stats.steps = steps;
        this.stats.time = performance.now() - start;
      } finally {
        this._cache = null;
        this._sceneFilter = null;
      }
    }

    /** Steer a body toward a point; returns true once it is close enough. */
    moveTo(object, x, y, speed) {
      const body = object && object.body ? object.body : object;
      if (!body || !body.velocity) return true;
      const dx = x - body.centerX;
      const dy = y - body.centerY;
      const distance = Math.hypot(dx, dy);
      const velocity = Math.max(1, speed === undefined ? 100 : speed);
      if (distance <= Math.max(1, velocity / 60)) {
        body.velocity.set(0, 0);
        return true;
      }
      body.velocity.set((dx / distance) * velocity, (dy / distance) * velocity);
      return false;
    }

    _integrate(dt) {
      this.bodies.forEach((body) => {
        body.blocked.up = false;
        body.blocked.down = false;
        body.blocked.left = false;
        body.blocked.right = false;
        body.touching.none = true;
        if (!body.enabled || !body.active || body.object.active === false) return;
        if (!this._bodyActive(body)) return;
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
          if (!this._bodyActive(bodyA)) return;
          listB.forEach((bodyB) => {
            if (bodyA === bodyB) return;
            if (!bodyB.enabled || !bodyB.active || bodyB.object.active === false) return;
            if (!this._bodyActive(bodyB)) return;
            if (!this._allowsPair(bodyA, bodyB)) return;
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
