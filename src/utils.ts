/**
 * Copyright (c) moroo
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import getLogger from '@wdio/logger';

import type { Logger } from '@wdio/logger';

/**
 * Logger instance for the @moroo/wdio-slack-reporter package.
 * This logger is configured using the getLogger function and is used
 * throughout the package for consistent logging.
 */
export const logger: Logger = getLogger('@moroo/wdio-slack-reporter');

/**
 * Waits for a specified amount of time.
 *
 * This function creates a promise that resolves after the specified number of milliseconds.
 * It can be used to pause execution in an async function using await.
 *
 * @param milliseconds - The number of milliseconds to wait
 * @returns A promise that resolves after the specified time
 *
 * @example
 * ```typescript
 * // Wait for 1 second
 * await waitForTimeout(1000);
 * ```
 */
export async function waitForTimeout(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
