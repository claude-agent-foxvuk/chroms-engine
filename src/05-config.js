  /**
   * Project metadata: `chroms.config.json`.
   *
   * A project that uses Chroms can describe itself with a small JSON manifest:
   * the engine version it was built against, its own name/version, the author
   * and the usual package metadata. `Chroms.loadConfig(url)` fetches and
   * validates one; `new Chroms.Game({ project })` attaches an already parsed
   * one and exposes it as `game.project`.
   */

  const CONFIG_SCHEMA_VERSION = 1;

  /** Parse '1.2.3' (an optional leading v and pre-release/build suffix are ignored). */
  function parseVersion(value) {
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^[vV]?(\d+)\.(\d+)\.(\d+)(?:[-+][0-9a-z.-]+)?$/i);
    if (!match) return null;
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
  }

  /**
   * Parse a compact version range: '1.2.3', '^1.2', '~1.2.3', '>=1.2.0',
   * '>1.2', '<=2.0.0', '<2', '1.x' or '*'. Returns null when malformed.
   */
  function parseVersionRange(range) {
    if (typeof range !== 'string') return null;
    const text = range.trim();
    if (!text || text === '*' || text === 'x' || text === 'X') return { any: true };
    const match = text.match(/^(\^|~|>=|<=|>|<|=)?\s*[vV]?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?$/);
    if (!match) return null;
    const operator = match[1] || '';
    const parts = [match[2], match[3], match[4]];
    if (parts[0] === 'x' || parts[0] === 'X' || parts[0] === '*') return { any: true };
    const base = {
      major: Number(parts[0]),
      minor: parts[1] === undefined || /^[xX*]$/.test(parts[1]) ? null : Number(parts[1]),
      patch: parts[2] === undefined || /^[xX*]$/.test(parts[2]) ? null : Number(parts[2])
    };
    return { operator, base, any: false };
  }

  function compareNumbers(a, b) {
    return a === b ? 0 : a < b ? -1 : 1;
  }

  /**
   * Compare two versions: -1, 0 or 1. Returns null when either value is not a
   * version. Pre-release and build suffixes are ignored.
   */
  function compareVersions(a, b) {
    const left = parseVersion(a);
    const right = parseVersion(b);
    if (!left || !right) return null;
    return (
      compareNumbers(left.major, right.major) ||
      compareNumbers(left.minor, right.minor) ||
      compareNumbers(left.patch, right.patch)
    );
  }

  function compareToBase(version, base) {
    const target = {
      major: base.major,
      minor: base.minor === null ? 0 : base.minor,
      patch: base.patch === null ? 0 : base.patch
    };
    return (
      compareNumbers(version.major, target.major) ||
      compareNumbers(version.minor, target.minor) ||
      compareNumbers(version.patch, target.patch)
    );
  }

  /** True when the whole (possibly comma/|| separated) range is well formed. */
  function isVersionRange(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    return value
      .split('||')
      .every((alternative) =>
        alternative.split(',').every((part) => parseVersionRange(part) !== null)
      );
  }

  /** True when `version` satisfies `range` ('^1.2.3', '~1.2', '>=1.2', '*'…). */
  function satisfies(version, range) {
    const target = parseVersion(version);
    if (!target) return false;
    if (typeof range !== 'string') return false;
    if (range.indexOf('||') !== -1) {
      return range.split('||').some((part) => satisfies(version, part));
    }
    if (range.indexOf(',') !== -1) {
      return range.split(',').every((part) => satisfies(version, part));
    }
    const parsed = parseVersionRange(range);
    if (!parsed) return false;
    if (parsed.any) return true;
    const base = parsed.base;
    const operator = parsed.operator;
    if (base.minor === null && base.patch === null) {
      // '^1', '~1', '>=1', '1' — major-only comparisons.
      const delta = compareNumbers(target.major, base.major);
      if (operator === '^' || operator === '' || operator === '=') return delta === 0;
      if (operator === '~') return delta === 0;
      if (operator === '>=') return delta >= 0;
      if (operator === '>') return delta > 0;
      if (operator === '<=') return delta <= 0;
      return delta < 0;
    }
    const delta = compareToBase(target, base);
    if (operator === '^') {
      if (base.major > 0) return target.major === base.major && delta >= 0;
      if (base.minor === null) return target.major === 0 && delta >= 0;
      if (base.minor > 0) return target.major === 0 && target.minor === base.minor && delta >= 0;
      if (base.patch === null) return target.major === 0 && target.minor === 0;
      return target.major === 0 && target.minor === 0 && target.patch === base.patch;
    }
    if (operator === '~') {
      return (
        target.major === base.major &&
        (base.minor === null || target.minor === base.minor) &&
        delta >= 0
      );
    }
    if (operator === '>=') return delta >= 0;
    if (operator === '>') return delta > 0;
    if (operator === '<=') return delta <= 0;
    if (operator === '<') return delta < 0;
    return delta === 0;
  }

  /** True when this build satisfies `range`. */
  function isCompatible(range) {
    return satisfies(VERSION, range);
  }

  function normalizeAuthor(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    if (!isObject(value)) return '';
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const email = typeof value.email === 'string' ? value.email.trim() : '';
    const url = typeof value.url === 'string' ? value.url.trim() : '';
    if (name && email) return name + ' <' + email + '>';
    return name || email || url;
  }

  function normalizeKeywords(value) {
    if (value === undefined) return [];
    const list = Array.isArray(value) ? value : [value];
    const out = [];
    list.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const word = entry.trim();
      if (word && out.indexOf(word) === -1) out.push(word);
    });
    return out;
  }

  function normalizeConfigValue(value) {
    return typeof value === 'string' ? value.trim() : value;
  }

  /**
   * Validate a parsed `chroms.config.json`.
   * Returns `{ ok, errors, warnings, config }`; `config` is always normalized
   * so a game can expose partial metadata even when something is missing.
   */
  function validateConfig(data) {
    const errors = [];
    const warnings = [];
    const source = isObject(data) ? data : {};
    if (!isObject(data)) errors.push('config must be a JSON object');

    const name = typeof source.name === 'string' ? source.name.trim() : '';
    if (!name) errors.push('name is required');

    const engine = typeof source.engine === 'string' ? source.engine.trim() : '';
    if (!engine) {
      errors.push('engine is required (the Chroms version the project targets, e.g. "^1.2.3")');
    } else if (!isVersionRange(engine)) {
      errors.push('engine must be a version or range such as "1.2.3", "^1.2" or ">=1.2.0"');
    }

    let version = null;
    if (source.version !== undefined && source.version !== null && source.version !== '') {
      version = String(source.version).trim();
      if (!parseVersion(version)) errors.push('version must look like "1.0.0"');
    }

    const config = {
      configVersion: CONFIG_SCHEMA_VERSION,
      name,
      version,
      engine,
      description: typeof source.description === 'string' ? source.description.trim() : '',
      author: normalizeAuthor(source.author),
      license: typeof source.license === 'string' ? source.license.trim() : '',
      homepage: typeof source.homepage === 'string' ? source.homepage.trim() : '',
      entry: typeof source.entry === 'string' ? source.entry.trim() : '',
      keywords: normalizeKeywords(source.keywords)
    };

    if (source.configVersion !== undefined) {
      const schema = Number(source.configVersion);
      if (!Number.isFinite(schema) || schema < 1) {
        errors.push('configVersion must be a positive number');
      } else if (schema > CONFIG_SCHEMA_VERSION) {
        warnings.push(
          'configVersion ' + schema + ' is newer than this engine understands (' + CONFIG_SCHEMA_VERSION + ')'
        );
      }
    }

    if (engine && isVersionRange(engine) && !satisfies(VERSION, engine)) {
      warnings.push(
        'project targets Chroms ' + engine + ' but this build is ' + VERSION + '; check the changelog for breaking changes'
      );
    }

    return { ok: errors.length === 0, errors, warnings, config };
  }

  /**
   * Fetch and validate `chroms.config.json`. Resolves with the normalized
   * config (warnings are attached as `config.warnings`); rejects when the
   * manifest is missing or invalid.
   */
  function loadConfig(url) {
    const source = url || 'chroms.config.json';
    if (typeof fetch !== 'function') {
      return Promise.reject(
        new Error('[Chroms] fetch is unavailable; pass a parsed object to new Game({ project })')
      );
    }
    return fetch(source)
      .then((response) => {
        if (!response || response.ok === false) {
          throw new Error('[Chroms] Could not load ' + source + ' (' + (response && response.status) + ')');
        }
        return response.json();
      })
      .then((data) => {
        const result = validateConfig(data);
        if (!result.ok) {
          throw new Error('[Chroms] Invalid ' + source + ': ' + result.errors.join('; '));
        }
        result.config.warnings = result.warnings.slice();
        if (result.warnings.length && typeof console !== 'undefined' && console.warn) {
          console.warn('[Chroms] ' + result.warnings.join('; '));
        }
        return result.config;
      });
  }

  Chroms.compareVersions = compareVersions;
  Chroms.satisfies = satisfies;
  Chroms.isCompatible = isCompatible;
  Chroms.validateConfig = validateConfig;
  Chroms.loadConfig = loadConfig;
  Chroms.CONFIG_SCHEMA_VERSION = CONFIG_SCHEMA_VERSION;
