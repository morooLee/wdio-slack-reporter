/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EVENTS, SLACK_REQUEST_TYPES } from './constants.js';
import type {
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  FilesCompleteUploadExternalResponse,
  FilesUploadV2Arguments,
  WebAPICallResult,
  WebClientOptions,
} from '@slack/web-api';
import type {
  IncomingWebhookDefaultArguments,
  IncomingWebhookResult,
  IncomingWebhookSendArguments,
} from '@slack/webhook';
import type { RunnerStats, TestStats } from '@wdio/reporter';
import type { Reporters } from '@wdio/types';

// 내부 모듈에서 사용하는 타입들을 import (순환 참조 방지를 위해 type 사용)

// ============================
// 1. 기본 타입 정의
// ============================

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
export type SlackRequestType =
  (typeof SLACK_REQUEST_TYPES)[keyof typeof SLACK_REQUEST_TYPES];

export class TimeoutError extends Error {
  public code: string;

  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    this.code = 'ETIMEDOUT';
  }
}

// ============================
// 2. Slack API 관련 타입
// ============================

// @slack/web-api에서 직접 타입 추출
export { WebClient } from '@slack/web-api';

export type * from '@slack/web-api';

// @slack/webhook에서 타입 추출
export { IncomingWebhook } from '@slack/webhook';

export type {
  IncomingWebhookDefaultArguments,
  IncomingWebhookSendArguments,
  IncomingWebhookResult,
} from '@slack/webhook';

// @slack/types 타입 추출
export type * from '@slack/types';

// ============================
// 3. 클라이언트 관련 타입
// ============================

export type FilesUploadV2Response = WebAPICallResult & {
  files: FilesCompleteUploadExternalResponse[];
};
export interface SlackWebClientOptions extends WebClientOptions {
  token: string;
}

export interface SlackIncomingWebhookOptions
  extends IncomingWebhookDefaultArguments {
  webhook: string;
}

// ============================
// 4. WDIOReporter 관련 타입
// ============================

export type * from '@wdio/reporter';

// ============================
// 5. SlackReporter 관련 타입
// ============================

// SlackReporter 순환 참조 방지를 위한 컨텍스트 타입
export interface SlackReporterContext {
  options: SlackReporterOptions;
}

export type SlackBaseOptions = Partial<Reporters.Options> & {
  notifyOnRunnerStart?: boolean;
  notifyOnRunnerEnd?: boolean;
  notifyOnTestFail?: boolean;
};

export type SlackWebAPIOptions = SlackBaseOptions &
  SlackWebClientOptions & {
    type: 'web-api';
    channel: string;
    createNotifyOnRunnerStartPayloads?: (
      this: SlackReporterContext,
      runnerStats: RunnerStats
    ) => (ChatPostMessageArguments & { reply_in_thread?: boolean })[];
    createNotifyOnRunnerEndPayloads?: (
      this: SlackReporterContext,
      runnerStats: RunnerStats
    ) => (ChatPostMessageArguments & { reply_in_thread?: boolean })[];
    createNotifyOnTestFailPayloads?: (
      this: SlackReporterContext,
      testStats: TestStats
    ) => (ChatPostMessageArguments & { reply_in_thread?: boolean })[];
  };

export type SlackWebhookOptions = SlackBaseOptions &
  IncomingWebhookDefaultArguments & {
    type: 'webhook';
    webhook: string;
    createNotifyOnRunnerStartPayloads?: (
      this: SlackReporterContext,
      runnerStats: RunnerStats
    ) => IncomingWebhookSendArguments[];
    createNotifyOnRunnerEndPayloads?: (
      this: SlackReporterContext,
      runnerStats: RunnerStats
    ) => IncomingWebhookSendArguments[];
    createNotifyOnTestFailPayloads?: (
      this: SlackReporterContext,
      testStats: TestStats
    ) => IncomingWebhookSendArguments[];
  };

export type SlackReporterOptions = SlackWebAPIOptions | SlackWebhookOptions;

// ============================
// 6. SlackQueue 관련 타입
// ============================

export interface SlackTaskBase {
  id: string;
  event: EventType;
}

export interface SlackWebAPIPostMessageTask extends SlackTaskBase {
  type: typeof SLACK_REQUEST_TYPES.WEB_API_POST_MESSAGE;
  payload: ChatPostMessageArguments & { reply_in_thread?: boolean };
}

export interface SlackWebAPIUploadTask extends SlackTaskBase {
  type: typeof SLACK_REQUEST_TYPES.WEB_API_UPLOAD;
  payload: FilesUploadV2Arguments;
  waitForUpload?: boolean;
}

export interface SlackWebhookSendTask extends SlackTaskBase {
  type: typeof SLACK_REQUEST_TYPES.WEBHOOK_SEND;
  payload: string | IncomingWebhookSendArguments;
}

export type SlackTask =
  | SlackWebAPIPostMessageTask
  | SlackWebAPIUploadTask
  | SlackWebhookSendTask;

export type SlackResult =
  | ChatPostMessageResponse
  | FilesUploadV2Response
  | IncomingWebhookResult;

// ============================
// 7. WebdriverIO 타입 확장
// ============================

declare global {
  namespace WebdriverIO {
    interface ReporterOption extends SlackReporterOptions {}
  }
}
