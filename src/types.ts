/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SuiteStats } from '@wdio/reporter';

import type { SLACK_REQUEST_TYPE, EVENTS } from './constants.js';
import type {
  ChatPostMessageArguments,
  FilesCompleteUploadExternalResponse,
  FilesUploadArguments,
  WebAPICallResult,
} from '@slack/web-api';
import type {
  IncomingWebhookResult,
  IncomingWebhookSendArguments,
} from '@slack/webhook';
import type { RunnerStats, TestStats } from '@wdio/reporter';
import type { Reporters } from '@wdio/types';

export {
  Block,
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  FilesCompleteUploadExternalResponse,
  FilesInfoResponse,
  FilesUploadArguments,
  KnownBlock,
  WebAPICallResult,
} from '@slack/web-api';
export {
  IncomingWebhookResult,
  IncomingWebhookSendArguments,
} from '@slack/webhook';

export { HookStats, RunnerStats, SuiteStats, TestStats } from '@wdio/reporter';

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

export interface SlackReporterOptions extends Reporters.Options {
  slackOptions?: SlackOptions;
  emojiSymbols?: EmojiSymbols;
  title?: string;
  resultsUrl?: string;
  notifyFailedCase?: boolean;
  notifyTestStartMessage?: boolean;
  notifyTestFinishMessage?: boolean;
  useScenarioBasedStateCounts?: boolean;
  createStartPayload?: (
    runnerStats: RunnerStats
  ) => ChatPostMessageArguments | IncomingWebhookSendArguments;
  createFailedTestPayload?: (
    testStats: TestStats
  ) => ChatPostMessageArguments | IncomingWebhookSendArguments;
  createResultPayload?: (
    runnerStats: RunnerStats,
    stateCounts: StateCount
  ) => ChatPostMessageArguments | IncomingWebhookSendArguments;
}

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

// global declarations moved from index.ts
declare global {
  namespace WebdriverIO {
    interface ReporterOption extends SlackReporterOptions {}
  }

  namespace NodeJS {
    interface Process {
      emit(
        event: typeof EVENTS.POST_MESSAGE,
        payload: ChatPostMessageArguments
      ): boolean;
      emit(
        event: typeof EVENTS.UPLOAD,
        args: {
          payload: FilesUploadArguments;
          options?: FilesUploadV2Options;
        }
      ): Promise<
        WebAPICallResult & {
          files: FilesCompleteUploadExternalResponse[];
        }
      >;
      emit(
        event: typeof EVENTS.SEND,
        payload: IncomingWebhookSendArguments
      ): boolean;
      emit(
        event: typeof EVENTS.SCREENSHOT,
        args: {
          buffer: Buffer;
          options?: FilesUploadV2Options;
        }
      ): boolean;
      emit(
        event: typeof EVENTS.RESULT,
        args: {
          result:
            | WebAPICallResult
            | IncomingWebhookResult
            | (WebAPICallResult & {
              files: FilesCompleteUploadExternalResponse[];
            })
            | undefined;
          error: any;
        }
      ): boolean;

      on(
        event: typeof EVENTS.POST_MESSAGE,
        listener: (
          payload: ChatPostMessageArguments
        ) => Promise<WebAPICallResult>
      ): this;
      on(
        event: typeof EVENTS.UPLOAD,
        listener: (args: {
          payload: FilesUploadArguments;
          options?: FilesUploadV2Options;
        }) => Promise<
          WebAPICallResult & {
            files: FilesCompleteUploadExternalResponse[];
          }
        >
      ): this;
      on(
        event: typeof EVENTS.SEND,
        listener: (
          payload: IncomingWebhookSendArguments
        ) => Promise<IncomingWebhookResult>
      ): this;
      on(
        event: typeof EVENTS.SCREENSHOT,
        listener: (args: {
          buffer: Buffer;
          options?: FilesUploadV2Options;
        }) => void
      ): this;
      once(
        event: typeof EVENTS.RESULT,
        listener: (args: {
          result:
            | WebAPICallResult
            | IncomingWebhookResult
            | (WebAPICallResult & {
              files: FilesCompleteUploadExternalResponse[];
            })
            | undefined;
          error: any;
        }) => Promise<void>
      ): this;
    }
  }
}
