/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: false,
  minify: false,
  bundle: false,
  target: 'esnext',
  outDir: 'dist',
  external: [
    '@slack/web-api',
    '@slack/webhook',
    '@wdio/logger',
    '@wdio/reporter',
  ],
  shims: true,
});
