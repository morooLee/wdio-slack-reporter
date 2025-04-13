/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SuiteStats } from '@wdio/reporter';

import type { SLACK_REQUEST_TYPE } from './constants.js';
import type {
  ChatPostMessageArguments,
  FilesUploadArguments,
} from '@slack/web-api';
import type { IncomingWebhookSendArguments } from '@slack/webhook';
import type { RunnerStats, TestStats } from '@wdio/reporter';

export type TestResultType = 'passed' | 'failed' | 'pending' | 'skipped';

export interface StateCount {
  passed: number;
  failed: number;
  skipped: number;
}

export class CucumberStats extends SuiteStats {
  state: TestStats['state'] = 'pending';
}

export interface EmojiSymbols {
  passed?: string;
  failed?: string;
  skipped?: string;
  pending?: string;
  start?: string;
  finished?: string;
  watch?: string;
}

export interface SlackWebApiOptions {
  type: 'web-api';
  channel: string;
  slackBotToken: string;
  uploadScreenshotOfFailedCase?: boolean;
  notifyDetailResultThread?: boolean;
  filterForDetailResults?: TestResultType[];
  createScreenshotPayload?: (
    testStats: TestStats,
    screenshotBuffer: Buffer
  ) => FilesUploadArguments;
  createResultDetailPayload?: (
    runnerStats: RunnerStats,
    stateCounts: StateCount
  ) => ChatPostMessageArguments;
}

export interface SlackWebhookOptions {
  type: 'webhook';
  webhook: string;
  slackName?: string;
  slackIconUrl?: string;
}

export type SlackOptions = SlackWebApiOptions | SlackWebhookOptions;

export interface FilesUploadV2Options {
  waitForUpload?: boolean;
  retry?: number;
  interval?: number;
}

export type SlackRequestType = PostMessage | Upload | Send;

interface PostMessage {
  type: typeof SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE;
  payload: ChatPostMessageArguments;
  isDetailResult?: boolean;
}

interface Upload {
  type: typeof SLACK_REQUEST_TYPE.WEB_API_UPLOAD;
  payload: FilesUploadArguments;
  options?: FilesUploadV2Options;
}

interface Send {
  type: typeof SLACK_REQUEST_TYPE.WEBHOOK_SEND;
  payload: IncomingWebhookSendArguments;
}
