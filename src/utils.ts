/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import getLogger from '@wdio/logger';

import SlackReporter from './reporter.js';

import type { ChatPostMessageArguments } from '@slack/web-api';
import type { IncomingWebhookSendArguments } from '@slack/webhook';
import type { Logger } from '@wdio/logger';
import type { RunnerStats, TestStats } from '@wdio/reporter';

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

export function createDefaultNotifyOnRunnerStartPayloads(
  this: SlackReporter,
  runnerStats: RunnerStats
):
  | (ChatPostMessageArguments & { reply_in_thread?: boolean })[]
  | IncomingWebhookSendArguments[] {
  return [
    {
      channel: this.options.channel!,
      text: 'Test execution started',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Test execution started 1st.\n - thread: ${SlackReporter.getFirstThread()}`,
          },
        },
      ],
    },
    {
      channel: this.options.channel!,
      text: 'Test execution started',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Test execution started 2nd.\n - thread: ${SlackReporter.getFirstThread()}`,
          },
        },
      ],
    },
  ];
}

export function createDefaultNotifyOnRunnerEndPayloads(
  this: SlackReporter,
  runnerStats: RunnerStats
):
  | (ChatPostMessageArguments & { reply_in_thread?: boolean })[]
  | IncomingWebhookSendArguments[] {
  return [
    {
      channel: this.options.channel!,
      text: 'Test execution ended',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Test execution ended 1st.\n - thread: ${SlackReporter.getFirstThread()}`,
          },
        },
      ],
      reply_in_thread: false,
    },
    {
      channel: this.options.channel!,
      text: 'Test execution ended',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Test execution ended 2nd.\n - thread: ${SlackReporter.getFirstThread()}`,
          },
        },
      ],
    },
  ];
}

export function createDefaultNotifyOnTestFailPayloads(
  this: SlackReporter,
  testStats: TestStats
):
  | (ChatPostMessageArguments & { reply_in_thread?: boolean })[]
  | IncomingWebhookSendArguments[] {
  return [
    {
      channel: this.options.channel!,
      text: 'Test failed',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Test failed 1st.\n - thread: ${SlackReporter.getFirstThread()}`,
          },
        },
      ],
      reply_in_thread: false,
    },
    {
      channel: this.options.channel!,
      text: 'Test failed',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Test failed 2nd.\n - thread: ${SlackReporter.getFirstThread()}`,
          },
        },
      ],
    },
  ];
}
