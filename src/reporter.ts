/**
 * Copyright (c) moroo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import WDIOReporter from '@wdio/reporter';

import { SlackWebClient, SlackWebhook } from './client.js';
import { EVENTS } from './constants.js';
import SlackQueue from './queue.js';
import {
  createDefaultNotifyOnRunnerEndPayloads,
  createDefaultNotifyOnRunnerStartPayloads,
  createDefaultNotifyOnTestFailPayloads,
  logger,
} from './utils.js';

import type {
  AfterCommandArgs,
  BeforeCommandArgs,
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  FilesUploadV2Arguments,
  FilesUploadV2Response,
  HookStats,
  IncomingWebhookSendArguments,
  RunnerStats,
  SlackReporterOptions,
  SuiteStats,
  TestStats,
} from './types.js';

export default class SlackReporter extends WDIOReporter {
  public options: SlackReporterOptions;

  private static _queue: SlackQueue = new SlackQueue();

  private _createNotifyOnRunnerStartPayloads?: (
    this: SlackReporter,
    runnerStats: RunnerStats
  ) =>
    | (ChatPostMessageArguments & { reply_in_thread?: boolean })[]
    | IncomingWebhookSendArguments[];
  private _createNotifyOnRunnerEndPayloads?: (
    this: SlackReporter,
    runnerStats: RunnerStats
  ) =>
    | (ChatPostMessageArguments & { reply_in_thread?: boolean })[]
    | IncomingWebhookSendArguments[];
  private _createNotifyOnTestFailPayloads?: (
    this: SlackReporter,
    testStats: TestStats
  ) =>
    | (ChatPostMessageArguments & { reply_in_thread?: boolean })[]
    | IncomingWebhookSendArguments[];

  constructor(options: SlackReporterOptions) {
    options = Object.assign(
      {
        notifyOnStart: true,
        notifyOnEnd: true,
        notifyOnFail: true,
        createNotifyOnRunnerStartPayloads:
          createDefaultNotifyOnRunnerStartPayloads,
        createNotifyOnRunnerEndPayloads: createDefaultNotifyOnRunnerEndPayloads,
        createNotifyOnTestFailPayloads: createDefaultNotifyOnTestFailPayloads,
      },
      options,
      { stdout: true }
    );

    super(options);

    this.options = options;

    if (options.type === 'web-api') {
      SlackReporter._queue.client = new SlackWebClient(options);
    } else {
      SlackReporter._queue.webhook = new SlackWebhook(options);
    }

    if (options.createNotifyOnRunnerStartPayloads) {
      this._createNotifyOnRunnerStartPayloads =
        options.createNotifyOnRunnerStartPayloads.bind(this);
    }
    if (options.createNotifyOnRunnerEndPayloads) {
      this._createNotifyOnRunnerEndPayloads =
        options.createNotifyOnRunnerEndPayloads.bind(this);
    }
    if (options.createNotifyOnTestFailPayloads) {
      this._createNotifyOnTestFailPayloads =
        options.createNotifyOnTestFailPayloads.bind(this);
    }
  }

  static getFirstThread(): string | undefined {
    return SlackReporter._queue.firstThread;
  }

  static getLatestThread(): string | undefined {
    return SlackReporter._queue.latestThread;
  }

  get isSynchronised(): boolean {
    return SlackReporter._queue.isEnded;
  }

  onRunnerStart(_runnerStats: RunnerStats): void {
    if (this.options.notifyOnRunnerStart) {
      if (!this._createNotifyOnRunnerStartPayloads) {
        logger.warn(
          '"createNotifyOnRunnerStartPayloads" method is not defined.'
        );

        return;
      }

      const payloads = this._createNotifyOnRunnerStartPayloads(_runnerStats);

      SlackReporter._queue.enqueue(
        this.options.type,
        EVENTS.ON_RUNNER_START,
        payloads
      );
    }
  }
  onBeforeCommand(_commandArgs: BeforeCommandArgs): void {}
  onAfterCommand(_commandArgs: AfterCommandArgs): void {}
  onBeforeAssertion(_assertionArgs: unknown): void {}
  onAfterAssertion(_assertionArgs: unknown): void {}
  onSuiteStart(_suiteStats: SuiteStats): void {}
  onHookStart(_hookStat: HookStats): void {}
  onHookEnd(_hookStats: HookStats): void {}
  onTestStart(_testStats: TestStats): void {}
  onTestPass(_testStats: TestStats): void {}
  onTestFail(_testStats: TestStats): void {
    if (this.options.notifyOnTestFail) {
      if (!this._createNotifyOnTestFailPayloads) {
        logger.warn('"createNotifyOnTestFailPayloads" method is not defined.');

        return;
      }

      const payloads = this._createNotifyOnTestFailPayloads(_testStats);

      SlackReporter._queue.enqueue(
        this.options.type,
        EVENTS.ON_TEST_FAIL,
        payloads
      );
    }
  }
  onTestRetry(_testStats: TestStats): void {}
  onTestSkip(_testStats: TestStats): void {}
  onTestPending(_testStats: TestStats): void {}
  onTestEnd(_testStats: TestStats): void {}
  onSuiteRetry(_suiteStats: SuiteStats): void {}
  onSuiteEnd(_suiteStats: SuiteStats): void {}
  onRunnerEnd(_runnerStats: RunnerStats): void {
    if (this.options.notifyOnRunnerEnd) {
      if (!this._createNotifyOnRunnerEndPayloads) {
        logger.warn('"createNotifyOnRunnerEndPayloads" method is not defined.');

        return;
      }

      const payloads = this._createNotifyOnRunnerEndPayloads(_runnerStats);

      SlackReporter._queue.enqueue(
        this.options.type,
        EVENTS.ON_RUNNER_END,
        payloads
      );
    }

    SlackReporter._queue.stop();
  }

  static async postMessage(
    payload: ChatPostMessageArguments
  ): Promise<ChatPostMessageResponse> {
    return SlackReporter._queue.postMessage(payload);
  }

  static async upload(
    payload: FilesUploadV2Arguments,
    waitForUpload: boolean = true
  ): Promise<FilesUploadV2Response> {
    return SlackReporter._queue.upload(payload, waitForUpload);
  }

  static async send(
    payload: string | IncomingWebhookSendArguments
  ): Promise<void> {
    await SlackReporter._queue.send(payload);
  }
}
