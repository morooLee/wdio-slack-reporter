/**
 * Copyright (c) moroo
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import path from 'node:path';
import util from 'node:util';

import WDIOReporter from '@wdio/reporter';

import { SlackWebClient, SlackWebhookClient } from './client.js';
import {
  DEFAULT_COLOR,
  DEFAULT_INDENT,
  EMOJI_SYMBOLS,
  FAILED_COLOR,
  SLACK_ICON_URL,
  SLACK_NAME,
  ERROR_MESSAGES,
  EVENTS,
  SLACK_REQUEST_TYPE,
  FINISHED_COLOR,
} from './constants.js';
import { logger } from './utils.js';

import type {
  SlackRequestType,
  EmojiSymbols,
  StateCount,
  CucumberStats,
  TestResultType,
  FilesUploadV2Options,
  SlackReporterOptions,
} from './types.js';
import type {
  Block,
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  FilesCompleteUploadExternalResponse,
  FilesUploadArguments,
  KnownBlock,
  WebAPICallResult,
} from '@slack/web-api';
import type {
  IncomingWebhookResult,
  IncomingWebhookSendArguments,
} from '@slack/webhook';
import type {
  HookStats,
  RunnerStats,
  SuiteStats,
  TestStats,
} from '@wdio/reporter';
import type { Capabilities } from '@wdio/types';

class SlackReporter extends WDIOReporter {
  private static resultsUrl?: string;
  private _slackRequestQueue: SlackRequestType[] = [];
  private _thread?: string;
  private _pendingSlackRequestCount = 0;
  private _stateCounts: StateCount = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  private _useScenarioBasedStateCounts = false;
  private _webClient?: SlackWebClient;
  private _webhookClient?: SlackWebhookClient;
  private _channel?: string;
  private _symbols: EmojiSymbols;
  private _isCucumberFramework: boolean = false;
  private _title?: string;
  private _notifyTestStartMessage: boolean = true;
  private _notifyFailedCase: boolean = true;
  private _uploadScreenshotOfFailedCase: boolean = true;
  private _notifyTestFinishMessage: boolean = true;
  private _notifyDetailResultThread: boolean = true;
  private _filterForDetailResults: TestResultType[] = [
    'passed',
    'failed',
    'pending',
    'skipped',
  ];
  private _isSynchronizing: boolean = false;
  private _interval: NodeJS.Timeout;
  private _hasRunnerEnd = false;
  private _lastScreenshotBuffer?: Buffer = undefined;
  private _suiteUids = new Set<string>();
  private _orderedSuites: SuiteStats[] = [];
  private _cucumberOrderedTests: CucumberStats[] = [];
  private _indents: number = 0;
  private _suiteIndents: Record<string, number> = {};
  private _currentSuite?: SuiteStats;

  constructor(options: SlackReporterOptions) {
    super(Object.assign({ stdout: true }, options));

    if (!options.slackOptions) {
      logger.error(ERROR_MESSAGES.UNDEFINED_SLACK_OPTION);
      logger.debug(options.slackOptions);
      throw new Error(ERROR_MESSAGES.UNDEFINED_SLACK_OPTION);
    }
    if (options.slackOptions.type === 'web-api') {
      if (options.slackOptions.slackBotToken) {
        logger.warn(
          '"slackBotToken" property is deprecated. Please use the inherited "token" property instead. Will be removed in the next major version.'
        );
        options.slackOptions.token = options.slackOptions.slackBotToken;
      }
      this._webClient = new SlackWebClient(options.slackOptions);
      logger.info('Created Slack Web API Client Instance.');
      logger.debug('Slack Web API Client', {
        token: options.slackOptions.slackBotToken,
        channel: options.slackOptions.channel,
      });
      this._channel = options.slackOptions.channel;
      if (options.slackOptions.notifyDetailResultThread !== undefined) {
        if (options.notifyTestFinishMessage === false) {
          logger.warn(
            'Notify is not possible. because the notifyResultMessage option is off.'
          );
        }
        this._notifyDetailResultThread =
          options.slackOptions.notifyDetailResultThread;
      }
      if (options.slackOptions.filterForDetailResults !== undefined) {
        if (options.slackOptions.notifyDetailResultThread === false) {
          logger.warn(
            'Detail result filters does not work. because the notifyDetailResultThread option is off.'
          );
        }
        if (options.slackOptions.filterForDetailResults.length === 0) {
          logger.info(
            'If there are no filters (array is empty), all filters are applied.'
          );
        } else {
          this._filterForDetailResults = [
            ...options.slackOptions.filterForDetailResults,
          ];
        }
      }
      if (options.slackOptions.uploadScreenshotOfFailedCase !== undefined) {
        this._uploadScreenshotOfFailedCase =
          options.slackOptions.uploadScreenshotOfFailedCase;
      }
      if (options.slackOptions.uploadScreenshotOfFailedCase !== undefined) {
        this._uploadScreenshotOfFailedCase =
          options.slackOptions.uploadScreenshotOfFailedCase;
      }
      if (options.slackOptions.createScreenshotPayload) {
        this.createScreenshotPayload =
          options.slackOptions.createScreenshotPayload.bind(this);
        logger.info(
          'The [createScreenshotPayload] function has been overridden.'
        );
        logger.debug('RESULT', this.createScreenshotPayload.toString());
      }
      if (options.slackOptions.createResultDetailPayload) {
        this.createResultDetailPayload =
          options.slackOptions.createResultDetailPayload.bind(this);
        logger.info(
          'The [createResultDetailPayload] function has been overridden.'
        );
        logger.debug('RESULT', this.createResultDetailPayload.toString());
      }
    } else {
      if (options.slackOptions.slackName) {
        logger.warn(
          '"slackName" property is deprecated. Please use the inherited "username" property instead. Will be removed in the next major version.'
        );
        options.slackOptions.username = options.slackOptions.slackName;
      }
      if (options.slackOptions.slackIconUrl) {
        logger.warn(
          '"slackIconUrl" property is deprecated. Please use the inherited "icon_url" property instead. Will be removed in the next major version.'
        );
        options.slackOptions.icon_url = options.slackOptions.slackIconUrl;
      }
      this._webhookClient = new SlackWebhookClient({
        username: options.slackOptions.username ?? SLACK_NAME,
        icon_url:
          !options.slackOptions.icon_url && !options.slackOptions.icon_emoji
            ? SLACK_ICON_URL
            : undefined,
        ...options.slackOptions,
      });
      logger.info('Created Slack Webhook Instance.');
      logger.debug('IncomingWebhook', {
        username: options.slackOptions.username ?? SLACK_NAME,
        icon_url:
          !options.slackOptions.icon_url && !options.slackOptions.icon_emoji
            ? SLACK_ICON_URL
            : undefined,
        ...options.slackOptions,
      });
    }
    this._symbols = {
      passed: options.emojiSymbols?.passed || EMOJI_SYMBOLS.PASSED,
      skipped: options.emojiSymbols?.skipped || EMOJI_SYMBOLS.SKIPPED,
      failed: options.emojiSymbols?.failed || EMOJI_SYMBOLS.FAILED,
      pending: options.emojiSymbols?.pending || EMOJI_SYMBOLS.PENDING,
      start: options.emojiSymbols?.start || EMOJI_SYMBOLS.ROCKET,
      finished: options.emojiSymbols?.finished || EMOJI_SYMBOLS.CHECKERED_FLAG,
      watch: options.emojiSymbols?.watch || EMOJI_SYMBOLS.STOPWATCH,
    };
    this._title = options.title;

    if (options.resultsUrl !== undefined) {
      SlackReporter.setResultsUrl(options.resultsUrl);
    }

    if (options.notifyTestStartMessage !== undefined) {
      this._notifyTestStartMessage = options.notifyTestStartMessage;
    }

    if (options.notifyFailedCase !== undefined) {
      this._notifyFailedCase = options.notifyFailedCase;
    }

    if (options.notifyTestFinishMessage !== undefined) {
      this._notifyTestFinishMessage = options.notifyTestFinishMessage;
    }

    if (options.useScenarioBasedStateCounts !== undefined) {
      this._useScenarioBasedStateCounts = options.useScenarioBasedStateCounts;
    }

    this._interval = global.setInterval(this.sync.bind(this), 100);

    if (options.createStartPayload) {
      this.createStartPayload = options.createStartPayload.bind(this);
      logger.info('The [createStartPayload] function has been overridden.');
      logger.debug('RESULT', this.createStartPayload.toString());
    }
    if (options.createFailedTestPayload) {
      this.createFailedTestPayload = options.createFailedTestPayload.bind(this);
      logger.info(
        'The [createFailedTestPayload] function has been overridden.'
      );
      logger.debug('RESULT', this.createFailedTestPayload.toString());
    }
    if (options.createResultPayload) {
      this.createResultPayload = options.createResultPayload.bind(this);
      logger.info('The [createResultPayload] function has been overridden.');
      logger.debug('RESULT', this.createResultPayload.toString());
    }

    process.on(EVENTS.POST_MESSAGE, this.postMessage.bind(this));
    process.on(EVENTS.UPLOAD, this.upload.bind(this));
    process.on(EVENTS.SEND, this.send.bind(this));
    process.on(EVENTS.SCREENSHOT, this.uploadFailedTestScreenshot.bind(this));
  }

  static getResultsUrl(): string | undefined {
    return SlackReporter.resultsUrl;
  }
  static setResultsUrl(url: string | undefined): void {
    SlackReporter.resultsUrl = url;
  }
  /**
   * Upload failed test screenshot
   * @param  {string | Buffer} data Screenshot buffer
   */
  static uploadFailedTestScreenshot(data: string | Buffer): void {
    let buffer: Buffer;

    if (typeof data === 'string') {
      buffer = Buffer.from(data, 'base64');
    } else {
      buffer = data;
    }

    process.emit(EVENTS.SCREENSHOT, {
      buffer,
    });
  }
  /**
   * Post message from Slack web-api
   * @param  {ChatPostMessageArguments} payload Parameters used by Slack web-api
   * @return {Promise<WebAPICallResult>}
   */
  static postMessage(
    payload: ChatPostMessageArguments
  ): Promise<WebAPICallResult> {
    return new Promise((resolve, reject) => {
      process.emit(EVENTS.POST_MESSAGE, payload);
      process.once(EVENTS.RESULT, ({ result, error }) => {
        if (result) {
          resolve(result as WebAPICallResult);
        }
        reject(error);
      });
    });
  }
  /**
   * Upload from Slack web-api
   * @param  {FilesUploadArguments} payload Parameters used by Slack web-api
   * @return {WebAPICallResult}
   */
  static async upload(
    payload: FilesUploadArguments,
    options: FilesUploadV2Options = {
      waitForUpload: true,
      timeout: 30,
      interval: 1000,
    }
  ): Promise<
    WebAPICallResult & {
      files: FilesCompleteUploadExternalResponse[];
    }
  > {
    return new Promise((resolve, reject) => {
      void process.emit(EVENTS.UPLOAD, { payload, options });
      process.once(EVENTS.RESULT, ({ result, error }) => {
        if (result) {
          resolve(
            result as WebAPICallResult & {
              files: FilesCompleteUploadExternalResponse[];
            }
          );
        }
        reject(error);
      });
    });
  }
  /**
   * Send from Slack webhook
   * @param  {IncomingWebhookSendArguments} payload Parameters used by Slack webhook
   * @return {IncomingWebhookResult}
   */
  static async send(
    payload: IncomingWebhookSendArguments
  ): Promise<IncomingWebhookResult> {
    return new Promise((resolve, reject) => {
      process.emit(EVENTS.SEND, payload);
      process.once(EVENTS.RESULT, ({ result, error }) => {
        if (result) {
          resolve(result as IncomingWebhookResult);
        }
        reject(error);
      });
    });
  }

  private uploadFailedTestScreenshot(buffer: Buffer): void {
    if (this._webClient) {
      if (this._notifyFailedCase && this._uploadScreenshotOfFailedCase) {
        this._lastScreenshotBuffer = buffer;
        return;
      } else {
        logger.warn(ERROR_MESSAGES.DISABLED_OPTIONS);
      }
    } else {
      logger.warn(ERROR_MESSAGES.NOT_USING_WEB_API);
    }

    // return new Promise((resolve, reject) => {
    // 	const interval = setInterval(() => {
    // 		if (this._lastScreenshotBuffer === undefined) {
    // 			clearInterval(interval);
    // 			if (this._webClient && this._notifyFailedCase) {
    // 				this._lastScreenshotBuffer = buffer;
    // 			} else {
    // 				logger.warn(
    // 					ERROR_MESSAGES.NOT_USING_WEB_API_OR_DISABLED_NOTIFY_FAILED_CASE
    // 				);
    // 			}
    // 			resolve();
    // 		}
    // 	}, 100);
    // });
  }
  private async postMessage(
    payload: ChatPostMessageArguments
  ): Promise<WebAPICallResult> {
    if (this._webClient) {
      try {
        logger.debug('COMMAND', `postMessage(${payload})`);
        this._pendingSlackRequestCount++;
        const result = await this._webClient.postMessage(payload);
        logger.debug('RESULT', util.inspect(result));
        process.emit(EVENTS.RESULT, { result, error: undefined });
        return result;
      } catch (error) {
        logger.error(error);
        process.emit(EVENTS.RESULT, { result: undefined, error });
        throw error;
      } finally {
        this._pendingSlackRequestCount--;
      }
    }

    logger.error(ERROR_MESSAGES.NOT_USING_WEB_API);
    throw new Error(ERROR_MESSAGES.NOT_USING_WEB_API);
  }

  private async upload(
    payload: FilesUploadArguments,
    options?: FilesUploadV2Options
  ): Promise<
    WebAPICallResult & {
      files: FilesCompleteUploadExternalResponse[];
    }
  > {
    if (this._webClient) {
      try {
        logger.debug('COMMAND', `upload(${payload})`);
        this._pendingSlackRequestCount++;

        const result = await this._webClient.uploadV2(payload, options);

        logger.debug('RESULT', util.inspect(result));
        process.emit(EVENTS.RESULT, { result, error: undefined });
        return result;
      } catch (error) {
        logger.error(error);
        process.emit(EVENTS.RESULT, { result: undefined, error });
        throw error;
      } finally {
        this._pendingSlackRequestCount--;
      }
    }

    logger.error(ERROR_MESSAGES.NOT_USING_WEB_API);
    throw new Error(ERROR_MESSAGES.NOT_USING_WEB_API);
  }

  private async send(
    payload: IncomingWebhookSendArguments
  ): Promise<IncomingWebhookResult> {
    if (this._webhookClient) {
      try {
        logger.debug('COMMAND', `send(${payload})`);
        this._pendingSlackRequestCount++;
        const result = await this._webhookClient.send(payload);
        logger.debug('RESULT', util.inspect(result));
        process.emit(EVENTS.RESULT, { result, error: undefined });
        return result;
      } catch (error) {
        logger.error(error);
        process.emit(EVENTS.RESULT, { result: undefined, error });
        throw error;
      } finally {
        this._pendingSlackRequestCount--;
      }
    }

    logger.error(ERROR_MESSAGES.NOT_USING_WEBHOOK);
    throw new Error(ERROR_MESSAGES.NOT_USING_WEBHOOK);
  }

  get isSynchronised(): boolean {
    return this._pendingSlackRequestCount === 0 && !this._isSynchronizing;
  }

  private async sync(): Promise<void> {
    if (
      this._hasRunnerEnd &&
      this._slackRequestQueue.length === 0 &&
      this._pendingSlackRequestCount === 0
    ) {
      clearInterval(this._interval);
    }
    if (
      this._isSynchronizing ||
      this._slackRequestQueue.length === 0 ||
      this._pendingSlackRequestCount > 0
    ) {
      return;
    }

    try {
      this._isSynchronizing = true;
      logger.info('Start Synchronisation');
      await this.next();
    } catch (error) {
      logger.error(error);
      throw error;
    } finally {
      this._isSynchronizing = false;
      logger.info('End Synchronisation');
    }
  }

  private async next(): Promise<void> {
    const request = this._slackRequestQueue.shift();
    let result:
      | ChatPostMessageResponse
      | IncomingWebhookResult
      | (WebAPICallResult & {
          files: FilesCompleteUploadExternalResponse[];
        });

    logger.info('POST', `Slack Request ${request?.type}`);
    logger.debug('DATA', util.inspect(request?.payload));
    if (request) {
      try {
        this._pendingSlackRequestCount++;

        switch (request.type) {
          case SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE: {
            if (this._webClient) {
              const payload: ChatPostMessageArguments =
                request.payload as ChatPostMessageArguments;

              if (this._thread) {
                payload.thread_ts = this._thread;
              }

              result = await this._webClient.postMessage({
                ...payload,
              });
              this._thread = result.ts;
              logger.debug('RESULT', util.inspect(result));
            }
            break;
          }
          case SLACK_REQUEST_TYPE.WEB_API_UPLOAD: {
            if (this._webClient) {
              const payload: FilesUploadArguments = request.payload;

              if (
                'file' in payload &&
                (payload.file as any as { type: string; data: number[] })
                  .type === 'Buffer'
              ) {
                payload.file = Buffer.from(
                  (payload.file as any as { type: string; data: number[] }).data
                );
              }

              // TODO 임시
              if ('file' in payload && 'buffer' in (payload.file as any)) {
                payload.file = (payload.file as any).buffer as any;
              }

              if (this._thread) {
                payload.thread_ts = this._thread;
              }

              result = await this._webClient.uploadV2(
                {
                  ...payload,
                },
                { ...(request.options || {}) }
              );
              logger.debug('RESULT', util.inspect(result));
            }
            break;
          }
          case SLACK_REQUEST_TYPE.WEBHOOK_SEND: {
            if (this._webhookClient) {
              result = await this._webhookClient.send(request.payload);
              logger.debug('RESULT', util.inspect(result));
            }
            break;
          }
        }
      } catch (error) {
        logger.error(error);
      } finally {
        this._pendingSlackRequestCount--;
      }

      if (this._slackRequestQueue.length > 0) {
        await this.next();
      }
    }
  }

  /**
   * Convert error stack to string
   * @param  {string} stack Error stack
   * @return {string}       Converted error stack
   */
  private convertErrorStack(stack: string): string {
    return stack.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );
  }
  /**
   * Get information about the environment
   * @description
   * Referenced from [Spec Reporter](https://github.com/webdriverio/webdriverio/blob/c6cf43f67aa46a294a4df158ddd194d79f11ac90/packages/wdio-spec-reporter/src/index.ts#L653)
   * @param  {Capabilities.ResolvedTestrunnerCapabilities} capability Capabilities
   * @param  {boolean} isMultiremote Is multiremote
   * @return {string}               Environment string
   */
  private getEnvironmentCombo(
    capability: Capabilities.ResolvedTestrunnerCapabilities,
    isMultiremote = false
  ): string {
    let output = '';
    const capabilities =
      'alwaysMatch' in capability ? capability.alwaysMatch : capability;
    const drivers: {
      driverName?: string;
      capability: WebdriverIO.Capabilities;
    }[] = [];

    if (isMultiremote) {
      output += '*MultiRemote*: \n';

      Object.keys(capabilities).forEach((key) => {
        drivers.push({
          driverName: key,
          capability: (
            capabilities as Record<string, WebdriverIO.Capabilities>
          )[key],
        });
      });
    } else {
      drivers.push({
        capability: capabilities,
      });
    }

    drivers.forEach(({ driverName, capability }, index, array) => {
      const isLastIndex = array.length - 1 === index;
      let env = '';
      const caps =
        'alwaysMatch' in capability
          ? (capability.alwaysMatch as WebdriverIO.Capabilities)
          : capability;
      const device = caps['appium:deviceName'];
      // prettier-ignore
      // @ts-expect-error outdated JSONWP capabilities
      const app = (capability['appium:app'] || capability.app || '').replace('sauce-storage:', '');
      const appName =
        caps['appium:bundleId'] ||
        caps['appium:appPackage'] ||
        caps['appium:appActivity'] ||
        (path.isAbsolute(app) ? path.basename(app) : app);

      // @ts-expect-error outdated JSONWP capabilities
      const browser = capability.browserName || capability.browser || appName;
      /**
       * fallback to different capability types:
       * browserVersion: W3C format
       * version: JSONWP format
       * platformVersion: mobile format
       * browser_version: invalid BS capability
       */
      // prettier-ignore
      // @ts-expect-error outdated JSONWP capabilities
      const version = caps.browserVersion || caps.version || caps['appium:platformVersion'] || caps.browser_version;
      /**
       * fallback to different capability types:
       * platformName: W3C format
       * platform: JSONWP format
       * os, os_version: invalid BS capability
       */
      // prettier-ignore
      // @ts-expect-error outdated JSONWP capabilities
      const platform = caps.platformName || caps.platform || (caps.os ? caps.os + (caps.os_version ? ` ${caps.os_version}` : '') : '(unknown)');
      if (device) {
        const program = appName || caps.browserName;
        const executing = program ? `executing ${program}` : '';

        env = `${device} on ${platform} ${version} ${executing}`.trim();
      } else {
        env = browser + (version ? ` (v${version})` : '') + ` on ${platform}`;
      }

      output += isMultiremote ? `- *${driverName}*: ` : '*Driver*: ';
      output += env;
      output += isLastIndex ? '' : '\n';
    });

    return output;
  }

  /**
   * Indent a suite based on where how it's nested
   * @param  {String} uid Unique suite key
   * @return {String}     Spaces for indentation
   */
  private indent(uid: string): string {
    const indents = this._suiteIndents[uid];
    return indents === 0 ? '' : Array(indents).join(DEFAULT_INDENT);
  }

  /**
   * Indent a suite based on where how it's nested
   * @param  {StateCount} stateCounts Stat count
   * @return {String}     String to the stat count to be displayed in Slack
   */
  private getCounts(stateCounts: StateCount): string {
    return `*${this._symbols.passed} Passed: ${stateCounts.passed} | ${this._symbols.failed} Failed: ${stateCounts.failed} | ${this._symbols.skipped} Skipped: ${stateCounts.skipped}*`;
  }

  private createStartPayload(
    runnerStats: RunnerStats
  ): ChatPostMessageArguments | IncomingWebhookSendArguments {
    const text = `${
      this._title ? '*Title*: `' + this._title + '`\n' : ''
    }${this.getEnvironmentCombo(
      runnerStats.capabilities,
      runnerStats.isMultiremote
    )}`;

    const payload: ChatPostMessageArguments | IncomingWebhookSendArguments = {
      channel: this._channel,
      text: `${this._symbols.start} Start testing${
        this._title ? 'for ' + this._title : ''
      }`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${this._symbols.start} Start testing`,
            emoji: true,
          },
        },
      ],
      attachments: [
        {
          color: DEFAULT_COLOR,
          text,
          ts: Date.now().toString(),
        },
      ],
    };

    return payload;
  }

  private createFailedTestPayload(
    hookAndTest: HookStats | TestStats
  ): ChatPostMessageArguments | IncomingWebhookSendArguments {
    const stack = hookAndTest.error?.stack
      ? '```' + this.convertErrorStack(hookAndTest.error.stack) + '```'
      : '';
    const payload: ChatPostMessageArguments | IncomingWebhookSendArguments = {
      channel: this._channel,
      text: `${this._symbols.failed} Test failure`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${this._symbols.failed} Test failure`,
            emoji: true,
          },
        },
      ],
      attachments: [
        {
          color: FAILED_COLOR,
          title: `${
            this._currentSuite ? this._currentSuite.title : hookAndTest.parent
          }`,
          text: `* » ${hookAndTest.title}*\n${stack}`,
        },
      ],
    };

    return payload;
  }

  private createScreenshotPayload(
    testStats: TestStats,
    screenshotBuffer: string | Buffer
  ): FilesUploadArguments {
    if (this._channel && this._thread) {
      const payload: FilesUploadArguments = {
        channel_id: this._channel,
        thread_ts: this._thread,
        initial_comment: `Screenshot for Fail to ${testStats.title}`,
        filename: `${testStats.uid}.png`,
        file: screenshotBuffer,
      };
      return payload;
    } else {
      const payload: FilesUploadArguments = {
        channel_id: this._channel,
        initial_comment: `Screenshot for Fail to ${testStats.title}`,
        filename: `${testStats.uid}.png`,
        file: screenshotBuffer,
      };
      return payload;
    }
  }

  private createResultPayload(
    runnerStats: RunnerStats,
    stateCounts: StateCount
  ): ChatPostMessageArguments | IncomingWebhookSendArguments {
    const resultsUrl = SlackReporter.getResultsUrl();
    const counts = this.getCounts(stateCounts);
    const payload: ChatPostMessageArguments | IncomingWebhookSendArguments = {
      channel: this._channel,
      text: `${this._symbols.finished} End of test${
        this._title ? ' - ' + this._title : ''
      }\n${counts}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${this._symbols.finished} End of test - ${
              this._symbols.watch
            } ${runnerStats.duration / 1000}s`,
            emoji: true,
          },
        },
      ],
      attachments: [
        {
          color: FINISHED_COLOR,
          text: `${this._title ? `*Title*: \`${this._title}\`\n` : ''}${
            resultsUrl ? `*Results*: <${resultsUrl}>\n` : ''
          }${counts}`,
          ts: Date.now().toString(),
        },
      ],
    };

    return payload;
  }

  private createResultDetailPayload(
    runnerStats: RunnerStats,
    stateCounts: StateCount
  ): ChatPostMessageArguments | IncomingWebhookSendArguments {
    const counts = this.getCounts(stateCounts);
    const payload: ChatPostMessageArguments | IncomingWebhookSendArguments = {
      channel: this._channel,
      text: `${this._title ? this._title + '\n' : ''}${counts}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Result Details',
            emoji: true,
          },
        },
        ...this.getResultDetailPayloads(),
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${counts}\n${this._symbols.watch} ${
              runnerStats.duration / 1000
            }s`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Filter*: ${this._filterForDetailResults
                .map((filter) => '`' + filter + '`')
                .join(', ')}`,
            },
          ],
        },
      ],
    };

    return payload;
  }

  private getResultDetailPayloads(): (Block | KnownBlock)[] {
    const output: string[] = [];
    let suites = this._isCucumberFramework
      ? this.getOrderedCucumberTests()
      : this.getOrderedSuites();

    const blocks: (Block | KnownBlock)[] = [];

    // Filter Detailed suites by state (Cucumber only)
    if (this._isCucumberFramework && this._notifyDetailResultThread) {
      suites = (suites as CucumberStats[]).filter(({ state }) =>
        this._filterForDetailResults.includes(state)
      );
    }

    for (const suite of suites) {
      // Don't do anything if a suite has no tests or sub suites
      if (
        suite.tests.length === 0 &&
        suite.suites.length === 0 &&
        suite.hooks.length === 0
      ) {
        continue;
      }

      let eventsToReport = this.getEventsToReport(suite);
      // Filter Detailed tests results by state (if needed)
      if (!this._isCucumberFramework && this._notifyDetailResultThread) {
        eventsToReport = eventsToReport.filter(
          ({ state }) => state && this._filterForDetailResults.includes(state)
        );
      }

      if (eventsToReport.length === 0) {
        continue;
      }

      // Get the indent/starting point for this suite
      const suiteIndent = this.indent(suite.uid);

      // Display the title of the suite
      if (suite.type) {
        output.push(`*${suiteIndent}${suite.title}*`);
      }

      // display suite description (Cucumber only)
      if (suite.description) {
        output.push(
          ...suite.description
            .trim()
            .split('\n')
            .map((l) => `${suiteIndent}${l.trim()}`)
        );
      }

      for (const test of eventsToReport) {
        const testTitle = test.title;
        const testState = test.state;
        const testIndent = `${DEFAULT_INDENT}${suiteIndent}`;

        // Output for a single test
        output.push(
          `*${testIndent}${
            testState ? `${this._symbols[testState]} ` : ''
          }${testTitle}*`
        );
      }

      // Put a line break after each suite (only if tests exist in that suite)
      if (eventsToReport.length) {
        const block: Block | KnownBlock = {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: output.join('\n'),
          },
        };
        output.length = 0;
        blocks.push(block);
      }
    }
    if (blocks.length === 0) {
      const block: Block | KnownBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*`No filter Results.`*',
        },
      };
      blocks.push(block);
    }
    return blocks;
  }

  private getOrderedSuites(): SuiteStats[] {
    if (this._orderedSuites.length) {
      return this._orderedSuites;
    }

    this._orderedSuites = [];
    for (const uid of this._suiteUids) {
      for (const [suiteUid, suite] of Object.entries(this.suites)) {
        if (suiteUid !== uid) {
          continue;
        }

        this._orderedSuites.push(suite);
      }
    }

    return this._orderedSuites;
  }

  private getOrderedCucumberTests(): CucumberStats[] {
    if (this._cucumberOrderedTests.length) {
      return this._cucumberOrderedTests;
    }

    this._cucumberOrderedTests = [];
    for (const uid of this._suiteUids) {
      for (const [suiteUid, suite] of Object.entries(this.suites)) {
        if (suiteUid !== uid) {
          continue;
        }
        if (suite.type === 'scenario') {
          let testState: CucumberStats['state'] = 'passed';
          if (suite.tests.some((test) => test.state === 'failed')) {
            testState = 'failed';
          } else if (suite.tests.every((test) => test.state === 'skipped')) {
            testState = 'skipped';
          }
          this._cucumberOrderedTests.push(
            Object.assign(suite, { state: testState })
          );
        }
      }
    }

    return this._cucumberOrderedTests;
  }

  private getCucumberTestsCounts(): StateCount {
    if (this._isCucumberFramework) {
      const suitesData = this.getOrderedCucumberTests();
      const suiteStats: StateCount = {
        passed: suitesData.filter(({ state }) => state === 'passed').length,
        failed: suitesData.filter(({ state }) => state === 'failed').length,
        skipped: suitesData.filter(({ state }) => state === 'skipped').length,
      };

      return suiteStats;
    } else {
      logger.warn(
        'Since the Cucumber Framework is not being used, the state is counted based on the tests(steps).'
      );
      return this._stateCounts;
    }
  }

  /**
   * returns everything worth reporting from a suite
   * @param  {Object}    suite  test suite containing tests and hooks
   * @return {Object[]}         list of events to report
   */
  private getEventsToReport(suite: SuiteStats): (TestStats | HookStats)[] {
    return [
      /**
       * report all tests and only hooks that failed
       */
      ...suite.hooksAndTests.filter((item) => {
        return item.type === 'test' || Boolean(item.error);
      }),
    ];
  }

  onRunnerStart(runnerStats: RunnerStats): void {
    logger.info('INFO', `Test Framework: ${runnerStats.config.framework}`);
    if (runnerStats.config.framework === 'cucumber') {
      this._isCucumberFramework = true;
    }
    if (this._notifyTestStartMessage) {
      try {
        if (this._webClient) {
          logger.info('INFO', `ON RUNNER START: POST MESSAGE`);
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
            payload: this.createStartPayload(
              runnerStats
            ) as ChatPostMessageArguments,
          });
        } else if (this._webhookClient) {
          logger.info('INFO', `ON RUNNER START: SEND`);
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEBHOOK_SEND,
            payload: this.createStartPayload(
              runnerStats
            ) as IncomingWebhookSendArguments,
          });
        }
      } catch (error) {
        logger.error(error);
        throw error;
      }
    }
  }

  // onBeforeCommand(commandArgs: BeforeCommandArgs): void {}
  // onAfterCommand(commandArgs: AfterCommandArgs): void {}

  onSuiteStart(suiteStats: SuiteStats): void {
    this._currentSuite = suiteStats;

    this._suiteUids.add(suiteStats.uid);
    if (this._isCucumberFramework) {
      if (suiteStats.type === 'feature') {
        this._indents = 0;
        this._suiteIndents[suiteStats.uid] = this._indents;
      }
    } else {
      this._suiteIndents[suiteStats.uid] = ++this._indents;
    }
  }

  // onHookStart(hookStat: HookStats): void {}
  onHookEnd(hookStats: HookStats): void {
    if (hookStats.error) {
      this._stateCounts.failed++;

      if (this._notifyFailedCase) {
        if (this._webClient) {
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
            payload: this.createFailedTestPayload(
              hookStats
            ) as ChatPostMessageArguments,
          });
        } else {
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEBHOOK_SEND,
            payload: this.createFailedTestPayload(
              hookStats
            ) as ChatPostMessageArguments,
          });
        }
      }
    }
  }

  // onTestStart(testStats: TestStats): void {}
  onTestPass(testStats: TestStats): void {
    this._stateCounts.passed++;
  }
  onTestFail(testStats: TestStats): void {
    this._stateCounts.failed++;

    if (this._notifyFailedCase) {
      if (this._webClient) {
        this._slackRequestQueue.push({
          type: SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
          payload: this.createFailedTestPayload(
            testStats
          ) as ChatPostMessageArguments,
        });

        if (this._uploadScreenshotOfFailedCase && this._lastScreenshotBuffer) {
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEB_API_UPLOAD,
            payload: this.createScreenshotPayload(
              testStats,
              this._lastScreenshotBuffer
            ) as FilesUploadArguments,
          });
          this._lastScreenshotBuffer = undefined;
        }
      } else {
        this._slackRequestQueue.push({
          type: SLACK_REQUEST_TYPE.WEBHOOK_SEND,
          payload: this.createFailedTestPayload(
            testStats
          ) as ChatPostMessageArguments,
        });
      }
    }
  }
  // onTestRetry(testStats: TestStats): void {}
  onTestSkip(testStats: TestStats): void {
    this._stateCounts.skipped++;
  }

  // onTestEnd(testStats: TestStats): void {}

  onSuiteEnd(suiteStats: SuiteStats): void {
    this._indents--;
  }

  onRunnerEnd(runnerStats: RunnerStats): void {
    if (this._notifyTestFinishMessage) {
      const stateCount = this._useScenarioBasedStateCounts
        ? this.getCucumberTestsCounts()
        : this._stateCounts;

      try {
        if (this._webClient) {
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
            payload: this.createResultPayload(
              runnerStats,
              stateCount
            ) as ChatPostMessageArguments,
          });

          if (this._notifyDetailResultThread) {
            this._slackRequestQueue.push({
              type: SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
              payload: this.createResultDetailPayload(
                runnerStats,
                stateCount
              ) as ChatPostMessageArguments,
              isDetailResult: true,
            });
          }
        } else {
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEBHOOK_SEND,
            payload: this.createResultPayload(
              runnerStats,
              stateCount
            ) as IncomingWebhookSendArguments,
          });
        }
      } catch (error) {
        logger.error(error);
        throw error;
      }
    }

    this._hasRunnerEnd = true;
  }
}

export default SlackReporter;
