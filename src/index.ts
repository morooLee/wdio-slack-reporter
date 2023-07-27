import {
  Block,
  ChatPostMessageArguments,
  FilesUploadArguments,
  KnownBlock,
  WebAPICallResult,
  WebClient,
} from '@slack/web-api';
import {
  IncomingWebhook,
  IncomingWebhookResult,
  IncomingWebhookSendArguments,
} from '@slack/webhook';
import getLogger from '@wdio/logger';
import WDIOReporter, {
  HookStats,
  RunnerStats,
  SuiteStats,
  TestStats,
} from '@wdio/reporter';
import { Capabilities } from '@wdio/types';
import util from 'util';
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
import {
  SlackRequestType,
  SlackReporterOptions,
  EmojiSymbols,
  StateCount,
  CucumberStats,
  TestResultType,
} from './types.js';

const log = getLogger('@moroo/wdio-slack-reporter');

class SlackReporter extends WDIOReporter {
  private static resultsUrl?: string;
  private _slackRequestQueue: SlackRequestType[] = [];
  private _lastSlackWebAPICallResult?: WebAPICallResult;
  private _pendingSlackRequestCount = 0;
  private _stateCounts: StateCount = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  private _useScenarioBasedStateCounts = false;
  private _client?: WebClient;
  private _webhook?: IncomingWebhook;
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
      log.error(ERROR_MESSAGES.UNDEFINED_SLACK_OPTION);
      log.debug(options.slackOptions);
      throw new Error(ERROR_MESSAGES.UNDEFINED_SLACK_OPTION);
    }
    if (options.slackOptions.type === 'web-api') {
      this._client = new WebClient(options.slackOptions.slackBotToken);
      log.info('Created Slack Web API Client Instance.');
      log.debug('Slack Web API Client', {
        token: options.slackOptions.slackBotToken,
        channel: options.slackOptions.channel,
      });
      this._channel = options.slackOptions.channel;
      if (options.slackOptions.notifyDetailResultThread !== undefined) {
        if (options.notifyTestFinishMessage === false) {
          log.warn(
            'Notify is not possible. because the notifyResultMessage option is off.'
          );
        }
        this._notifyDetailResultThread =
          options.slackOptions.notifyDetailResultThread;
      }
      if (options.slackOptions.filterForDetailResults !== undefined) {
        if (options.slackOptions.notifyDetailResultThread === false) {
          log.warn(
            'Detail result filters does not work. because the notifyDetailResultThread option is off.'
          );
        }
        if (options.slackOptions.filterForDetailResults.length === 0) {
          log.info(
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
        log.info('The [createScreenshotPayload] function has been overridden.');
        log.debug('RESULT', this.createScreenshotPayload.toString());
      }
      if (options.slackOptions.createResultDetailPayload) {
        this.createResultDetailPayload =
          options.slackOptions.createResultDetailPayload.bind(this);
        log.info(
          'The [createResultDetailPayload] function has been overridden.'
        );
        log.debug('RESULT', this.createResultDetailPayload.toString());
      }
    } else {
      this._webhook = new IncomingWebhook(options.slackOptions.webhook, {
        username: options.slackOptions.slackName || SLACK_NAME,
        icon_url: options.slackOptions.slackIconUrl || SLACK_ICON_URL,
      });
      log.info('Created Slack Webhook Instance.');
      log.debug('IncomingWebhook', {
        webhook: options.slackOptions.webhook,
        username: options.slackOptions.slackName || SLACK_NAME,
        icon_url: options.slackOptions.slackIconUrl || SLACK_ICON_URL,
      });
    }
    this._symbols = {
      passed: options.emojiSymbols?.passed || EMOJI_SYMBOLS.PASSED,
      skipped: options.emojiSymbols?.skipped || EMOJI_SYMBOLS.SKIPPED,
      failed: options.emojiSymbols?.failed || EMOJI_SYMBOLS.FAILED,
      pending: options.emojiSymbols?.pending || EMOJI_SYMBOLS.PENDING,
      start: options.emojiSymbols?.start || EMOJI_SYMBOLS.ROKET,
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
      log.info('The [createStartPayload] function has been overridden.');
      log.debug('RESULT', this.createStartPayload.toString());
    }
    if (options.createFailedTestPayload) {
      this.createFailedTestPayload = options.createFailedTestPayload.bind(this);
      log.info('The [createFailedTestPayload] function has been overridden.');
      log.debug('RESULT', this.createFailedTestPayload.toString());
    }
    if (options.createResultPayload) {
      this.createResultPayload = options.createResultPayload.bind(this);
      log.info('The [createResultPayload] function has been overridden.');
      log.debug('RESULT', this.createResultPayload.toString());
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
   * Upload failed test scrteenshot
   * @param  {WebdriverIO.Browser} browser Parameters used by WebdriverIO.Browser
   * @param  {{page: Page, options: ScreenshotOptions}} puppeteer Parameters used by Puppeteer
   * @return {Promise<Buffer>}
   */
  static uploadFailedTestScreenshot(data: string | Buffer): void {
    let buffer: Buffer;

    if (typeof data === 'string') {
      buffer = Buffer.from(data, 'base64');
    } else {
      buffer = data;
    }
    process.emit(EVENTS.SCREENSHOT, buffer);
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
    payload: FilesUploadArguments
  ): Promise<WebAPICallResult> {
    return new Promise((resolve, reject) => {
      process.emit(EVENTS.UPLOAD, payload);
      process.once(EVENTS.RESULT, ({ result, error }) => {
        if (result) {
          resolve(result as WebAPICallResult);
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
    if (this._client) {
      if (this._notifyFailedCase && this._uploadScreenshotOfFailedCase) {
        this._lastScreenshotBuffer = buffer;
        return;
      } else {
        log.warn(ERROR_MESSAGES.DISABLED_OPTIONS);
      }
    } else {
      log.warn(ERROR_MESSAGES.NOT_USING_WEB_API);
    }

    // return new Promise((resolve, reject) => {
    // 	const interval = setInterval(() => {
    // 		if (this._lastScreenshotBuffer === undefined) {
    // 			clearInterval(interval);
    // 			if (this._client && this._notifyFailedCase) {
    // 				this._lastScreenshotBuffer = buffer;
    // 			} else {
    // 				log.warn(
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
    if (this._client) {
      try {
        log.debug('COMMAND', `postMessage(${payload})`);
        this._pendingSlackRequestCount++;
        const result = await this._client.chat.postMessage(payload);
        log.debug('RESULT', util.inspect(result));
        process.emit(EVENTS.RESULT, { result, error: undefined });
        return result;
      } catch (error) {
        log.error(error);
        process.emit(EVENTS.RESULT, { result: undefined, error });
        throw error;
      } finally {
        this._pendingSlackRequestCount--;
      }
    }

    log.error(ERROR_MESSAGES.NOT_USING_WEB_API);
    throw new Error(ERROR_MESSAGES.NOT_USING_WEB_API);
  }

  private async upload(
    payload: FilesUploadArguments
  ): Promise<WebAPICallResult> {
    if (this._client) {
      try {
        log.debug('COMMAND', `upload(${payload})`);
        this._pendingSlackRequestCount++;
        const result = await this._client.files.upload(payload);
        log.debug('RESULT', util.inspect(result));
        process.emit(EVENTS.RESULT, { result, error: undefined });
        return result;
      } catch (error) {
        log.error(error);
        process.emit(EVENTS.RESULT, { result: undefined, error });
        throw error;
      } finally {
        this._pendingSlackRequestCount--;
      }
    }

    log.error(ERROR_MESSAGES.NOT_USING_WEB_API);
    throw new Error(ERROR_MESSAGES.NOT_USING_WEB_API);
  }

  private async send(
    payload: IncomingWebhookSendArguments
  ): Promise<IncomingWebhookResult> {
    if (this._webhook) {
      try {
        log.debug('COMMAND', `send(${payload})`);
        this._pendingSlackRequestCount++;
        const result = await this._webhook.send(payload);
        log.debug('RESULT', util.inspect(result));
        process.emit(EVENTS.RESULT, { result, error: undefined });
        return result;
      } catch (error) {
        log.error(error);
        process.emit(EVENTS.RESULT, { result: undefined, error });
        throw error;
      } finally {
        this._pendingSlackRequestCount--;
      }
    }

    log.error(ERROR_MESSAGES.NOT_USING_WEBHOOK);
    throw new Error(ERROR_MESSAGES.NOT_USING_WEBHOOK);
  }

  get isSynchronised(): boolean {
    return (
      this._pendingSlackRequestCount === 0 && this._isSynchronizing === false
    );
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
      log.info('Start Synchronising...');
      await this.next();
    } catch (error) {
      log.error(error);
      throw error;
    } finally {
      this._isSynchronizing = false;
      log.info('End Synchronising!!!');
    }
  }

  private async next() {
    const request = this._slackRequestQueue.shift();
    let result: WebAPICallResult | IncomingWebhookResult;

    log.info('POST', `Slack Request ${request?.type}`);
    log.debug('DATA', util.inspect(request?.payload));
    if (request) {
      try {
        this._pendingSlackRequestCount++;

        switch (request.type) {
          case SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE: {
            if (this._client) {
              result = await this._client.chat.postMessage({
                ...request.payload,
                thread_ts: request.isDetailResult
                  ? (this._lastSlackWebAPICallResult?.ts as string)
                  : undefined,
              });
              this._lastSlackWebAPICallResult = result;
              log.debug('RESULT', util.inspect(result));
            }
            break;
          }
          case SLACK_REQUEST_TYPE.WEB_API_UPLOAD: {
            if (this._client) {
              result = await this._client.files.upload({
                ...request.payload,
                thread_ts: this._lastSlackWebAPICallResult?.ts as string,
              });
              log.debug('RESULT', util.inspect(result));
            }
            break;
          }
          case SLACK_REQUEST_TYPE.WEBHOOK_SEND: {
            if (this._webhook) {
              result = await this._webhook.send(request.payload);
              log.debug('RESULT', util.inspect(result));
            }
            break;
          }
        }
      } catch (error) {
        log.error(error);
      } finally {
        this._pendingSlackRequestCount--;
      }

      if (this._slackRequestQueue.length > 0) {
        await this.next();
      }
    }
  }

  private convertErrorStack(stack: string): string {
    return stack.replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );
  }
  private getEnviromentCombo(
    capability: Capabilities.RemoteCapability,
    isMultiremote = false
  ): string {
    let output = '';
    const capabilities: Capabilities.RemoteCapability =
      ((capability as Capabilities.W3CCapabilities)
        .alwaysMatch as Capabilities.DesiredCapabilities) ||
      (capability as Capabilities.DesiredCapabilities);
    const drivers: {
      driverName?: string;
      capability: Capabilities.RemoteCapability;
    }[] = [];

    if (isMultiremote) {
      output += '*MultiRemote*: \n';

      Object.keys(capabilities).forEach((key) => {
        drivers.push({
          driverName: key,
          capability: (capabilities as Capabilities.MultiRemoteCapabilities)[
            key
          ],
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
        ((capability as Capabilities.W3CCapabilities)
          .alwaysMatch as Capabilities.DesiredCapabilities) ||
        (capability as Capabilities.DesiredCapabilities);
      const device = caps.deviceName;
      const browser = caps.browserName || caps.browser;
      const version =
        caps.browserVersion ||
        caps.version ||
        caps.platformVersion ||
        caps.browser_version;
      const platform =
        caps.platformName ||
        caps.platform ||
        (caps.os
          ? caps.os + (caps.os_version ? ` ${caps.os_version}` : '')
          : '(unknown)');
      if (device) {
        const program =
          (caps.app || '').replace('sauce-storage:', '') || caps.browserName;
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
    }${this.getEnviromentCombo(
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
    screenshotBuffer: Buffer
  ): FilesUploadArguments {
    const payload: FilesUploadArguments = {
      channels: this._channel,
      initial_comment: `Screenshot for Fail to ${testStats.title}`,
      filename: `${testStats.uid}.png`,
      filetype: 'png',
      file: screenshotBuffer,
    };
    return payload;
  }

  private createResultPayload(
    runnerStats: RunnerStats,
    stateCounts: StateCount
  ): ChatPostMessageArguments | IncomingWebhookSendArguments {
    const resltsUrl = SlackReporter.getResultsUrl();
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
            resltsUrl ? `*Results*: <${resltsUrl}>\n` : ''
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
      if (
        this._isCucumberFramework === false &&
        this._notifyDetailResultThread
      ) {
        eventsToReport = eventsToReport.filter(({ state }) =>
          this._filterForDetailResults.includes(state)
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

  private getOrderedSuites() {
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

  private getOrderedCucumberTests() {
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

  private getCucumberTestsCounts() {
    if (this._isCucumberFramework) {
      const suitesData = this.getOrderedCucumberTests();
      const suiteStats: StateCount = {
        passed: suitesData.filter(({ state }) => state === 'passed').length,
        failed: suitesData.filter(({ state }) => state === 'failed').length,
        skipped: suitesData.filter(({ state }) => state === 'skipped').length,
      };

      return suiteStats;
    } else {
      log.warn(
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
  private getEventsToReport(suite: SuiteStats) {
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
    log.info('INFO', `Test Framework: ${runnerStats.config.framework}`);
    if (runnerStats.config.framework === 'cucumber') {
      this._isCucumberFramework = true;
    }
    if (this._notifyTestStartMessage) {
      try {
        if (this._client) {
          log.info('INFO', `ON RUNNER START: POST MESSAGE`);
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
            payload: this.createStartPayload(
              runnerStats
            ) as ChatPostMessageArguments,
          });
        } else if (this._webhook) {
          log.info('INFO', `ON RUNNER START: SEND`);
          this._slackRequestQueue.push({
            type: SLACK_REQUEST_TYPE.WEBHOOK_SEND,
            payload: this.createStartPayload(
              runnerStats
            ) as IncomingWebhookSendArguments,
          });
        }
      } catch (error) {
        log.error(error);
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
        if (this._client) {
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
      if (this._client) {
        this._slackRequestQueue.push({
          type: SLACK_REQUEST_TYPE.WEB_API_POST_MESSAGE,
          payload: this.createFailedTestPayload(
            testStats
          ) as ChatPostMessageArguments,
        });

        if (this._uploadScreenshotOfFailedCase && this._lastScreenshotBuffer) {
          log.error('UID', testStats.uid);
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
      log.error(this._useScenarioBasedStateCounts);
      const stateCount = this._useScenarioBasedStateCounts
        ? this.getCucumberTestsCounts()
        : this._stateCounts;

      try {
        if (this._client) {
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
        log.error(error);
        throw error;
      }
    }

    this._hasRunnerEnd = true;
  }
}

export default SlackReporter;
export { SlackReporterOptions };
export * from './types.js';

declare global {
  namespace WebdriverIO {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
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
        payload: FilesUploadArguments
      ): Promise<WebAPICallResult>;
      emit(
        event: typeof EVENTS.SEND,
        payload: IncomingWebhookSendArguments
      ): boolean;
      emit(event: typeof EVENTS.SCREENSHOT, buffer: Buffer): boolean;
      emit(
        event: typeof EVENTS.RESULT,
        args: {
          result: WebAPICallResult | IncomingWebhookResult | undefined;
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
        listener: (payload: FilesUploadArguments) => Promise<WebAPICallResult>
      ): this;
      on(
        event: typeof EVENTS.SEND,
        listener: (
          payload: IncomingWebhookSendArguments
        ) => Promise<IncomingWebhookResult>
      ): this;
      on(
        event: typeof EVENTS.SCREENSHOT,
        listener: (buffer: Buffer) => void
      ): this;
      once(
        event: typeof EVENTS.RESULT,
        listener: (args: {
          result: WebAPICallResult | IncomingWebhookResult | undefined;
          error: any;
        }) => Promise<void>
      ): this;
    }
  }
}
