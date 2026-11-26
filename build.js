#!/usr/bin/env node
'use strict';

/**
 * Bundles src/*.js into the browser distributable chroms.js.
 * The sources already contain the single IIFE wrapper, so concatenation in
 * filename order is the whole build.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');
const outFile = path.join(root, 'chroms.js');

const files = fs
  .readdirSync(srcDir)
  .filter((file) => file.endsWith('.js'))
  .sort();

const parts = files.map((file) => {
  const code = fs.readFileSync(path.join(srcDir, file), 'utf8');
  return '/* ---- ' + file + ' ---- */\n' + code.trimEnd();
});

const header =
  '/*! Chroms Engine v1.2.0 | built ' +
  new Date().toISOString().slice(0, 10) +
  ' | docs: docs/en/index.md / docs/ru/index.md */\n';

fs.writeFileSync(outFile, header + parts.join('\n\n') + '\n', 'utf8');

const size = fs.statSync(outFile).size;
console.log(
  'Built chroms.js from ' +
    files.length +
    ' modules (' +
    (size / 1024).toFixed(1) +
    ' KB)'
);
